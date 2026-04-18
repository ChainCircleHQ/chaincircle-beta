// GovernanceModuleV2 hooks.
//
// v2 governance model:
//   - Silver/Gold can propose. Anyone with voteWeight > 0 can vote.
//   - Proposal kinds: EarlyExit (reduce a member's penalty for emergency exit),
//                     CancelCircle (nuke a stuck/abandoned circle).
//   - Voting weight = reputation.voteWeight (Gold=2, Silver=1, else 0).
//   - Quorum = snapshotElectorateWeight * QUORUM_NUMERATOR / QUORUM_DENOMINATOR,
//     measured on the sum of YES votes.
//   - After deadline + quorum met, anyone can call execute(proposalId) — the
//     module then calls core.executeGovernanceAction to enact the outcome.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { useCircleContract } from './useCircleContract';
import { CONTRACT_ADDRESSES } from '../constants/contracts';
import GovernanceABI from '../abis/v2/GovernanceModuleV2.json';
import { sendUniversalTx } from '../lib/pushchainTx';

const iface = ethers.Interface.from(GovernanceABI.abi);

export const PROPOSAL_KIND = {
  EARLY_EXIT: 0,
  CANCEL_CIRCLE: 1,
};

export const PROPOSAL_STATUS = {
  PENDING: 0,
  PASSED: 1,
  FAILED: 2,
  EXECUTED: 3,
};

const STATUS_LABEL = ['Active', 'Passed', 'Failed', 'Executed'];
const KIND_LABEL = ['Early exit', 'Cancel circle'];

function formatProposal(p) {
  const deadline = Number(p.deadline);
  const now = Math.floor(Date.now() / 1000);
  return {
    id: Number(p.id),
    circleId: Number(p.circleId),
    kind: Number(p.kind),
    kindLabel: KIND_LABEL[Number(p.kind)] || 'Unknown',
    proposer: p.proposer,
    target: p.target,
    reductionBps: Number(p.reductionBps),
    justification: p.justification,
    createdAt: Number(p.createdAt),
    deadline,
    yesWeight: p.yesWeight, // bigint
    noWeight: p.noWeight,   // bigint
    status: Number(p.status),
    statusLabel: STATUS_LABEL[Number(p.status)] || 'Unknown',
    executedAt: Number(p.executedAt),
    secondsRemaining: Math.max(0, deadline - now),
    isOpen: Number(p.status) === PROPOSAL_STATUS.PENDING && deadline > now,
  };
}

