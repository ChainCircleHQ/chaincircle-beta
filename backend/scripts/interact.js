const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("=".repeat(60));
    console.log("INTERACTING WITH CHAINCIRCLE CONTRACTS");
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
        process.exit(1);
    }

    const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const [signer] = await hre.ethers.getSigners();

    console.log("\nNetwork:", deploymentData.network);
    console.log("Account:", signer.address);
    console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(signer.address)), "PC\n");

    // Get contract instances
    const cusd = await hre.ethers.getContractAt("CUSD", deploymentData.contracts.CUSD);
    const chainCircleCore = await hre.ethers.getContractAt("ChainCircleCore", deploymentData.contracts.ChainCircleCore);
    const reputationManager = await hre.ethers.getContractAt("ReputationManager", deploymentData.contracts.ReputationManager);
    const badgeNFT = await hre.ethers.getContractAt("BadgeNFT", deploymentData.contracts.BadgeNFT);
    const nameRegistry = await hre.ethers.getContractAt("NameRegistry", deploymentData.contracts.NameRegistry);

    console.log("=".repeat(60));
    console.log("CUSD TOKEN INFO");
    console.log("=".repeat(60));
    const cusdBalance = await cusd.balanceOf(signer.address);
    console.log("Your CUSD Balance:", hre.ethers.formatUnits(cusdBalance, 6), "CUSD");
    
    const timeUntilClaim = await cusd.getTimeUntilNextClaim(signer.address);
    if (timeUntilClaim === 0n) {
        console.log("Faucet Status: ✅ Available to claim");
    } else {
        const hours = Number(timeUntilClaim) / 3600;
        console.log(`Faucet Status: ⏳ Available in ${hours.toFixed(2)} hours`);
    }

    console.log("\n=".repeat(60));
    console.log("GLOBAL STATISTICS");
    console.log("=".repeat(60));
    
    const totalPooled = await chainCircleCore.getTotalPooled();
    console.log("Total Pooled:", hre.ethers.formatUnits(totalPooled, 6), "CUSD");
    
    const activeCircles = await chainCircleCore.getActiveCircleCount();
    console.log("Active Circles:", activeCircles.toString());
    
    const circleCounter = await chainCircleCore.circleCounter();
    console.log("Total Circles Created:", circleCounter.toString());

    console.log("\n=".repeat(60));
    console.log("YOUR CIRCLES");
    console.log("=".repeat(60));
    
    const userCircles = await chainCircleCore.getUserCircles(signer.address);
    console.log("Circles Joined:", userCircles.length);

    if (userCircles.length > 0) {
        console.log("\nCircle Details:");
        for (let i = 0; i < userCircles.length; i++) {
            const circleId = userCircles[i];
            const circle = await chainCircleCore.getCircleDetails(circleId);
            console.log(`\n  Circle #${circleId}:`);
            console.log(`    Name: ${circle.name}`);
            console.log(`    Amount: ${hre.ethers.formatUnits(circle.amount, 6)} CUSD`);
            console.log(`    Duration: ${circle.duration} months`);
            console.log(`    Current Round: ${circle.currentRound}/${circle.duration}`);
            console.log(`    Members: ${circle.maxMembers}`);
            console.log(`    Status: ${circle.isActive ? "Active" : "Inactive"}`);
            console.log(`    Icon: ${await chainCircleCore.circleIcons(circleId)}`);
        }
    }

    console.log("\n=".repeat(60));
    console.log("YOUR CONTRIBUTIONS");
    console.log("=".repeat(60));
    
    const totalContributions = await chainCircleCore.getUserTotalContributions(signer.address);
    console.log("Total Saved:", hre.ethers.formatUnits(totalContributions, 6), "CUSD");
    
    const activeUserCircles = await chainCircleCore.getUserActiveCircleCount(signer.address);
    console.log("Active Circles:", activeUserCircles.toString());
    
    const totalInterest = await chainCircleCore.getUserTotalInterest(signer.address);
    console.log("Total Interest Earned:", hre.ethers.formatUnits(totalInterest, 6), "CUSD");

    console.log("\n=".repeat(60));
    console.log("RECENT ACTIVITY");
    console.log("=".repeat(60));
    
    const recentActivity = await chainCircleCore.getRecentActivity(signer.address, 5);
    if (recentActivity.length > 0) {
        console.log(`Last ${recentActivity.length} activities:`);
        recentActivity.forEach((activity, index) => {
            const date = new Date(Number(activity.timestamp) * 1000);
            console.log(`\n  ${index + 1}. ${activity.activityType}`);
            console.log(`     Amount: ${hre.ethers.formatUnits(activity.amount, 6)} CUSD`);
            console.log(`     Circle ID: ${activity.circleId}`);
            console.log(`     Date: ${date.toLocaleString()}`);
        });
    } else {
        console.log("No activity yet");
    }

    console.log("\n=".repeat(60));
    console.log("YOUR REPUTATION");
    console.log("=".repeat(60));
    
    const reputation = await reputationManager.getUserReputation(signer.address);
    console.log("Score:", reputation.score.toString());
    console.log("Tier:", reputation.tier);
    console.log("Circles Completed:", reputation.circlesCompleted.toString());
    console.log("On-Time Rate:", reputation.onTimeRate.toString(), "%");
    console.log("Total Saved:", hre.ethers.formatUnits(reputation.totalSaved, 6), "CUSD");
    console.log("Longest Streak:", reputation.longestStreak.toString());
    
    const accountAge = Number(reputation.accountAge);
    if (accountAge > 0) {
        const days = accountAge / 86400;
        console.log("Account Age:", days.toFixed(1), "days");
    }

    const detailedStats = await reputationManager.getDetailedStats(signer.address);
    console.log("\nDetailed Stats:");
    console.log("  Current Streak:", detailedStats.currentStreak.toString());
    console.log("  Missed Payments:", detailedStats.missedPayments.toString());
    console.log("  Interest Earned:", hre.ethers.formatUnits(detailedStats.totalInterestEarned, 6), "CUSD");
    console.log("  Subsequent Cycles:", detailedStats.subsequentCycles.toString());

    const canVote = await reputationManager.canVote(signer.address);
    console.log("\nGovernance Rights:", canVote ? "✅ Can vote" : "❌ Cannot vote (need Silver+ & 2 completed circles)");

    console.log("\n=".repeat(60));
    console.log("YOUR BADGE");
    console.log("=".repeat(60));
    
    try {
        const badge = await badgeNFT.getUserBadge(signer.address);
        if (badge.tokenId > 0) {
            console.log("Badge Token ID:", badge.tokenId.toString());
            console.log("Badge Tier:", badge.tier);
        } else {
            console.log("No badge minted yet");
        }
    } catch (error) {
        console.log("No badge minted yet");
    }

    console.log("\n=".repeat(60));
    console.log("YOUR PAYOUTS");
    console.log("=".repeat(60));
    
    const payoutHistory = await chainCircleCore.getUserPayoutHistory(signer.address);
    if (payoutHistory.circleIds.length > 0) {
        console.log(`Total Payouts Received: ${payoutHistory.circleIds.length}`);
        payoutHistory.circleIds.forEach((circleId, index) => {
            const date = new Date(Number(payoutHistory.dates[index]) * 1000);
            console.log(`\n  Payout #${index + 1}:`);
            console.log(`    Circle: ${payoutHistory.circleNames[index]}`);
            console.log(`    Amount: ${hre.ethers.formatUnits(payoutHistory.amounts[index], 6)} CUSD`);
            console.log(`    Date: ${date.toLocaleDateString()}`);
            console.log(`    Claimed: ${payoutHistory.claimed[index] ? "Yes" : "No"}`);
        });
    } else {
        console.log("No payouts received yet");
    }

    const upcomingPayouts = await chainCircleCore.getUserUpcomingPayouts(signer.address);
    if (upcomingPayouts.circleIds.length > 0) {
        console.log(`\nUpcoming Payouts: ${upcomingPayouts.circleIds.length}`);
        upcomingPayouts.circleIds.forEach((circleId, index) => {
            const date = new Date(Number(upcomingPayouts.estimatedDates[index]) * 1000);
            console.log(`\n  Upcoming #${index + 1}:`);
            console.log(`    Circle: ${upcomingPayouts.circleNames[index]}`);
            console.log(`    Estimated Date: ${date.toLocaleDateString()}`);
        });
    } else {
        console.log("\nNo upcoming payouts");
    }

    console.log("\n=".repeat(60));
    console.log("DISPLAY NAME");
    console.log("=".repeat(60));
    
    const hasName = await nameRegistry.hasName(signer.address);
    if (hasName) {
        const name = await nameRegistry.getName(signer.address);
        console.log("Your Display Name:", name);
    } else {
        console.log("No display name set");
    }

    console.log("\n=".repeat(60));
    console.log("CONTRACT ADDRESSES");
    console.log("=".repeat(60));
    console.log("CUSD:", deploymentData.contracts.CUSD);
    console.log("ChainCircleCore:", deploymentData.contracts.ChainCircleCore);
    console.log("ReputationManager:", deploymentData.contracts.ReputationManager);
    console.log("BadgeNFT:", deploymentData.contracts.BadgeNFT);
    console.log("GovernanceModule:", deploymentData.contracts.GovernanceModule);
    console.log("NameRegistry:", deploymentData.contracts.NameRegistry);
    console.log("MockYield:", deploymentData.contracts.MockYield);

    console.log("\n=".repeat(60));
    console.log("EXPLORER LINKS");
    console.log("=".repeat(60));
    console.log("View on Push Chain Explorer:");
    console.log(`https://donut.push.network/address/${deploymentData.contracts.ChainCircleCore}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ INTERACTION FAILED:");
        console.error(error);
        process.exit(1);
    });