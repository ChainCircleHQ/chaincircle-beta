# ChainCircle — Gap Analysis & Roadmap

**Date:** 2026-04-17
**Scope:** Full A-to-Z product + architecture review after Phase 4 backfill confirmed most contract functions don't emit events because most flows aren't exercised.

This is the plan for everything after Supabase indexing is live. Companion to [`audit.md`](audit.md) (the config/hygiene audit) — `audit.md` answered "what's sloppy"; this file answers "what's missing."

---

## 0. The One-Paragraph Product

ChainCircle is a rotating savings circle (ROSCA) on Push Chain. Friends pool money periodically; each round one member receives the pot plus 4% APR yield. The differentiator is **cross-chain UX via Push Chain's Universal Executor Accounts** — users from Ethereum, Solana, and elsewhere transact in the same circle from their native wallets without bridging. On top of the savings primitive sits a reputation system (score + tier), soulbound badges, governance for emergencies, and a name registry. In theory. In practice most of that is not wired.

---

## 1. What actually works today

| Flow | Status | Notes |
|---|---|---|
| Wallet connect (any chain via Push UEA) | ✅ | Push UI kit handles it, auth gate at [`ProtectedRoute.jsx`](frontend/src/Components/ProtectedRoute.jsx) |
| Claim CUSD from faucet | ✅ | 1000 CUSD / 24h, uses `claimFromFaucet()` correctly |
| Create circle | ✅ | 3-step form, validation, `approve + createCircle` |
| Join via invite code | ✅ | Uses `useCircleByInviteCode` lookup + `joinCircle` |
| Contribute to a circle | ✅ | `approve + contribute` |
| View dashboard (own circles, stats) | ✅ | Reads `getUserCircles`, `getUserTotalContributions`, `getGlobalStats` |
| View reputation score + tier | ✅ | Read-only display from `getUserReputation` |
| Emergency withdraw (10% penalty) | ✅ | UI warns clearly, works end-to-end |
| In-app notifications | ✅ | Decoded from chain events — contributions, score changes, badge mints |
| View payout history / upcoming | ✅ | Read-only; **claim button is a stub** (see §2.1) |

Everything else on the product surface either doesn't exist or is broken.

---

## 2. Bugs & broken wiring (fix first)

### 2.1 Payout claiming is a stub
- **Symptom:** `Payout.jsx:154-157` renders a "Claim Payout" button. `useWithdrawPayout` hook exists in `useCircleActions.js:192-225`. Neither is actually wired — the hook is never called, and the contract's `withdrawPayout(circleId)` function is itself a stub (doesn't move funds — actual transfers happen automatically inside `_processPayout()` when a round completes).
- **Root cause:** architectural mismatch. The contract pushes payouts automatically on round completion. The UI was designed as if users pull them. Only one model can be right.
- **Fix options:**
  - **A. Accept auto-push:** remove the Claim button; Payout page becomes pure history + upcoming view. Frontend shows "Arriving on [date], to wallet [addr]". Simplest.
  - **B. Add pull semantics:** change contract to hold payouts in an escrow mapping (`pendingWithdrawals[user]`) and implement a real `withdrawPayout()`. More control for users (matters for cross-chain resolution — see §2.4) but requires redeploy.
  - **C. Hybrid:** auto-push to on-chain escrow on round completion; `withdrawPayout()` pulls to preferred wallet (incl. cross-chain via Push UEA). **Best match for the "preferred wallet" feature, which is currently dead code (§2.4).**
- **Decision needed from you.**