// Single-proposal read — used by detail views.
export function useProposal(proposalId) {
  const { getContract, isConnected } = useCircleContract();
  return useQuery({
    queryKey: ['governance.proposal', proposalId],
    queryFn: async () => {
      const gov = await getContract('governance');
      const p = await gov.getProposal(proposalId);
      return formatProposal(p);
    },
    enabled: isConnected && proposalId != null,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

// All active proposals (walks nextProposalId backwards — bounded for sanity).
export function useAllProposals({ limit = 50 } = {}) {
  const { getContract, isConnected } = useCircleContract();
  return useQuery({
    queryKey: ['governance.all', limit],
    queryFn: async () => {
      const gov = await getContract('governance');
      const next = Number(await gov.nextProposalId());
      if (next <= 1) return [];
      const first = Math.max(1, next - limit);
      const ids = [];
      for (let i = next - 1; i >= first; i--) ids.push(i);
      const proposals = await Promise.all(
        ids.map((id) => gov.getProposal(id).then(formatProposal).catch(() => null))
      );
      return proposals.filter(Boolean);
    },
    enabled: isConnected,
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}

// Has the connected user already voted on this proposal?
export function useHasVoted(proposalId) {
  const { getContract, userAddress, isConnected } = useCircleContract();
  return useQuery({
    queryKey: ['governance.hasVoted', proposalId, userAddress],
    queryFn: async () => {
      const gov = await getContract('governance');
      return gov.hasVoted(proposalId, userAddress);
    },
    enabled: isConnected && !!userAddress && proposalId != null,
    staleTime: 15_000,
  });
}

// User's vote weight (0 = can't vote, 1 = Silver, 2 = Gold).
export function useVoteWeight() {
  const { getContract, userAddress, isConnected } = useCircleContract();
  return useQuery({
    queryKey: ['governance.voteWeight', userAddress],
    queryFn: async () => {
      const rep = await getContract('reputation');
      const weight = await rep.voteWeight(userAddress);
      return Number(weight);
    },
    enabled: isConnected && !!userAddress,
    staleTime: 60_000,
  });
}

export function useProposeEarlyExit() {
  const { pushChainClient, isInitialized, userAddress } = useCircleContract();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ circleId, target, reductionBps, justification, duration }) => {
      if (!isInitialized || !pushChainClient || !userAddress) {
        throw new Error('Wallet not connected');
      }
      if (!target || !ethers.isAddress(target)) throw new Error('Invalid target address');
      if (reductionBps < 0 || reductionBps > 10000) {
        throw new Error('Reduction must be 0–10000 bps');
      }
      if (!justification || justification.trim().length < 10) {
        throw new Error('Please provide a justification (min 10 chars)');
      }
      const data = iface.encodeFunctionData('proposeEarlyExit', [
        circleId, target, reductionBps, justification.trim(), duration,
      ]);
      return sendUniversalTx(pushChainClient, {
        to: CONTRACT_ADDRESSES.GOVERNANCE_MODULE, data, value: 0n,
      }, { label: 'Creating proposal' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance.all'] });
    },
  });
}

export function useProposeCancelCircle() {
  const { pushChainClient, isInitialized, userAddress } = useCircleContract();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ circleId, justification, duration }) => {
      if (!isInitialized || !pushChainClient || !userAddress) {
        throw new Error('Wallet not connected');
      }
      if (!justification || justification.trim().length < 10) {
        throw new Error('Please provide a justification (min 10 chars)');
      }
      const data = iface.encodeFunctionData('proposeCancelCircle', [
        circleId, justification.trim(), duration,
      ]);
      return sendUniversalTx(pushChainClient, {
        to: CONTRACT_ADDRESSES.GOVERNANCE_MODULE, data, value: 0n,
      }, { label: 'Creating proposal' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance.all'] });
    },
  });
}

export function useVote() {
  const { pushChainClient, isInitialized, userAddress } = useCircleContract();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ proposalId, support }) => {
      if (!isInitialized || !pushChainClient || !userAddress) {
        throw new Error('Wallet not connected');
      }
      const data = iface.encodeFunctionData('vote', [proposalId, support]);
      return sendUniversalTx(pushChainClient, {
        to: CONTRACT_ADDRESSES.GOVERNANCE_MODULE, data, value: 0n,
      }, { label: support ? 'Voting yes' : 'Voting no' });
    },
    onSuccess: (_, { proposalId }) => {
      queryClient.invalidateQueries({ queryKey: ['governance.proposal', proposalId] });
      queryClient.invalidateQueries({ queryKey: ['governance.hasVoted', proposalId] });
      queryClient.invalidateQueries({ queryKey: ['governance.all'] });
    },
  });
}

export function useExecuteProposal() {
  const { pushChainClient, isInitialized, userAddress } = useCircleContract();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (proposalId) => {
      if (!isInitialized || !pushChainClient || !userAddress) {
        throw new Error('Wallet not connected');
      }
      const data = iface.encodeFunctionData('execute', [proposalId]);
      return sendUniversalTx(pushChainClient, {
        to: CONTRACT_ADDRESSES.GOVERNANCE_MODULE, data, value: 0n,
      }, { label: 'Executing proposal' });
    },
    onSuccess: (_, proposalId) => {
      queryClient.invalidateQueries({ queryKey: ['governance.proposal', proposalId] });
      queryClient.invalidateQueries({ queryKey: ['governance.all'] });
    },
  });
}
