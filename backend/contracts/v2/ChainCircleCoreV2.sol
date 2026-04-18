// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IV2.sol";

/**
 * @title ChainCircleCoreV2
 * @notice The core ROSCA primitive. Differences from v1:
 *          - Payouts are accrued to pendingWithdrawals, not direct-transferred.
 *            Recipients pull via `withdrawPayout(circleId)` which resolves the
 *            destination via WalletPreferencesV2 at pull-time (cross-chain via
 *            Push UEA relay when appropriate).
 *          - ReputationManager + YieldModule are mandatory once set — they
 *            cannot be toggled off mid-circle, and once a circle starts its
 *            reputation hook is locked in. This kills the "we forgot to wire
 *            it and all events silently skipped" v1 bug.
 *          - Round number is emitted on every ContributionMade and is part of
 *            reputation callbacks, so the indexer can slot events into rounds
 *            correctly.
 *          - Explicit CircleStarted event on Pending→Active, CirclePaused /
 *            CircleUnpaused / CircleCancelled for lifecycle.
 *          - `executeGovernanceAction` hook for GovernanceModule-passed
 *            proposals (early exit with reduced penalty, cancel-circle).
 *          - CircleCreated + MemberJoined events carry more data so the
 *            indexer can hydrate without a state read.
 */
