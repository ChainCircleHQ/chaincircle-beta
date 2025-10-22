import { ethers } from "ethers";
import { CUSD_DECIMALS, REPUTATION_TIERS, GOVERNANCE_REQUIREMENTS } from "./constants.js";

// Token formatting
function parseUnits(amount, decimals = CUSD_DECIMALS) {
    return ethers.parseUnits(amount.toString(), decimals);
}

function formatUnits(amount, decimals = CUSD_DECIMALS) {
    return ethers.formatUnits(amount, decimals);
}

// Address utilities
function shortenAddress(address) {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Circle calculations
function calculateTotalPool(amount, members, duration) {
    return parseUnits(amount) * BigInt(members) * BigInt(duration);
}

function calculatePerMemberReceive(amount, members) {
    return parseUnits(amount) * BigInt(members);
}

function calculateEstimatedInterest(principal, duration, aprBps = 400) {
    const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
    const BPS_DIVISOR = 10000;
    const MONTHLY_SECONDS = 30 * 24 * 60 * 60;
    
    const timeElapsed = duration * MONTHLY_SECONDS;
    const yearFraction = (BigInt(timeElapsed) * BigInt(1e18)) / BigInt(SECONDS_PER_YEAR);
    const interest = (BigInt(principal) * BigInt(aprBps) * yearFraction) / 
                     (BigInt(BPS_DIVISOR) * BigInt(1e18));
    
    return interest;
}

function calculateYield(principal, timeElapsed, aprBps = 400) {
    const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
    const BPS_DIVISOR = 10000;
    
    const yearFraction = (BigInt(timeElapsed) * BigInt(1e18)) / BigInt(SECONDS_PER_YEAR);
    const interest = (BigInt(principal) * BigInt(aprBps) * yearFraction) / 
                     (BigInt(BPS_DIVISOR) * BigInt(1e18));
    
    return interest;
}

// Reputation utilities (UPDATED)
function getTierFromScore(score) {
    const numScore = typeof score === 'bigint' ? Number(score) : score;
    
    if (numScore >= REPUTATION_TIERS.GOLD.min) return "Gold";
    if (numScore >= REPUTATION_TIERS.SILVER.min) return "Silver";
    if (numScore >= REPUTATION_TIERS.BRONZE.min) return "Bronze";
    return "None";
}

function getTierInfo(score) {
    const tier = getTierFromScore(score);
    return REPUTATION_TIERS[tier.toUpperCase()] || REPUTATION_TIERS.NONE;
}

function canUserVote(score, circlesCompleted) {
    const numScore = typeof score === 'bigint' ? Number(score) : score;
    const numCircles = typeof circlesCompleted === 'bigint' ? Number(circlesCompleted) : circlesCompleted;
    
    return numScore >= GOVERNANCE_REQUIREMENTS.MIN_TIER_SCORE && 
           numCircles >= GOVERNANCE_REQUIREMENTS.MIN_COMPLETED_CIRCLES;
}

function calculateProgressToNextTier(score) {
    const numScore = typeof score === 'bigint' ? Number(score) : score;
    const currentTier = getTierFromScore(numScore);
    
    if (currentTier === "Gold") {
        return { nextTier: null, pointsNeeded: 0, progress: 100 };
    }
    
    const tierOrder = ["None", "Bronze", "Silver", "Gold"];
    const currentIndex = tierOrder.indexOf(currentTier);
    const nextTier = tierOrder[currentIndex + 1];
    const nextTierInfo = REPUTATION_TIERS[nextTier.toUpperCase()];
    
    const pointsNeeded = nextTierInfo.min - numScore;
    const currentTierInfo = getTierInfo(numScore);
    const tierRange = nextTierInfo.min - currentTierInfo.min;
    const progress = Math.min(100, Math.max(0, ((numScore - currentTierInfo.min) / tierRange) * 100));
    
    return { nextTier, pointsNeeded, progress: Math.round(progress) };
}

// Faucet utilities
function formatTimeUntilClaim(seconds) {
    const numSeconds = typeof seconds === 'bigint' ? Number(seconds) : seconds;
    
    if (numSeconds === 0) return "Available now";
    
    const hours = Math.floor(numSeconds / 3600);
    const minutes = Math.floor((numSeconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

// Time utilities
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTimestamp(timestamp) {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
}

function formatRelativeTime(timestamp) {
    const now = Date.now();
    const date = new Date(Number(timestamp) * 1000);
    const diff = now - date.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
}

// Transaction utilities
async function waitForTransaction(tx, confirmations = 1) {
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmations...");
    const receipt = await tx.wait(confirmations);
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    return receipt;
}

async function estimateGas(contract, functionName, args) {
    try {
        const gasEstimate = await contract[functionName].estimateGas(...args);
        const gasWithBuffer = (gasEstimate * 120n) / 100n; // 20% buffer
        return gasWithBuffer;
    } catch (error) {
        console.error("Gas estimation failed:", error);
        throw error;
    }
}

// Enum name getters
function getGoalTypeName(goalType) {
    const types = ["HOME", "EDUCATION", "BUSINESS", "EMERGENCY", "TRAVEL", "OTHER"];
    return types[goalType] || "UNKNOWN";
}

function getGoalTypeIcon(goalType) {
    const icons = ["home", "education", "business", "emergency", "travel", "other"];
    return icons[goalType] || "other";
}

function getFrequencyName(frequency) {
    const frequencies = ["MONTHLY", "WEEKLY"];
    return frequencies[frequency] || "UNKNOWN";
}

function getCircleStatusName(status) {
    const statuses = ["PENDING", "ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"];
    return statuses[status] || "UNKNOWN";
}

// Activity type formatting
function formatActivityType(activityType) {
    const types = {
        "CONTRIBUTE": "Contribution",
        "WITHDRAW": "Withdrawal",
        "INTEREST": "Interest Earned"
    };
    return types[activityType] || activityType;
}

// Circle progress calculation
function calculateCircleProgress(currentRound, duration) {
    if (duration === 0) return 0;
    return Math.round((Number(currentRound) / Number(duration)) * 100);
}

// Validation utilities
function validateCircleParams(name, amount, duration, maxMembers) {
    const errors = [];
    
    if (!name || name.length < 3) {
        errors.push("Circle name must be at least 3 characters");
    }
    
    if (name && name.length > 50) {
        errors.push("Circle name must be less than 50 characters");
    }
    
    if (amount < 100) {
        errors.push("Minimum contribution is 100 CUSD");
    }
    
    if (amount > 5000) {
        errors.push("Maximum contribution is 5000 CUSD");
    }
    
    if (duration < 3 || duration > 12) {
        errors.push("Duration must be between 3 and 12 months");
    }
    
    if (maxMembers < 3 || maxMembers > 12) {
        errors.push("Members must be between 3 and 12");
    }
    
    return { valid: errors.length === 0, errors };
}

// Display formatting
function formatCurrency(amount, decimals = CUSD_DECIMALS) {
    const formatted = formatUnits(amount, decimals);
    const num = parseFloat(formatted);
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function formatPercentage(value) {
    return `${Math.round(Number(value))}%`;
}

export {
    // Token
    parseUnits,
    formatUnits,
    formatCurrency,

    // Address
    shortenAddress,

    // Circle calculations
    calculateTotalPool,
    calculatePerMemberReceive,
    calculateEstimatedInterest,
    calculateYield,
    calculateCircleProgress,

    // Reputation
    getTierFromScore,
    getTierInfo,
    canUserVote,
    calculateProgressToNextTier,

    // Faucet
    formatTimeUntilClaim,

    // Time
    delay,
    formatTimestamp,
    formatRelativeTime,

    // Transactions
    waitForTransaction,
    estimateGas,

    // Enums
    getGoalTypeName,
    getGoalTypeIcon,
    getFrequencyName,
    getCircleStatusName,
    formatActivityType,

    // Validation
    validateCircleParams,

    // Display
    formatPercentage
};