// Wires the cross-contract pointers flagged by check-wiring.js.
// Requires PRIVATE_KEY of the owner of each contract (same key ideally)
// set in backend/.env. Idempotent — only sends setter tx if pointer is wrong.
//
//   node scripts/fix-wiring.js

require("dotenv").config();
const { JsonRpcProvider, Wallet, Contract, ZeroAddress } = require("ethers");

const RPC = process.env.PUSH_CHAIN_RPC || "https://evm.rpc-testnet-donut-node1.push.org/";

if (!process.env.PRIVATE_KEY) {
    console.error("PRIVATE_KEY missing in backend/.env — need owner key to run setters");
    process.exit(1);
}

const ADDRS = {
    ChainCircleCore:   "0x59D44aea45bd92E2798b7998e8E090586670f161",
    ReputationManager: "0xEaEa469279B89E7fF0BDd5903226483418AB37e4",
    BadgeNFT:          "0x9171F3AE9Cb9EBBa0826ad31971647DceB52Bd50",
    MockYield:         "0x2312493eac47f20a3a1B8e7AB1627F1B1FDd3412",
};

const CORE_ABI = [
    "function reputationManager() view returns (address)",
    "function yieldModule() view returns (address)",
    "function setReputationManager(address) external",
    "function setYieldModule(address) external",
];
const REP_ABI = [
    "function circleCore() view returns (address)",
    "function badgeNFT() view returns (address)",
    "function setCircleCore(address) external",
    "function setBadgeNFT(address) external",
];
const BADGE_ABI = [
    "function reputationManager() view returns (address)",
    "function setReputationManager(address) external",
];

const cmp = (a, b) => a && b && a.toLowerCase() === b.toLowerCase();

async function ensure(contract, getterName, setterName, expected, label) {
    const current = await contract[getterName]();
    if (cmp(current, expected)) {
        console.log(`  ✅ ${label} already ${expected}`);
        return;
    }
    console.log(`  → sending ${setterName}(${expected})  (was ${current === ZeroAddress ? "unset" : current})`);
    const tx = await contract[setterName](expected);
    console.log(`     tx: ${tx.hash}`);
    await tx.wait();
    console.log(`     ✅ confirmed`);
}

async function main() {
    const provider = new JsonRpcProvider(RPC);
    const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`signer: ${wallet.address}\n`);

    const core = new Contract(ADDRS.ChainCircleCore, CORE_ABI, wallet);
    const rep  = new Contract(ADDRS.ReputationManager, REP_ABI, wallet);
    const badge = new Contract(ADDRS.BadgeNFT, BADGE_ABI, wallet);

    console.log("ChainCircleCore:");
    await ensure(core, "reputationManager", "setReputationManager", ADDRS.ReputationManager, "reputationManager");
    await ensure(core, "yieldModule", "setYieldModule", ADDRS.MockYield, "yieldModule");

    console.log("\nReputationManager:");
    await ensure(rep, "circleCore", "setCircleCore", ADDRS.ChainCircleCore, "circleCore");
    await ensure(rep, "badgeNFT", "setBadgeNFT", ADDRS.BadgeNFT, "badgeNFT");

    console.log("\nBadgeNFT:");
    await ensure(badge, "reputationManager", "setReputationManager", ADDRS.ReputationManager, "reputationManager");

    console.log("\n✅ Wiring complete. Next contribution should emit ScoreChanged.");
    console.log("   Verify with: node scripts/check-wiring.js");
}

main().catch((e) => { console.error(e); process.exit(1); });