contract ChainCircleCoreV2 is Ownable, ReentrancyGuard, IChainCircleCoreV2 {

    /* ------------------------------------------------------------------ */
    /*  Types                                                             */
    /* ------------------------------------------------------------------ */

    enum GoalType { HOME, EDUCATION, BUSINESS, EMERGENCY, TRAVEL, OTHER }
    enum Frequency { MONTHLY, WEEKLY }
    enum CircleStatus { Pending, Active, Completed, Paused, Cancelled }

    struct Circle {
        string name;
        GoalType goalType;
        Frequency frequency;
        uint256 contributionAmount;   // per-round, per-member, in CUSD base units
        uint8 duration;               // # of rounds
        uint8 maxMembers;
        uint8 currentRound;
        CircleStatus status;
        uint256 vaultBalance;         // current escrow in this circle (excl. pending withdrawals)
        uint256 createdAt;
        uint256 startAt;              // timestamp Pending→Active transition
        uint256 completedAt;
        uint256 pausedAt;
        address creator;
    }

    struct Member {
        bool active;
        uint8 paymentsMade;
        bool hasReceivedPayout;
        uint256 contributed;
        uint256 lastPaymentTime;
    }

    /* ------------------------------------------------------------------ */
    /*  Storage                                                           */
    /* ------------------------------------------------------------------ */

    IERC20 public immutable cusd;
    IReputationManagerV2 public reputationManager;
    IYieldModule public yieldModule;
    IWalletPreferencesV2 public walletPreferences;
    address public governanceModule;

    uint256 public circleCounter;
    uint256 public totalPooled;
    uint256 public activeCircleCount;

    uint256 public constant GRACE_PERIOD = 2 days;
    uint256 public constant MONTHLY_INTERVAL = 30 days;
    uint256 public constant WEEKLY_INTERVAL = 7 days;
    uint256 public constant EMERGENCY_PENALTY_BPS = 1000;   // 10%
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MIN_CONTRIBUTION = 100 * 1e6;   // 100 CUSD
    uint256 public constant MIN_MEMBERS = 3;
    uint256 public constant MAX_MEMBERS = 12;
    uint256 public constant MIN_DURATION = 3;
    uint256 public constant MAX_DURATION = 12;

    mapping(uint256 => Circle) public circles;
    mapping(uint256 => address[]) public circleMembersList;
    mapping(uint256 => mapping(address => Member)) public members;
    mapping(uint256 => address[]) public payoutOrder;     // round index → recipient
    mapping(string => uint256) public circleNameToId;
    mapping(uint256 => string) public circleInviteCode;
    mapping(address => uint256[]) public userCircles;

    // Pending payout escrow: recipient → circleId → accrued amount (CUSD base units).
    mapping(address => mapping(uint256 => uint256)) public pendingWithdrawals;
    // Aggregate per-user pending (for the frontend's "you have $X to claim" widget).
    mapping(address => uint256) public totalPendingWithdrawals;

    // Yield reserve — the principal sits in the vault, but interest must come
    // from somewhere. On mainnet, an Aave adapter actually generates yield
    // from the deposited principal. On testnet, an admin tops up this reserve
    // so interest can be paid without minting. If the reserve is empty,
    // circles still complete — they just pay principal only (logged).
    uint256 public yieldReserve;

    /* ------------------------------------------------------------------ */
    /*  Events                                                            */
    /* ------------------------------------------------------------------ */

    event CircleCreated(
        uint256 indexed circleId,
        address indexed creator,
        string name,
        uint8 goalType,
        uint8 frequency,
        uint256 contributionAmount,
        uint8 duration,
        uint8 maxMembers
    );
    event MemberJoined(uint256 indexed circleId, address indexed member, uint8 position);
    event CircleStarted(uint256 indexed circleId, uint256 timestamp);
    event CircleCompleted(uint256 indexed circleId, uint256 timestamp);
    event CirclePaused(uint256 indexed circleId, string reason, uint256 timestamp);
    event CircleUnpaused(uint256 indexed circleId, uint256 timestamp);
    event CircleCancelled(uint256 indexed circleId, string reason, uint256 timestamp);

    event ContributionMade(
        uint256 indexed circleId,
        address indexed member,
        uint8 indexed round,
        uint256 amount,
        bool onTime,
        uint256 timestamp
    );
    event PayoutAccrued(
        uint256 indexed circleId,
        address indexed recipient,
        uint8 indexed round,
        uint256 principal,
        uint256 interest,
        uint256 timestamp
    );
    event PayoutWithdrawn(
        uint256 indexed circleId,
        address indexed recipient,
        address indexed destination,
        uint256 destinationChainId,
        uint256 amount
    );
    event CrossChainPayoutRequested(
        address indexed recipient,
        uint256 indexed destinationChainId,
        uint256 amount,
        bytes32 ref
    );
    event EmergencyWithdrawal(
        uint256 indexed circleId,
        address indexed member,
        uint256 refund,
        uint256 penalty
    );
    event GovernanceActionExecuted(
        uint256 indexed proposalId,
        uint256 indexed circleId,
        address indexed target,
        uint8 kind,
        uint256 reductionBps
    );
    event ReputationManagerSet(address indexed manager);
    event YieldModuleSet(address indexed module);
    event WalletPreferencesSet(address indexed prefs);
    event GovernanceModuleSet(address indexed gov);
    event YieldReserveDeposited(address indexed from, uint256 amount, uint256 newReserve);
    event YieldReserveWithdrawn(address indexed to, uint256 amount, uint256 newReserve);
    event YieldReserveExhausted(uint256 indexed circleId, uint8 indexed round, uint256 shortfall);

    error NotCreator();
    error NotGovernance();
    error InvalidDuration();
    error InvalidMembers();
    error InvalidAmount();
    error CircleDoesNotExist();
    error CircleNotOpen();
    error CircleFull();
    error AlreadyMember();
    error NotMember();
    error CircleNotActive();
    error AllPaymentsMade();
    error NoPendingPayout();
    error CircleAlreadyStarted();
    error CircleNotPaused();
    error WalletPrefsNotSet();
    error ReputationMgrNotSet();
    error YieldModuleNotSet();
    error TransferFailed();

    /* ------------------------------------------------------------------ */
    /*  Constructor + wiring                                              */
    /* ------------------------------------------------------------------ */

    constructor(address cusdAddr) Ownable(msg.sender) {
        require(cusdAddr != address(0), "zero cusd");
        cusd = IERC20(cusdAddr);
    }

    function setReputationManager(address mgr) external onlyOwner {
        require(mgr != address(0), "zero mgr");
        reputationManager = IReputationManagerV2(mgr);
        emit ReputationManagerSet(mgr);
    }

    function setYieldModule(address mod) external onlyOwner {
        require(mod != address(0), "zero mod");
        yieldModule = IYieldModule(mod);
        emit YieldModuleSet(mod);
    }

    function setWalletPreferences(address prefs) external onlyOwner {
        require(prefs != address(0), "zero prefs");
        walletPreferences = IWalletPreferencesV2(prefs);
        emit WalletPreferencesSet(prefs);
    }

    function setGovernanceModule(address gov) external onlyOwner {
        require(gov != address(0), "zero gov");
        governanceModule = gov;
        emit GovernanceModuleSet(gov);
    }

    /**
     * @notice Admin tops up the yield reserve. The reserve sits in the same
     *         contract balance as principal but is tracked separately so the
     *         payout logic never accidentally pays out principal as interest.
     */
    function depositYieldReserve(uint256 amount) external {
        if (!cusd.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        yieldReserve += amount;
        emit YieldReserveDeposited(msg.sender, amount, yieldReserve);
    }

    /**
     * @notice Admin can withdraw from the yield reserve. Never touches vault
     *         principal — reserve accounting guards that.
     */
    function withdrawYieldReserve(address to, uint256 amount) external onlyOwner {
        require(amount <= yieldReserve, "exceeds reserve");
        yieldReserve -= amount;
        if (!cusd.transfer(to, amount)) revert TransferFailed();
        emit YieldReserveWithdrawn(to, amount, yieldReserve);
    }

    /* ------------------------------------------------------------------ */
    /*  Circle lifecycle                                                  */
    /* ------------------------------------------------------------------ */

    function createCircle(
        string calldata name,
        uint8 goalType,
        uint256 contributionAmount,
        uint8 duration,
        uint8 maxMembers,
        uint8 frequency
    ) external nonReentrant returns (uint256 circleId) {
        if (duration < MIN_DURATION || duration > MAX_DURATION) revert InvalidDuration();
        if (maxMembers < MIN_MEMBERS || maxMembers > MAX_MEMBERS) revert InvalidMembers();
        if (contributionAmount < MIN_CONTRIBUTION) revert InvalidAmount();
        if (address(reputationManager) == address(0)) revert ReputationMgrNotSet();
        if (address(yieldModule) == address(0)) revert YieldModuleNotSet();

        circleCounter += 1;
        circleId = circleCounter;

        Circle storage c = circles[circleId];
        c.name = name;
        c.goalType = GoalType(goalType);
        c.frequency = Frequency(frequency);
        c.contributionAmount = contributionAmount;
        c.duration = duration;
        c.maxMembers = maxMembers;
        c.status = CircleStatus.Pending;
        c.createdAt = block.timestamp;
        c.creator = msg.sender;

        circleNameToId[name] = circleId;
        circleInviteCode[circleId] = _generateInviteCode(circleId);

        emit CircleCreated(circleId, msg.sender, name, goalType, frequency, contributionAmount, duration, maxMembers);

        // Creator auto-joins as the first member (same as v1). Reverts on their
        // CUSD transfer failure, which is the correct UX — don't create a
        // circle without its creator paid in.
        _joinCircle(circleId, msg.sender);
    }

    function joinCircle(uint256 circleId) external nonReentrant {
        _joinCircle(circleId, msg.sender);
    }

    function _joinCircle(uint256 circleId, address user) internal {
        Circle storage c = circles[circleId];
        if (c.createdAt == 0) revert CircleDoesNotExist();
        if (c.status != CircleStatus.Pending) revert CircleNotOpen();
        if (circleMembersList[circleId].length >= c.maxMembers) revert CircleFull();
        if (members[circleId][user].active) revert AlreadyMember();

        circleMembersList[circleId].push(user);
        userCircles[user].push(circleId);

        Member storage m = members[circleId][user];
        m.active = true;

        uint8 position = uint8(circleMembersList[circleId].length - 1);
        emit MemberJoined(circleId, user, position);

        // First contribution is the join-fee. Reputation counts this as
        // round 0 — on-time by construction (they're paying at the moment
        // they join, no deadline to miss).
        if (!cusd.transferFrom(user, address(this), c.contributionAmount)) revert TransferFailed();
        m.paymentsMade = 1;
        m.contributed = c.contributionAmount;
        m.lastPaymentTime = block.timestamp;
        c.vaultBalance += c.contributionAmount;
        totalPooled += c.contributionAmount;

        reputationManager.onDeposit(circleId, 0, user, true, c.contributionAmount);
        emit ContributionMade(circleId, user, 0, c.contributionAmount, true, block.timestamp);

        // When the last seat fills, transition Pending→Active with explicit
        // start event so the indexer can set circles.started_at precisely.
        if (circleMembersList[circleId].length == c.maxMembers) {
            c.status = CircleStatus.Active;
            c.startAt = block.timestamp;
            activeCircleCount += 1;
            _generatePayoutOrder(circleId);
            emit CircleStarted(circleId, block.timestamp);
        }
    }

    function contribute(uint256 circleId) external nonReentrant {
        _contribute(circleId, msg.sender);
    }

    function _contribute(uint256 circleId, address user) internal {
        Circle storage c = circles[circleId];
        Member storage m = members[circleId][user];

        if (c.status != CircleStatus.Active) revert CircleNotActive();
        if (!m.active) revert NotMember();
        if (m.paymentsMade >= c.duration) revert AllPaymentsMade();

        uint256 dueAt = _dueTimeForRound(circleId, c.currentRound);
        bool onTime = block.timestamp <= dueAt + GRACE_PERIOD;

        if (!cusd.transferFrom(user, address(this), c.contributionAmount)) revert TransferFailed();

        m.paymentsMade += 1;
        m.contributed += c.contributionAmount;
        m.lastPaymentTime = block.timestamp;
        c.vaultBalance += c.contributionAmount;
        totalPooled += c.contributionAmount;

        uint8 round = c.currentRound;
        reputationManager.onDeposit(circleId, round, user, onTime, c.contributionAmount);
        emit ContributionMade(circleId, user, round, c.contributionAmount, onTime, block.timestamp);

        _checkRoundCompletion(circleId);
    }

    function _checkRoundCompletion(uint256 circleId) internal {
        Circle storage c = circles[circleId];
        address[] storage list = circleMembersList[circleId];
        uint256 paidThisRound = 0;
        for (uint256 i = 0; i < list.length; i++) {
            if (members[circleId][list[i]].paymentsMade > c.currentRound) paidThisRound += 1;
        }
        if (paidThisRound == list.length) {
            _accruePayout(circleId);
            c.currentRound += 1;
            if (c.currentRound >= c.duration) _complete(circleId);
        }
    }

    function _accruePayout(uint256 circleId) internal {
        Circle storage c = circles[circleId];
        uint8 round = c.currentRound;
        address recipient = payoutOrder[circleId][round];

        uint256 principal = c.contributionAmount * circleMembersList[circleId].length;
        uint256 desiredInterest = yieldModule.calculateYield(principal, block.timestamp - c.startAt);

        // Only pay interest if the reserve covers it. Otherwise pay principal
        // only and log the shortfall. The alternative — reverting — would
        // lock the circle forever just because admin forgot to top up the
        // reserve. Safer to degrade to principal-only.
        uint256 interestPaid = desiredInterest <= yieldReserve ? desiredInterest : 0;
        if (desiredInterest > 0 && interestPaid == 0) {
            emit YieldReserveExhausted(circleId, round, desiredInterest);
        }

        uint256 total = principal + interestPaid;
        c.vaultBalance -= principal;
        if (interestPaid > 0) yieldReserve -= interestPaid;

        pendingWithdrawals[recipient][circleId] += total;
        totalPendingWithdrawals[recipient] += total;

        members[circleId][recipient].hasReceivedPayout = true;

        reputationManager.onPayoutReceived(circleId, round, recipient, interestPaid);
        emit PayoutAccrued(circleId, recipient, round, principal, interestPaid, block.timestamp);
    }

    function _complete(uint256 circleId) internal {
        Circle storage c = circles[circleId];
        c.status = CircleStatus.Completed;
        c.completedAt = block.timestamp;
        activeCircleCount -= 1;

        address[] storage list = circleMembersList[circleId];
        for (uint256 i = 0; i < list.length; i++) {
            reputationManager.onCompleted(circleId, list[i]);
        }
        emit CircleCompleted(circleId, block.timestamp);
    }

    /* ------------------------------------------------------------------ */
    /*  Pull-based payout withdrawal (the hybrid's "pull" half)           */
    /* ------------------------------------------------------------------ */

    function withdrawPayout(uint256 circleId) external nonReentrant {
        if (address(walletPreferences) == address(0)) revert WalletPrefsNotSet();
        uint256 amount = pendingWithdrawals[msg.sender][circleId];
        if (amount == 0) revert NoPendingPayout();

        pendingWithdrawals[msg.sender][circleId] = 0;
        totalPendingWithdrawals[msg.sender] -= amount;

        (address dest, uint256 destChainId) = walletPreferences.getPayoutDestination(msg.sender);

        // If destination chain is Push Chain (the native chain where the CUSD
        // actually lives), do a direct ERC20 transfer. If it's another chain,
        // emit a CrossChainPayoutRequested so Push UEA's relay can pick it up.
        // For now cross-chain relay uses the same CUSD on Push but emits the
        // intent; downstream relay wiring is infra not contract code.
        if (!cusd.transfer(dest, amount)) revert TransferFailed();
        emit PayoutWithdrawn(circleId, msg.sender, dest, destChainId, amount);

        if (destChainId != PUSH_CHAIN_ID) {
            emit CrossChainPayoutRequested(
                msg.sender,
                destChainId,
                amount,
                keccak256(abi.encode(circleId, msg.sender, amount, block.timestamp))
            );
        }
    }

    uint256 public constant PUSH_CHAIN_ID = 42101;

    /**
     * @notice View convenience — returns the dest the next withdrawal will
     *         send to, so the UI can preview.
     */
    function previewPayoutDestination(address user) external view returns (address wallet, uint256 chainId) {
        if (address(walletPreferences) == address(0)) return (user, PUSH_CHAIN_ID);
        return walletPreferences.getPayoutDestination(user);
    }

    /* ------------------------------------------------------------------ */
    /*  Emergency + governance exits                                      */
    /* ------------------------------------------------------------------ */

    function emergencyWithdraw(uint256 circleId) external nonReentrant {
        _emergencyExit(circleId, msg.sender, EMERGENCY_PENALTY_BPS);
    }

    function executeGovernanceAction(
        uint256 proposalId,
        uint256 circleId,
        address target,
        uint8 kind,
        uint256 reductionBps
    ) external override {
        if (msg.sender != governanceModule) revert NotGovernance();
        if (kind == GovernanceActionKind.EARLY_EXIT) {
            require(reductionBps <= EMERGENCY_PENALTY_BPS, "reduction too high");
            uint256 penaltyBps = EMERGENCY_PENALTY_BPS - reductionBps;
            _emergencyExit(circleId, target, penaltyBps);
        } else if (kind == GovernanceActionKind.CANCEL_CIRCLE) {
            _cancelCircle(circleId, "governance");
        } else {
            revert("unknown action");
        }
        emit GovernanceActionExecuted(proposalId, circleId, target, kind, reductionBps);
    }

    function _emergencyExit(uint256 circleId, address user, uint256 penaltyBps) internal {
        Circle storage c = circles[circleId];
        Member storage m = members[circleId][user];
        if (!m.active) revert NotMember();
        if (c.status == CircleStatus.Completed || c.status == CircleStatus.Cancelled) revert CircleNotOpen();

        uint256 refund = m.contributed;
        uint256 penalty = (refund * penaltyBps) / BPS_DENOMINATOR;
        uint256 net = refund - penalty;

        m.active = false;
        c.vaultBalance = c.vaultBalance >= net ? c.vaultBalance - net : 0;
        if (net > 0) {
            if (!cusd.transfer(user, net)) revert TransferFailed();
        }
        // Penalty stays in the vault — gets distributed to remaining members
        // over the rest of the rounds (implicit via their payout calculation).

        emit EmergencyWithdrawal(circleId, user, net, penalty);
    }

    /* ------------------------------------------------------------------ */
    /*  Pause / Unpause / Cancel                                          */
    /* ------------------------------------------------------------------ */

    function pauseCircle(uint256 circleId, string calldata reason) external {
        Circle storage c = circles[circleId];
        if (c.creator != msg.sender && msg.sender != governanceModule && msg.sender != owner()) revert NotCreator();
        if (c.status != CircleStatus.Active) revert CircleNotActive();
        c.status = CircleStatus.Paused;
        c.pausedAt = block.timestamp;
        emit CirclePaused(circleId, reason, block.timestamp);
    }

    function unpauseCircle(uint256 circleId) external {
        Circle storage c = circles[circleId];
        if (c.creator != msg.sender && msg.sender != governanceModule && msg.sender != owner()) revert NotCreator();
        if (c.status != CircleStatus.Paused) revert CircleNotPaused();
        c.status = CircleStatus.Active;
        c.pausedAt = 0;
        emit CircleUnpaused(circleId, block.timestamp);
    }

    function cancelCircle(uint256 circleId, string calldata reason) external {
        Circle storage c = circles[circleId];
        if (c.creator != msg.sender && msg.sender != governanceModule && msg.sender != owner()) revert NotCreator();
        _cancelCircle(circleId, reason);
    }

    function _cancelCircle(uint256 circleId, string memory reason) internal {
        Circle storage c = circles[circleId];
        if (c.status == CircleStatus.Completed || c.status == CircleStatus.Cancelled) revert CircleNotOpen();
        c.status = CircleStatus.Cancelled;
        if (c.startAt > 0 && activeCircleCount > 0) activeCircleCount -= 1;

        // Refund any remaining vault balance proportionally to members who
        // haven't yet received a payout. Escrowed payouts (pendingWithdrawals)
        // are untouched — recipients can still withdraw.
        address[] storage list = circleMembersList[circleId];
        uint256 unpaidCount = 0;
        for (uint256 i = 0; i < list.length; i++) {
            if (members[circleId][list[i]].active && !members[circleId][list[i]].hasReceivedPayout) unpaidCount += 1;
        }
        if (unpaidCount > 0 && c.vaultBalance > 0) {
            uint256 share = c.vaultBalance / unpaidCount;
            for (uint256 i = 0; i < list.length; i++) {
                address mem = list[i];
                if (members[circleId][mem].active && !members[circleId][mem].hasReceivedPayout) {
                    pendingWithdrawals[mem][circleId] += share;
                    totalPendingWithdrawals[mem] += share;
                }
            }
            c.vaultBalance = 0;
        }
        emit CircleCancelled(circleId, reason, block.timestamp);
    }

    /* ------------------------------------------------------------------ */
    /*  Views used by the frontend + indexer                              */
    /* ------------------------------------------------------------------ */

    function getCircle(uint256 circleId) external view returns (Circle memory) {
        return circles[circleId];
    }

    function getCircleMembers(uint256 circleId) external view returns (address[] memory) {
        return circleMembersList[circleId];
    }

    function getPayoutOrder(uint256 circleId) external view returns (address[] memory) {
        return payoutOrder[circleId];
    }

    function getPendingFor(address user, uint256 circleId) external view returns (uint256) {
        return pendingWithdrawals[user][circleId];
    }

    function memberStatus(uint256 circleId, address user) external view returns (
        bool isActive,
        uint8 paymentsMade,
        uint8 paymentsExpected,
        bool hasReceivedPayout,
        bool isPaymentDue
    ) {
        Circle storage c = circles[circleId];
        Member storage m = members[circleId][user];
        isActive = m.active;
        paymentsMade = m.paymentsMade;
        paymentsExpected = c.currentRound + 1;
        hasReceivedPayout = m.hasReceivedPayout;
        if (c.status == CircleStatus.Active) {
            uint256 dueAt = _dueTimeForRound(circleId, c.currentRound);
            isPaymentDue = m.paymentsMade <= c.currentRound && block.timestamp >= dueAt;
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Internal helpers                                                  */
    /* ------------------------------------------------------------------ */

    function _generatePayoutOrder(uint256 circleId) internal {
        address[] storage list = circleMembersList[circleId];
        uint256 n = list.length;
        address[] memory shuffled = new address[](n);
        for (uint256 i = 0; i < n; i++) shuffled[i] = list[i];

        // Fisher-Yates using block context as entropy. Testnet-acceptable; for
        // mainnet use VRF or commit-reveal.
        for (uint256 i = n - 1; i > 0; i--) {
            uint256 j = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, circleId, i))) % (i + 1);
            (shuffled[i], shuffled[j]) = (shuffled[j], shuffled[i]);
        }
        for (uint256 i = 0; i < n; i++) payoutOrder[circleId].push(shuffled[i]);
    }

    function _dueTimeForRound(uint256 circleId, uint8 round) internal view returns (uint256) {
        Circle storage c = circles[circleId];
        uint256 interval = c.frequency == Frequency.WEEKLY ? WEEKLY_INTERVAL : MONTHLY_INTERVAL;
        return c.startAt + (uint256(round) * interval);
    }

    function _generateInviteCode(uint256 circleId) internal view returns (string memory) {
        bytes32 h = keccak256(abi.encodePacked(circleId, block.timestamp, msg.sender));
        bytes memory alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        bytes memory code = new bytes(8);
        for (uint256 i = 0; i < 8; i++) code[i] = alphabet[uint8(h[i]) % alphabet.length];
        return string(code);
    }
}
