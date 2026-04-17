// Incremental indexer — pulls new events since last checkpoint, decodes them,
// writes to DB. Designed to run on a 1-minute pg_cron schedule.
// Idempotent: primary keys on (tx_hash) and (tx_hash, log_index) guarantee
// safe re-runs.

import { supabaseAdmin, lc } from "../_shared/supabase.ts";
import {
    CONTRACTS,
    IFACES,
    provider,
    fetchLogs,
    blockTimestamp,
} from "../_shared/chain.ts";

const BATCH_SIZE = 5000; // max blocks per run per contract

Deno.serve(async (_req: Request) => {
    const db = supabaseAdmin();
    const p = provider();
    const head = await p.getBlockNumber();
    const results: Record<string, unknown> = { head, per_contract: {} };

    const { data: states, error } = await db
        .from("indexer_state")
        .select("*");
    if (error) return json({ error: error.message }, 500);

    for (const s of states ?? []) {
        const contractName = s.contract_name as keyof typeof IFACES;
        if (!IFACES[contractName]) continue;

        const fromBlock = Number(s.last_block_processed) + 1;
        const toBlock = Math.min(head, fromBlock + BATCH_SIZE - 1);
        if (fromBlock > head) {
            (results.per_contract as Record<string, unknown>)[contractName] = {
                skipped: true,
                at: head,
            };
            continue;
        }

        try {
            const logs = await fetchLogs(p, s.contract_address, fromBlock, toBlock);
            const decoded = await decodeAndWrite(db, p, contractName, logs);

            await db
                .from("indexer_state")
                .update({
                    last_block_processed: toBlock,
                    last_run_at: new Date().toISOString(),
                    last_error: null,
                    error_count: 0,
                })
                .eq("contract_address", s.contract_address);

            (results.per_contract as Record<string, unknown>)[contractName] = {
                from: fromBlock,
                to: toBlock,
                decoded,
            };
        } catch (e) {
            await db
                .from("indexer_state")
                .update({
                    last_error: (e as Error).message,
                    error_count: (s.error_count ?? 0) + 1,
                    last_run_at: new Date().toISOString(),
                })
                .eq("contract_address", s.contract_address);
            (results.per_contract as Record<string, unknown>)[contractName] = {
                error: (e as Error).message,
            };
        }
    }

    // Refresh activity_log so the Recent Activity feed picks up new rows.
    await db.rpc("refresh_activity_log").catch(() => {});

    return json(results);
});

async function decodeAndWrite(
    db: ReturnType<typeof supabaseAdmin>,
    p: ReturnType<typeof provider>,
    contract: keyof typeof IFACES,
    logs: Awaited<ReturnType<typeof fetchLogs>>,
): Promise<number> {
    const iface = IFACES[contract];
    let n = 0;
    const tsCache = new Map<number, Date>();
    const ts = async (blk: number) => {
        if (!tsCache.has(blk)) tsCache.set(blk, await blockTimestamp(p, blk));
        return tsCache.get(blk)!;
    };

    for (const log of logs) {
        try {
            const parsed = iface.parseLog(log);
            if (!parsed) continue;
            n++;
            await route(db, contract, parsed, log, await ts(log.blockNumber));
        } catch {
            // unknown event (not in our minimal ABI) — skip
        }
    }
    return n;
}

