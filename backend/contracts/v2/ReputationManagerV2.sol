// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IV2.sol";

/**
 * @title ReputationManagerV2
 * @notice Mandatory callback target for ChainCircleCoreV2. Same scoring rules
 *         as v1 (15/25/250/100/50/-75) but events now carry circleId + round,
 *         the BadgeNFT mint call is NOT wrapped in try/catch (if it fails the
 *         whole contribution reverts — state stays consistent), and a proper
 *         `getReputationHistory` view exists for the frontend timeline.
 */
contract ReputationManagerV2 is IReputationManagerV2, Ownable {

    /* ------------------------------------------------------------------ */
    /*  Scoring constants                                                 */
    /* ------------------------------------------------------------------ */

    uint256 public constant ON_TIME_PAYMENT = 15;
    uint256 public constant STREAK_BONUS = 50;          // every 5 consecutive on-time
    uint256 public constant STREAK_INTERVAL = 5;
    uint256 public constant GRACE_PENALTY = 75;
    uint256 public constant COMPLETE_CYCLE = 250;
    uint256 public constant SUBSEQUENT_CYCLE = 100;
    uint256 public constant PAYOUT_RECEIVED = 25;

    uint256 public constant BRONZE_MIN = 500;
    uint256 public constant SILVER_MIN = 700;
    uint256 public constant GOLD_MIN = 850;

    uint256 public constant MIN_COMPLETED_FOR_VOTE = 2;

    /* ------------------------------------------------------------------ */
    /*  Storage                                                           */
    /* ------------------------------------------------------------------ */

    struct ReputationData {
        uint256 score;
        uint256 currentStreak;
        uint256 longestStreak;
        uint256 totalPayments;
        uint256 onTimePayments;
        uint256 missedPayments;
        uint256 circlesCompleted;
        uint256 totalContributed;
        uint256 totalInterestEarned;
        uint256 accountCreatedAt;
    }

    struct HistoryEntry {
        uint256 timestamp;
        uint256 circleId;
        uint8 round;
        int256 delta;        // signed — penalties are negative
        uint256 scoreAfter;
        bytes32 reasonHash;  // keccak256(reason) so we don't blow up storage
        string reason;
    }

    mapping(address => ReputationData) private _rep;
    mapping(address => HistoryEntry[]) private _history;

    address public circleCore;
    IBadgeNFTV2 public badgeNFT;

    /* ------------------------------------------------------------------ */
    /*  Events                                                            */
    /* ------------------------------------------------------------------ */

    event ScoreChanged(
        address indexed user,
        uint256 oldScore,
        uint256 newScore,
        uint256 circleId,
        uint8 round,
        string reason
    );
    event StreakUpdated(address indexed user, uint256 newStreak);
    event CircleCoreSet(address indexed core);
    event BadgeNFTSet(address indexed badge);

    error OnlyCircleCore();
    error ZeroAddress();

    modifier onlyCircleCore() {
        if (msg.sender != circleCore) revert OnlyCircleCore();
        _;
    }

    constructor() Ownable(msg.sender) {}

    /* ------------------------------------------------------------------ */
    /*  Wiring                                                            */
    /* ------------------------------------------------------------------ */

    function setCircleCore(address core) external onlyOwner {
        if (core == address(0)) revert ZeroAddress();
        circleCore = core;
        emit CircleCoreSet(core);
    }

    function setBadgeNFT(address badge) external onlyOwner {
        if (badge == address(0)) revert ZeroAddress();
        badgeNFT = IBadgeNFTV2(badge);
        emit BadgeNFTSet(badge);
    }

    /* ------------------------------------------------------------------ */
    /*  Callback surface                                                  */
    /* ------------------------------------------------------------------ */

    function onDeposit(
        uint256 circleId,
        uint8 round,
        address user,
        bool onTime,
        uint256 amount
    ) external onlyCircleCore {
        ReputationData storage rep = _rep[user];
        if (rep.accountCreatedAt == 0) rep.accountCreatedAt = block.timestamp;

        uint256 oldScore = rep.score;
        rep.totalPayments += 1;
        rep.totalContributed += amount;

        if (onTime) {
            rep.onTimePayments += 1;
            rep.score += ON_TIME_PAYMENT;
            rep.currentStreak += 1;
            if (rep.currentStreak > rep.longestStreak) rep.longestStreak = rep.currentStreak;

            string memory reason = "on-time payment";
            if (rep.currentStreak > 0 && rep.currentStreak % STREAK_INTERVAL == 0) {
                rep.score += STREAK_BONUS;
                emit StreakUpdated(user, rep.currentStreak);
                reason = "on-time + streak bonus";
            }
            _recordAndCheckBadge(user, oldScore, rep.score, circleId, round, reason);
        } else {
            rep.missedPayments += 1;
            rep.currentStreak = 0;
            uint256 penalty = GRACE_PENALTY > rep.score ? rep.score : GRACE_PENALTY;
            rep.score -= penalty;
            _recordAndCheckBadge(user, oldScore, rep.score, circleId, round, "late payment penalty");
        }
    }

    function onPayoutReceived(
        uint256 circleId,
        uint8 round,
        address user,
        uint256 interest
    ) external onlyCircleCore {
        ReputationData storage rep = _rep[user];
        if (rep.accountCreatedAt == 0) rep.accountCreatedAt = block.timestamp;
        uint256 oldScore = rep.score;
        rep.score += PAYOUT_RECEIVED;
        rep.totalInterestEarned += interest;
        _recordAndCheckBadge(user, oldScore, rep.score, circleId, round, "payout received");
    }

    function onCompleted(uint256 circleId, address user) external onlyCircleCore {
        ReputationData storage rep = _rep[user];
        if (rep.accountCreatedAt == 0) rep.accountCreatedAt = block.timestamp;
        uint256 oldScore = rep.score;
        rep.circlesCompleted += 1;
        rep.score += COMPLETE_CYCLE;
        if (rep.circlesCompleted > 1) rep.score += SUBSEQUENT_CYCLE;
        string memory reason = rep.circlesCompleted == 1 ? "circle completed" : "subsequent circle completed";
        _recordAndCheckBadge(user, oldScore, rep.score, circleId, 0, reason);
    }

    /* ------------------------------------------------------------------ */
    /*  Internal — record history + refresh badge                         */
    /* ------------------------------------------------------------------ */

    function _recordAndCheckBadge(
        address user,
        uint256 oldScore,
        uint256 newScore,
        uint256 circleId,
        uint8 round,
        string memory reason
    ) internal {
        _history[user].push(HistoryEntry({
            timestamp: block.timestamp,
            circleId: circleId,
            round: round,
            delta: int256(newScore) - int256(oldScore),
            scoreAfter: newScore,
            reasonHash: keccak256(bytes(reason)),
            reason: reason
        }));

        emit ScoreChanged(user, oldScore, newScore, circleId, round, reason);

        // Mint or upgrade the badge if tier changed. Mandatory — if this
        // reverts the whole contribution reverts, which is what we want for
        // state consistency.
        if (address(badgeNFT) != address(0)) {
            string memory oldTier = _tierFromScore(oldScore);
            string memory newTier = _tierFromScore(newScore);
            if (keccak256(bytes(oldTier)) != keccak256(bytes(newTier)) && bytes(newTier).length > 0) {
                badgeNFT.mintOrUpgrade(user, newTier);
            }
        }
    }

    function _tierFromScore(uint256 score) internal pure returns (string memory) {
        if (score >= GOLD_MIN) return "Gold";
        if (score >= SILVER_MIN) return "Silver";
        if (score >= BRONZE_MIN) return "Bronze";
        return "";
    }

    /* ------------------------------------------------------------------ */
    /*  Views                                                             */
    /* ------------------------------------------------------------------ */

    function scoreOf(address user) external view returns (uint256) {
        return _rep[user].score;
    }

    function tierOf(address user) external view returns (string memory) {
        string memory t = _tierFromScore(_rep[user].score);
        return bytes(t).length == 0 ? "None" : t;
    }

    function canVote(address user) external view returns (bool) {
        return _rep[user].score >= SILVER_MIN
            && _rep[user].circlesCompleted >= MIN_COMPLETED_FOR_VOTE;
    }

    function voteWeight(address user) external view returns (uint256) {
        if (_rep[user].score >= GOLD_MIN) return 2;
        if (_rep[user].score >= SILVER_MIN) return 1;
        return 0;
    }

    function getReputation(address user) external view returns (ReputationData memory) {
        return _rep[user];
    }

    function getReputationHistory(address user, uint256 offset, uint256 limit)
        external view returns (HistoryEntry[] memory out, uint256 total)
    {
        HistoryEntry[] storage full = _history[user];
        total = full.length;
        if (offset >= total) return (new HistoryEntry[](0), total);
        uint256 end = offset + limit;
        if (end > total) end = total;
        out = new HistoryEntry[](end - offset);
        for (uint256 i = offset; i < end; i++) out[i - offset] = full[i];
    }

    function onTimeRate(address user) external view returns (uint256) {
        ReputationData storage rep = _rep[user];
        if (rep.totalPayments == 0) return 0;
        return (rep.onTimePayments * 100) / rep.totalPayments;
    }
}
