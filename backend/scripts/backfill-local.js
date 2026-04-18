// Local backfill — bypasses Edge Function 150s timeout. Reads indexer_state
// from Supabase, scans Push Chain events in 10k-block batches (RPC cap),
// decodes against the REAL deployed ABIs, enriches circles via contract
// reads, upserts into Supabase with service role. Idempotent + resumable.
//
// Run with: node scripts/backfill-local.js
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PUSH_CHAIN_RPC(_FALLBACK)

require("dotenv").config();
const { JsonRpcProvider, Interface, Contract, FallbackProvider } = require("ethers");

const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    PUSH_CHAIN_RPC = "https://evm.donut.rpc.push.org/",
    PUSH_CHAIN_RPC_FALLBACK = "https://evm.donut.rpc.push.org/",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env");
    process.exit(1);
}

const BATCH = 10000;                   // Push Chain RPC hard cap
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1500;

// --- Event ABIs — real signatures from frontend/src/abis/*.json -----------
const EVENT_ABIS = {
    CHAIN_CIRCLE_CORE: [
        "event CircleCreated(uint256 indexed circleId, address indexed creator, uint256 goalAmount)",
        "event MemberJoined(uint256 indexed circleId, address indexed member)",
        "event ContributionMade(uint256 indexed circleId, address indexed member, uint256 amount, uint256 timestamp)",
        "event PayoutProcessed(uint256 indexed circleId, address indexed recipient, uint256 amount, uint256 timestamp)",
        "event InterestDistributed(uint256 indexed circleId, address indexed recipient, uint256 amount, uint256 timestamp)",
        "event EmergencyWithdrawal(uint256 indexed circleId, address indexed member, uint256 amount)",
        "event CircleCompleted(uint256 indexed circleId, uint256 timestamp)",
    ],
    REPUTATION_MANAGER: [
        "event ScoreChanged(address indexed user, uint256 oldScore, uint256 newScore, string reason)",
        "event TierChanged(address indexed user, string oldTier, string newTier)",
        "event StreakUpdated(address indexed user, uint256 newStreak)",
    ],
    BADGE_NFT: [
        "event BadgeMinted(address indexed user, uint256 indexed tokenId, string tier)",
        "event BadgeUpgraded(address indexed user, uint256 indexed tokenId, string oldTier, string newTier)",
    ],
    NAME_REGISTRY: [
        "event NameRegistered(address indexed user, string name)",
        "event NameUpdated(address indexed user, string oldName, string newName)",
    ],
};

// ChainCircleCore.circles(uint256) view — used to enrich circles table after
// CircleCreated events, since the event only carries (id, creator, goalAmount).
const CORE_READ_ABI = [
    "function circles(uint256) view returns (string name, uint8 goalType, uint256 amount, uint8 duration, uint8 currentRound, uint8 maxMembers, uint8 frequency, bool isActive, uint8 status, uint256 createdAt, uint256 startAt, uint256 vaultBalance, address creator)",
];

const NAME_TO_KEY = {
    ChainCircleCore: "CHAIN_CIRCLE_CORE",
    ReputationManager: "REPUTATION_MANAGER",
    BadgeNFT: "BADGE_NFT",
    GovernanceModule: "GOVERNANCE_MODULE",
    NameRegistry: "NAME_REGISTRY",
};

const IFACES = Object.fromEntries(
    Object.entries(EVENT_ABIS).map(([k, abi]) => [k, new Interface(abi)]),
);

const lc = (addr) => addr.toLowerCase();

// -------- flaky-RPC wrapper ------------------------------------------------
function makeProvider() {
    return new JsonRpcProvider(PUSH_CHAIN_RPC);
}
function makeFallback() {
    return new JsonRpcProvider(PUSH_CHAIN_RPC_FALLBACK);
}

async function withRetry(fn, label) {
    let lastErr;
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            return await fn();
        } catch (e) {
            lastErr = e;
            const delay = BASE_DELAY_MS * Math.pow(2, i);
            console.log(`  ⚠ ${label} attempt ${i + 1}/${MAX_RETRIES} failed: ${shortErr(e)} — retry in ${delay}ms`);
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    throw lastErr;
}

function shortErr(e) {
    return (e?.shortMessage || e?.message || String(e)).slice(0, 120);
}

// -------- Supabase PostgREST helpers --------------------------------------
function db(path, init = {}) {
    return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
            ...(init.headers ?? {}),
        },
    });
}

async function upsert(table, rows, onConflict) {
    if (!rows.length) return;
    const res = await db(`${table}?on_conflict=${onConflict}`, {
        method: "POST",
        body: JSON.stringify(rows),
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`upsert ${table} (${rows.length} rows) failed: ${res.status} ${txt.slice(0, 300)}`);
    }
}

async function upsertUser(address, displayName) {
    await upsert(
        "users",
        [{ address: lc(address), ...(displayName ? { display_name: displayName } : {}) }],
        "address",
    );
}

