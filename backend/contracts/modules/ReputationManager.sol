// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IBadgeNFT {
    function mintBadge(address user, string memory tier) external returns (uint256);
    function upgradeBadge(address user, string memory newTier) external;
}

contract ReputationManager is Ownable {
    
    struct ReputationData {
        uint256 score;
        uint256 circlesCompleted;
        uint256 totalContributions;
        uint256 onTimePayments;
        uint256 totalPayments;
        uint256 currentStreak;
        uint256 longestStreak;
        uint256 missedPayments;
        uint256 accountCreated;
        uint256 totalInterestEarned;
        uint256 subsequentCyclesJoined;
    }

    // Points system
    uint256 public constant COMPLETE_CYCLE = 250;
    uint256 public constant ON_TIME_PAYMENT = 15;
    uint256 public constant STREAK_BONUS = 50; // Every 5 consecutive
    uint256 public constant GRACE_PENALTY = 75;
    uint256 public constant PAYOUT_RECEIVED = 25;
    uint256 public constant SUBSEQUENT_CYCLE = 100;

    // Badge thresholds
    uint256 public constant BRONZE_MIN = 500;
    uint256 public constant SILVER_MIN = 700;
    uint256 public constant GOLD_MIN = 850;

    mapping(address => ReputationData) public reputations;
    address public circleCore;
    IBadgeNFT public badgeNFT;

    event ScoreChanged(address indexed user, uint256 oldScore, uint256 newScore, string reason);
    event TierChanged(address indexed user, string oldTier, string newTier);
    event StreakUpdated(address indexed user, uint256 newStreak);
    event ContributionRecorded(address indexed user, uint256 circleId, bool onTime);

    modifier onlyCircleCore() {
        require(msg.sender == circleCore, "Only CircleCore");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setCircleCore(address _core) external onlyOwner {
        circleCore = _core;
    }

    function setBadgeNFT(address _badge) external onlyOwner {
        badgeNFT = IBadgeNFT(_badge);
    }

    function initializeUser(address user) external {
        if (reputations[user].accountCreated == 0) {
            reputations[user].accountCreated = block.timestamp;
            reputations[user].score = 0;
        }
    }

    function onDeposit(
        uint256 circleId,
        address user,
        bool onTime,
        uint256 amount
    ) external onlyCircleCore {
        ReputationData storage rep = reputations[user];
        
        if (rep.accountCreated == 0) {
            rep.accountCreated = block.timestamp;
        }

        uint256 oldScore = rep.score;
        rep.totalPayments++;
        rep.totalContributions += amount;

        if (onTime) {
            rep.onTimePayments++;
            rep.score += ON_TIME_PAYMENT;
            rep.currentStreak++;
            
            if (rep.currentStreak > rep.longestStreak) {
                rep.longestStreak = rep.currentStreak;
            }
            
            // Streak bonus every 5 consecutive payments
            if (rep.currentStreak % 5 == 0) {
                rep.score += STREAK_BONUS;
                emit StreakUpdated(user, rep.currentStreak);
            }
            
            emit ScoreChanged(user, oldScore, rep.score, "On-time payment");
        } else {
            // Missed payment - apply grace penalty
            rep.missedPayments++;
            rep.currentStreak = 0;
            
            if (rep.score >= GRACE_PENALTY) {
                rep.score -= GRACE_PENALTY;
            } else {
                rep.score = 0;
            }
            
            emit ScoreChanged(user, oldScore, rep.score, "Missed payment penalty");
        }

        _checkAndUpdateBadge(user, oldScore);
        emit ContributionRecorded(user, circleId, onTime);
    }

    function onCompleted(address user, uint256 circleId) external onlyCircleCore {
        ReputationData storage rep = reputations[user];
        uint256 oldScore = rep.score;
        
        rep.circlesCompleted++;
        rep.score += COMPLETE_CYCLE;

        // Subsequent cycle bonus (not for first circle)
        if (rep.circlesCompleted > 1) {
            rep.subsequentCyclesJoined++;
            rep.score += SUBSEQUENT_CYCLE;
        }

        _checkAndUpdateBadge(user, oldScore);
        emit ScoreChanged(user, oldScore, rep.score, "Circle completed");
    }

    function onPayoutReceived(address user, uint256 amount) external onlyCircleCore {
        ReputationData storage rep = reputations[user];
        uint256 oldScore = rep.score;
        
        rep.score += PAYOUT_RECEIVED;
        rep.totalInterestEarned += amount;

        _checkAndUpdateBadge(user, oldScore);
        emit ScoreChanged(user, oldScore, rep.score, "Payout received");
    }

    function _checkAndUpdateBadge(address user, uint256 oldScore) internal {
        string memory oldTier = getTier(oldScore);
        string memory newTier = getTier(reputations[user].score);

        if (keccak256(bytes(oldTier)) != keccak256(bytes(newTier))) {
            if (address(badgeNFT) != address(0)) {
                try badgeNFT.upgradeBadge(user, newTier) {
                    // Badge upgraded
                } catch {
                    // First badge mint
                    try badgeNFT.mintBadge(user, newTier) {} catch {}
                }
            }
            emit TierChanged(user, oldTier, newTier);
        }
    }

    function getUserReputation(address user) external view returns (
        uint256 score,
        string memory tier,
        uint256 circlesCompleted,
        uint8 onTimeRate,
        uint256 totalSaved,
        uint256 accountAge,
        uint256 longestStreak
    ) {
        ReputationData memory rep = reputations[user];
        
        score = rep.score;
        tier = getTier(score);
        circlesCompleted = rep.circlesCompleted;
        
        if (rep.totalPayments > 0) {
            onTimeRate = uint8((rep.onTimePayments * 100) / rep.totalPayments);
        } else {
            onTimeRate = 0;
        }
        
        totalSaved = rep.totalContributions;
        accountAge = rep.accountCreated > 0 ? block.timestamp - rep.accountCreated : 0;
        longestStreak = rep.longestStreak;
    }

    function getTier(uint256 score) public pure returns (string memory) {
        if (score >= GOLD_MIN) return "Gold";
        if (score >= SILVER_MIN) return "Silver";
        if (score >= BRONZE_MIN) return "Bronze";
        return "None";
    }

    function canVote(address user) external view returns (bool) {
        ReputationData memory rep = reputations[user];
        return rep.score >= SILVER_MIN && rep.circlesCompleted >= 2;
    }

    function getDetailedStats(address user) external view returns (
        uint256 currentStreak,
        uint256 missedPayments,
        uint256 totalInterestEarned,
        uint256 subsequentCycles
    ) {
        ReputationData memory rep = reputations[user];
        return (
            rep.currentStreak,
            rep.missedPayments,
            rep.totalInterestEarned,
            rep.subsequentCyclesJoined
        );
    }

    function getOnTimeRate(address user) external view returns (uint8) {
        ReputationData memory rep = reputations[user];
        if (rep.totalPayments == 0) return 0;
        return uint8((rep.onTimePayments * 100) / rep.totalPayments);
    }
}