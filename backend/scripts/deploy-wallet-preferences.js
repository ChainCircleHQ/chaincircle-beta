const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying WalletPreferences with account:", deployer.address);
    console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

    // Deploy WalletPreferences
    console.log("\nDeploying WalletPreferences...");
    const WalletPreferences = await hre.ethers.getContractFactory("WalletPreferences");
    const walletPreferences = await WalletPreferences.deploy();
    await walletPreferences.waitForDeployment();
    const walletPreferencesAddress = await walletPreferences.getAddress();
    console.log("✅ WalletPreferences deployed to:", walletPreferencesAddress);

    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer.address);
    console.log("Contract:", walletPreferencesAddress);

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
        contract: {
            WalletPreferences: walletPreferencesAddress
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

    // Load existing deployment data
    const existingDeploymentFile = path.join(networkDir, "deployment-addresses.json");
    let allContracts = {};
    
    if (fs.existsSync(existingDeploymentFile)) {
        const existingData = JSON.parse(fs.readFileSync(existingDeploymentFile, 'utf8'));
        allContracts = { ...existingData.contracts, ...deploymentData.contract };
    } else {
        allContracts = deploymentData.contract;
    }

    // Save updated deployment file
    const updatedDeploymentData = {
        network: hre.network.name,
        chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
        deployer: deployer.address,
        timestamp: deploymentData.timestamp,
        blockNumber: await hre.ethers.provider.getBlockNumber(),
        contracts: allContracts
    };

    // Save main deployment file with WalletPreferences added
    fs.writeFileSync(existingDeploymentFile, JSON.stringify(updatedDeploymentData, null, 2));
    console.log("✅ Updated deployment data saved to:", existingDeploymentFile);

    // Save a backup with timestamp
    const backupFile = path.join(
        networkDir, 
        `wallet-preferences-${Date.now()}.json`
    );
    fs.writeFileSync(backupFile, JSON.stringify(deploymentData, null, 2));
    console.log("✅ Backup saved to:", backupFile);

    // Update frontend addresses file
    const frontendFile = path.join(networkDir, "addresses.js");
    if (fs.existsSync(frontendFile)) {
        const addressesContent = fs.readFileSync(frontendFile, 'utf8');
        
        // Extract the address data by removing JS syntax
        const match = addressesContent.match(/export const CONTRACT_ADDRESSES = ({[\s\S]*});/);
        if (match) {
            const frontendData = JSON.parse(match[1]);
            frontendData.WALLET_PREFERENCES_ADDRESS = walletPreferencesAddress;
            
            fs.writeFileSync(
                frontendFile,
                `// Auto-generated on ${new Date().toISOString()}\n` +
                `export const CONTRACT_ADDRESSES = ${JSON.stringify(frontendData, null, 2)};\n`
            );
            console.log("✅ Frontend addresses updated:", frontendFile);
        } else {
            console.log("⚠️ Could not parse existing addresses.js");
        }
    } else {
        console.log("⚠️ Frontend addresses file not found. Create it with full deploy first.");
    }

    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉");
    console.log("=".repeat(60));
    console.log("\nNext steps:");
    console.log("1. Update frontend constants with:", walletPreferencesAddress);
    console.log("2. Update backend/utils/constants.js");
    console.log("3. Create ABI file for frontend");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ DEPLOYMENT FAILED:");
        console.error(error);
        process.exit(1);
    });

