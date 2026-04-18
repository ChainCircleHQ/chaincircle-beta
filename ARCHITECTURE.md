# ChainCircle v2 — Architecture

**Status:** design locked, implementation in progress
**Why v2:** the v1 contracts emit no reputation/badge events (pre-integration bytecode), payouts direct-transfer with no wallet-preference routing, governance has no enforcement, and rounds aren't recorded on-chain. All of this blocks the cross-chain pitch and leaves reputation/badges inert.

**Key constraint:** zero data loss. v1 contracts stay at their current addresses; v2 deploys alongside. Circles in v1 complete their natural rotations; new circles go on v2. Supabase indexer watches both.

---

## Deployment strategy

**New contract addresses** for v2. Old v1 contracts stay deployed and functional. `indexer_state` gets an extra row per new contract; Supabase schema extends (no tables replaced).

Users already in v1 circles stay in those circles until they complete or emergency-withdraw. New circles auto-use v2 (frontend only calls v2 addresses for new writes). No migration contract needed — graceful cohort cutover.

**Reused (same address):** `CUSD`, `NameRegistry`. Names persist, CUSD balances persist.

**Redeployed (new address):** `ChainCircleCore`, `ReputationManager`, `BadgeNFT`, `GovernanceModule`, `WalletPreferences`, `TestnetYield` (renamed from `MockYield`, same logic, honest name).

---

## Contract responsibilities

### `ChainCircleCoreV2` — the primitive

Preserves v1 circle creation/join/contribute mechanics. Changes:

| Area | v1 behavior | v2 behavior |
|---|---|---|
| Contribution event | No round number | `ContributionMade(circleId, member, round, amount, timestamp)` |
| Payout | Direct `transfer` to `payoutOrder[round]` | Accrued to `pendingWithdrawals[recipient][circleId]` mapping; recipient pulls via `withdrawPayout(circleId)` |
| Payout destination | Always `msg.sender` (or payout order address) | Resolved via `WalletPreferences.getPreferredWallet(recipient)` at withdrawal time; fallback to recipient |
| Reputation callbacks | Optional (silently skipped if not wired) | **Mandatory** — revert if `reputationManager == address(0)` on first use |
| Round start event | Not emitted | `CircleStarted(circleId, timestamp)` emitted on Pending → Active transition |
| Pause/Cancel | States defined but unused | `pauseCircle(id, reason)` / `unpauseCircle(id)` / `cancelCircle(id)` — creator + governance only |
| Governance hook | Doesn't exist | `executeGovernanceAction(proposalId, circleId, target, reduction)` — only-governance, enables passed proposals to trigger early member exits with reduced penalty |
| Cross-chain payout | Would deliver to Push Chain address only | On `withdrawPayout`, if destination has non-Push origin, emits `CrossChainPayoutRequested(user, chainId, amount)` — the Push UEA relay picks it up |
| `tx.funds` support | N/A | `contribute(circleId)` is marked `external` and the SDK can bundle CUSD movement atomically via `tx.funds` — no pre-approve step needed for the end user |

**Hybrid payout = escrow + pull.** Rationale:
- Auto-push-to-external-chain at round completion would require every round to make an Push UEA relay call — expensive and failure-prone. Better to accrue on-chain and let the recipient pull when they want.
- The pull step is what reads WalletPreferences, so users can change their preferred wallet mid-circle and still get payouts routed correctly.
- Cross-chain delivery is one extra hop at withdrawal time, not per-round.

### `ReputationManagerV2` — mandatory callback target

- Same scoring rules (15 / 25 / 250 / 100 / 50 / -75 as v1).
- Events now include `circleId` and `round` on every `ScoreChanged`.
- New `getReputationHistory(user, limit)` view.
- BadgeNFT call is NOT in try-catch — if badge mint fails, tx reverts so state stays consistent.
- `onDeposit` / `onPayoutReceived` / `onCompleted` are the only entry points; only-circleCore access control.

### `BadgeNFTV2` — auto-mint on tier crossings

- Same soulbound ERC721.
- `getUserBadge(user)` API preserved.
- Internal `mintOrUpgrade(user, tier)` replaces the two separate functions — `ReputationManager` calls this one method; contract decides mint vs upgrade.
- Emits `TierThresholdCrossed(user, fromTier, toTier, scoreAfter, timestamp)` on every change so the off-chain view can synthesize the history without needing `getReputationHistory`.

### `GovernanceModuleV2` — enforced outcomes

- Proposals: early-exit-member, cancel-circle, adjust-penalty (admin).
- Quorum: 50% of eligible voters (Silver+ with ≥2 completed circles per `ReputationManager.canVote(user)`).
- Vote weight by tier: Silver = 1, Gold = 2. Creator of the proposal cannot vote on it.
- `execute(proposalId)` after deadline:
  - Reads outcome: `passed` iff weighted-yes > weighted-no and quorum met.
  - If passed and type is early-exit: calls `ChainCircleCore.executeGovernanceAction(proposalId, circleId, target, reductionPercent)`.
  - Emits `ProposalResolved(proposalId, outcome, executedAt)`.
