# ChainCircle Audit Report — Phase 1

**Date:** 2026-04-17
**Scope:** `/Users/mac/chaincircle/org-beta/` (canonical repo, HEAD `e68d418`)
**Auditor:** automated sweep across hardcoded data, AI integration, Push Chain config, deps, hygiene.

This file is the input to Phase 2+. Each finding has a severity tag (`HIGH`/`MED`/`LOW`) and an `action:` pointing to the phase that fixes it.

---

## 0. TL;DR

| Area | Status |
|---|---|
| AI integration | **None exists** — Phase 6 is greenfield. Good news. |
| Hardcoded data | Contract addresses triplicated; RPC URLs duplicated; protocol params static; one mock array. Manageable. |
| Push Chain | SDK `@pushchain/ui-kit@^2.0.11`, need to verify against latest docs. Faucet **bypassed** via direct `mint()` — security issue. |
| Contract coverage | Frontend uses only **14 of 117** contract functions (`ABI_AUDIT_REPORT.md`). Badge NFT and NameRegistry **0% integrated**. Huge extension surface. |
| Deps | Root `package.json` is cruft (3 stray packages, no name/scripts). `lucide-react` is 3 majors behind. Otherwise modern. |
| Hygiene | `.gitignore` good. No committed secrets. **Only backend has `.env.example`**, frontend missing one. |

---

## 1. Root `package.json` is junk — DELETE

- `/Users/mac/chaincircle/org-beta/package.json` has just 3 deps (`html-to-image`, `lucide-react`, `save`) and **no name, no scripts, no version**.
- `save` is a random squatted package (2.9.0, last updated years ago) — likely installed by mistake.
- All three are also declared in `frontend/package.json` (legitimately).
- **Severity:** MED — confusing, never loaded, bloats root.
- **Action (Phase 2):** Delete the root `package.json` + root `package-lock.json` / `pnpm-lock.yaml` entirely. Everything lives under `frontend/` and `backend/`.

---

## 2. Contract addresses TRIPLICATED

Three files hold the same 8 deployed addresses, diverging invites a bug:

| File | Addresses present |
|---|---|
| `frontend/src/constants/contracts.js:3-10` | All 8 + NETWORK_CONFIG |
| `frontend/src/utils/constants.js:117-123` | All 8 again |
| `backend/utils/constants.js:117-124` | All 8 again (backend) |

Plus one inline hardcode:
- `frontend/src/Pages/Landing/Faucet.jsx:19` — CUSD address inlined as literal `'0x7D5Dbda57E186f7e905e5E77224Cd60054fF41f3'` instead of imported.

**Deployed addresses (Push Chain Donut, chainId 42101):**
| Contract | Address |
|---|---|
| CUSD | `0x7D5Dbda57E186f7e905e5E77224Cd60054fF41f3` |
| ChainCircleCore | `0x59D44aea45bd92E2798b7998e8E090586670f161` |
| ReputationManager | `0xEaEa469279B89E7fF0BDd5903226483418AB37e4` |
| BadgeNFT | `0x9171F3AE9Cb9EBBa0826ad31971647DceB52Bd50` |
| GovernanceModule | `0xA3c786088a6D3EB9216B5647a4149a7dF0149b49` |
| NameRegistry | `0x1c8fCc121D52EAa6d4705fCcE95e34E2CEDced5E` |
| WalletPreferences | `0xB5b71E6fbA444d0B791C62C855cc31b3521e8E38` |
| MockYield | `0x2312493eac47f20a3a1B8e7AB1627F1B1FDd3412` |

- **Severity:** HIGH (inlined `Faucet.jsx`), MED (triplication).
- **Action (Phase 3):** Single source of truth = `frontend/src/config/contracts.js`, fed from `.env.local` (`VITE_CUSD_ADDRESS`, etc.). Backend reads from its own `.env`. Remove the other two copies. Fix `Faucet.jsx:19` to import.

---

## 3. RPC URLs & chain metadata hardcoded

- `backend/hardhat.config.js:18` — RPC hardcoded: `"https://evm.rpc-testnet-donut-node1.push.org/"`, chainId `42101`. Already has `.env.example` — but the config file doesn't read from env for RPC.
- `frontend/src/utils/constants.js:5-8` — Primary + fallback RPC hardcoded in `PUSH_CHAIN_CONFIG`.
- `frontend/src/constants/contracts.js:13-23` — Duplicate `NETWORK_CONFIG` with RPC + explorer.
- `backend/utils/constants.js:1-14` — Duplicate again.

**Severity:** HIGH.
**Action (Phase 3):** All chain metadata → `.env` (root-of-frontend, root-of-backend). One loader per side.

