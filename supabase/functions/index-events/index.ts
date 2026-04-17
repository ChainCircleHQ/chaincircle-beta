// Incremental indexer — pulls new events since last checkpoint, decodes them
// against the real deployed ABIs, enriches circles via contract reads, writes
// to DB. Runs on pg_cron (1 min). Idempotent on re-runs.

import { supabaseAdmin, lc } from "../_shared/supabase.ts";
import {
    IFACES,
    NAME_TO_KEY,
    provider,
    coreContract,
    fetchLogs,
    blockTimestamp,
} from "../_shared/chain.ts";

const BATCH_SIZE = 10_000; // Push Chain RPC hard cap

Deno.serve(async (_req: Request) => {
    try {
        return await run();
    } catch (e) {
        return json(
            {
                error: (e as Error).message,
                stack: (e as Error).stack?.split("\n").slice(0, 10),
            },
            500,
        );
    }
});

async function run(): Promise<Response> {
    const db = supabaseAdmin();
    const p = provider();
    const core = coreContract(p);
    const head = await p.getBlockNumber();
    const results: Record<string, unknown> = { head, per_contract: {} };

    const { data: states, error } = await db.from("indexer_state").select("*");
    if (error) return json({ error: error.message, phase: "select_indexer_state" }, 500);

    const blockTsCache = new Map<number, Date>();

    for (const s of states ?? []) {
        const key = NAME_TO_KEY[s.contract_name];
        if (!key) continue;

        const fromBlock = Number(s.last_block_processed) + 1;
        const toBlock = Math.min(head, fromBlock + BATCH_SIZE - 1);
        if (fromBlock > head) {
            (results.per_contract as Record<string, unknown>)[key] = { skipped: true, at: head };
            continue;
        }

        try {
            const logs = await fetchLogs(p, s.contract_address, fromBlock, toBlock);
            const counts = await writeBatch(db, p, core, key, logs, blockTsCache);

            await db
                .from("indexer_state")
                .update({
                    last_block_processed: toBlock,
                    last_run_at: new Date().toISOString(),
                    last_error: null,
                    error_count: 0,
                })
                .eq("contract_address", s.contract_address);

            (results.per_contract as Record<string, unknown>)[key] = { from: fromBlock, to: toBlock, logs: logs.length, ...counts };
        } catch (e) {
            await db
                .from("indexer_state")
                .update({
                    last_error: (e as Error).message,
                    error_count: (s.error_count ?? 0) + 1,
                    last_run_at: new Date().toISOString(),
                })
                .eq("contract_address", s.contract_address);
            (results.per_contract as Record<string, unknown>)[key] = { error: (e as Error).message };
        }
    }

    try { await db.rpc("refresh_activity_log"); } catch { /* non-fatal */ }
    return json(results);
}