- Access-controlled from ChainCircleCore side: only the address set via `setGovernanceModule()` can call the governance action.

### `WalletPreferencesV2` — payout routing source of truth

- Extends v1 with `chainId` alongside `chainName` string, plus `supportedChain(chainId) → bool` whitelist (seeded with Ethereum, Base, Arbitrum, Optimism, Polygon, BNB, Solana, Push).
- `getPayoutDestination(user)` returns `(address preferredWallet, uint256 chainId)` — this is the view `ChainCircleCore.withdrawPayout` calls.
- Preferred-wallet changes take effect on the next withdrawal, not retroactively.

### `TestnetYield` (renamed from `MockYield`)

- Same 4% APR formula.
- Interface extracted to `IYieldModule` so mainnet Aave adapter (`AaveYieldAdapter`) can be dropped in without changing ChainCircleCore.

---

## Event catalog (for indexer)

New events to decode + store:

| Event | Emitter | Consumed by |
|---|---|---|
| `ContributionMade(circleId, member, round, amount, timestamp)` | Core | `contributions` table (round column added) |
| `PayoutAccrued(circleId, recipient, amount, round, timestamp)` | Core | `payouts_accrued` (new table) |
| `PayoutWithdrawn(circleId, recipient, destination, amount)` | Core | `payouts` (existing), adds destination |
| `CrossChainPayoutRequested(recipient, chainId, amount, txRef)` | Core | `cross_chain_payouts` (new) |
| `CircleStarted(circleId, timestamp)` | Core | `circles.started_at` accurate |
| `CirclePaused(circleId, reason, timestamp)` | Core | `circles.status = 3`, log to `circle_events` |
| `CircleUnpaused(circleId, timestamp)` | Core | `circles.status = 1` |
| `CircleCancelled(circleId, reason, timestamp)` | Core | `circles.status = 4` |
| `ScoreChanged(user, oldScore, newScore, circleId, round, reason)` | Rep | `reputation_events` — existing, adds `round` col |
| `TierThresholdCrossed(user, fromTier, toTier, scoreAfter, timestamp)` | Badge | `tier_changes` (new) |
| `BadgeMinted(user, tokenId, tier)` | Badge | `badges` (existing) |
| `BadgeUpgraded(user, tokenId, oldTier, newTier)` | Badge | `badges` (existing), track history |
| `ProposalCreated(proposalId, circleId, kind, proposer, deadline)` | Gov | `governance_proposals` (new) |
| `Voted(proposalId, voter, support, weight)` | Gov | `governance_votes` (existing), add `weight` |
| `ProposalResolved(proposalId, outcome, executedAt)` | Gov | `governance_proposals` |

---

## Supabase schema delta

Migration `20260418000000_v2_schema.sql` adds:

```sql
-- Round column on contributions (nullable for v1 rows)
alter table public.contributions add column round smallint;

-- Payout tracking split into accrued vs withdrawn (v2)
create table public.payouts_accrued (
    tx_hash text primary key,
    circle_id bigint not null references public.circles(circle_id) on delete cascade,
    recipient_address text not null references public.users(address),
    amount numeric(38, 0) not null,
    round smallint not null,
    block_number bigint not null,
    block_timestamp timestamptz not null
);

-- Add destination column to existing payouts table for v2 withdrawals
alter table public.payouts add column destination_address text;
alter table public.payouts add column destination_chain_id bigint;

-- Cross-chain payout relay requests
create table public.cross_chain_payouts (
    tx_hash text primary key,
    recipient_address text not null references public.users(address),
    destination_chain_id bigint not null,
    amount numeric(38, 0) not null,
    block_number bigint not null,
    block_timestamp timestamptz not null,
    relay_status text not null default 'pending'
        check (relay_status in ('pending', 'relayed', 'delivered', 'failed'))
);

-- Badge tier change history
create table public.tier_changes (
    id bigserial primary key,
    user_address text not null references public.users(address),
    from_tier text,
    to_tier text not null,
    score_after int not null,
    tx_hash text not null,
    block_number bigint not null,
    block_timestamp timestamptz not null,
    unique (tx_hash, user_address)
);

-- Circle lifecycle events (started, paused, unpaused, cancelled)
create table public.circle_events (
    id bigserial primary key,
    circle_id bigint not null references public.circles(circle_id) on delete cascade,
    event_type text not null check (event_type in ('started', 'paused', 'unpaused', 'cancelled', 'completed')),
    reason text,
    tx_hash text not null,
    block_number bigint not null,
    block_timestamp timestamptz not null
);

-- Governance proposals (expands v1 governance_votes which only tracked votes)
-- (governance_proposals table already exists from Phase 4, just ALTER to add fields)
alter table public.governance_votes add column weight smallint default 1;
```

