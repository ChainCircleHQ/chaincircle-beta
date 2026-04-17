// Supabase-backed circle hooks — will progressively replace the on-chain
// event-scan hooks in src/hooks/useCircleData.js during Phase 5. Keep the
// return shape compatible so swapping call sites is a rename, not a rewrite.

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export function useCirclesDb({ status, creator, limit = 50 } = {}) {
    const query = useQuery({
        queryKey: ['circles.db', { status, creator, limit }],
        queryFn: async () => {
            let q = supabase
                .from('circles')
                .select('*')
                .order('created_block', { ascending: false })
                .limit(limit);
            if (status !== undefined) q = q.eq('status', status);
            if (creator) q = q.eq('creator_address', creator.toLowerCase());
            const { data, error } = await q;
            if (error) throw error;
            return data;
        },
        staleTime: 15_000,
    });

    // Realtime subscription — new circles arrive without a refetch.
    useEffect(() => {
        const channel = supabase
            .channel('circles-feed')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'circles' },
                () => query.refetch(),
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [query.refetch]);

    return query;
}

export function useRecentActivityDb({ actor, circleId, limit = 50 } = {}) {
    return useQuery({
        queryKey: ['activity_log.db', { actor, circleId, limit }],
        queryFn: async () => {
            let q = supabase
                .from('activity_log')
                .select('*')
                .order('ts', { ascending: false })
                .limit(limit);
            if (actor) q = q.eq('actor_address', actor.toLowerCase());
            if (circleId) q = q.eq('circle_id', circleId);
            const { data, error } = await q;
            if (error) throw error;
            return data;
        },
        staleTime: 10_000,
        refetchInterval: 30_000,
    });
}
