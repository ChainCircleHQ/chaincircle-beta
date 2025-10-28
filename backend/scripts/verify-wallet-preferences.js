const hre = require("hardhat");

async function main() {
    console.log("=".repeat(60));
    console.log("VERIFYING WALLETPREFERENCES CONTRACT");
    console.log("=".repeat(60));

    const fs = require("fs");
    const path = require("path");

    // Load deployment data
    const deploymentFile = path.join(
        __dirname,
        "..",
        "deployments",
        hre.network.name,
        "deployment-addresses.json"
    );

    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ Deployment file not found:", deploymentFile);
        process.exit(1);
    }

    const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const walletPreferencesAddress = deploymentData.contracts.WalletPreferences;

    if (!walletPreferencesAddress) {
        console.error("❌ WalletPreferences address not found in deployment data");
        process.exit(1);
    }

    console.log("Network:", hre.network.name);
    console.log("WalletPreferences Address:", walletPreferencesAddress);
    console.log("Starting verification...\n");

    try {
        await hre.run("verify:verify", {
            address: walletPreferencesAddress,
            constructorArguments: [],
        });
        console.log("\n✅ WalletPreferences verified successfully!");
        console.log(`View contract: https://donut.push.network/address/${walletPreferencesAddress}#code`);
    } catch (error) {
        if (error.message.includes("Already Verified") || error.message.includes("already verified")) {
            console.log("\n✅ WalletPreferences already verified");
            console.log(`View contract: https://donut.push.network/address/${walletPreferencesAddress}#code`);
        } else {
            console.error("\n❌ Verification failed:", error.message);
            process.exit(1);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

