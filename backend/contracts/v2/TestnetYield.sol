// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./interfaces/IV2.sol";

/**
 * @title TestnetYield
 * @notice Deterministic 4% APR yield simulator for testnet. Pure, no state.
 *         Mainnet swap: deploy an AaveYieldAdapter implementing the same
 *         IYieldModule and point ChainCircleCoreV2 at it via setYieldModule.
 *         Math: interest = principal * APR_BPS * elapsedSeconds / (BPS * YEAR).
 */
contract TestnetYield is IYieldModule {
    uint256 public constant APR_BPS = 400;         // 4%
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    function calculateYield(uint256 principal, uint256 timeElapsed) external pure returns (uint256) {
        if (principal == 0 || timeElapsed == 0) return 0;
        return (principal * APR_BPS * timeElapsed) / (BPS_DENOMINATOR * SECONDS_PER_YEAR);
    }

    function aprBps() external pure returns (uint256) {
        return APR_BPS;
    }
}
