const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChainCircleCore", function () {
    let cusd, chainCircleCore, reputationManager, mockYield;
    let owner, user1, user2, user3;

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();

        const CUSD = await ethers.getContractFactory("CUSD");
        cusd = await CUSD.deploy();

        const ReputationManager = await ethers.getContractFactory("ReputationManager");
        reputationManager = await ReputationManager.deploy();

        const MockYield = await ethers.getContractFactory("MockYield");
        mockYield = await MockYield.deploy();

        const ChainCircleCore = await ethers.getContractFactory("ChainCircleCore");
        chainCircleCore = await ChainCircleCore.deploy(await cusd.getAddress());

        await chainCircleCore.setReputationManager(await reputationManager.getAddress());
        await chainCircleCore.setYieldModule(await mockYield.getAddress());
        await reputationManager.setCircleCore(await chainCircleCore.getAddress());

        await cusd.mint(user1.address, ethers.parseUnits("10000", 6));
        await cusd.mint(user2.address, ethers.parseUnits("10000", 6));
        await cusd.mint(user3.address, ethers.parseUnits("10000", 6));
    });

    describe("Circle Creation", function () {
        it("Should create a circle successfully", async function () {
            const amount = ethers.parseUnits("500", 6);
            
            await cusd.connect(user1).approve(await chainCircleCore.getAddress(), amount);

            const tx = await chainCircleCore.connect(user1).createCircle(
                "Test Circle",
                0,
                amount,
                6,
                3,
                0
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return chainCircleCore.interface.parseLog(log).name === "CircleCreated";
                } catch (e) {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
        });

        it("Should set circle icon based on goal type", async function () {
            const amount = ethers.parseUnits("500", 6);
            await cusd.connect(user1).approve(await chainCircleCore.getAddress(), amount);

            await chainCircleCore.connect(user1).createCircle(
                "Home Circle",
                0, // HOME
                amount,
                6,
                3,
                0
            );

            const icon = await chainCircleCore.circleIcons(1);
            expect(icon).to.equal("home");
        });

        it("Should reject invalid duration", async function () {
            const amount = ethers.parseUnits("500", 6);

            await expect(
                chainCircleCore.connect(user1).createCircle(
                    "Test Circle",
                    0,
                    amount,
                    2,
                    3,
                    0
                )
            ).to.be.revertedWith("Invalid duration");
        });

        it("Should reject invalid max members", async function () {
            const amount = ethers.parseUnits("500", 6);

            await expect(
                chainCircleCore.connect(user1).createCircle(
                    "Test Circle",
                    0,
                    amount,
                    6,
                    2,
                    0
                )
            ).to.be.revertedWith("Invalid max members");
        });

        it("Should reject amount below minimum", async function () {
            const amount = ethers.parseUnits("50", 6);

            await expect(
                chainCircleCore.connect(user1).createCircle(
                    "Test Circle",
                    0,
                    amount,
                    6,
                    3,
                    0
                )
            ).to.be.revertedWith("Minimum 100 CUSD");
        });
    });

    describe("Joining Circles", function () {
        let circleId;

        beforeEach(async function () {
            const amount = ethers.parseUnits("500", 6);
            await cusd.connect(user1).approve(await chainCircleCore.getAddress(), amount);
            
            await chainCircleCore.connect(user1).createCircle(
                "Test Circle",
                0,
                amount,
                6,
                3,
                0
            );

            circleId = 1;
        });

        it("Should allow users to join circle", async function () {
            const amount = ethers.parseUnits("500", 6);
            await cusd.connect(user2).approve(await chainCircleCore.getAddress(), amount);

            await expect(chainCircleCore.connect(user2).joinCircle(circleId))
                .to.emit(chainCircleCore, "MemberJoined");
        });

        it("Should log activity when joining", async function () {
            const amount = ethers.parseUnits("500", 6);
            await cusd.connect(user2).approve(await chainCircleCore.getAddress(), amount);
            await chainCircleCore.connect(user2).joinCircle(circleId);

            const activity = await chainCircleCore.getRecentActivity(user2.address, 1);
            expect(activity.length).to.equal(1);
            expect(activity[0].activityType).to.equal("CONTRIBUTE");
        });

        it("Should activate circle when full", async function () {
            const amount = ethers.parseUnits("500", 6);
            
            await cusd.connect(user2).approve(await chainCircleCore.getAddress(), amount);
            await chainCircleCore.connect(user2).joinCircle(circleId);

            await cusd.connect(user3).approve(await chainCircleCore.getAddress(), amount);
            await chainCircleCore.connect(user3).joinCircle(circleId);

            const circle = await chainCircleCore.getCircleDetails(circleId);
            expect(circle.isActive).to.be.true;
        });

        it("Should reject joining full circle", async function () {
            const amount = ethers.parseUnits("500", 6);
            
            await cusd.connect(user2).approve(await chainCircleCore.getAddress(), amount);
            await chainCircleCore.connect(user2).joinCircle(circleId);

            await cusd.connect(user3).approve(await chainCircleCore.getAddress(), amount);
            await chainCircleCore.connect(user3).joinCircle(circleId);

            const circle = await chainCircleCore.getCircleDetails(circleId);
            expect(circle.status).to.equal(1);

            const [, , , , user4] = await ethers.getSigners();
            await cusd.mint(user4.address, ethers.parseUnits("10000", 6));
            await cusd.connect(user4).approve(await chainCircleCore.getAddress(), amount);

            await expect(
                chainCircleCore.connect(user4).joinCircle(circleId)
            ).to.be.revertedWith("Circle not open");
        });
    });

    describe("New Features", function () {
        let circleId;

        beforeEach(async function () {
            const amount = ethers.parseUnits("500", 6);
            await cusd.connect(user1).approve(await chainCircleCore.getAddress(), amount * 3n);
            
            await chainCircleCore.connect(user1).createCircle(
                "Test Circle",
                0,
                amount,
                3,
                3,
                0
            );
            circleId = 1;

            await cusd.connect(user2).approve(await chainCircleCore.getAddress(), amount * 3n);
            await chainCircleCore.connect(user2).joinCircle(circleId);

            await cusd.connect(user3).approve(await chainCircleCore.getAddress(), amount * 3n);
            await chainCircleCore.connect(user3).joinCircle(circleId);
        });

        it("Should get circle progress", async function () {
            const progress = await chainCircleCore.getCircleProgress(circleId);
            expect(progress.percentage).to.equal(0); // Not started yet
            expect(progress.circleName).to.equal("Test Circle");
            expect(progress.icon).to.equal("home");
        });

        it("Should return user payout history", async function () {
            const history = await chainCircleCore.getUserPayoutHistory(user1.address);
            expect(history.circleIds.length).to.equal(0); // No payouts yet
        });

        it("Should return upcoming payouts", async function () {
            const upcoming = await chainCircleCore.getUserUpcomingPayouts(user1.address);
            expect(upcoming.circleIds.length).to.be.gt(0);
        });
    });

    describe("View Functions", function () {
        it("Should return total pooled amount", async function () {
            const total = await chainCircleCore.getTotalPooled();
            expect(total).to.equal(0);
        });

        it("Should return active circle count", async function () {
            const count = await chainCircleCore.getActiveCircleCount();
            expect(count).to.equal(0);
        });

        it("Should return user circles", async function () {
            const circles = await chainCircleCore.getUserCircles(user1.address);
            expect(circles.length).to.equal(0);
        });
    });
});