---

## Frontend changes

1. **Contract addresses** — `frontend/src/constants/contracts.js` keeps the v1 addresses but adds `V2_*` keys. All new-write hooks target v2. Reads check both: if a `circle.contract_address` is v1, route queries accordingly.

2. **`useCircleActions`** — rewritten to target v2. v1 emergency-withdraw stays as `useV1EmergencyExit` for users stuck in old circles.

3. **New hook `usePendingPayouts()`** — returns accrued-but-unclaimed payouts per circle for the connected user. Drives the Payouts page's new "Claim" button and a dashboard widget.

4. **Governance route** `/chain/governance` — list active proposals, vote (Silver+ gated), create proposal. Badge tier checked via existing `user_reputation` view.

5. **Payout claim** — actually wired. Button calls `useWithdrawPayout(circleId)` (was a stub). Toast confirms on-chain execution + destination.

6. **WalletPreferences v2** — add chain-id alongside chain name on add; payout-destination preview shows "Your payouts will land at 0x… on Base."

7. **Circle detail** — version indicator pill: v1 circles get "Legacy" badge; v2 get "v2" badge. No user action needed but sets expectations about which features (governance, tx.funds) are available.

---

## Indexer changes

- `chain.ts` event ABIs expanded with the new events.
- `NAME_TO_KEY` adds v2 contract names.
- `indexer_state` seeded with v2 contract addresses at their deploy blocks.
- `backfill-local.js` knows about both v1 and v2 circles and can backfill either.
- Edge Function cron already iterates over `indexer_state`, so adding rows is sufficient for ongoing indexing.

---

## Test plan

- **Unit tests** (`backend/test/v2/*.test.js`): Hardhat + Chai coverage on each new contract — state transitions, access controls, event emission.
- **Integration test**: full circle lifecycle end-to-end: create → join × cap → contribute × rounds → payout accrued → withdraw pull → cross-chain emission. Verify reputation+badge events emitted at each step.
- **Governance test**: propose early exit → Silver/Gold vote → execute → verify state changed on core.
- **Migration test**: v1 circle still callable (contribute, emergencyWithdraw) after v2 deploy.

Coverage target: 100% on new contracts. Not a suggestion — this is the testnet we're onboarding real users to.

---

## Deployment sequence

1. Deploy `TestnetYield` (reuse interface).
2. Deploy `ReputationManagerV2` (no deps at construction).
3. Deploy `BadgeNFTV2`.
4. Deploy `WalletPreferencesV2`.
5. Deploy `ChainCircleCoreV2(CUSD_ADDRESS)`.
6. Deploy `GovernanceModuleV2(core, rep)`.
7. Wire (atomic batch script):
   - `core.setReputationManager(rep)`
   - `core.setYieldModule(yield)`
   - `core.setWalletPreferences(prefs)`
   - `core.setGovernanceModule(gov)`
   - `rep.setCircleCore(core)`
   - `rep.setBadgeNFT(badge)`
   - `badge.setReputationManager(rep)`
8. Smoke test: create a circle, add a member, contribute, verify ScoreChanged event.
9. Save to `backend/deployments/pushDonut-v2.json`.
10. Update `frontend/src/constants/contracts.js` with v2 addresses.
11. Supabase migrations + indexer_state insertions.
12. Rolling deploy frontend.

---

## What this does NOT change

- CUSD contract (deposits preserved).
- NameRegistry (display names preserved).
- Supabase tables `users`, `circles`, `circle_members`, `contributions`, `payouts`, `reputation_events`, `badges`, `governance_votes`, `indexer_state`, `user_preferences`, `ai_insights_cache`, `user_reputation` view — all preserved, with non-breaking column additions.
- Off-chain reputation view (`user_reputation`) — keeps working for all historical events; new events from v2 augment it.
- Off-chain AI insights — same function, fed by same view.
- Push Chain SDK version (`@pushchain/ui-kit@~5.2.2`) — stays.

---

## What ships in the next commit (this one: architecture + contracts)

- `backend/contracts/v2/ChainCircleCoreV2.sol`
- `backend/contracts/v2/ReputationManagerV2.sol`
- `backend/contracts/v2/BadgeNFTV2.sol`
- `backend/contracts/v2/WalletPreferencesV2.sol`
- `backend/contracts/v2/GovernanceModuleV2.sol`
- `backend/contracts/v2/TestnetYield.sol` (renamed, same math)
- `backend/contracts/v2/interfaces/IChainCircleCoreV2.sol` (external-facing interface)
- `backend/test/v2/*.test.js` (Hardhat test harness)
- `backend/scripts/v2/deploy.js` (atomic deploy + wire)
- `backend/scripts/v2/verify.js` (Blockscout verification)

Blocked on `PRIVATE_KEY` (owner wallet) for actual deploy. After you supply it, I run the deploy + verify + update everything downstream.
