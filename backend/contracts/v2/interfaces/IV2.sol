// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title Shared interfaces for ChainCircle v2 contracts.
 * @notice Single file so the cross-references don't fan out; every v2
 *         contract imports from here.
 */

/* ------------------------------------------------------------------ */
/*  Yield                                                             */
/* ------------------------------------------------------------------ */

interface IYieldModule {
    /**
     * @notice Pure interest calc for a principal held for `timeElapsed` seconds.
     * @dev    Must be deterministic — TestnetYield is 4% APR, mainnet Aave
     *         adapter will be the same signature.
     */
    function calculateYield(uint256 principal, uint256 timeElapsed) external pure returns (uint256);

    /// @notice Current APR in basis points (4% = 400).
    function aprBps() external view returns (uint256);
}

/* ------------------------------------------------------------------ */
/*  Wallet Preferences                                                */
/* ------------------------------------------------------------------ */

interface IWalletPreferencesV2 {
    /**
     * @notice Resolve the payout destination for a user.
     * @dev    Always returns a non-zero address — if the user has never set
     *         a preferred wallet, falls back to `user` itself on Push Chain
     *         (chainId = 42101).
     */
    function getPayoutDestination(address user) external view returns (address wallet, uint256 chainId);

    /// @notice True if the chain id is registered as a valid payout destination.
    function isSupportedChain(uint256 chainId) external view returns (bool);
}

/* ------------------------------------------------------------------ */
/*  Badge NFT                                                         */
/* ------------------------------------------------------------------ */

interface IBadgeNFTV2 {
    /**
     * @notice Mint a new badge or upgrade an existing one. Only callable by
     *         the ReputationManager.
     * @dev    Idempotent when `tier` matches existing — no-op, no tx noise.
     */
    function mintOrUpgrade(address user, string calldata tier) external returns (uint256 tokenId);

    /// @notice Current badge for user, or (0, "") if none.
    function getUserBadge(address user) external view returns (uint256 tokenId, string memory tier);
}

/* ------------------------------------------------------------------ */
/*  Reputation Manager                                                */
/* ------------------------------------------------------------------ */

interface IReputationManagerV2 {
    // Callback surface — only ChainCircleCore calls these.
    function onDeposit(uint256 circleId, uint8 round, address user, bool onTime, uint256 amount) external;
    function onPayoutReceived(uint256 circleId, uint8 round, address user, uint256 interest) external;
    function onCompleted(uint256 circleId, address user) external;

    // Read surface.
    function scoreOf(address user) external view returns (uint256);
    function tierOf(address user) external view returns (string memory);
    function canVote(address user) external view returns (bool);
    function voteWeight(address user) external view returns (uint256);
}

/* ------------------------------------------------------------------ */
/*  ChainCircleCore — exposed to GovernanceModule                      */
/* ------------------------------------------------------------------ */

interface IChainCircleCoreV2 {
    /**
     * @notice Called by GovernanceModule to enact a passed proposal.
     * @param proposalId   the passing proposal's id (recorded for audit).
     * @param circleId     the circle to act on.
     * @param target       the member address being acted on.
     * @param kind         the action type (see GovernanceActionKind).
     * @param reductionBps penalty reduction in bps (0-10000). Only used for
     *                     EARLY_EXIT; ignored otherwise.
     */
    function executeGovernanceAction(
        uint256 proposalId,
        uint256 circleId,
        address target,
        uint8 kind,
        uint256 reductionBps
    ) external;
}

library GovernanceActionKind {
    uint8 internal constant EARLY_EXIT = 1;
    uint8 internal constant CANCEL_CIRCLE = 2;
}
