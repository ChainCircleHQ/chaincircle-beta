const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

    // 1. Deploy CUSD
    console.log("\n1. Deploying CUSD...");
    const CUSD = await hre.ethers.getContractFactory("CUSD");
    const cusd = await CUSD.deploy();
    await cusd.waitForDeployment();
    const cusdAddress = await cusd.getAddress();
    console.log("✅ CUSD deployed to:", cusdAddress);

    // 2. Deploy MockYield
    console.log("\n2. Deploying MockYield...");
    const MockYield = await hre.ethers.getContractFactory("MockYield");
    const mockYield = await MockYield.deploy();
    await mockYield.waitForDeployment();
    const yieldAddress = await mockYield.getAddress();
    console.log("✅ MockYield deployed to:", yieldAddress);

    // 3. Deploy ReputationManager
    console.log("\n3. Deploying ReputationManager...");
    const ReputationManager = await hre.ethers.getContractFactory("ReputationManager");
    const reputationManager = await ReputationManager.deploy();
    await reputationManager.waitForDeployment();
    const reputationAddress = await reputationManager.getAddress();
    console.log("✅ ReputationManager deployed to:", reputationAddress);

    // 4. Deploy BadgeNFT
    console.log("\n4. Deploying BadgeNFT...");
    const BadgeNFT = await hre.ethers.getContractFactory("BadgeNFT");
    const badgeNFT = await BadgeNFT.deploy();
    await badgeNFT.waitForDeployment();
    const badgeAddress = await badgeNFT.getAddress();
    console.log("✅ BadgeNFT deployed to:", badgeAddress);

    // 5. Deploy ChainCircleCore
    console.log("\n5. Deploying ChainCircleCore...");
    const ChainCircleCore = await hre.ethers.getContractFactory("ChainCircleCore");
    const chainCircleCore = await ChainCircleCore.deploy(cusdAddress);
    await chainCircleCore.waitForDeployment();
    const coreAddress = await chainCircleCore.getAddress();
    console.log("✅ ChainCircleCore deployed to:", coreAddress);

    // 6. Deploy GovernanceModule
    console.log("\n6. Deploying GovernanceModule...");
    const GovernanceModule = await hre.ethers.getContractFactory("GovernanceModule");
    const governanceModule = await GovernanceModule.deploy(coreAddress);
    await governanceModule.waitForDeployment();
    const governanceAddress = await governanceModule.getAddress();
    console.log("✅ GovernanceModule deployed to:", governanceAddress);

    // 7. Deploy NameRegistry
    console.log("\n7. Deploying NameRegistry...");
    const NameRegistry = await hre.ethers.getContractFactory("NameRegistry");
    const nameRegistry = await NameRegistry.deploy();
    await nameRegistry.waitForDeployment();
    const nameRegistryAddress = await nameRegistry.getAddress();
    console.log("✅ NameRegistry deployed to:", nameRegistryAddress);

    console.log("\n" + "=".repeat(60));
    console.log("LINKING CONTRACTS...");
    console.log("=".repeat(60));

    // Link ChainCircleCore with ReputationManager
    console.log("\nLinking ChainCircleCore → ReputationManager...");
    let tx = await chainCircleCore.setReputationManager(reputationAddress);
    await tx.wait();
    console.log("✅ ChainCircleCore.setReputationManager completed");

    // Link ChainCircleCore with YieldModule
    console.log("\nLinking ChainCircleCore → MockYield...");
    tx = await chainCircleCore.setYieldModule(yieldAddress);
    await tx.wait();
    console.log("✅ ChainCircleCore.setYieldModule completed");

    // Link ReputationManager with ChainCircleCore
    console.log("\nLinking ReputationManager → ChainCircleCore...");
    tx = await reputationManager.setCircleCore(coreAddress);
    await tx.wait();
    console.log("✅ ReputationManager.setCircleCore completed");

    // Link ReputationManager with BadgeNFT
    console.log("\nLinking ReputationManager → BadgeNFT...");
    tx = await reputationManager.setBadgeNFT(badgeAddress);
    await tx.wait();
    console.log("✅ ReputationManager.setBadgeNFT completed");

    // Link BadgeNFT with ReputationManager
    console.log("\nLinking BadgeNFT → ReputationManager...");
    tx = await badgeNFT.setReputationManager(reputationAddress);
    await tx.wait();
    console.log("✅ BadgeNFT.setReputationManager completed");

    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer.address);
    console.log("\nContract Addresses:");
    console.log("-------------------");
    console.log("CUSD:              ", cusdAddress);
    console.log("MockYield:         ", yieldAddress);
    console.log("ReputationManager: ", reputationAddress);
    console.log("BadgeNFT:          ", badgeAddress);
    console.log("ChainCircleCore:   ", coreAddress);
    console.log("GovernanceModule:  ", governanceAddress);
    console.log("NameRegistry:      ", nameRegistryAddress);

    // Save deployment data
    console.log("\n" + "=".repeat(60));
    console.log("SAVING DEPLOYMENT DATA...");
    console.log("=".repeat(60));

    const deploymentData = {
        network: hre.network.name,
        chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber(),
        contracts: {
            CUSD: cusdAddress,
            MockYield: yieldAddress,
            ReputationManager: reputationAddress,
            BadgeNFT: badgeAddress,
            ChainCircleCore: coreAddress,
            GovernanceModule: governanceAddress,
            NameRegistry: nameRegistryAddress
        },
        links: {
            "ChainCircleCore → ReputationManager": "✅",
            "ChainCircleCore → MockYield": "✅",
            "ReputationManager → ChainCircleCore": "✅",
            "ReputationManager → BadgeNFT": "✅",
            "BadgeNFT → ReputationManager": "✅"
        }
    };

    // Create deployments directory structure
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const networkDir = path.join(deploymentsDir, hre.network.name);
    
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }
    if (!fs.existsSync(networkDir)) {
        fs.mkdirSync(networkDir);
    }

    // Save main deployment file
    const deploymentFile = path.join(networkDir, "deployment-addresses.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log("✅ Deployment data saved to:", deploymentFile);

    // Save a backup with timestamp
    const backupFile = path.join(
        networkDir, 
        `deployment-${Date.now()}.json`
    );
    fs.writeFileSync(backupFile, JSON.stringify(deploymentData, null, 2));
    console.log("✅ Backup saved to:", backupFile);

    // Save frontend-friendly format
    const frontendData = {
        CUSD_ADDRESS: cusdAddress,
        CHAIN_CIRCLE_CORE_ADDRESS: coreAddress,
        REPUTATION_MANAGER_ADDRESS: reputationAddress,
        BADGE_NFT_ADDRESS: badgeAddress,
        GOVERNANCE_MODULE_ADDRESS: governanceAddress,
        NAME_REGISTRY_ADDRESS: nameRegistryAddress,
        MOCK_YIELD_ADDRESS: yieldAddress,
        NETWORK: hre.network.name,
        CHAIN_ID: (await hre.ethers.provider.getNetwork()).chainId.toString()
    };

    const frontendFile = path.join(networkDir, "addresses.js");
    fs.writeFileSync(
        frontendFile,
        `// Auto-generated on ${new Date().toISOString()}\n` +
        `export const CONTRACT_ADDRESSES = ${JSON.stringify(frontendData, null, 2)};\n`
    );
    console.log("✅ Frontend addresses saved to:", frontendFile);

    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉");
    console.log("=".repeat(60));
    console.log("\nNext steps:");
    console.log("1. Verify contracts: npx hardhat run scripts/verify.js --network", hre.network.name);
    console.log("2. Test interactions: npx hardhat run scripts/interact.js --network", hre.network.name);
    console.log("3. Update frontend with addresses from:", frontendFile);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ DEPLOYMENT FAILED:");
        console.error(error);
        process.exit(1);
    });