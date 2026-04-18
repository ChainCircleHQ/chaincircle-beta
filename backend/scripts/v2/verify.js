// Blockscout verification for the v2 deployment. Reads addresses from
// deployments/<network>-v2.json and runs hardhat-verify for each.
//
// Usage:
//   npx hardhat run scripts/v2/verify.js --network pushDonut

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Same list the deploy script seeds into WalletPreferencesV2.
const SUPPORTED_CHAINS = [1, 11155111, 84532, 421614, 11155420, 80002, 97];
const V1_CUSD = "0x7D5Dbda57E186f7e905e5E77224Cd60054fF41f3";

async function verify(address, args = [], contract = undefined) {
    try {
        await hre.run("verify:verify", { address, constructorArguments: args, contract });
        console.log(`  ✅ ${contract || address} verified`);
    } catch (e) {
        if (/already verified/i.test(e.message)) {
            console.log(`  ✅ ${contract || address} already verified`);
        } else {
            console.log(`  ⚠ ${contract || address} failed: ${e.message.slice(0, 200)}`);
        }
    }
}

async function main() {
    const recFile = path.join(__dirname, `../../deployments/${hre.network.name}-v2.json`);
    if (!fs.existsSync(recFile)) throw new Error(`no deployment record at ${recFile} — run deploy.js first`);
    const rec = JSON.parse(fs.readFileSync(recFile));
    const c = rec.contracts;
    console.log("verifying v2 deployment on", hre.network.name);

    await verify(c.TestnetYield,          [],                                         "contracts/v2/TestnetYield.sol:TestnetYield");
    await verify(c.WalletPreferencesV2,   [SUPPORTED_CHAINS],                         "contracts/v2/WalletPreferencesV2.sol:WalletPreferencesV2");
    await verify(c.BadgeNFTV2,            [],                                         "contracts/v2/BadgeNFTV2.sol:BadgeNFTV2");
    await verify(c.ReputationManagerV2,   [],                                         "contracts/v2/ReputationManagerV2.sol:ReputationManagerV2");
    await verify(c.ChainCircleCoreV2,     [V1_CUSD],                                  "contracts/v2/ChainCircleCoreV2.sol:ChainCircleCoreV2");
    await verify(c.GovernanceModuleV2,    [c.ChainCircleCoreV2, c.ReputationManagerV2],"contracts/v2/GovernanceModuleV2.sol:GovernanceModuleV2");

    console.log("\nall verifications attempted.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
