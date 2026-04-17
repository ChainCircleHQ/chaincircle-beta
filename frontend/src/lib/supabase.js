// Browser Supabase client.
// Reads from Vite env; missing vars throw early with a clear message so
// Phase 5 work (swapping contract reads for Supabase queries) fails fast
// during dev rather than silently returning empty results.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
    throw new Error(
        'Supabase env missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local',
    );
}

export const supabase = createClient(url, anonKey, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 5 } },
});
