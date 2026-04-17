// Shared Supabase admin client for Edge Functions.
// Uses the service role key (set as a secret) so writes bypass RLS.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.103.3";

export function supabaseAdmin(): SupabaseClient {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
        throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    }
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

export function lc(address: string): string {
    return address.toLowerCase();
}
