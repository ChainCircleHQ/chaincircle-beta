const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("=".repeat(60));
    console.log("VERIFYING CONTRACTS ON PUSH CHAIN EXPLORER");
    console.log("=".repeat(60));

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
        console.error("Please run deployment first: npx hardhat run scripts/deploy.js --network", hre.network.name);
        process.exit(1);
    }

    const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    console.log("\nNetwork:", deploymentData.network);
    console.log("Deployed at:", deploymentData.timestamp);
    console.log("\nStarting verification...\n");

    const verificationResults = {
        network: hre.network.name,
        timestamp: new Date().toISOString(),
        results: {}
    };

    // 1. Verify CUSD
    try {
        console.log("1. Verifying CUSD...");
        await hre.run("verify:verify", {
            address: deploymentData.contracts.CUSD,
            constructorArguments: [],
        });
        console.log("✅ CUSD verified\n");
        verificationResults.results.CUSD = "verified";
    } catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("✅ CUSD already verified\n");
            verificationResults.results.CUSD = "already verified";
        } else {
            console.log("❌ CUSD verification failed:", error.message, "\n");
            verificationResults.results.CUSD = `failed: ${error.message}`;
        }
    }

    // 2. Verify MockYield
    try {
        console.log("2. Verifying MockYield...");
        await hre.run("verify:verify", {
            address: deploymentData.contracts.MockYield,
            constructorArguments: [],
        });
        console.log("✅ MockYield verified\n");
        verificationResults.results.MockYield = "verified";
    } catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("✅ MockYield already verified\n");
            verificationResults.results.MockYield = "already verified";
        } else {
            console.log("❌ MockYield verification failed:", error.message, "\n");
            verificationResults.results.MockYield = `failed: ${error.message}`;
        }
    }

    // 3. Verify ReputationManager
    try {
        console.log("3. Verifying ReputationManager...");
        await hre.run("verify:verify", {
            address: deploymentData.contracts.ReputationManager,
            constructorArguments: [],
        });
        console.log("✅ ReputationManager verified\n");
        verificationResults.results.ReputationManager = "verified";
    } catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("✅ ReputationManager already verified\n");
            verificationResults.results.ReputationManager = "already verified";
        } else {
            console.log("❌ ReputationManager verification failed:", error.message, "\n");
            verificationResults.results.ReputationManager = `failed: ${error.message}`;
        }
    }

    // 4. Verify BadgeNFT
    try {
        console.log("4. Verifying BadgeNFT...");
        await hre.run("verify:verify", {
            address: deploymentData.contracts.BadgeNFT,
            constructorArguments: [],
        });
        console.log("✅ BadgeNFT verified\n");
        verificationResults.results.BadgeNFT = "verified";
    } catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("✅ BadgeNFT already verified\n");
            verificationResults.results.BadgeNFT = "already verified";
        } else {
            console.log("❌ BadgeNFT verification failed:", error.message, "\n");
            verificationResults.results.BadgeNFT = `failed: ${error.message}`;
        }
    }

    // 5. Verify ChainCircleCore
    try {
        console.log("5. Verifying ChainCircleCore...");
        await hre.run("verify:verify", {
            address: deploymentData.contracts.ChainCircleCore,
            constructorArguments: [deploymentData.contracts.CUSD],
        });
        console.log("✅ ChainCircleCore verified\n");
        verificationResults.results.ChainCircleCore = "verified";
    } catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("✅ ChainCircleCore already verified\n");
            verificationResults.results.ChainCircleCore = "already verified";
        } else {
            console.log("❌ ChainCircleCore verification failed:", error.message, "\n");
            verificationResults.results.ChainCircleCore = `failed: ${error.message}`;
        }
    }

    // 6. Verify GovernanceModule
    try {
        console.log("6. Verifying GovernanceModule...");
        await hre.run("verify:verify", {
            address: deploymentData.contracts.GovernanceModule,
            constructorArguments: [deploymentData.contracts.ChainCircleCore],
        });
        console.log("✅ GovernanceModule verified\n");
        verificationResults.results.GovernanceModule = "verified";
    } catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("✅ GovernanceModule already verified\n");
            verificationResults.results.GovernanceModule = "already verified";
        } else {
            console.log("❌ GovernanceModule verification failed:", error.message, "\n");
            verificationResults.results.GovernanceModule = `failed: ${error.message}`;
        }
    }

    // 7. Verify NameRegistry
    try {
        console.log("7. Verifying NameRegistry...");
        await hre.run("verify:verify", {
            address: deploymentData.contracts.NameRegistry,
            constructorArguments: [],
        });
        console.log("✅ NameRegistry verified\n");
        verificationResults.results.NameRegistry = "verified";
    } catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("✅ NameRegistry already verified\n");
            verificationResults.results.NameRegistry = "already verified";
        } else {
            console.log("❌ NameRegistry verification failed:", error.message, "\n");
            verificationResults.results.NameRegistry = `failed: ${error.message}`;
        }
    }

    // Save verification results
    const verificationFile = path.join(
        __dirname,
        "..",
        "deployments",
        hre.network.name,
        "verification-results.json"
    );
    fs.writeFileSync(verificationFile, JSON.stringify(verificationResults, null, 2));

    console.log("=".repeat(60));
    console.log("VERIFICATION SUMMARY");
    console.log("=".repeat(60));
    Object.entries(verificationResults.results).forEach(([contract, status]) => {
        const icon = status.includes("verified") ? "✅" : "❌";
        console.log(`${icon} ${contract}: ${status}`);
    });
    console.log("\nResults saved to:", verificationFile);
    console.log("\nView contracts on Push Chain Explorer:");
    console.log("https://donut.push.network");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ VERIFICATION FAILED:");
        console.error(error);
        process.exit(1);
    });