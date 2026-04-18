// Diagnose cross-contract wiring. Read-only — no private key needed.
// Explains why ReputationManager/BadgeNFT events aren't flowing.
//
//   node scripts/check-wiring.js

require("dotenv").config();
const { JsonRpcProvider, Contract, ZeroAddress } = require("ethers");

const RPC = process.env.PUSH_CHAIN_RPC || "https://evm.donut.rpc.push.org/";

const ADDRS = {
    ChainCircleCore:   "0x59D44aea45bd92E2798b7998e8E090586670f161",
    ReputationManager: "0xEaEa469279B89E7fF0BDd5903226483418AB37e4",
    BadgeNFT:          "0x9171F3AE9Cb9EBBa0826ad31971647DceB52Bd50",
    MockYield:         "0x2312493eac47f20a3a1B8e7AB1627F1B1FDd3412",
    GovernanceModule:  "0xA3c786088a6D3EB9216B5647a4149a7dF0149b49",
};

const ABIS = {
    ChainCircleCore: [
        "function reputationManager() view returns (address)",
        "function yieldModule() view returns (address)",
        "function owner() view returns (address)",
    ],
    ReputationManager: [
        "function circleCore() view returns (address)",
        "function badgeNFT() view returns (address)",
        "function owner() view returns (address)",
    ],
    BadgeNFT: [
        "function reputationManager() view returns (address)",
        "function owner() view returns (address)",
    ],
};

const tick = "✅";
const cross = "❌";
const warn = "⚠️ ";

function cmpAddr(a, b) {
    if (!a || !b) return false;
    return a.toLowerCase() === b.toLowerCase();
}

function row(label, actual, expected) {
    const ok = cmpAddr(actual, expected);
    const zero = !actual || actual === ZeroAddress;
    const status = zero ? cross + " UNSET" : ok ? tick : cross;
    console.log(`  ${status}  ${label.padEnd(42)} ${actual}${!zero && !ok ? ` (expected ${expected})` : ""}`);
    return ok;
}

async function main() {
    const provider = new JsonRpcProvider(RPC);
    const head = await provider.getBlockNumber();
    console.log(`\nRPC: ${RPC}`);
    console.log(`Head: ${head}\n`);

    const core = new Contract(ADDRS.ChainCircleCore, ABIS.ChainCircleCore, provider);
    const rep  = new Contract(ADDRS.ReputationManager, ABIS.ReputationManager, provider);
    const badge = new Contract(ADDRS.BadgeNFT, ABIS.BadgeNFT, provider);

    console.log("ChainCircleCore:");
    const repFromCore = await core.reputationManager().catch(() => null);
    const yieldFromCore = await core.yieldModule().catch(() => null);
    const coreOwner = await core.owner().catch(() => null);
    const coreRepOk = row("core.reputationManager", repFromCore, ADDRS.ReputationManager);
    const coreYieldOk = row("core.yieldModule", yieldFromCore, ADDRS.MockYield);
    console.log(`  owner: ${coreOwner}\n`);

    console.log("ReputationManager:");
    const coreFromRep = await rep.circleCore().catch(() => null);
    const badgeFromRep = await rep.badgeNFT().catch(() => null);
    const repOwner = await rep.owner().catch(() => null);
    const repCoreOk = row("rep.circleCore", coreFromRep, ADDRS.ChainCircleCore);
    const repBadgeOk = row("rep.badgeNFT", badgeFromRep, ADDRS.BadgeNFT);
    console.log(`  owner: ${repOwner}\n`);

    console.log("BadgeNFT:");
    const repFromBadge = await badge.reputationManager().catch(() => null);
    const badgeOwner = await badge.owner().catch(() => null);
    const badgeRepOk = row("badge.reputationManager", repFromBadge, ADDRS.ReputationManager);
    console.log(`  owner: ${badgeOwner}\n`);

    const allGood = coreRepOk && coreYieldOk && repCoreOk && repBadgeOk && badgeRepOk;

    console.log("-".repeat(70));
    if (allGood) {
        console.log(`${tick} All cross-contract pointers are wired correctly.`);
        console.log("   If events still aren't flowing, the contracts may not be emitting");
        console.log("   on current contribution flows. Check a sample contribution tx on-chain.");
    } else {
        console.log(`${cross} Wiring is incomplete. Run scripts/fix-wiring.js (requires PRIVATE_KEY`);
        console.log("   of the owner wallet set in backend/.env) to fix. Missing pointers are");
        console.log("   the likely reason ScoreChanged/BadgeMinted events never fire.");
    }

    // Quick sanity: is the owner the same across all three? If so, one key fixes all.
    const owners = [coreOwner, repOwner, badgeOwner].filter(Boolean);
    const uniq = [...new Set(owners.map((o) => o.toLowerCase()))];
    if (uniq.length > 1) {
        console.log(`\n${warn}Owners differ across contracts — may need multiple keys to fix:`);
        uniq.forEach((o) => console.log(`     ${o}`));
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