// -------- event → row mapping ---------------------------------------------
async function processBatch(key, logs, provider, coreContract, blockTsCache) {
    const iface = IFACES[key];
    const users = new Set();
    const circleIdsToEnrich = new Set();
    const circleCreated = [];
    const members = [];
    const contributions = [];
    const payouts = [];
    const reputation = [];
    const badges = [];
    const circleCompletedUpdates = [];

    for (const log of logs) {
        let parsed;
        try { parsed = iface.parseLog(log); } catch { continue; }
        if (!parsed) continue;

        if (!blockTsCache.has(log.blockNumber)) {
            const blk = await withRetry(() => provider.getBlock(log.blockNumber), `getBlock(${log.blockNumber})`);
            blockTsCache.set(log.blockNumber, new Date(Number(blk.timestamp) * 1000));
        }
        const ts = blockTsCache.get(log.blockNumber).toISOString();

        if (key === "CHAIN_CIRCLE_CORE") {
            if (parsed.name === "CircleCreated") {
                const [circleId, creator, goalAmount] = parsed.args;
                users.add(creator);
                circleIdsToEnrich.add(Number(circleId));
                circleCreated.push({
                    circle_id: Number(circleId),
                    creator_address: lc(creator),
                    contract_address: lc(log.address),
                    created_block: log.blockNumber,
                    // PostgREST bulk upsert requires identical key sets — pre-init
                    // all enrichment fields to null, override on successful read
                    name: null,
                    goal_type: null,
                    contribution_amount: goalAmount.toString(),
                    duration_months: null,
                    member_cap: null,
                    frequency: null,
                    status: 0,
                    current_round: 0,
                    total_pooled: "0",
                    started_at: null,
                });
            } else if (parsed.name === "MemberJoined") {
                const [circleId, member] = parsed.args;
                users.add(member);
                members.push({
                    circle_id: Number(circleId),
                    user_address: lc(member),
                    joined_block: log.blockNumber,
                    joined_at: ts,
                });
            } else if (parsed.name === "ContributionMade") {
                const [circleId, member, amount /*, timestamp*/] = parsed.args;
                users.add(member);
                contributions.push({
                    tx_hash: log.transactionHash,
                    circle_id: Number(circleId),
                    user_address: lc(member),
                    amount: amount.toString(),
                    block_number: log.blockNumber,
                    block_timestamp: ts,
                });
            } else if (parsed.name === "PayoutProcessed" || parsed.name === "InterestDistributed") {
                const [circleId, recipient, amount /*, timestamp*/] = parsed.args;
                users.add(recipient);
                payouts.push({
                    tx_hash: log.transactionHash,
                    circle_id: Number(circleId),
                    recipient_address: lc(recipient),
                    amount: amount.toString(),
                    block_number: log.blockNumber,
                    block_timestamp: ts,
                });
            } else if (parsed.name === "CircleCompleted") {
                circleCompletedUpdates.push({ circle_id: Number(parsed.args[0]), completed_at: ts });
            }
        } else if (key === "REPUTATION_MANAGER" && parsed.name === "ScoreChanged") {
            const [user, oldScore, newScore, reason] = parsed.args;
            users.add(user);
            reputation.push({
                tx_hash: log.transactionHash,
                log_index: log.index,
                user_address: lc(user),
                event_type: reason || "ScoreChanged",
                delta: Number(newScore) - Number(oldScore),
                score_after: Number(newScore),
                reason: reason || null,
                block_number: log.blockNumber,
                block_timestamp: ts,
            });
        } else if (key === "BADGE_NFT" && parsed.name === "BadgeMinted") {
            const [user, tokenId, tier] = parsed.args;
            users.add(user);
            badges.push({
                token_id: Number(tokenId),
                user_address: lc(user),
                badge_type: tier,
                tx_hash: log.transactionHash,
                block_number: log.blockNumber,
                minted_at: ts,
            });
        } else if (key === "NAME_REGISTRY") {
            const [user, first, second] = parsed.args;
            const name = parsed.name === "NameRegistered" ? first : second;
            await upsertUser(user, name);
        }
    }

    // 1. Users first (FK dependency everywhere else)
    for (const u of users) await upsertUser(u);

    // 2. Circles — enrich CircleCreated rows by calling circles(id) on the core contract
    if (circleCreated.length) {
        for (const row of circleCreated) {
            try {
                const c = await withRetry(
                    () => coreContract.circles(row.circle_id),
                    `circles(${row.circle_id})`,
                );
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
            } catch (e) {
                console.log(`  ⚠ enrich circle ${row.circle_id} failed: ${shortErr(e)}`);
            }
        }
        await upsert("circles", circleCreated, "circle_id");
    }

    // 3. Members, contributions, payouts, reputation, badges
    await upsert("circle_members", members, "circle_id,user_address");
    await upsert("contributions", contributions, "tx_hash");
    await upsert("payouts", payouts, "tx_hash");
    await upsert("reputation_events", reputation, "tx_hash,log_index");
    await upsert("badges", badges, "token_id");

    // 4. Circle completions
    for (const u of circleCompletedUpdates) {
        await db(`circles?circle_id=eq.${u.circle_id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: 2, completed_at: u.completed_at }),
        });
    }

    return {
        circles: circleCreated.length,
        members: members.length,
        contributions: contributions.length,
        payouts: payouts.length,
        reputation: reputation.length,
        badges: badges.length,
        completed: circleCompletedUpdates.length,
    };
}

// -------- main loop --------------------------------------------------------
async function main() {
    const primary = makeProvider();
    const fallback = makeFallback();
    const head = await withRetry(() => primary.getBlockNumber(), "getBlockNumber");
    console.log(`head = ${head}`);

    const res = await db("indexer_state?select=*");
    const statesAll = await res.json();
    // Process ChainCircleCore first — it carries the most critical data
    // (circles, members, contributions, payouts). Other contracts are
    // secondary. This way a partial run is still useful.
    const priority = ["ChainCircleCore", "NameRegistry", "ReputationManager", "BadgeNFT", "GovernanceModule"];
    const states = statesAll.sort(
        (a, b) => priority.indexOf(a.contract_name) - priority.indexOf(b.contract_name),
    );

    // Core contract instance used for enriching CircleCreated events
    const coreState = states.find((s) => s.contract_name === "ChainCircleCore");
    const coreContract = new Contract(coreState.contract_address, CORE_READ_ABI, primary);

    const blockTsCache = new Map();

    for (const s of states) {
        const key = NAME_TO_KEY[s.contract_name];
        if (!key || !IFACES[key]) { console.log(`skip ${s.contract_name} (no ABI mapped)`); continue; }

        let from = Number(s.last_block_processed) + 1;
        if (from > head) { console.log(`${s.contract_name}: caught up at ${head}`); continue; }

        console.log(`\n${s.contract_name} @ ${s.contract_address}: ${from} → ${head}  (${head - from + 1} blocks)`);
        const started = Date.now();
        let totalLogs = 0;
        let totalWrites = { circles: 0, members: 0, contributions: 0, payouts: 0, reputation: 0, badges: 0, completed: 0 };

        let skipped = 0;
        while (from <= head) {
            const to = Math.min(head, from + BATCH - 1);
            const fetchLogs = (p) => p.getLogs({ address: s.contract_address, fromBlock: from, toBlock: to });

            // Outermost try/catch — NEVER crash, just log and continue.
            let processed = false;
            try {
                let logs;
                try {
                    logs = await withRetry(() => fetchLogs(primary), `getLogs ${from}-${to} [primary]`);
                } catch {
                    try {
                        logs = await withRetry(() => fetchLogs(fallback), `getLogs ${from}-${to} [fallback]`);
                    } catch (e) {
                        console.log(`  ✖ ${from}-${to}: both RPCs exhausted — skipping range (${shortErr(e)})`);
                        skipped++;
                        from = to + 1;
                        continue;
                    }
                }

                if (logs.length) {
                    const counts = await processBatch(key, logs, primary, coreContract, blockTsCache);
                    totalLogs += logs.length;
                    for (const k of Object.keys(totalWrites)) totalWrites[k] += counts[k] || 0;
                    const nonZero = Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(" ");
                    if (nonZero) console.log(`  ${from}-${to}: ${logs.length} logs → ${nonZero}`);
                }
                processed = true;
            } catch (e) {
                console.log(`  ✖ ${from}-${to}: batch error — skipping (${shortErr(e)})`);
                skipped++;
            }

            // Always advance checkpoint so we don't reprocess. If anything was
            // skipped, rerun backfill to pick it up; it's idempotent.
            try {
                await db(`indexer_state?contract_address=eq.${s.contract_address}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        last_block_processed: to,
                        last_run_at: new Date().toISOString(),
                        last_error: processed ? null : "batch_skipped",
                    }),
                });
            } catch (e) {
                console.log(`  ⚠ checkpoint update failed at ${to}: ${shortErr(e)}`);
            }

            from = to + 1;

            // Heartbeat every 100 batches so we see progress on empty ranges.
            if ((from - Number(s.last_block_processed) - 1) % (BATCH * 100) === 0) {
                const pct = (((from - 1) / head) * 100).toFixed(1);
                console.log(`  · heartbeat: ${from - 1}/${head} (${pct}%) skipped=${skipped}`);
            }
        }

        if (skipped > 0) console.log(`  ⚠ ${skipped} ranges skipped — rerun backfill to catch them`);

        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        console.log(`${s.contract_name} done: ${totalLogs} logs, wrote ${JSON.stringify(totalWrites)} in ${elapsed}s`);
    }

    console.log("\n✅ All contracts caught up. Refreshing activity_log…");
    const r = await db("rpc/refresh_activity_log", { method: "POST", body: "{}" });
    console.log(r.ok ? "refreshed." : `refresh failed: ${r.status}`);
    console.log("\nbackfill complete.");
}

main().catch((e) => {
    console.error("\n❌ backfill failed:", shortErr(e));
    console.error(e.stack?.split("\n").slice(0, 10).join("\n"));
    process.exit(1);
});
