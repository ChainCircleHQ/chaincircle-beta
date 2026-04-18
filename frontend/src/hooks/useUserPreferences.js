// Cross-device persistence for UI-only preferences (pinned/muted circles).
// Backed by Supabase public.user_preferences; replaces the localStorage-only
// version. Falls back to localStorage for the current session if Supabase
// is unreachable, so UI never blocks on network.

import { useCallback, useEffect, useState } from 'react';
import { useCircleContract } from './useCircleContract';
import { supabase } from '../lib/supabase';

const LS_PINNED = 'pinnedCircles';
const LS_MUTED = 'mutedCircles';

const lc = (a) => (a ? String(a).toLowerCase() : a);

function readLocalArr(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw).map((v) => Number(v)).filter(Number.isFinite) : [];
    } catch {
        return [];
    }
}

function writeLocalArr(key, arr) {
    try {
        localStorage.setItem(key, JSON.stringify(arr));
    } catch { /* storage unavailable — ignore */ }
}

export function useUserPreferences() {
    const { userAddress, isConnected } = useCircleContract();
    const [pinned, setPinned] = useState(() => readLocalArr(LS_PINNED));
    const [muted, setMuted] = useState(() => readLocalArr(LS_MUTED));
    const [loaded, setLoaded] = useState(false);

    // Hydrate from Supabase on mount / address change. Keep localStorage in
    // sync as a fallback cache for offline sessions.
    useEffect(() => {
        if (!isConnected || !userAddress) return;
        const addr = lc(userAddress);
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('user_preferences')
                    .select('pinned_circles, muted_circles')
                    .eq('address', addr)
                    .maybeSingle();
                if (error) throw error;
                const p = (data?.pinned_circles || []).map(Number);
                const m = (data?.muted_circles || []).map(Number);
                setPinned(p);
                setMuted(m);
                writeLocalArr(LS_PINNED, p);
                writeLocalArr(LS_MUTED, m);
            } catch {
                // Fall back to whatever's in localStorage already
            } finally {
                setLoaded(true);
            }
        })();
    }, [isConnected, userAddress]);

    const persist = useCallback(
        async (nextPinned, nextMuted) => {
            writeLocalArr(LS_PINNED, nextPinned);
            writeLocalArr(LS_MUTED, nextMuted);
            if (!userAddress) return;
            const addr = lc(userAddress);
            await supabase
                .from('user_preferences')
                .upsert(
                    { address: addr, pinned_circles: nextPinned, muted_circles: nextMuted },
                    { onConflict: 'address' },
                );
        },
        [userAddress],
    );

    const togglePin = useCallback(
        (circleId) => {
            const id = Number(circleId);
            setPinned((cur) => {
                const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
                persist(next, muted);
                return next;
            });
        },
        [muted, persist],
    );

    const toggleMute = useCallback(
        (circleId) => {
            const id = Number(circleId);
            setMuted((cur) => {
                const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
                persist(pinned, next);
                return next;
            });
        },
        [pinned, persist],
    );

    const isPinned = useCallback((id) => pinned.includes(Number(id)), [pinned]);
    const isMuted = useCallback((id) => muted.includes(Number(id)), [muted]);

    return { pinned, muted, isPinned, isMuted, togglePin, toggleMute, loaded };
}
