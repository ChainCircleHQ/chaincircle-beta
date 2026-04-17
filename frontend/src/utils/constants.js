// Shared constants that don't belong in contracts.js (which is chain config only).
// Only exports what's actually imported somewhere — see audit.md §4 for the cleanup.
// Protocol params that should eventually read from on-chain will be migrated in Phase 5.

export const CUSD_DECIMALS = 6;

export const GOAL_TYPES = {
    HOME: 0,
    EDUCATION: 1,
    BUSINESS: 2,
    EMERGENCY: 3,
    TRAVEL: 4,
    OTHER: 5,
};

export const REPUTATION_TIERS = {
    NONE: { min: 0, max: 499, name: "None" },
    BRONZE: { min: 500, max: 699, name: "Bronze" },
    SILVER: { min: 700, max: 849, name: "Silver" },
    GOLD: { min: 850, max: Infinity, name: "Gold" },
};

export const GOVERNANCE_REQUIREMENTS = {
    MIN_TIER: "Silver",
    MIN_TIER_SCORE: 700,
    MIN_COMPLETED_CIRCLES: 2,
};
