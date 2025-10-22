const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Full Circle Integration Test", function () {
    let cusd, chainCircleCore, reputationManager, mockYield;
    let owner, user1, user2, user3;
    let circleId;

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
        await cusd.mint(await chainCircleCore.getAddress(), ethers.parseUnits("10000", 6));
    });

    it("Should complete full circle lifecycle", async function () {
        const amount = ethers.parseUnits("500", 6);

        await cusd.connect(user1).approve(await chainCircleCore.getAddress(), amount * 10n);
        const tx = await chainCircleCore.connect(user1).createCircle(
            "Dream Home Squad",
            0,
            amount,
            3,
            3,
            0
        );

        const receipt = await tx.wait();
        circleId = 1;

        let circle = await chainCircleCore.getCircleDetails(circleId);
        expect(circle.name).to.equal("Dream Home Squad");
        expect(circle.isActive).to.be.false;

        await cusd.connect(user2).approve(await chainCircleCore.getAddress(), amount * 10n);
        await chainCircleCore.connect(user2).joinCircle(circleId);

        await cusd.connect(user3).approve(await chainCircleCore.getAddress(), amount * 10n);
        await chainCircleCore.connect(user3).joinCircle(circleId);

        circle = await chainCircleCore.getCircleDetails(circleId);
        expect(circle.isActive).to.be.true;

        const activeCount = await chainCircleCore.getActiveCircleCount();
        expect(activeCount).to.equal(1);

        await time.increase(30 * 24 * 60 * 60);

        await chainCircleCore.connect(user1).contribute(circleId);
        await chainCircleCore.connect(user2).contribute(circleId);
        await chainCircleCore.connect(user3).contribute(circleId);

        circle = await chainCircleCore.getCircleDetails(circleId);
        expect(circle.currentRound).to.equal(2);

        await time.increase(30 * 24 * 60 * 60);

        await chainCircleCore.connect(user1).contribute(circleId);
        await chainCircleCore.connect(user2).contribute(circleId);
        await chainCircleCore.connect(user3).contribute(circleId);

        circle = await chainCircleCore.getCircleDetails(circleId);
        expect(circle.isActive).to.be.false;
        expect(circle.status).to.equal(2);

        const finalActiveCount = await chainCircleCore.getActiveCircleCount();
        expect(finalActiveCount).to.equal(0);

        const rep1 = await reputationManager.getUserReputation(user1.address);
        const rep2 = await reputationManager.getUserReputation(user2.address);
        const rep3 = await reputationManager.getUserReputation(user3.address);

        expect(rep1.circlesCompleted).to.equal(1);
        expect(rep2.circlesCompleted).to.equal(1);
        expect(rep3.circlesCompleted).to.equal(1);

        expect(rep1.score).to.be.gt(0);
        expect(rep2.score).to.be.gt(0);
        expect(rep3.score).to.be.gt(0);
    });

    it("Should track user contributions correctly", async function () {
        const amount = ethers.parseUnits("500", 6);

        await cusd.connect(user1).approve(await chainCircleCore.getAddress(), amount * 10n);
        await chainCircleCore.connect(user1).createCircle(
            "Test Circle",
            0,
            amount,
            3,
            3,
            0
        );

        circleId = 1;

        await cusd.connect(user2).approve(await chainCircleCore.getAddress(), amount * 10n);
        await chainCircleCore.connect(user2).joinCircle(circleId);

        await cusd.connect(user3).approve(await chainCircleCore.getAddress(), amount * 10n);
        await chainCircleCore.connect(user3).joinCircle(circleId);

        const totalContributions1 = await chainCircleCore.getUserTotalContributions(user1.address);
        expect(totalContributions1).to.equal(amount);

        const totalContributions2 = await chainCircleCore.getUserTotalContributions(user2.address);
        expect(totalContributions2).to.equal(amount);

        const totalContributions3 = await chainCircleCore.getUserTotalContributions(user3.address);
        expect(totalContributions3).to.equal(amount);
    });

    it("Should update total pooled correctly", async function () {
        const amount = ethers.parseUnits("500", 6);

        await cusd.connect(user1).approve(await chainCircleCore.getAddress(), amount * 10n);
        await chainCircleCore.connect(user1).createCircle(
            "Test Circle",
            0,
            amount,
            3,
            3,
            0
        );

        circleId = 1;

        let totalPooled = await chainCircleCore.getTotalPooled();
        expect(totalPooled).to.equal(amount);

        await cusd.connect(user2).approve(await chainCircleCore.getAddress(), amount * 10n);
        await chainCircleCore.connect(user2).joinCircle(circleId);

        totalPooled = await chainCircleCore.getTotalPooled();
        expect(totalPooled).to.equal(amount * 2n);

        await cusd.connect(user3).approve(await chainCircleCore.getAddress(), amount * 10n);
        await chainCircleCore.connect(user3).joinCircle(circleId);

        totalPooled = await chainCircleCore.getTotalPooled();
        expect(totalPooled).to.equal(amount * 3n);
    });
});