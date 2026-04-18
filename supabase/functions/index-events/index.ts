// Incremental indexer for ChainCircle v2. Pulls logs since last checkpoint,
// decodes against v2 ABIs, writes to the normalized Supabase schema (init +
// v2_schema + v2_schema_supplement migrations). Idempotent on re-runs.
//
// Contracts indexed:
//   CHAIN_CIRCLE_CORE, REPUTATION_MANAGER, BADGE_NFT, WALLET_PREFERENCES,
//   GOVERNANCE_MODULE
//
// Emits one row per event, plus derived updates (circles.started_at,
// payouts_accrued.withdrawn=true when PayoutWithdrawn arrives, etc.).

import { supabaseAdmin, lc } from "../_shared/supabase.ts";
import {
    IFACES,
    NAME_TO_KEY,
    provider,
    coreContract,
    fetchLogs,
    blockTimestamp,
} from "../_shared/chain.ts";

const BATCH_SIZE = 10_000;

Deno.serve(async (_req: Request) => {
    try {
        return await run();
    } catch (e) {
        return json({
            error: (e as Error).message,
            stack: (e as Error).stack?.split("\n").slice(0, 10),
        }, 500);
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
            await db.from("indexer_state")
                .update({
                    last_block_processed: toBlock,
                    last_run_at: new Date().toISOString(),
                    last_error: null,
                    error_count: 0,
                })
                .eq("contract_address", s.contract_address);
            (results.per_contract as Record<string, unknown>)[key] = {
                from: fromBlock, to: toBlock, logs: logs.length, ...counts,
            };
        } catch (e) {
            await db.from("indexer_state")
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

type Db = ReturnType<typeof supabaseAdmin>;
type Core = ReturnType<typeof coreContract>;

async function writeBatch(
    db: Db, p: ReturnType<typeof provider>, core: Core,
    key: keyof typeof IFACES,
    logs: Awaited<ReturnType<typeof fetchLogs>>,
    blockTsCache: Map<number, Date>,
): Promise<Record<string, number>> {
    const iface = IFACES[key];
    const ts = async (b: number) => {
        if (!blockTsCache.has(b)) blockTsCache.set(b, await blockTimestamp(p, b));
        return blockTsCache.get(b)!.toISOString();
    };

    const counts: Record<string, number> = {
        circles: 0, members: 0, contributions: 0,
        payouts: 0, payouts_accrued: 0, cross_chain: 0,
        reputation: 0, badges: 0, tier_changes: 0,
        circle_events: 0, governance: 0, proposal_votes: 0,
        linked_wallets: 0, emergencies: 0,
    };

    const users = new Set<string>();

    for (const log of logs) {
        let parsed;
        try { parsed = iface.parseLog(log); } catch { continue; }
        if (!parsed) continue;
        const tsIso = await ts(log.blockNumber);

        if (key === "CHAIN_CIRCLE_CORE") {
            await handleCoreEvent(db, core, parsed, log, tsIso, users, counts);
        } else if (key === "REPUTATION_MANAGER") {
            await handleReputationEvent(db, parsed, log, tsIso, users, counts);
        } else if (key === "BADGE_NFT") {
            await handleBadgeEvent(db, parsed, log, tsIso, users, counts);
        } else if (key === "WALLET_PREFERENCES") {
            await handleWalletEvent(db, parsed, log, tsIso, users, counts);
        } else if (key === "GOVERNANCE_MODULE") {
            await handleGovernanceEvent(db, parsed, log, tsIso, users, counts);
        }
    }

    // Users first (FK) — batch upsert at end to save roundtrips.
    if (users.size) {
        const rows = [...users].map((addr) => ({ address: lc(addr) }));
        await db.from("users").upsert(rows, { onConflict: "address", ignoreDuplicates: true });
    }
    return counts;
}

// ---------------------------------------------------------------- Core -----

async function handleCoreEvent(
    db: Db, core: Core,
    parsed: { name: string; args: readonly unknown[] },
    log: { transactionHash: string; blockNumber: number; address: string },
    tsIso: string,
    users: Set<string>,
    counts: Record<string, number>,
): Promise<void> {
    const args = parsed.args as readonly unknown[];

    if (parsed.name === "CircleCreated") {
        // v2 event: (circleId, creator, name, goalType, frequency, contributionAmount, duration, maxMembers)
        const [circleId, creator, name, goalType, frequency, contributionAmount, duration, maxMembers] =
            args as [bigint, string, string, number, number, bigint, number, number];
        users.add(creator);
        await db.from("circles").upsert({
            circle_id: Number(circleId),
            creator_address: lc(creator),
            contract_address: lc(log.address),
            created_block: log.blockNumber,
            name,
            goal_type: Number(goalType),
            contribution_amount: contributionAmount.toString(),
            duration_months: Number(duration),
            member_cap: Number(maxMembers),
            frequency: Number(frequency),
            status: 0,
            current_round: 0,
            // Reset cumulative counters — prevents v1 row leftovers from
            // showing stale totals when an on-conflict overwrite happens.
            total_pooled: "0",
            core_version: 2,
        }, { onConflict: "circle_id" });
        counts.circles++;
        return;
    }
    if (parsed.name === "MemberJoined") {
        const [circleId, member, position] = args as [bigint, string, number];
        users.add(member);
        await db.from("circle_members").upsert({
            circle_id: Number(circleId),
            user_address: lc(member),
            position: Number(position),
            joined_block: log.blockNumber,
            joined_at: tsIso,
        }, { onConflict: "circle_id,user_address" });
        counts.members++;
        return;
    }
    if (parsed.name === "CircleStarted") {
        const [circleId] = args as [bigint];
        await db.from("circles")
            .update({ status: 1, started_at: tsIso })
            .eq("circle_id", Number(circleId));
        await db.from("circle_events").upsert({
            circle_id: Number(circleId), event_type: "started",
            tx_hash: log.transactionHash, block_number: log.blockNumber, block_timestamp: tsIso,
        }, { onConflict: "tx_hash,event_type" });
        counts.circle_events++;
        return;
    }
    if (parsed.name === "CirclePaused") {
        const [circleId, reason] = args as [bigint, string];
        await db.from("circle_events").upsert({
            circle_id: Number(circleId), event_type: "paused", reason,
            tx_hash: log.transactionHash, block_number: log.blockNumber, block_timestamp: tsIso,
        }, { onConflict: "tx_hash,event_type" });
        counts.circle_events++;
        return;
    }
    if (parsed.name === "CircleUnpaused") {
        const [circleId] = args as [bigint];
        await db.from("circle_events").upsert({
            circle_id: Number(circleId), event_type: "unpaused",
            tx_hash: log.transactionHash, block_number: log.blockNumber, block_timestamp: tsIso,
        }, { onConflict: "tx_hash,event_type" });
        counts.circle_events++;
        return;
    }
    if (parsed.name === "CircleCancelled") {
        const [circleId, reason] = args as [bigint, string];
        await db.from("circles")
            .update({ status: 3 })
            .eq("circle_id", Number(circleId));
        await db.from("circle_events").upsert({
            circle_id: Number(circleId), event_type: "cancelled", reason,
            tx_hash: log.transactionHash, block_number: log.blockNumber, block_timestamp: tsIso,
        }, { onConflict: "tx_hash,event_type" });
        counts.circle_events++;
        return;
    }
    if (parsed.name === "CircleCompleted") {
        const [circleId] = args as [bigint];
        await db.from("circles")
            .update({ status: 2, completed_at: tsIso })
            .eq("circle_id", Number(circleId));
        await db.from("circle_events").upsert({
            circle_id: Number(circleId), event_type: "completed",
            tx_hash: log.transactionHash, block_number: log.blockNumber, block_timestamp: tsIso,
        }, { onConflict: "tx_hash,event_type" });
        counts.circle_events++;
        return;
    }
    if (parsed.name === "ContributionMade") {
        // v2: (circleId, member, round, amount, onTime, timestamp)
        const [circleId, member, round, amount, onTime] =
            args as [bigint, string, number, bigint, boolean];
        users.add(member);
        await db.from("contributions").upsert({
            tx_hash: log.transactionHash,
            circle_id: Number(circleId),
            user_address: lc(member),
            round: Number(round),
            amount: amount.toString(),
            on_time: onTime,
            block_number: log.blockNumber,
            block_timestamp: tsIso,
        }, { onConflict: "tx_hash" });
        counts.contributions++;
        // Keep circles.current_round ~= max observed. Cheap update; indexer
        // sees events in order so we can trust round is monotonic.
        await db.from("circles")
            .update({ current_round: Number(round) })
            .eq("circle_id", Number(circleId))
            .lt("current_round", Number(round));
        return;
    }
    if (parsed.name === "PayoutAccrued") {
        // (circleId, recipient, round, principal, interest, timestamp)
        const [circleId, recipient, round, principal, interest] =
            args as [bigint, string, number, bigint, bigint];
        users.add(recipient);
        await db.from("payouts_accrued").upsert({
            tx_hash: log.transactionHash,
            circle_id: Number(circleId),
            recipient_address: lc(recipient),
            round: Number(round),
            principal: principal.toString(),
            interest: interest.toString(),
            withdrawn: false,
            block_number: log.blockNumber,
            block_timestamp: tsIso,
        }, { onConflict: "tx_hash" });
        counts.payouts_accrued++;
        return;
    }
    if (parsed.name === "PayoutWithdrawn") {
        // (circleId, recipient, destination, destinationChainId, amount)
        const [circleId, recipient, destination, destinationChainId, amount] =
            args as [bigint, string, string, bigint, bigint];
        users.add(recipient);
        await db.from("payouts").upsert({
            tx_hash: log.transactionHash,
            circle_id: Number(circleId),
            recipient_address: lc(recipient),
            destination_address: lc(destination),
            destination_chain_id: Number(destinationChainId),
            amount: amount.toString(),
            block_number: log.blockNumber,
            block_timestamp: tsIso,
        }, { onConflict: "tx_hash" });
        counts.payouts++;
        // Mark matching payout_accrued row as withdrawn. There's no 1:1
        // tx-hash link — the accrual and withdrawal are separate txs — so
        // match by (circle_id, recipient) taking the oldest un-withdrawn row.
        const { data: pending } = await db
            .from("payouts_accrued")
            .select("tx_hash")
            .eq("circle_id", Number(circleId))
            .eq("recipient_address", lc(recipient))
            .eq("withdrawn", false)
            .order("block_number", { ascending: true })
            .limit(1);
        const pendingHash = pending?.[0]?.tx_hash;
        if (pendingHash) {
            await db.from("payouts_accrued")
                .update({ withdrawn: true, withdrawn_tx: log.transactionHash })
                .eq("tx_hash", pendingHash);
        }
        // Mark the circle member as paid.
        await db.from("circle_members")
            .update({ has_received_payout: true })
            .eq("circle_id", Number(circleId))
            .eq("user_address", lc(recipient));
        return;
    }
    if (parsed.name === "CrossChainPayoutRequested") {
        const [recipient, destinationChainId, amount, ref] =
            args as [string, bigint, bigint, string];
        users.add(recipient);
        await db.from("cross_chain_payouts").upsert({
            tx_hash: log.transactionHash,
            recipient_address: lc(recipient),
            destination_chain_id: Number(destinationChainId),
            amount: amount.toString(),
            ref,
            relay_status: "pending",
            block_number: log.blockNumber,
            block_timestamp: tsIso,
        }, { onConflict: "tx_hash" });
        counts.cross_chain++;
        return;
    }
    if (parsed.name === "EmergencyWithdrawal") {
        const [circleId, member, refund, penalty] = args as [bigint, string, bigint, bigint];
        users.add(member);
        await db.from("circle_events").upsert({
            circle_id: Number(circleId),
            event_type: "emergency",
            reason: `refund=${refund.toString()};penalty=${penalty.toString()};member=${lc(member)}`,
            tx_hash: log.transactionHash, block_number: log.blockNumber, block_timestamp: tsIso,
        }, { onConflict: "tx_hash,event_type" });
        counts.emergencies++;
        return;
    }
    if (parsed.name === "GovernanceActionExecuted") {
        // (proposalId, circleId, target, kind, reductionBps) — flip proposal
        // status so the UI stops showing it as "Passed, awaiting execute".
        const [proposalId] = args as [bigint];
        await db.from("governance_proposals")
            .update({ status: "executed", executed_at: tsIso })
            .eq("proposal_id", Number(proposalId));
        counts.governance++;
        return;
    }
}

// ---------------------------------------------------------- Reputation -----

async function handleReputationEvent(
    db: Db,
    parsed: { name: string; args: readonly unknown[] },
    log: { transactionHash: string; blockNumber: number; logIndex?: number; index?: number },
    tsIso: string,
    users: Set<string>,
    counts: Record<string, number>,
): Promise<void> {
    if (parsed.name !== "ScoreChanged") return;
    const [user, oldScore, newScore, circleId, round, reason] =
        parsed.args as [string, bigint, bigint, bigint, number, string];
    users.add(user);
    const logIndex = log.logIndex ?? log.index ?? 0;
    await db.from("reputation_events").upsert({
        tx_hash: log.transactionHash,
        log_index: logIndex,
        user_address: lc(user),
        event_type: reason || "ScoreChanged",
        delta: Number(newScore) - Number(oldScore),
        score_after: Number(newScore),
        reason: reason || null,
        circle_id: Number(circleId) || null,
        round: Number(round) || null,
        block_number: log.blockNumber,
        block_timestamp: tsIso,
    }, { onConflict: "tx_hash,log_index" });
    counts.reputation++;
}

// ---------------------------------------------------------------- Badge ----

async function handleBadgeEvent(
    db: Db,
    parsed: { name: string; args: readonly unknown[] },
    log: { transactionHash: string; blockNumber: number },
    tsIso: string,
    users: Set<string>,
    counts: Record<string, number>,
): Promise<void> {
    if (parsed.name === "BadgeMinted") {
        const [user, tokenId, tier] = parsed.args as [string, bigint, string];
        users.add(user);
        await db.from("badges").upsert({
            token_id: Number(tokenId),
            user_address: lc(user),
            badge_type: tier,
            tx_hash: log.transactionHash,
            block_number: log.blockNumber,
            minted_at: tsIso,
        }, { onConflict: "token_id" });
        counts.badges++;
    } else if (parsed.name === "TierThresholdCrossed") {
        const [user, fromTier, toTier] = parsed.args as [string, string, string];
        users.add(user);
        await db.from("tier_changes").upsert({
            user_address: lc(user),
            from_tier: fromTier || null,
            to_tier: toTier,
            score_after: 0, // not carried by this event — filled by ScoreChanged if arriving same block
            tx_hash: log.transactionHash,
            block_number: log.blockNumber,
            block_timestamp: tsIso,
        }, { onConflict: "tx_hash,user_address" });
        counts.tier_changes++;
    } else if (parsed.name === "BadgeUpgraded") {
        const [user, tokenId, , newTier] = parsed.args as [string, bigint, string, string];
        users.add(user);
        await db.from("badges")
            .update({ badge_type: newTier })
            .eq("token_id", Number(tokenId));
    }
}

// --------------------------------------------------------- WalletPrefs -----

async function handleWalletEvent(
    db: Db,
    parsed: { name: string; args: readonly unknown[] },
    log: { blockNumber: number },
    tsIso: string,
    users: Set<string>,
    counts: Record<string, number>,
): Promise<void> {
    if (parsed.name === "WalletAdded") {
        const [user, wallet, chainId, chainName] = parsed.args as [string, string, bigint, string];
        users.add(user);
        await db.from("linked_wallets").upsert({
            user_address: lc(user),
            wallet_address: lc(wallet),
            chain_id: Number(chainId),
            chain_name: chainName,
            is_preferred: false, // set below if it's the first
            added_at: tsIso,
            removed: false,
        }, { onConflict: "user_address,wallet_address" });
        counts.linked_wallets++;
    } else if (parsed.name === "WalletRemoved") {
        const [user, wallet] = parsed.args as [string, string];
        await db.from("linked_wallets")
            .update({ removed: true })
            .eq("user_address", lc(user))
            .eq("wallet_address", lc(wallet));
        counts.linked_wallets++;
    } else if (parsed.name === "PreferredWalletChanged") {
        const [user, , newWallet] = parsed.args as [string, string, string];
        users.add(user);
        // Clear old preferred, set new one.
        await db.from("linked_wallets")
            .update({ is_preferred: false })
            .eq("user_address", lc(user));
        await db.from("linked_wallets")
            .update({ is_preferred: true })
            .eq("user_address", lc(user))
            .eq("wallet_address", lc(newWallet));
        counts.linked_wallets++;
    }
    void log; // tsIso intentionally unused for Preferred — no new row.
}

// --------------------------------------------------------- Governance -----

async function handleGovernanceEvent(
    db: Db,
    parsed: { name: string; args: readonly unknown[] },
    log: { transactionHash: string; blockNumber: number },
    tsIso: string,
    users: Set<string>,
    counts: Record<string, number>,
): Promise<void> {
    if (parsed.name === "ProposalCreated") {
        const [proposalId, circleId, proposer, kind, target, reductionBps, justification, deadline] =
            parsed.args as [bigint, bigint, string, number, string, bigint, string, bigint];
        users.add(proposer);
        await db.from("governance_proposals").upsert({
            proposal_id: Number(proposalId),
            circle_id: Number(circleId),
            proposer_address: lc(proposer),
            kind: Number(kind) === 0 ? "early_exit" : "cancel_circle",
            target_address: target === "0x0000000000000000000000000000000000000000" ? null : lc(target),
            reduction_bps: Number(reductionBps),
            justification,
            deadline: new Date(Number(deadline) * 1000).toISOString(),
            status: "pending",
            yes_weight: 0,
            no_weight: 0,
            created_block: log.blockNumber,
        }, { onConflict: "proposal_id" });
        counts.governance++;
    } else if (parsed.name === "Voted") {
        const [proposalId, voter, support, weight] = parsed.args as [bigint, string, boolean, bigint];
        users.add(voter);
        await db.from("proposal_votes").upsert({
            proposal_id: Number(proposalId),
            voter_address: lc(voter),
            support,
            weight: Number(weight),
            tx_hash: log.transactionHash,
            block_number: log.blockNumber,
            voted_at: tsIso,
        }, { onConflict: "proposal_id,voter_address" });
        counts.proposal_votes++;
        // Bump aggregate yes/no weight on the proposal.
        const column = support ? "yes_weight" : "no_weight";
        const { data: current } = await db.from("governance_proposals")
            .select(column).eq("proposal_id", Number(proposalId)).maybeSingle();
        const next = Number((current as Record<string, number> | null)?.[column] ?? 0) + Number(weight);
        await db.from("governance_proposals")
            .update({ [column]: next })
            .eq("proposal_id", Number(proposalId));
    } else if (parsed.name === "ProposalResolved") {
        const [proposalId, outcome, yesWeight, noWeight, executedAt] =
            parsed.args as [bigint, number, bigint, bigint, bigint];
        const label = ["pending", "passed", "failed", "executed"][Number(outcome)] || "pending";
        await db.from("governance_proposals")
            .update({
                status: label,
                yes_weight: Number(yesWeight),
                no_weight: Number(noWeight),
                executed_at: Number(executedAt) > 0 ? new Date(Number(executedAt) * 1000).toISOString() : null,
            })
            .eq("proposal_id", Number(proposalId));
        counts.governance++;
    }
}

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body, null, 2), {
        status, headers: { "content-type": "application/json" },
    });
}