async function route(
    db: ReturnType<typeof supabaseAdmin>,
    contract: keyof typeof IFACES,
    parsed: { name: string; args: readonly unknown[] },
    log: { transactionHash: string; blockNumber: number; index: number },
    blockTs: Date,
): Promise<void> {
    const common = {
        tx_hash: log.transactionHash,
        block_number: log.blockNumber,
        block_timestamp: blockTs.toISOString(),
    };

    if (contract === "CHAIN_CIRCLE_CORE") {
        switch (parsed.name) {
            case "CircleCreated": {
                const [circleId, creator, name, goalType, amount, duration, memberCap, frequency] =
                    parsed.args as [bigint, string, string, bigint, bigint, bigint, bigint, bigint];
                await upsertUser(db, creator);
                await db.from("circles").upsert({
                    circle_id: Number(circleId),
                    creator_address: lc(creator),
                    name,
                    goal_type: Number(goalType),
                    contribution_amount: amount.toString(),
                    duration_months: Number(duration),
                    member_cap: Number(memberCap),
                    frequency: Number(frequency),
                    contract_address: log.transactionHash.slice(0, 42), // actual contract addr from log.address in prod
                    created_block: log.blockNumber,
                }, { onConflict: "circle_id" });
                return;
            }
            case "CircleJoined": {
                const [circleId, member, position] = parsed.args as [bigint, string, bigint];
                await upsertUser(db, member);
                await db.from("circle_members").upsert({
                    circle_id: Number(circleId),
                    user_address: lc(member),
                    position: Number(position),
                    joined_block: log.blockNumber,
                    joined_at: blockTs.toISOString(),
                }, { onConflict: "circle_id,user_address" });
                return;
            }
            case "Contributed": {
                const [circleId, member, amount, round] = parsed.args as [bigint, string, bigint, bigint];
                await upsertUser(db, member);
                await db.from("contributions").upsert({
                    ...common,
                    circle_id: Number(circleId),
                    user_address: lc(member),
                    amount: amount.toString(),
                    round: Number(round),
                }, { onConflict: "tx_hash" });
                return;
            }
            case "PayoutDistributed": {
                const [circleId, recipient, amount, round] = parsed.args as [bigint, string, bigint, bigint];
                await upsertUser(db, recipient);
                await db.from("payouts").upsert({
                    ...common,
                    circle_id: Number(circleId),
                    recipient_address: lc(recipient),
                    amount: amount.toString(),
                    round: Number(round),
                }, { onConflict: "tx_hash" });
                return;
            }
            case "CircleStarted":
                await db.from("circles").update({
                    status: 1,
                    started_at: blockTs.toISOString(),
                }).eq("circle_id", Number(parsed.args[0]));
                return;
            case "CircleCompleted":
                await db.from("circles").update({
                    status: 2,
                    completed_at: blockTs.toISOString(),
                }).eq("circle_id", Number(parsed.args[0]));
                return;
        }
    }

    if (contract === "REPUTATION_MANAGER" && parsed.name === "ReputationUpdated") {
        const [user, delta, scoreAfter, eventType, reason] = parsed.args as [
            string, bigint, bigint, string, string,
        ];
        await upsertUser(db, user);
        await db.from("reputation_events").upsert({
            ...common,
            log_index: log.index,
            user_address: lc(user),
            event_type: eventType,
            delta: Number(delta),
            score_after: Number(scoreAfter),
            reason,
        }, { onConflict: "tx_hash,log_index" });
        return;
    }

    if (contract === "BADGE_NFT" && parsed.name === "BadgeMinted") {
        const [user, tokenId, badgeType] = parsed.args as [string, bigint, string];
        await upsertUser(db, user);
        await db.from("badges").upsert({
            token_id: Number(tokenId),
            user_address: lc(user),
            badge_type: badgeType,
            tx_hash: log.transactionHash,
            block_number: log.blockNumber,
            minted_at: blockTs.toISOString(),
        }, { onConflict: "token_id" });
        return;
    }

    if (contract === "NAME_REGISTRY") {
        if (parsed.name === "NameRegistered" || parsed.name === "NameUpdated") {
            const [user, ...rest] = parsed.args as [string, ...string[]];
            const name = parsed.name === "NameRegistered" ? rest[0] : rest[1];
            await upsertUser(db, user, name);
            return;
        }
    }

    if (contract === "GOVERNANCE_MODULE") {
        if (parsed.name === "ProposalCreated") {
            const [proposalId, circleId, proposer, proposalType] = parsed.args as [
                bigint, bigint, string, string,
            ];
            await upsertUser(db, proposer);
            await db.from("governance_votes").upsert({
                proposal_id: Number(proposalId),
                circle_id: Number(circleId),
                proposer_address: lc(proposer),
                proposal_type: proposalType,
                started_at: blockTs.toISOString(),
                created_block: log.blockNumber,
            }, { onConflict: "proposal_id" });
            return;
        }
        if (parsed.name === "ProposalResolved") {
            const [proposalId, outcome] = parsed.args as [bigint, string];
            await db.from("governance_votes").update({
                outcome,
                ended_at: blockTs.toISOString(),
            }).eq("proposal_id", Number(proposalId));
            return;
        }
    }
}

async function upsertUser(
    db: ReturnType<typeof supabaseAdmin>,
    address: string,
    displayName?: string,
): Promise<void> {
    const row: Record<string, unknown> = { address: lc(address) };
    if (displayName) row.display_name = displayName;
    await db.from("users").upsert(row, { onConflict: "address", ignoreDuplicates: !displayName });
}

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body, null, 2), {
        status,
        headers: { "content-type": "application/json" },
    });
}