### 2.2 BadgeNFT ABI mismatch
- **Symptom:** [`useBadgeNFT.js`](frontend/src/hooks/useBadgeNFT.js) calls `contract.hasBadge(user, badgeType)` and `contract.getBadgeURI(badgeType)`. These **do not exist** in the deployed [`BadgeNFT.sol`](backend/contracts/tokens/BadgeNFT.sol). The deployed contract only exposes `getUserBadge(user) → (tokenId, tier)` and standard ERC721 `tokenURI(tokenId)`.
- **Consequence:** every badge-related UI path silently fails; `useUserBadges`, `useOwnsBadge`, `useUserBadgeCount`, `useMintBadge` are all non-functional.
- **Fix:** rewrite `useBadgeNFT.js` against the real contract — one badge per user, tier upgrades in place. Remove `useMintBadge` entirely (contract mints automatically via ReputationManager; users can't mint directly).

### 2.3 ReputationManager events produce nothing
- **Symptom:** Phase 4 backfill processed all 11.6M blocks of ReputationManager deployments — 0 events decoded.
- **Root cause:** ChainCircleCore calls ReputationManager via interface only if `reputationManager != address(0)` (guard at [`ChainCircleCore.sol:290`](backend/contracts/core/ChainCircleCore.sol)). Either:
  1. `setReputationManager()` was never called post-deploy, or
  2. It was called but the contribution → onDeposit → ScoreChanged path is silently failing (interface mismatch between what ChainCircleCore expects and what ReputationManager exposes).
- **Fix:** verify via `hardhat run scripts/check-wiring.js` that `ChainCircleCore.reputationManager` is set to the deployed `ReputationManager` address, and that a test contribution triggers a `ScoreChanged` event. If not wired, run `setReputationManager(<addr>)` from the owner key. Same check for `setBadgeNFT` on ReputationManager.
- **Until this is fixed, no reputation/badge data will ever flow to Supabase.**

### 2.4 WalletPreferences is dead code
- **Symptom:** UI exists at [`LinkedWallets.jsx`](frontend/src/Pages/Profile/LinkedWallets.jsx) and [`PayoutPreferences.jsx`](frontend/src/Pages/Profile/PayoutPreferences.jsx). `useWalletPreferences` hook is complete. **None of the settings pages actually call it** — hook is imported but never invoked. Even if they did, the value would be ignored — `ChainCircleCore._processPayout()` always sends to the pre-calculated `payoutOrder[circleId][round]`, never reads `WalletPreferences.getPreferredWallet()`.
- **Fix:** this is blocked on the §2.1 payout architecture decision.
  - If §2.1-A (auto-push): delete WalletPreferences + its UI. It can't do anything.
  - If §2.1-C (hybrid pull): wire `withdrawPayout()` to resolve via `WalletPreferences.getPreferredWallet(user)` and bridge to that wallet via Push UEA.

### 2.5 GovernanceModule.execute() doesn't execute
- **Symptom:** Contract has proposals, votes, and `execute()` — but `execute()` only flips a status flag. It does not call `ChainCircleCore.emergencyWithdraw()` or any other withdrawal function when a proposal passes. Cross-contract permission is also missing — `emergencyWithdraw()` only allows the member themselves to call it, not a proxy.
- **Fix:** redesign. Options:
  - **A.** Add `onlyGovernance` modifier to a new `ChainCircleCore.executeGovernanceAction(circleId, target, amount)` and grant via `setGovernanceModule(addr)`. `GovernanceModule.execute()` calls back when passed.
  - **B.** Drop the governance module entirely for v1 — single-action `emergencyWithdraw` is enough for testnet.
  - My pick for near-term: **B**. Ship without governance; design it properly for v2.

### 2.6 Mute / pin / notification-settings are localStorage-only
- Circle mute state stored in `localStorage` ([`Circle.jsx:28-30`](frontend/src/Routes/Circle.jsx)). Lost on cross-device. NotificationSettings.jsx is purely cosmetic.
- **Fix:** move to a `user_preferences` Supabase table keyed by address. Cross-device sync, anon-role RLS locked to `auth.jwt() ->> 'sub' = address` (or a signed nonce).

---

## 3. Missing surfaces (build next)

### 3.1 Name registry UI (low effort, high UX win)
- Contract is free, unique, 1-32 chars. Hooks are fully defined but unused.
- **Build:** onboarding step after first wallet connect — "pick a display name" (optional). Settings page to change it. Resolver for circle member lists (show name instead of 0x prefix).
- **Files to add:** `frontend/src/Pages/Profile/DisplayName.jsx`, wire into `Profile.jsx`, show name fallback → address throughout circle member lists.

### 3.2 Circle search / discovery
- `searchCircles(term)` exists on-chain, no UI. Currently the only way to find a circle is via invite code.
- **Build:** search input on Dashboard → `searchCircles(term)` → list of matching public circles → click to preview → join.
- **Question:** are all circles currently "public" (invite code just shortcuts the search)? Or is there a public/private flag? Needs clarification; add a `bool isPublic` to circles if not already there.

### 3.3 Circle detail page — peer view
- Currently `CirclePreview` modal shows the user's own status. There's no way to see other members' reputation scores before joining, or see payment status of peers in-flight.
- **Build:** `/chain/circle/:id` route with full roster. Each member: display name (from NameRegistry), reputation score, tier badge, on-time rate, current round paid?/late? status.
- **Product value:** trust is the entire point of ROSCAs. Seeing "3 Gold-tier, 2 Silver, 1 unrated" is the difference between joining and walking away.

### 3.4 Contribution reminders
- In-app notifications work (reading chain events). **No reminders** for upcoming payments due in 48h, 24h, at due time.
- **Build now:** `useNotifications.js` already computes reminder data — expose it on dashboard as a banner + dedicated tab.
- **Build later:** push notifications (browser PWA), email (via Supabase auth?), SMS.

### 3.5 Leaderboard / social proof
- Everyone reads their own score. No public leaderboard.
- **Build:** `/chain/leaderboard` — top 100 by reputation, filterable by tier. Names + scores, shareable links. Drives engagement, signals active users.
- Easy data query — Supabase `users` table joined with reputation aggregate.

### 3.6 Public activity feed
- Each user sees their own activity. No global "recent activity on ChainCircle" view.
- **Build:** Dashboard side-panel or `/chain/activity` route showing `activity_log` view from Supabase (already built in Phase 4 schema). Realtime subscription for new events.

### 3.7 Onboarding / empty states
- First-time user on dashboard with no circles sees generic empty state. No guidance.
- **Build:** empty-state illustrations + three CTAs: "Create first circle" / "Join with invite code" / "Browse public circles". Brief tutorial overlay on first visit (localStorage-gated).

---

## 4. Architecture-level gaps

### 4.1 Payout model — pick one and commit
Already covered in §2.1. Blocks §2.4, §3 items that touch payouts. **This is the single biggest product decision on the list.**

### 4.2 Cross-chain payout resolution
The core differentiator is "user joins from Solana, pays in SOL, receives to SOL." Today:
- Contribute: works via Push UEA (user's SOL → Push Chain → CUSD transferFrom)
- Payout: **always goes to the Push Chain address that called `joinCircle`**, not back to the originating SOL/ETH address. Push UEA maps them but payout doesn't traverse back.
- **Fix:** on payout, resolve recipient's preferred wallet via `WalletPreferences`, then use Push Chain's universal execution to transfer to that chain. Requires §2.1-C architecture.
- **Until this is fixed, cross-chain is only half-true** — you can put money in from anywhere, but you only get it out on Push Chain.

### 4.3 Yield source
`MockYield` returns a fixed 4% APR — no actual yield is generated. Contributions sit in CUSD in the circle vault, no interest is being earned.
- Fine for testnet; **must change for mainnet.** Options: Aave deposit, Compound, or a cooperative-owned vault.
- Flag: the frontend prominently advertises "4% APR" — if we ever launch on mainnet without a real yield source, that's misleading.

### 4.4 Fee model
No protocol fees today. README says "protocol retains 20% of generated interest" but [`ChainCircleCore.sol:343,351,353`](backend/contracts/core/ChainCircleCore.sol) sends 100% of yield to the payout recipient. Contradiction to resolve before mainnet.

### 4.5 Observability
No event for when a circle transitions from `Pending → Active` (fills up). Makes it hard to alert "circle is starting now."
- **Fix (contract change):** emit `CircleStarted(circleId, timestamp)` at [`ChainCircleCore.sol:264`](backend/contracts/core/ChainCircleCore.sol).
- Add similar explicit events for cancellation, pause if those states ever get used.

---

## 5. UX / design debt

| Issue | Where | Fix |
|---|---|---|
| No toast/snackbar | App-wide | Install `sonner` or `react-hot-toast`; replace all `alert()` + inline error text |
| `alert()` for errors | `CreateCircleModal.jsx:87`, `Faucet.jsx:70` | Same |
| No loading skeletons | Dashboard, Profile | Replace "Loading…" text with shimmer skeletons |
| No form focus on error | CreateCircleModal | Scroll to first invalid field + focus it |
| No ARIA labels | All interactive elements | Audit + add `aria-label` to icon buttons, form inputs |
| Orphan components | `Spinner.jsx`, `FAQ.jsx`, `Terms.jsx`, `About.jsx` | Delete or populate |
| Contact info triplicated | `CreateCircleModal:764,766`, `Terms:212,214`, `About:222,225` | Move to `frontend/src/config/contact.js` |
| Large bundle (8.9MB) | `pnpm build` output | Code-split: lazy-load Profile subpages, Circle detail, Faucet |
| Mobile responsiveness | Unclear — looks designed for desktop | Manual audit on a phone, fix what breaks |

---

## 6. Proposed phase sequencing

Inserting these into the existing phase plan from [`task_plan.md`](../task_plan.md):

**Phase 5 — Swap frontend reads to Supabase** (unchanged from existing plan)
- Replace `useCircleData` on-chain event scans with `useCirclesDb` / `useRecentActivityDb`
- Keep all writes on-chain
- Kill `Notification.jsx` mockServices array

**Phase 5.5 (NEW) — Fix-first pass**
- §2.2 BadgeNFT ABI rewrite
- §2.3 Verify + wire ReputationManager / BadgeNFT cross-contract permissions (probably one `setReputationManager` + `setBadgeNFT` tx from owner key)
- §2.6 Move `localStorage` preferences → Supabase `user_preferences` table
- §5 toast system + replace `alert()`s
- §5 delete orphan components

**Phase 6 — Payout architecture decision + implementation**
- Pick §2.1 A/B/C
- If not A: contract changes required — new withdraw logic, wire WalletPreferences
- Redeploy affected contracts, update ABIs, backfill with new events
- Ship `/chain/circle/:id` peer view while waiting for contract redeploy (independent work)

**Phase 7 — Missing surfaces**
- §3.1 Name registration onboarding
- §3.2 Circle search
- §3.3 Circle detail peer view
- §3.4 Contribution reminder banner
- §3.5 Leaderboard
- §3.6 Global activity feed
- §3.7 Onboarding empty states

**Phase 8 — AI extensions** (original Phase 6)
- Reputation insights ("you're on a 5-streak, +50 if you contribute on time this round")
- Circle recommendations ("3 Silver-tier users looking to join a Q2 Home-goal circle")
- Chat assistant for support
- Summaries of monthly activity
- Keys server-side via Edge Function proxy — never `VITE_*`

**Phase 9 — Mainnet readiness**
- §4.3 Real yield source
- §4.4 Fee model alignment
- §4.2 Cross-chain payout resolution (depends on §2.1-C)
- Audit pass on contracts
- Error monitoring, analytics

---

## 7. Decisions I need from you before building further

1. **§2.1 Payout model:** A (auto-push) / B (full pull) / C (hybrid auto-escrow + pull to preferred wallet).
   - **My strong rec: C** — enables cross-chain payouts, which is the product's whole pitch. Requires contract redeploy.

2. **§2.5 Governance for v1:** ship it or defer?
   - **My rec: defer.** It's not working correctly and not essential. Come back in v2 once there's user demand.

3. **§3.2 Public vs private circles:** is there a flag today, or is every circle effectively public (just invite-only by virtue of nobody knowing the code)?

4. **§4.3 Mainnet yield source:** do we have a target partner (Aave, Compound, cooperative vault) or is mainnet itself deferred for now?

5. **§4.4 Protocol fee:** keep the 20%-of-interest model (contract change) or drop it (README change)?

6. **Phase 8 AI scope:** pick 2-3 features to lead with. Everything is feasible but doing all at once is a lot.

Answer these and I can start Phase 5 + 5.5 in parallel. 5 is pure frontend work (Supabase hook swaps) while you're thinking on the bigger architectural decisions.
