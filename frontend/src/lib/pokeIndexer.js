// Fire-and-forget ping to the index-events Edge Function. Called after
// every on-chain write so the indexer picks up the new events within a
// few seconds instead of waiting for the ~60s cron tick.
//
// Flow: caller awaits the tx (or skips if pending), then triggers this.
// We don't await the HTTP call — UX shouldn't block on indexer latency.
// The function is idempotent; double-invocation from overlapping writes
// just re-reads the same (now-empty) range.

import { supabase } from './supabase';

let lastInvokedAt = 0;
const MIN_INTERVAL_MS = 1500; // cheap throttle — multiple writes in quick
                              // succession don't need multiple pokes.

export function pokeIndexer() {
    const now = Date.now();
    if (now - lastInvokedAt < MIN_INTERVAL_MS) return;
    lastInvokedAt = now;
    // supabase-js invoke() handles auth + URL composition; .catch swallows
    // network hiccups because this is best-effort.
    supabase.functions
        .invoke('index-events', { body: {} })
        .catch(() => { /* indexer will catch up via cron anyway */ });
}

// Wait N ms then poke — some origin chains (Solana especially) need the
// Push gateway a beat to finalize before the EVM log is queryable.
export function pokeIndexerSoon(delayMs = 2500) {
    setTimeout(pokeIndexer, delayMs);
}
