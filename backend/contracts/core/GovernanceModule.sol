// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";

contract GovernanceModule is Ownable {

    enum ProposalStatus { Active, Passed, Rejected, Executed }

    struct Proposal {
        uint256 id;
        uint256 circleId;
        address targetMember;
        string justification;
        uint256 deadline;
        uint256 yesVotes;
        uint256 noVotes;
        ProposalStatus status;
        mapping(address => bool) hasVoted;
        bool exists;
    }

    address public circleCore;
    uint256 public proposalCounter;
    
    mapping(uint256 => Proposal) public proposals;

    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed circleId,
        address indexed targetMember,
        string justification,
        uint256 deadline
    );
    event Voted(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalExecuted(uint256 indexed proposalId, bool passed);

    constructor(address _circleCore) Ownable(msg.sender) {
        circleCore = _circleCore;
    }

    function proposeEarlyWithdrawal(
        uint256 circleId,
        address targetMember,
        string calldata justification,
        uint256 duration
    ) external returns (uint256) {
        require(duration > 0 && duration <= 7 days, "Invalid duration");
        require(targetMember != address(0), "Invalid target");

        proposalCounter++;
        uint256 proposalId = proposalCounter;

        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.circleId = circleId;
        proposal.targetMember = targetMember;
        proposal.justification = justification;
        proposal.deadline = block.timestamp + duration;
        proposal.status = ProposalStatus.Active;
        proposal.exists = true;

        emit ProposalCreated(proposalId, circleId, targetMember, justification, proposal.deadline);

        return proposalId;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.exists, "Proposal does not exist");
        require(block.timestamp < proposal.deadline, "Voting closed");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(proposal.status == ProposalStatus.Active, "Proposal not active");

        proposal.hasVoted[msg.sender] = true;

        if (support) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }

        emit Voted(proposalId, msg.sender, support);
    }

    function execute(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.exists, "Proposal does not exist");
        require(block.timestamp >= proposal.deadline, "Voting still active");
        require(proposal.status == ProposalStatus.Active, "Already executed");

        proposal.status = ProposalStatus.Executed;

        bool passed = proposal.yesVotes > proposal.noVotes;

        emit ProposalExecuted(proposalId, passed);
    }

    function getProposal(uint256 proposalId) 
        external 
        view 
        returns (
            uint256 circleId,
            address targetMember,
            string memory justification,
            uint256 deadline,
            uint256 yesVotes,
            uint256 noVotes,
            ProposalStatus status
        ) 
    {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.exists, "Proposal does not exist");
        
        return (
            proposal.circleId,
            proposal.targetMember,
            proposal.justification,
            proposal.deadline,
            proposal.yesVotes,
            proposal.noVotes,
            proposal.status
        );
    }

    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return proposals[proposalId].hasVoted[voter];
    }
}