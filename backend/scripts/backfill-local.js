// Local backfill driver for the v2 indexer.
//
// Strategy change vs the v1 script: the indexer logic now lives entirely in
// the `index-events` Supabase Edge Function (which is also what pg_cron runs
// every minute). To catch up from a deployment checkpoint, we just call that
// function in a loop until every contract in indexer_state is caught up with
// the chain head. The function advances its own checkpoints; we trust that.
//
// Run with: node scripts/backfill-local.js
// Requires: SUPABASE_URL, SUPABASE_ANON_KEY (or SERVICE_ROLE), INDEXER_URL
//           (defaults to ${SUPABASE_URL}/functions/v1/index-events)

require("dotenv").config();

const {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    INDEXER_URL,
} = process.env;

if (!SUPABASE_URL) {
    console.error("Missing SUPABASE_URL in backend/.env");
    process.exit(1);
}
const KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
if (!KEY) {
    console.error("Missing SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in backend/.env");
    process.exit(1);
}

const FN_URL = INDEXER_URL || `${SUPABASE_URL}/functions/v1/index-events`;

// PostgREST helper so we can read indexer_state for the "are we caught up" check.
function db(path) {
    return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
            apikey: KEY,
            Authorization: `Bearer ${KEY}`,
        },
    });
}

async function invokeIndexer() {
    const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${KEY}`,
            "Content-Type": "application/json",
        },
        body: "{}",
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 400) }; }
    if (!res.ok) throw new Error(`indexer returned ${res.status}: ${text.slice(0, 300)}`);
    return body;
}

async function readStates() {
    const res = await db("indexer_state?select=contract_name,last_block_processed,last_error");
    if (!res.ok) throw new Error(`indexer_state fetch failed: ${res.status}`);
    return res.json();
}

function allCaughtUp(states, head) {
    return states.every((s) => Number(s.last_block_processed) >= head);
}

async function main() {
    console.log(`driver = ${FN_URL}`);

    // 1. Find current chain head so we know when to stop.
    const firstRun = await invokeIndexer();
    const head = Number(firstRun.head);
    if (!Number.isFinite(head)) throw new Error("indexer did not report head: " + JSON.stringify(firstRun).slice(0, 200));
    console.log(`head = ${head}`);
    console.log("per_contract (first pass):", JSON.stringify(firstRun.per_contract, null, 2));

    // 2. Loop until every contract's last_block_processed reaches head.
    let iter = 1;
    const MAX_ITERS = 500;
    while (iter < MAX_ITERS) {
        const states = await readStates();
        const behind = states.filter((s) => Number(s.last_block_processed) < head);
        if (!behind.length) {
            console.log(`✅ all contracts caught up at ${head} after ${iter} pass(es).`);
            break;
        }
        console.log(`\npass ${iter + 1}: ${behind.length} behind →`,
            behind.map((s) => `${s.contract_name}@${s.last_block_processed}`).join(", "));
        const body = await invokeIndexer();
        iter++;
        // Tiny pause so we don't hammer the function in a hot loop on an
        // empty range (no events decoded → returns immediately).
        await new Promise((r) => setTimeout(r, 150));
        // Surface per-contract errors so transient RPC failures don't fly silent.
        for (const [k, v] of Object.entries(body.per_contract || {})) {
            if (v?.error) console.log(`  ⚠ ${k}: ${String(v.error).slice(0, 200)}`);
        }
    }

    // 3. Refresh the activity_log materialized view so UI picks up the fresh rows.
    const refresh = await fetch(`${SUPABASE_URL}/rest/v1/rpc/refresh_activity_log`, {
        method: "POST",
        headers: {
            apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json",
        },
        body: "{}",
    });
    console.log(refresh.ok ? "activity_log refreshed." : `refresh failed: ${refresh.status}`);
    console.log("\nbackfill complete.");
}

main().catch((e) => {
    console.error("\n❌ backfill failed:", e.message);
    if (e.stack) console.error(e.stack.split("\n").slice(0, 8).join("\n"));
    process.exit(1);
});
