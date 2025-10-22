const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockYield", function () {
    let mockYield;

    beforeEach(async function () {
        const MockYield = await ethers.getContractFactory("MockYield");
        mockYield = await MockYield.deploy();
    });

    describe("APR Configuration", function () {
        it("Should return correct APR", async function () {
            const apr = await mockYield.getAPR();
            expect(apr).to.equal(400);
        });
    });

    describe("Yield Calculation", function () {
        it("Should calculate yield correctly for 1 year", async function () {
            const principal = ethers.parseUnits("10000", 6);
            const oneYear = 365 * 24 * 60 * 60;

            const yield1 = await mockYield.calculateYield(principal, oneYear);
            const expectedYield = (principal * 400n) / 10000n;

            expect(yield1).to.be.closeTo(expectedYield, ethers.parseUnits("1", 6));
        });

        it("Should calculate yield correctly for 6 months", async function () {
            const principal = ethers.parseUnits("10000", 6);
            const sixMonths = (365 * 24 * 60 * 60) / 2;

            const yield1 = await mockYield.calculateYield(principal, sixMonths);
            const expectedYield = (principal * 400n) / 20000n;

            expect(yield1).to.be.closeTo(expectedYield, ethers.parseUnits("1", 6));
        });

        it("Should calculate yield correctly for 3 months", async function () {
            const principal = ethers.parseUnits("10000", 6);
            const threeMonths = (365 * 24 * 60 * 60) / 4;

            const yield1 = await mockYield.calculateYield(principal, threeMonths);
            const expectedYield = (principal * 400n) / 40000n;

            expect(yield1).to.be.closeTo(expectedYield, ethers.parseUnits("1", 6));
        });

        it("Should return zero for zero principal", async function () {
            const oneYear = 365 * 24 * 60 * 60;
            const yield1 = await mockYield.calculateYield(0, oneYear);

            expect(yield1).to.equal(0);
        });

        it("Should return zero for zero time", async function () {
            const principal = ethers.parseUnits("10000", 6);
            const yield1 = await mockYield.calculateYield(principal, 0);

            expect(yield1).to.equal(0);
        });

        it("Should calculate yield for different principal amounts", async function () {
            const oneYear = 365 * 24 * 60 * 60;

            const yield1k = await mockYield.calculateYield(ethers.parseUnits("1000", 6), oneYear);
            const yield10k = await mockYield.calculateYield(ethers.parseUnits("10000", 6), oneYear);

            expect(yield10k).to.equal(yield1k * 10n);
        });

        it("Should scale linearly with time", async function () {
            const principal = ethers.parseUnits("10000", 6);
            const oneMonth = (365 * 24 * 60 * 60) / 12;
            const twoMonths = 2 * oneMonth;

            const yield1Month = await mockYield.calculateYield(principal, oneMonth);
            const yield2Months = await mockYield.calculateYield(principal, twoMonths);

            expect(yield2Months).to.be.closeTo(yield1Month * 2n, ethers.parseUnits("0.1", 6));
        });

        it("Should handle small time periods", async function () {
            const principal = ethers.parseUnits("10000", 6);
            const oneDay = 24 * 60 * 60;

            const yield1 = await mockYield.calculateYield(principal, oneDay);

            expect(yield1).to.be.gt(0);
        });

        it("Should handle large principal amounts", async function () {
            const largePrincipal = ethers.parseUnits("1000000", 6);
            const oneYear = 365 * 24 * 60 * 60;

            const yield1 = await mockYield.calculateYield(largePrincipal, oneYear);
            const expectedYield = (largePrincipal * 400n) / 10000n;

            expect(yield1).to.be.closeTo(expectedYield, ethers.parseUnits("100", 6));
        });
    });

    describe("APR Verification", function () {
        it("Should produce 4% yield over 1 year", async function () {
            const principal = ethers.parseUnits("100000", 6);
            const oneYear = 365 * 24 * 60 * 60;

            const yield1 = await mockYield.calculateYield(principal, oneYear);
            const yieldPercentage = (yield1 * 10000n) / principal;

            expect(yieldPercentage).to.be.closeTo(400n, 1n);
        });
    });
});