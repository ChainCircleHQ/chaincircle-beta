// Shared constants used by hardhat scripts and helpers.
// Only exports what's actually imported somewhere — see audit.md §4.
// Chain config lives in hardhat.config.js (reads from .env).
// Protocol params that mirror the contracts are kept here for script-side
// reference; canonical source remains the Solidity.

const CUSD_DECIMALS = 6;

const REPUTATION_TIERS = {
    NONE: { min: 0, max: 499, name: "None" },
    BRONZE: { min: 500, max: 699, name: "Bronze" },
    SILVER: { min: 700, max: 849, name: "Silver" },
    GOLD: { min: 850, max: Infinity, name: "Gold" },
};

const GOVERNANCE_REQUIREMENTS = {
    MIN_TIER: "Silver",
    MIN_TIER_SCORE: 700,
    MIN_COMPLETED_CIRCLES: 2,
};

module.exports = {
    CUSD_DECIMALS,
    REPUTATION_TIERS,
    GOVERNANCE_REQUIREMENTS,
};