---

## 4. Protocol parameters hardcoded in JS (should be contract-read)

All in `frontend/src/utils/constants.js`:

| Line | Constant | Value | Why it's a problem |
|---|---|---|---|
| 18 | `CUSD_DECIMALS` | 6 | Read from `CUSD.decimals()` ABI call |
| 19 | `FAUCET_AMOUNT` | 1000 | Read from `CUSD` faucet constants |
| 20 | `FAUCET_COOLDOWN_HOURS` | 24 | Read from contract |
| 23-28 | Circle limits | 100/5000/3/12/3/12 | Should match `ChainCircleCore` constants |
| 31-33 | Time constants | Grace/monthly/weekly | Should match contract |
| 36 | `APR_BASIS_POINTS` | 400 (4%) | Read from `MockYield` |
| 39-46 | `REPUTATION_POINTS` | various | Read from `ReputationManager` |
| 84-89 | `REPUTATION_TIERS` | thresholds | Read from `ReputationManager` |
| 92-96 | `GOVERNANCE_REQUIREMENTS` | min tier 700 / 2 circles | Read from `GovernanceModule` |

**Severity:** MED.
**Action (Phase 5):** Replace with on-chain reads cached in Supabase (cheap, 5-min TTL is fine).

---

## 5. Mock / placeholder data

- `frontend/src/Routes/Notification.jsx:165-184` — `mockServices` array with 2 placeholder notifications.
- **Severity:** MED.
- **Action (Phase 5):** Replace with Supabase `activity_log` query.

