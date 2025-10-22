const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReputationManager", function () {
    let reputationManager, chainCircleCore, badgeNFT;
    let owner, user1, user2;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        const ReputationManager = await ethers.getContractFactory("ReputationManager");
        reputationManager = await ReputationManager.deploy();

        const BadgeNFT = await ethers.getContractFactory("BadgeNFT");
        badgeNFT = await BadgeNFT.deploy();

        const ChainCircleCore = await ethers.getContractFactory("ChainCircleCore");
        const CUSD = await ethers.getContractFactory("CUSD");
        const cusd = await CUSD.deploy();
        chainCircleCore = await ChainCircleCore.deploy(await cusd.getAddress());

        await reputationManager.setCircleCore(await chainCircleCore.getAddress());
        await reputationManager.setBadgeNFT(await badgeNFT.getAddress());
        await badgeNFT.setReputationManager(await reputationManager.getAddress());
    });

    describe("Initialization", function () {
        it("Should initialize user reputation", async function () {
            await reputationManager.initializeUser(user1.address);

            const reputation = await reputationManager.getUserReputation(user1.address);
            expect(reputation.score).to.equal(0);
            expect(reputation.tier).to.equal("None");
            expect(reputation.circlesCompleted).to.equal(0);
        });

        it("Should not reinitialize existing user", async function () {
            await reputationManager.initializeUser(user1.address);
            await reputationManager.initializeUser(user1.address);

            const reputation = await reputationManager.getUserReputation(user1.address);
            expect(reputation.score).to.equal(0);
        });
    });

    describe("On-Time Payments - NEW POINTS SYSTEM", function () {
        it("Should increase score by 15 for on-time payment", async function () {
            await reputationManager.connect(owner).setCircleCore(owner.address);

            await reputationManager.onDeposit(1, user1.address, true, ethers.parseUnits("500", 6));

            const reputation = await reputationManager.getUserReputation(user1.address);
            expect(reputation.score).to.equal(15); // NEW: 15 points
            expect(reputation.onTimeRate).to.equal(100);
        });

        it("Should decrease score by 75 for late payment", async function () {
            await reputationManager.connect(owner).setCircleCore(owner.address);

            // First make 10 on-time payments to build up score
            for (let i = 0; i < 10; i++) {
                await reputationManager.onDeposit(1, user1.address, true, ethers.parseUnits("500", 6));
            }

            const before = await reputationManager.getUserReputation(user1.address);
            const scoreBefore = before.score;

            await reputationManager.onDeposit(1, user1.address, false, ethers.parseUnits("500", 6));

            const after = await reputationManager.getUserReputation(user1.address);
            expect(after.score).to.equal(scoreBefore - 75n); // NEW: -75 penalty
        });

        it("Should award streak bonus every 5 payments", async function () {
            await reputationManager.connect(owner).setCircleCore(owner.address);

            // Make 5 on-time payments
            for (let i = 0; i < 5; i++) {
                await reputationManager.onDeposit(1, user1.address, true, ethers.parseUnits("500", 6));
            }

            const reputation = await reputationManager.getUserReputation(user1.address);
            // 15 * 5 = 75 + 50 (streak bonus) = 125
            expect(reputation.score).to.equal(125);
            expect(reputation.longestStreak).to.equal(5);
        });

        it("Should reset streak on missed payment", async function () {
            await reputationManager.connect(owner).setCircleCore(owner.address);

            // Make 3 on-time payments
            for (let i = 0; i < 3; i++) {
                await reputationManager.onDeposit(1, user1.address, true, ethers.parseUnits("500", 6));
            }

            // Miss one
            await reputationManager.onDeposit(1, user1.address, false, ethers.parseUnits("500", 6));

            const stats = await reputationManager.getDetailedStats(user1.address);
            expect(stats.currentStreak).to.equal(0);
        });

        it("Should track total contributions", async function () {
            await reputationManager.connect(owner).setCircleCore(owner.address);

            const amount = ethers.parseUnits("500", 6);
            await reputationManager.onDeposit(1, user1.address, true, amount);
            await reputationManager.onDeposit(1, user1.address, true, amount);

            const reputation = await reputationManager.getUserReputation(user1.address);
            expect(reputation.totalSaved).to.equal(amount * 2n);
        });
    });

    describe("Circle Completion", function () {
        it("Should increase score by 250 on completion", async function () {
            await reputationManager.connect(owner).setCircleCore(owner.address);

            const initialReputation = await reputationManager.getUserReputation(user1.address);
            const initialScore = initialReputation.score;

            await reputationManager.onCompleted(user1.address, 1);

            const finalReputation = await reputationManager.getUserReputation(user1.address);
            expect(finalReputation.score).to.equal(initialScore + 250n); // NEW: 250 points
            expect(finalReputation.circlesCompleted).to.equal(1);
        });

        it("Should award subsequent cycle bonus", async function () {
            await reputationManager.connect(owner).setCircleCore(owner.address);

            await reputationManager.onCompleted(user1.address, 1);
            const after1 = await reputationManager.getUserReputation(user1.address);

            await reputationManager.onCompleted(user1.address, 2);
            const after2 = await reputationManager.getUserReputation(user1.address);

            // Second completion: 250 + 100 (subsequent bonus)
            expect(after2.score).to.equal(after1.score + 350n);
        });

        it("Should emit tier change event when crossing threshold", async function () {
            await reputationManager.connect(owner).setCircleCore(owner.address);

            // Complete 3 circles to get to 750+ (Bronze → Silver → Gold)
            for (let i = 0; i < 3; i++) {
                await reputationManager.onCompleted(user1.address, i);
            }

            const reputation = await reputationManager.getUserReputation(user1.address);
            expect(reputation.tier).to.equal("Gold"); // 250 * 3 = 750
        });
    });

    describe("Payout Received", function () {
        it("Should award 25 points for payout received", async function () {
            await reputationManager.connect(owner).setCircleCore(owner.address);

            await reputationManager.onPayoutReceived(user1.address, ethers.parseUnits("100", 6));

            const reputation = await reputationManager.getUserReputation(user1.address);
            expect(reputation.score).to.equal(25);
        });
    });

    describe("Tier System - NEW THRESHOLDS", function () {
        it("Should return correct tier for score", async function () {
            expect(await reputationManager.getTier(0)).to.equal("None");
            expect(await reputationManager.getTier(499)).to.equal("None");
            expect(await reputationManager.getTier(500)).to.equal("Bronze"); // NEW
            expect(await reputationManager.getTier(699)).to.equal("Bronze");
            expect(await reputationManager.getTier(700)).to.equal("Silver"); // NEW
            expect(await reputationManager.getTier(849)).to.equal("Silver");
            expect(await reputationManager.getTier(850)).to.equal("Gold"); // NEW
            expect(await reputationManager.getTier(1000)).to.equal("Gold");
        });
    });

    describe("Voting Rights", function () {
        it("Should require Silver+ and 2 completed circles to vote", async function () {
            await reputationManager.connect(owner).setCircleCore(owner.address);

            // Not eligible yet
            expect(await reputationManager.canVote(user1.address)).to.be.false;

            // Complete 2 circles (500 points)
            await reputationManager.onCompleted(user1.address, 1);
            await reputationManager.onCompleted(user1.address, 2);

            // Still not eligible (only 500 points, need 700+ for Silver)
            expect(await reputationManager.canVote(user1.address)).to.be.false;

            // Complete one more circle (750 points)
            await reputationManager.onCompleted(user1.address, 3);

            // Now eligible (750+ points = Silver, 3 completed circles >= 2)
            expect(await reputationManager.canVote(user1.address)).to.be.true;
        });
    });

    describe("Access Control", function () {
        it("Should only allow circle core to record deposits", async function () {
            await expect(
                reputationManager.connect(user1).onDeposit(1, user2.address, true, ethers.parseUnits("500", 6))
            ).to.be.revertedWith("Only CircleCore");
        });

        it("Should only allow circle core to record completions", async function () {
            await expect(
                reputationManager.connect(user1).onCompleted(user2.address, 1)
            ).to.be.revertedWith("Only CircleCore");
        });

        it("Should only allow owner to set circle core", async function () {
            await expect(
                reputationManager.connect(user1).setCircleCore(user2.address)
            ).to.be.reverted;
        });
    });

    describe("On-Time Rate Calculation", function () {
        it("Should calculate on-time rate correctly", async function () {
            await reputationManager.connect(owner).setCircleCore(owner.address);

            await reputationManager.onDeposit(1, user1.address, true, ethers.parseUnits("500", 6));
            await reputationManager.onDeposit(1, user1.address, true, ethers.parseUnits("500", 6));
            await reputationManager.onDeposit(1, user1.address, false, ethers.parseUnits("500", 6));
            await reputationManager.onDeposit(1, user1.address, true, ethers.parseUnits("500", 6));

            const onTimeRate = await reputationManager.getOnTimeRate(user1.address);
            expect(onTimeRate).to.equal(75);
        });

        it("Should return 0 for users with no payments", async function () {
            const onTimeRate = await reputationManager.getOnTimeRate(user1.address);
            expect(onTimeRate).to.equal(0);
        });
    });

    describe("Detailed Stats", function () {
        it("Should return detailed statistics", async function () {
            await reputationManager.connect(owner).setCircleCore(owner.address);

            await reputationManager.onDeposit(1, user1.address, true, ethers.parseUnits("500", 6));
            await reputationManager.onDeposit(1, user1.address, false, ethers.parseUnits("500", 6));
            await reputationManager.onPayoutReceived(user1.address, ethers.parseUnits("50", 6));

            const stats = await reputationManager.getDetailedStats(user1.address);
            expect(stats.currentStreak).to.equal(0); // Reset by missed payment
            expect(stats.missedPayments).to.equal(1);
            expect(stats.totalInterestEarned).to.equal(ethers.parseUnits("50", 6));
        });
    });
});