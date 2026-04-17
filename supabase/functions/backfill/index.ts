// One-shot backfill: resets indexer_state to 0 for all contracts, then
// repeatedly invokes the same decode loop until caught up with head.
// Use once after fresh migration, or after a contract redeploy.
//
// Call with: curl -X POST https://<ref>.supabase.co/functions/v1/backfill \
//   -H "Authorization: Bearer <SERVICE_ROLE_KEY>"

import { supabaseAdmin } from "../_shared/supabase.ts";

const INDEXER_URL_ENV = "INDEXER_FUNCTION_URL";
const RUN_CAP = 200; // safety ceiling on number of indexer invocations per backfill

Deno.serve(async (_req: Request) => {
    const db = supabaseAdmin();
    const indexerUrl = Deno.env.get(INDEXER_URL_ENV);
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!indexerUrl || !serviceKey) {
        return json({ error: `Set ${INDEXER_URL_ENV} and SUPABASE_SERVICE_ROLE_KEY` }, 500);
    }

    await db.from("indexer_state").update({
        last_block_processed: 0,
        last_error: null,
        error_count: 0,
    }).neq("contract_address", "");

    const history: unknown[] = [];
    for (let i = 0; i < RUN_CAP; i++) {
        const res = await fetch(indexerUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${serviceKey}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({}),
        });
        const body = await res.json();
        history.push({ run: i + 1, status: res.status, summary: body.per_contract ?? body });

        const perContract = body.per_contract ?? {};
        const allCaughtUp = Object.values(perContract as Record<string, { skipped?: boolean }>)
            .every((v) => v?.skipped === true);
        if (allCaughtUp) {
            return json({ done: true, runs: i + 1, history: history.slice(-5) });
        }
    }

    return json({ done: false, reason: "hit RUN_CAP", runs: RUN_CAP, history: history.slice(-5) });
});

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body, null, 2), {
        status,
        headers: { "content-type": "application/json" },
    });
}
