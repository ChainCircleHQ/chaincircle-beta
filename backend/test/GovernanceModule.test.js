const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("GovernanceModule", function () {
    let cusd, chainCircleCore, governanceModule;
    let owner, user1, user2, user3;
    let circleId;

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();

        const CUSD = await ethers.getContractFactory("CUSD");
        cusd = await CUSD.deploy();

        const ChainCircleCore = await ethers.getContractFactory("ChainCircleCore");
        chainCircleCore = await ChainCircleCore.deploy(await cusd.getAddress());

        const GovernanceModule = await ethers.getContractFactory("GovernanceModule");
        governanceModule = await GovernanceModule.deploy(await chainCircleCore.getAddress());

        await cusd.mint(user1.address, ethers.parseUnits("10000", 6));
        await cusd.mint(user2.address, ethers.parseUnits("10000", 6));
        await cusd.mint(user3.address, ethers.parseUnits("10000", 6));

        const amount = ethers.parseUnits("500", 6);
        await cusd.connect(user1).approve(await chainCircleCore.getAddress(), amount * 10n);
        await chainCircleCore.connect(user1).createCircle("Test Circle", 0, amount, 3, 3, 0);

        circleId = 1;

        await cusd.connect(user2).approve(await chainCircleCore.getAddress(), amount * 10n);
        await chainCircleCore.connect(user2).joinCircle(circleId);

        await cusd.connect(user3).approve(await chainCircleCore.getAddress(), amount * 10n);
        await chainCircleCore.connect(user3).joinCircle(circleId);
    });

    describe("Proposal Creation", function () {
        it("Should allow circle member to create proposal", async function () {
            const tx = await governanceModule.connect(user1).proposeEarlyWithdrawal(
                circleId,
                user2.address,
                "Emergency withdrawal needed",
                7 * 24 * 60 * 60
            );

            await expect(tx).to.emit(governanceModule, "ProposalCreated");
        });

        it("Should allow anyone to create proposal", async function () {
            const [, , , , nonMember] = await ethers.getSigners();

            const tx = await governanceModule.connect(nonMember).proposeEarlyWithdrawal(
                circleId,
                user2.address,
                "Emergency withdrawal needed",
                7 * 24 * 60 * 60
            );

            await expect(tx).to.emit(governanceModule, "ProposalCreated");
        });

        it("Should reject invalid duration", async function () {
            await expect(
                governanceModule.connect(user1).proposeEarlyWithdrawal(
                    circleId,
                    user2.address,
                    "Emergency withdrawal needed",
                    8 * 24 * 60 * 60
                )
            ).to.be.revertedWith("Invalid duration");
        });

        it("Should reject invalid target member", async function () {
            await expect(
                governanceModule.connect(user1).proposeEarlyWithdrawal(
                    circleId,
                    ethers.ZeroAddress,
                    "Emergency withdrawal needed",
                    7 * 24 * 60 * 60
                )
            ).to.be.revertedWith("Invalid target");
        });
    });

    describe("Voting", function () {
        let proposalId;

        beforeEach(async function () {
            const tx = await governanceModule.connect(user1).proposeEarlyWithdrawal(
                circleId,
                user2.address,
                "Emergency withdrawal needed",
                7 * 24 * 60 * 60
            );
            proposalId = 1;
        });

        it("Should allow voting on active proposal", async function () {
            await expect(governanceModule.connect(user1).vote(proposalId, true))
                .to.emit(governanceModule, "Voted")
                .withArgs(proposalId, user1.address, true);
        });

        it("Should track yes and no votes correctly", async function () {
            await governanceModule.connect(user1).vote(proposalId, true);
            await governanceModule.connect(user2).vote(proposalId, false);
            await governanceModule.connect(user3).vote(proposalId, true);

            const proposal = await governanceModule.getProposal(proposalId);
            expect(proposal.yesVotes).to.equal(2);
            expect(proposal.noVotes).to.equal(1);
        });

        it("Should prevent double voting", async function () {
            await governanceModule.connect(user1).vote(proposalId, true);

            await expect(
                governanceModule.connect(user1).vote(proposalId, false)
            ).to.be.revertedWith("Already voted");
        });

        it("Should reject voting on non-existent proposal", async function () {
            await expect(
                governanceModule.connect(user1).vote(999, true)
            ).to.be.revertedWith("Proposal does not exist");
        });

        it("Should reject voting after deadline", async function () {
            await time.increase(8 * 24 * 60 * 60);

            await expect(
                governanceModule.connect(user1).vote(proposalId, true)
            ).to.be.revertedWith("Voting closed");
        });
    });

    describe("Proposal Execution", function () {
        let proposalId;

        beforeEach(async function () {
            const tx = await governanceModule.connect(user1).proposeEarlyWithdrawal(
                circleId,
                user2.address,
                "Emergency withdrawal needed",
                7 * 24 * 60 * 60
            );
            proposalId = 1;
        });

        it("Should reject execution before deadline", async function () {
            await governanceModule.connect(user1).vote(proposalId, true);

            await expect(
                governanceModule.execute(proposalId)
            ).to.be.revertedWith("Voting still active");
        });

        it("Should execute passing proposal after deadline", async function () {
            await governanceModule.connect(user1).vote(proposalId, true);
            await governanceModule.connect(user2).vote(proposalId, true);

            await time.increase(8 * 24 * 60 * 60);

            const tx = await governanceModule.execute(proposalId);
            await tx.wait();
            
            const proposal = await governanceModule.getProposal(proposalId);
            expect(proposal.status).to.equal(3);
        });

        it("Should mark rejected proposal after deadline", async function () {
            await governanceModule.connect(user1).vote(proposalId, false);
            await governanceModule.connect(user2).vote(proposalId, false);

            await time.increase(8 * 24 * 60 * 60);

            const tx = await governanceModule.execute(proposalId);
            await tx.wait();

            const proposal = await governanceModule.getProposal(proposalId);
            expect(proposal.status).to.equal(3);
        });

        it("Should prevent double execution", async function () {
            await governanceModule.connect(user1).vote(proposalId, true);
            await governanceModule.connect(user2).vote(proposalId, true);

            await time.increase(8 * 24 * 60 * 60);

            await governanceModule.execute(proposalId);

            await expect(
                governanceModule.execute(proposalId)
            ).to.be.revertedWith("Already executed");
        });
    });

    describe("Proposal Queries", function () {
        let proposalId;

        beforeEach(async function () {
            const tx = await governanceModule.connect(user1).proposeEarlyWithdrawal(
                circleId,
                user2.address,
                "Emergency withdrawal needed",
                7 * 24 * 60 * 60
            );
            proposalId = 1;
        });

        it("Should return proposal details correctly", async function () {
            const proposal = await governanceModule.getProposal(proposalId);

            expect(proposal.circleId).to.equal(circleId);
            expect(proposal.targetMember).to.equal(user2.address);
            expect(proposal.justification).to.equal("Emergency withdrawal needed");
            expect(proposal.status).to.equal(0);
        });

        it("Should check if user has voted", async function () {
            expect(await governanceModule.hasVoted(proposalId, user1.address)).to.be.false;

            await governanceModule.connect(user1).vote(proposalId, true);

            expect(await governanceModule.hasVoted(proposalId, user1.address)).to.be.true;
        });

        it("Should reject query for non-existent proposal", async function () {
            await expect(
                governanceModule.getProposal(999)
            ).to.be.revertedWith("Proposal does not exist");
        });
    });
});