(That's the only mock array found. The rest of the UI reads real contract state.)

---

## 6. Magic numbers in hooks (mostly OK)

- Block search ranges: `useCircleData.js:215` → 50000, `useNotifications.js:22` → 10000. MED — should be time-based (e.g. "last 7 days"), not block count, because block time varies.
- Reputation reminder window: `useNotifications.js:239` → 7 days. LOW.
- `BATCH_SIZE = 100` in `useCircleData.js:531`. LOW — fine.
- `staleTime` values (15-30s) across hooks. LOW — fine.

**Action (Phase 5):** Convert block ranges to time-based queries against Supabase indexer.

---

## 7. Contact info duplicated in 3 places

- `frontend/src/Pages/Circle/CreateCircleModal.jsx:764,766`
- `frontend/src/Pages/Landing/Terms.jsx:212,214`
- `frontend/src/Pages/Landing/About.jsx:222,225`

All hardcode `support@chaincircle.org`, `@chaincircle_`, `ChainCircleHQ`.

**Severity:** LOW.
**Action (Phase 3):** Move to single `frontend/src/config/contact.js`. Env override optional.

---

## 8. AI integration

**Status: NONE EXISTS.**

- Zero AI provider SDKs in `package.json` (no `openai`, `@anthropic-ai/sdk`, `@google/generative-ai`, nothing).
- Zero API keys in source or env.
- Zero hardcoded prompts, zero chat UI, zero recommendation components.
- Zero `VITE_*_API_KEY` vars that would leak to browser.

**Impact:** Phase 6 starts clean. No keys to rotate, no shortcuts to undo. Design fresh with server-side Edge Function proxy from day one.

---

## 9. Push Chain SDK

- **Version:** `@pushchain/ui-kit@^2.0.11` (frontend only — no other `@pushchain/*` packages).
- **APIs used:** `PushUniversalWalletProvider`, `PushUI.CONSTANTS`, `usePushWalletContext`, `usePushChainClient`, `PushUniversalAccountButton`.
- **To verify (Phase 3):** Current latest version + changelog for breaking changes + whether `pushChainClient.universal.account` path still works in latest.

---

## 10. Contract integration coverage = 12%

Per `frontend/src/abis/ABI_AUDIT_REPORT.md` (dated Oct 2025):
- Total functions available across ABIs: **117**
- Currently called from frontend: **14**
- **BadgeNFT: 0% integrated** (contract exists, NFT assets committed, no UI)
- **NameRegistry: 0% integrated** (ENS-like naming built, not wired)
- **ReputationManager: 4% integrated** (score display works, but tier logic / events / governance checks not wired)
- **Faucet bypassed (HIGH SECURITY):** Frontend calls `CUSD.mint()` directly instead of `CUSD.claimFromFaucet()`, bypassing the cooldown check. Any user can mint unlimited tokens. **This alone is a critical fix.**

**Action:**
- Phase 3: Fix the faucet bypass (`Faucet.jsx` → call `claimFromFaucet` not `mint`).
- Phase 5+: Wire badge + name registry UI.
- This also becomes a good Phase 6 AI target (e.g. "suggest a name" using claims history).

---

## 11. Hardhat config

- Solidity `0.8.22`, optimizer on (`runs: 200, viaIR: true`).
- Network `pushDonut`, RPC + chainId hardcoded (see §3).
- Verifier: Blockscout at `https://donut.push.network/api`.
- Accounts: from `process.env.PRIVATE_KEY`. ✓ good.
- OpenZeppelin `^5.0.0`. ✓ modern.

No deployment-record JSON files — addresses are manually copied to frontend. Risk: silent drift on redeploy.

**Action (Phase 3):** Add a `hardhat-deploy` or custom post-deploy script that writes `backend/deployments/pushDonut.json` + mirrors to `frontend/src/config/contracts.generated.js`. Single source.

---

## 12. Dependencies (freshness)

**Root `package.json`** — delete entirely (§1).

**Frontend** (`frontend/package.json`):
| Package | Current | Notes |
|---|---|---|
| `@pushchain/ui-kit` | ^2.0.11 | Verify latest |
| `ethers` | ^6.15.0 | 6.x fine |
| `react` / `react-dom` | ^19.1.1 | Current |
| `vite` | ^7.1.7 | Current |
| `tailwindcss` + `@tailwindcss/vite` | ^4.1.14 | Tailwind 4 — current |
| `@tanstack/react-query` | ^5.90.2 | Current |
| `react-router` | ^7.9.3 | Current (not `react-router-dom`, which is legacy) |
| `lucide-react` | ^0.447.0 in frontend, ^0.548.0 in root | Latest is **1.8.0** — upgrade |
| `react-smooth` | ^4.0.4 | Fine |
| `html-to-image` | ^1.11.13 | Fine |
| `react-icons` | ^5.5.0 | Fine |

**Backend** (`backend/package.json`):
| Package | Current | Notes |
|---|---|---|
| `hardhat` | ^2.19.0 | Stable; hardhat 3 released, optional upgrade |
| `@openzeppelin/contracts` | ^5.0.0 | Current |
| `@nomicfoundation/hardhat-toolbox` | ^4.0.0 | Current |
| `ethers` (dev) | ^6.4.0 | Current |
| `dotenv` | ^16.3.1 | Current |

**Severity:** LOW — mostly modern.
**Action (Phase 3):** Upgrade `lucide-react` to 1.x, pin versions, regenerate lockfile.

---

## 13. Hygiene

- `.gitignore` ✓ covers `.env`, `.env.*`, `coverage`, `dist`, `.cache`, `.vercel`, `.claude`, `node_modules`.
- **No committed secrets** found via pattern scan.
- Only `backend/.env.example` exists. **Frontend has no `.env.example`** — needs one for new devs.
- No committed `artifacts/`, `cache/`, `.DS_Store`. ✓

**Action (Phase 2):**
- Create `frontend/.env.example` with all `VITE_*` vars (RPC, chain, contracts, Supabase URL/anon).
- Create `.env.example` at root documenting where each side's env lives.

---

## 14. Service/data layer observations

- `frontend/src/services/circleAPI.js` and `recentActivitiesAPI.js` — direct ethers.js contract reads. These are the prime candidates to be replaced by Supabase hooks in Phase 5.
- `useCircleData.js` does expensive event log scans (50k blocks) on every hook mount. This is what Supabase indexing will replace.

---

## Phase 1 → Phase 2 handoff checklist

Items to fix *immediately* in Phase 2:

1. Delete root `package.json` + root lockfiles (§1)
2. Create `CONTRIBUTORS.md` (Mayor Isaac) + README credit block (existing plan)
3. Add `frontend/.env.example` (§13)
4. Keep `.gitignore` as is (already good)

Items to fix in Phase 3 (config/deps):

5. Unify contract-address source → one env-driven config per side (§2)
6. Move RPC URLs to `.env` (§3)
7. Fix `Faucet.jsx` to use `claimFromFaucet()` not `mint()` (§10) — **security**
8. Upgrade `lucide-react` + verify `@pushchain/ui-kit` latest (§9, §12)
9. Add deployment-record JSON output from hardhat (§11)

Items for Phase 5 (Supabase swap):

10. Replace protocol-param constants with on-chain reads cached in Supabase (§4)
11. Replace `Notification.jsx` mockServices with activity_log query (§5)
12. Convert block-range scans to time-based Supabase queries (§6)
13. Wire BadgeNFT + NameRegistry UI (§10) — also doubles as Phase 6 AI hook points

---

**End of audit.**
