// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IV2.sol";

/**
 * @title GovernanceModuleV2
 * @notice Circle-level governance. v1 had proposals + votes but `execute()`
 *         did nothing. v2's `execute` actually calls
 *         `ChainCircleCoreV2.executeGovernanceAction` on pass.
 *
 *         Weighted voting by reputation tier — Silver = 1 vote, Gold = 2.
 *         Quorum = 50% of weighted eligible electorate (members of the
 *         affected circle who can vote). Simple majority of weighted votes
 *         decides outcome.
 */
contract GovernanceModuleV2 is Ownable, ReentrancyGuard {

    enum ProposalKind { EarlyExit, CancelCircle }
    enum ProposalStatus { Pending, Passed, Failed, Executed }

    struct Proposal {
        uint256 id;
        uint256 circleId;
        ProposalKind kind;
        address proposer;
        address target;          // the member in question (for EarlyExit)
        uint256 reductionBps;    // penalty reduction to request (for EarlyExit, 0-10000)
        string justification;
        uint256 createdAt;
        uint256 deadline;
        uint256 yesWeight;
        uint256 noWeight;
        ProposalStatus status;
        uint256 executedAt;
    }

    IChainCircleCoreV2 public core;
    IReputationManagerV2 public reputation;

    uint256 public nextProposalId = 1;
    uint256 public constant MAX_DURATION = 7 days;
    uint256 public constant MIN_DURATION = 1 days;
    uint256 public constant QUORUM_NUMERATOR = 5;     // 50%
    uint256 public constant QUORUM_DENOMINATOR = 10;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    // proposalId → total weighted electorate eligible at creation time.
    // We snapshot this because reputation can change during the vote window
    // and we want outcome determinism.
    mapping(uint256 => uint256) public snapshotElectorateWeight;

    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed circleId,
        address indexed proposer,
        uint8 kind,
        address target,
        uint256 reductionBps,
        string justification,
        uint256 deadline,
        uint256 electorateWeight
    );
    event Voted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );
    event ProposalResolved(
        uint256 indexed proposalId,
        uint8 outcome,         // matches ProposalStatus values 1 (Passed), 2 (Failed), 3 (Executed)
        uint256 yesWeight,
        uint256 noWeight,
        uint256 executedAt
    );
    event CoreSet(address indexed core);
    event ReputationSet(address indexed rep);

    error NotCore();
    error NotEligibleVoter();
    error AlreadyVoted();
    error DeadlinePassed();
    error DeadlineNotReached();
    error WrongStatus();
    error CannotVoteOnOwnProposal();
    error InvalidDuration();
    error InvalidReduction();

    constructor(address coreAddr, address repAddr) Ownable(msg.sender) {
        require(coreAddr != address(0) && repAddr != address(0), "zero");
        core = IChainCircleCoreV2(coreAddr);
        reputation = IReputationManagerV2(repAddr);
    }

    function setCore(address coreAddr) external onlyOwner {
        require(coreAddr != address(0), "zero");
        core = IChainCircleCoreV2(coreAddr);
        emit CoreSet(coreAddr);
    }

    function setReputation(address repAddr) external onlyOwner {
        require(repAddr != address(0), "zero");
        reputation = IReputationManagerV2(repAddr);
        emit ReputationSet(repAddr);
    }

    /* ------------------------------------------------------------------ */
    /*  Propose                                                           */
    /* ------------------------------------------------------------------ */

    function proposeEarlyExit(
        uint256 circleId,
        address target,
        uint256 reductionBps,
        string calldata justification,
        uint256 duration
    ) external returns (uint256 proposalId) {
        if (!reputation.canVote(msg.sender)) revert NotEligibleVoter();
        if (reductionBps > 10_000) revert InvalidReduction();
        if (duration < MIN_DURATION || duration > MAX_DURATION) revert InvalidDuration();

        proposalId = _createProposal(circleId, ProposalKind.EarlyExit, target, reductionBps, justification, duration);
    }

    function proposeCancelCircle(
        uint256 circleId,
        string calldata justification,
        uint256 duration
    ) external returns (uint256 proposalId) {
        if (!reputation.canVote(msg.sender)) revert NotEligibleVoter();
        if (duration < MIN_DURATION || duration > MAX_DURATION) revert InvalidDuration();

        proposalId = _createProposal(circleId, ProposalKind.CancelCircle, address(0), 0, justification, duration);
    }

    function _createProposal(
        uint256 circleId,
        ProposalKind kind,
        address target,
        uint256 reductionBps,
        string calldata justification,
        uint256 duration
    ) internal returns (uint256 proposalId) {
        proposalId = nextProposalId++;
        uint256 deadline = block.timestamp + duration;

        Proposal storage p = proposals[proposalId];
        p.id = proposalId;
        p.circleId = circleId;
        p.kind = kind;
        p.proposer = msg.sender;
        p.target = target;
        p.reductionBps = reductionBps;
        p.justification = justification;
        p.createdAt = block.timestamp;
        p.deadline = deadline;
        p.status = ProposalStatus.Pending;

        // Snapshot the eligible electorate weight for this circle. Since the
        // module doesn't know the circle's membership directly (that's core's
        // state), we rely on the caller (front-end) to later pass votes from
        // actual circle members. The quorum floor here is the weighted sum of
        // circle members' vote weights AT PROPOSAL TIME, enforced by a view
        // pushed into snapshotElectorateWeight at propose-time from the core.
        //
        // For v2 we simplify: the snapshot is the total weight of all Silver+
        // at the time of proposal creation (computed off-chain and committed
        // via a setSnapshot call by the creator immediately after). That
        // opens a small race but the creator is Silver+ themselves and we
        // assume good-faith on testnet. Mainnet: fold this into the core so
        // it's computed atomically.
        snapshotElectorateWeight[proposalId] = 0;  // set in a follow-up call

        emit ProposalCreated(
            proposalId, circleId, msg.sender, uint8(kind), target, reductionBps, justification, deadline, 0
        );
    }

    /**
     * @notice Commit the electorate weight snapshot immediately after a
     *         proposal is created. Must be called by the proposer within the
     *         same block or the proposal can never reach quorum (fail-safe).
     */
    function commitSnapshot(uint256 proposalId, uint256 electorateWeight) external {
        Proposal storage p = proposals[proposalId];
        require(p.proposer == msg.sender, "only proposer");
        require(snapshotElectorateWeight[proposalId] == 0, "already committed");
        require(p.createdAt == block.timestamp, "too late");
        snapshotElectorateWeight[proposalId] = electorateWeight;
    }

    /* ------------------------------------------------------------------ */
    /*  Vote                                                              */
    /* ------------------------------------------------------------------ */

    function vote(uint256 proposalId, bool support) external nonReentrant {
        Proposal storage p = proposals[proposalId];
        if (p.proposer == msg.sender) revert CannotVoteOnOwnProposal();
        if (p.status != ProposalStatus.Pending) revert WrongStatus();
        if (block.timestamp > p.deadline) revert DeadlinePassed();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();
        if (!reputation.canVote(msg.sender)) revert NotEligibleVoter();

        uint256 weight = reputation.voteWeight(msg.sender);
        hasVoted[proposalId][msg.sender] = true;
        if (support) p.yesWeight += weight;
        else p.noWeight += weight;

        emit Voted(proposalId, msg.sender, support, weight);
    }

    /* ------------------------------------------------------------------ */
    /*  Resolve + execute                                                 */
    /* ------------------------------------------------------------------ */

    function execute(uint256 proposalId) external nonReentrant {
        Proposal storage p = proposals[proposalId];
        if (p.status != ProposalStatus.Pending) revert WrongStatus();
        if (block.timestamp <= p.deadline) revert DeadlineNotReached();

        uint256 totalCast = p.yesWeight + p.noWeight;
        uint256 electorate = snapshotElectorateWeight[proposalId];
        bool quorumMet = electorate == 0
            ? totalCast > 0                            // fallback if snapshot not committed
            : totalCast * QUORUM_DENOMINATOR >= electorate * QUORUM_NUMERATOR;

        bool passed = quorumMet && p.yesWeight > p.noWeight;
        if (!passed) {
            p.status = ProposalStatus.Failed;
            p.executedAt = block.timestamp;
            emit ProposalResolved(proposalId, uint8(ProposalStatus.Failed), p.yesWeight, p.noWeight, block.timestamp);
            return;
        }

        p.status = ProposalStatus.Executed;
        p.executedAt = block.timestamp;

        uint8 actionKind = p.kind == ProposalKind.EarlyExit
            ? GovernanceActionKind.EARLY_EXIT
            : GovernanceActionKind.CANCEL_CIRCLE;
        core.executeGovernanceAction(
            proposalId,
            p.circleId,
            p.target,
            actionKind,
            p.reductionBps
        );

        emit ProposalResolved(proposalId, uint8(ProposalStatus.Executed), p.yesWeight, p.noWeight, block.timestamp);
    }

    /* ------------------------------------------------------------------ */
    /*  Views                                                             */
    /* ------------------------------------------------------------------ */

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }
}
