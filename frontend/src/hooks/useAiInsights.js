// AI insights client — calls the ai-insights Edge Function.
// Uses the anon Supabase key (fine — the function has its own Anthropic
// key server-side; rate-limiting + abuse control live on the function).

import { useQuery } from '@tanstack/react-query';
import { useCircleContract } from './useCircleContract';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function fetchInsights(body) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-insights`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`ai-insights ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
}

// Kind: 'reputation' | 'recommendations' | 'summary' | 'chat'
export function useAiInsights(kind, { enabled = true, prompt } = {}) {
    const { userAddress, isConnected } = useCircleContract();
    const addr = userAddress?.toLowerCase() || null;
    return useQuery({
        queryKey: ['aiInsights', kind, addr, prompt],
        queryFn: () => fetchInsights({ kind, address: addr, prompt }),
        enabled: enabled && isConnected && !!addr,
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
    });
}

// One-shot chat (for a future chat surface). Doesn't need an address.
export async function askChat(prompt) {
    return fetchInsights({ kind: 'chat', prompt });
}