async function writeBatch(
    db: ReturnType<typeof supabaseAdmin>,
    p: ReturnType<typeof provider>,
    core: ReturnType<typeof coreContract>,
    key: keyof typeof IFACES,
    logs: Awaited<ReturnType<typeof fetchLogs>>,
    blockTsCache: Map<number, Date>,
): Promise<Record<string, number>> {
    const iface = IFACES[key];
    const ts = async (b: number) => {
        if (!blockTsCache.has(b)) blockTsCache.set(b, await blockTimestamp(p, b));
        return blockTsCache.get(b)!.toISOString();
    };

    const users = new Set<string>();
    const circleCreated: Record<string, unknown>[] = [];
    const members: Record<string, unknown>[] = [];
    const contributions: Record<string, unknown>[] = [];
    const payouts: Record<string, unknown>[] = [];
    const reputation: Record<string, unknown>[] = [];
    const badges: Record<string, unknown>[] = [];
    const completions: { circle_id: number; completed_at: string }[] = [];
    const nameUpserts: { address: string; display_name: string }[] = [];

    for (const log of logs) {
        let parsed;
        try { parsed = iface.parseLog(log); } catch { continue; }
        if (!parsed) continue;
        const tsIso = await ts(log.blockNumber);

        if (key === "CHAIN_CIRCLE_CORE") {
            if (parsed.name === "CircleCreated") {
                const [circleId, creator] = parsed.args as [bigint, string, bigint];
                users.add(creator);
                circleCreated.push({
                    circle_id: Number(circleId),
                    creator_address: lc(creator),
                    contract_address: lc(log.address),
                    created_block: log.blockNumber,
                });
            } else if (parsed.name === "MemberJoined") {
                const [circleId, member] = parsed.args as [bigint, string];
                users.add(member);
                members.push({
                    circle_id: Number(circleId),
                    user_address: lc(member),
                    joined_block: log.blockNumber,
                    joined_at: tsIso,
                });
            } else if (parsed.name === "ContributionMade") {
                const [circleId, member, amount] = parsed.args as [bigint, string, bigint, bigint];
                users.add(member);
                contributions.push({
                    tx_hash: log.transactionHash, circle_id: Number(circleId),
                    user_address: lc(member), amount: amount.toString(),
                    block_number: log.blockNumber, block_timestamp: tsIso,
                });
            } else if (parsed.name === "PayoutProcessed" || parsed.name === "InterestDistributed") {
                const [circleId, recipient, amount] = parsed.args as [bigint, string, bigint, bigint];
                users.add(recipient);
                payouts.push({
                    tx_hash: log.transactionHash, circle_id: Number(circleId),
                    recipient_address: lc(recipient), amount: amount.toString(),
                    block_number: log.blockNumber, block_timestamp: tsIso,
                });
            } else if (parsed.name === "CircleCompleted") {
                completions.push({ circle_id: Number(parsed.args[0]), completed_at: tsIso });
            }
        } else if (key === "REPUTATION_MANAGER" && parsed.name === "ScoreChanged") {
            const [user, oldScore, newScore, reason] = parsed.args as [string, bigint, bigint, string];
            users.add(user);
            reputation.push({
                tx_hash: log.transactionHash, log_index: log.index,
                user_address: lc(user), event_type: reason || "ScoreChanged",
                delta: Number(newScore) - Number(oldScore), score_after: Number(newScore),
                reason: reason || null,
                block_number: log.blockNumber, block_timestamp: tsIso,
            });
        } else if (key === "BADGE_NFT" && parsed.name === "BadgeMinted") {
            const [user, tokenId, tier] = parsed.args as [string, bigint, string];
            users.add(user);
            badges.push({
                token_id: Number(tokenId), user_address: lc(user), badge_type: tier,
                tx_hash: log.transactionHash, block_number: log.blockNumber, minted_at: tsIso,
            });
        } else if (key === "NAME_REGISTRY") {
            const args = parsed.args as [string, ...string[]];
            const name = parsed.name === "NameRegistered" ? args[1] : args[2];
            nameUpserts.push({ address: lc(args[0]), display_name: name });
        }
    }

    // Users first (FK)
    for (const addr of users) {
        await db.from("users").upsert({ address: lc(addr) }, { onConflict: "address", ignoreDuplicates: true });
    }
    for (const nu of nameUpserts) {
        await db.from("users").upsert(nu, { onConflict: "address" });
    }

    // Enrich circles
    for (const row of circleCreated) {
        try {
            const c = await core.circles(row.circle_id);
            row.name = c.name;
            row.goal_type = Number(c.goalType);
            row.contribution_amount = c.amount.toString();
            row.duration_months = Number(c.duration);
            row.member_cap = Number(c.maxMembers);
            row.frequency = Number(c.frequency);
            row.status = Number(c.status);
            row.current_round = Number(c.currentRound);
            row.total_pooled = c.vaultBalance.toString();
            if (Number(c.startAt) > 0) row.started_at = new Date(Number(c.startAt) * 1000).toISOString();
        } catch { /* leave fields null */ }
    }

    if (circleCreated.length) await db.from("circles").upsert(circleCreated, { onConflict: "circle_id" });
    if (members.length)       await db.from("circle_members").upsert(members, { onConflict: "circle_id,user_address" });
    if (contributions.length) await db.from("contributions").upsert(contributions, { onConflict: "tx_hash" });
    if (payouts.length)       await db.from("payouts").upsert(payouts, { onConflict: "tx_hash" });
    if (reputation.length)    await db.from("reputation_events").upsert(reputation, { onConflict: "tx_hash,log_index" });
    if (badges.length)        await db.from("badges").upsert(badges, { onConflict: "token_id" });

    for (const c of completions) {
        await db.from("circles").update({ status: 2, completed_at: c.completed_at }).eq("circle_id", c.circle_id);
    }

    return {
        circles: circleCreated.length, members: members.length,
        contributions: contributions.length, payouts: payouts.length,
        reputation: reputation.length, badges: badges.length,
        completions: completions.length,
    };
}

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body, null, 2), {
        status, headers: { "content-type": "application/json" },
    });
}
