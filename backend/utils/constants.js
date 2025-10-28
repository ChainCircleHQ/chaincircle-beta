const PUSH_CHAIN_CONFIG = {
    TESTNET: {
        chainId: 42101,
        name: "Push Chain Donut Testnet",
        rpcUrl: "https://evm.rpc-testnet-donut-node1.push.org/",
        rpcUrlAlt: "https://evm.rpc-testnet-donut-node2.push.org/",
        explorerUrl: "https://donut.push.network",
        faucetUrl: "https://faucet.push.org",
        nativeCurrency: {
            name: "Push Token",
            symbol: "PC",
            decimals: 18
        }
    }
};

// CUSD Token Configuration
const CUSD_DECIMALS = 6;
const FAUCET_AMOUNT = 1000; // 1000 CUSD per claim
const FAUCET_COOLDOWN_HOURS = 24;

// Circle Contribution Limits
const MIN_CONTRIBUTION = 100;
const MAX_CONTRIBUTION = 5000;
const MIN_DURATION = 3;
const MAX_DURATION = 12;
const MIN_MEMBERS = 3;
const MAX_MEMBERS = 12;

// Time Constants
const GRACE_PERIOD_DAYS = 2;
const MONTHLY_INTERVAL_DAYS = 30;
const WEEKLY_INTERVAL_DAYS = 7;

// Yield Configuration
const APR_BASIS_POINTS = 400; // 4% APR

// Reputation Points System (NEW)
const REPUTATION_POINTS = {
    COMPLETE_CYCLE: 250,
    ON_TIME_PAYMENT: 15,
    STREAK_BONUS: 50,        // Every 5 consecutive
    GRACE_PENALTY: 75,
    PAYOUT_RECEIVED: 25,
    SUBSEQUENT_CYCLE: 100
};

// Goal Types
const GOAL_TYPES = {
    HOME: 0,
    EDUCATION: 1,
    BUSINESS: 2,
    EMERGENCY: 3,
    TRAVEL: 4,
    OTHER: 5
};

// Goal Type Icons (for frontend mapping)
const GOAL_ICONS = {
    0: "home",
    1: "education",
    2: "business",
    3: "emergency",
    4: "travel",
    5: "other"
};

// Frequency Types
const FREQUENCY_TYPES = {
    MONTHLY: 0,
    WEEKLY: 1
};

// Circle Status
const CIRCLE_STATUS = {
    PENDING: 0,
    ACTIVE: 1,
    COMPLETED: 2,
    PAUSED: 3,
    CANCELLED: 4
};

// Reputation Tiers (UPDATED)
const REPUTATION_TIERS = {
    NONE: { min: 0, max: 499, name: "None" },
    BRONZE: { min: 500, max: 699, name: "Bronze" },
    SILVER: { min: 700, max: 849, name: "Silver" },
    GOLD: { min: 850, max: Infinity, name: "Gold" }
};

// Governance Requirements
const GOVERNANCE_REQUIREMENTS = {
    MIN_TIER: "Silver",      // 700+ score
    MIN_TIER_SCORE: 700,
    MIN_COMPLETED_CIRCLES: 2
};

// Activity Types (for activity log)
const ACTIVITY_TYPES = {
    CONTRIBUTE: "CONTRIBUTE",
    WITHDRAW: "WITHDRAW",
    INTEREST: "INTEREST"
};

// Push Chain Protocol Addresses
const UEA_FACTORY_ADDRESS = "0x00000000000000000000000000000000000000eA";

// Chain Namespaces
const CHAIN_NAMESPACES = {
    PUSH_TESTNET_DONUT: "eip155:42101",
    ETHEREUM_SEPOLIA: "eip155:11155111",
    SOLANA_DEVNET: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
};

// Deployed Contract Addresses (Latest Deployment - Oct 2025)
const CONTRACT_ADDRESSES = {
    CUSD: "0x7D5Dbda57E186f7e905e5E77224Cd60054fF41f3",
    CHAIN_CIRCLE_CORE: "0x59D44aea45bd92E2798b7998e8E090586670f161",
    REPUTATION_MANAGER: "0xEaEa469279B89E7fF0BDd5903226483418AB37e4",
    MOCK_YIELD: "0x2312493eac47f20a3a1B8e7AB1627F1B1FDd3412",
    BADGE_NFT: "0x9171F3AE9Cb9EBBa0826ad31971647DceB52Bd50",
    GOVERNANCE_MODULE: "0xA3c786088a6D3EB9216B5647a4149a7dF0149b49",
    NAME_REGISTRY: "0x1c8fCc121D52EAa6d4705fCcE95e34E2CEDced5E",
    WALLET_PREFERENCES: "0xB5b71E6fbA444d0B791C62C855cc31b3521e8E38"
};

module.exports = {
    PUSH_CHAIN_CONFIG,
    CUSD_DECIMALS,
    FAUCET_AMOUNT,
    FAUCET_COOLDOWN_HOURS,
    MIN_CONTRIBUTION,
    MAX_CONTRIBUTION,
    MIN_DURATION,
    MAX_DURATION,
    MIN_MEMBERS,
    MAX_MEMBERS,
    GRACE_PERIOD_DAYS,
    MONTHLY_INTERVAL_DAYS,
    WEEKLY_INTERVAL_DAYS,
    APR_BASIS_POINTS,
    REPUTATION_POINTS,
    GOAL_TYPES,
    GOAL_ICONS,
    FREQUENCY_TYPES,
    CIRCLE_STATUS,
    REPUTATION_TIERS,
    GOVERNANCE_REQUIREMENTS,
    ACTIVITY_TYPES,
    UEA_FACTORY_ADDRESS,
    CHAIN_NAMESPACES,
    CONTRACT_ADDRESSES
};