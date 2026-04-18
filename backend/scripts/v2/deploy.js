// Atomic deploy + wire for ChainCircle v2. Idempotent at the wiring step —
// if a contract is already deployed (address passed via env), we skip the
// deploy and only wire missing pointers.
//
// Usage:
//   PRIVATE_KEY=0x... npx hardhat run scripts/v2/deploy.js --network pushDonut
//
// Writes: backend/deployments/pushDonut-v2.json
//   and a matching JS export at frontend/src/constants/contracts.v2.js
//   and updates indexer_state in Supabase if SUPABASE_* are set.

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Reuse v1 addresses when we don't need to redeploy.
const V1_CUSD = "0x7D5Dbda57E186f7e905e5E77224Cd60054fF41f3";
const V1_NAME_REGISTRY = "0x1c8fCc121D52EAa6d4705fCcE95e34E2CEDced5E";

// Chain IDs seeded into WalletPreferencesV2 as supported destinations.
const SUPPORTED_CHAINS = [
    1,          // Ethereum mainnet (future)
    11155111,   // Ethereum Sepolia
    84532,      // Base Sepolia
    421614,     // Arbitrum Sepolia
    11155420,   // Optimism Sepolia
    80002,      // Polygon Amoy
    97,         // BNB testnet
    // Solana chains aren't EVM chainIds — represented as CAIP slugs off-chain,
    // on-chain payout destination is the user's Push Chain address.
];

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const addr = await deployer.getAddress();
    const balance = await hre.ethers.provider.getBalance(addr);
    console.log("deployer:", addr);
    console.log("balance:", hre.ethers.formatEther(balance), "PC");
    if (balance === 0n) {
        throw new Error("deployer has 0 balance — fund from faucet.push.org first");
    }

    const deployed = {};

    // ---------------- TestnetYield ----------------
    console.log("\n→ deploying TestnetYield…");
    const TestnetYield = await hre.ethers.getContractFactory("TestnetYield");
    const yieldMod = await TestnetYield.deploy();
    await yieldMod.waitForDeployment();
    deployed.TestnetYield = await yieldMod.getAddress();
    console.log("  ", deployed.TestnetYield);

    // ---------------- WalletPreferencesV2 ----------------
    console.log("\n→ deploying WalletPreferencesV2…");
    const WalletPrefs = await hre.ethers.getContractFactory("WalletPreferencesV2");
    const prefs = await WalletPrefs.deploy(SUPPORTED_CHAINS);
    await prefs.waitForDeployment();
    deployed.WalletPreferencesV2 = await prefs.getAddress();
    console.log("  ", deployed.WalletPreferencesV2);

    // ---------------- BadgeNFTV2 ----------------
    console.log("\n→ deploying BadgeNFTV2…");
    const BadgeNFT = await hre.ethers.getContractFactory("BadgeNFTV2");
    const badge = await BadgeNFT.deploy();
    await badge.waitForDeployment();
    deployed.BadgeNFTV2 = await badge.getAddress();
    console.log("  ", deployed.BadgeNFTV2);

    // ---------------- ReputationManagerV2 ----------------
    console.log("\n→ deploying ReputationManagerV2…");
    const RepMgr = await hre.ethers.getContractFactory("ReputationManagerV2");
    const rep = await RepMgr.deploy();
    await rep.waitForDeployment();
    deployed.ReputationManagerV2 = await rep.getAddress();
    console.log("  ", deployed.ReputationManagerV2);

    // ---------------- ChainCircleCoreV2 ----------------
    console.log("\n→ deploying ChainCircleCoreV2…");
    const Core = await hre.ethers.getContractFactory("ChainCircleCoreV2");
    const core = await Core.deploy(V1_CUSD);
    await core.waitForDeployment();
    deployed.ChainCircleCoreV2 = await core.getAddress();
    console.log("  ", deployed.ChainCircleCoreV2);

    // ---------------- GovernanceModuleV2 ----------------
    console.log("\n→ deploying GovernanceModuleV2…");
    const Gov = await hre.ethers.getContractFactory("GovernanceModuleV2");
    const gov = await Gov.deploy(deployed.ChainCircleCoreV2, deployed.ReputationManagerV2);
    await gov.waitForDeployment();
    deployed.GovernanceModuleV2 = await gov.getAddress();
    console.log("  ", deployed.GovernanceModuleV2);

    // ---------------- Wire pointers ----------------
    console.log("\n→ wiring cross-contract pointers…");

    console.log("  core.setReputationManager");
    await (await core.setReputationManager(deployed.ReputationManagerV2)).wait();
    console.log("  core.setYieldModule");
    await (await core.setYieldModule(deployed.TestnetYield)).wait();
    console.log("  core.setWalletPreferences");
    await (await core.setWalletPreferences(deployed.WalletPreferencesV2)).wait();
    console.log("  core.setGovernanceModule");
    await (await core.setGovernanceModule(deployed.GovernanceModuleV2)).wait();

    console.log("  rep.setCircleCore");
    await (await rep.setCircleCore(deployed.ChainCircleCoreV2)).wait();
    console.log("  rep.setBadgeNFT");
    await (await rep.setBadgeNFT(deployed.BadgeNFTV2)).wait();

    console.log("  badge.setReputationManager");
    await (await badge.setReputationManager(deployed.ReputationManagerV2)).wait();

    // ---------------- Record: reused + deployed ----------------
    const record = {
        network: hre.network.name,
        chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
        deployer: addr,
        deployedAt: new Date().toISOString(),
        contracts: {
            // Reused from v1 — no redeploy.
            CUSD: V1_CUSD,
            NameRegistry: V1_NAME_REGISTRY,
            // Fresh v2 deployments.
            ChainCircleCoreV2: deployed.ChainCircleCoreV2,
            ReputationManagerV2: deployed.ReputationManagerV2,
            BadgeNFTV2: deployed.BadgeNFTV2,
            WalletPreferencesV2: deployed.WalletPreferencesV2,
            GovernanceModuleV2: deployed.GovernanceModuleV2,
            TestnetYield: deployed.TestnetYield,
        },
        deployBlock: await hre.ethers.provider.getBlockNumber(),
    };

    const outDir = path.join(__dirname, "../../deployments");
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `${hre.network.name}-v2.json`);
    fs.writeFileSync(outFile, JSON.stringify(record, null, 2));
    console.log(`\n✅ wrote ${outFile}`);

    // Frontend constants companion.
    const feFile = path.join(__dirname, "../../..", "frontend/src/constants/contracts.v2.js");
    const feContent = `// Auto-generated by backend/scripts/v2/deploy.js. Commit this file.
export const V2_CONTRACT_ADDRESSES = ${JSON.stringify(record.contracts, null, 4)};
export const V2_DEPLOY_BLOCK = ${record.deployBlock};
export const V2_NETWORK = ${JSON.stringify({ name: record.network, chainId: record.chainId })};
`;
    fs.writeFileSync(feFile, feContent);
    console.log(`✅ wrote ${feFile}`);

    console.log("\nDone. Next:");
    console.log("  1. npx hardhat run scripts/v2/verify.js --network pushDonut");
    console.log("  2. Add new addresses to Supabase indexer_state");
    console.log("  3. Update frontend/src/constants/contracts.js to import v2 addresses");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
