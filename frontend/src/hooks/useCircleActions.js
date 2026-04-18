// Write-path hooks for ChainCircleCoreV2. Every call goes through sendUniversalTx
// so the TxProgressBanner shows signing → confirming → confirmed and gateway
// indexer lag is recovered via trackTransaction(hash).
//
// v2 differences from v1:
//   - `circles(id)` / `getCircle(id)` returns struct with `contributionAmount`
//     (v1 was `amount`). No `getCircleDetails` — that function never existed
//     in v2; we read the struct via `circles(id)`.
//   - `withdrawPayout(circleId)` is now a real pull: the contract escrows the
//     net payout in `pendingWithdrawals[user][circleId]` after finalizeRound
//     runs on the last contribution of the round; the member pulls when ready.
//   - `contribute` / finalize-last-payment triggers mandatory reputation +
//     badge callbacks, so the indexer will pick up ScoreChanged / BadgeMinted
//     events automatically.
//   - `emergencyWithdraw` still returns 90%, plus a 10% penalty goes into the
//     vault; reputation is slashed via mandatory callback.

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useCircleContract } from './useCircleContract';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../constants/contracts';
import ChainCircleCoreABI from '../abis/v2/ChainCircleCoreV2.json';
import CUSDABI from '../abis/CUSD.json';
import { sendUniversalTx } from '../lib/pushchainTx';
import { pokeIndexerSoon } from '../lib/pokeIndexer';

// Query keys the read hooks actually use (see useCircleData.js).
// invalidating any of these with their `.db` suffix matches; without it
// React Query doesn't find them and the UI stays stuck on stale data.
const REFRESH_KEYS = [
  ['userCircles.db'],
  ['activeCircles.db'],
  ['circleDetails.db'],
  ['recentActivities.db'],
  ['userStats.db'],
  ['globalStats.db'],
  ['payoutHistory.db'],
  ['upcomingPayouts.db'],
  ['searchCircles.db'],
  ['pendingPayouts'],
  ['crossChainPayouts'],
  ['circleEvents'],
  ['tierChanges'],
  ['notifications.db'],
  ['memberStatus'],
  ['payoutDestination'],
  ['cusdBalance'],
];

// Common post-write refresh: fire the indexer so new events land in
// Supabase within ~2s, then wait a tick and invalidate every read-side
// query so the UI picks up the fresh rows. Safe to call more than once.
function scheduleRefresh(queryClient) {
  pokeIndexerSoon(2500);
  // Invalidate now (in case query result is already stale from a prior tx)
  // AND on a short delay (after the indexer has actually written).
  const invalidateAll = () => {
    for (const key of REFRESH_KEYS) queryClient.invalidateQueries({ queryKey: key });
  };
  invalidateAll();
  setTimeout(invalidateAll, 4500);
}

const coreIface = ethers.Interface.from(ChainCircleCoreABI.abi);
const cusdIface = ethers.Interface.from(CUSDABI.abi);

// Required common precondition for any write path. Throws a user-friendly
// error if the wallet isn't connected / initialized / universal client ready.
function requireWallet({ isInitialized, pushChainClient, userAddress }) {
  if (!isInitialized || !pushChainClient) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }
  if (!pushChainClient.universal?.sendTransaction) {
    throw new Error('Push Chain client not ready. Reconnect and try again.');
  }
  if (!userAddress) {
    throw new Error('Wallet address unavailable. Please reconnect your wallet.');
  }
}

// Returns the CUSD contribution amount for a circle (v2: `circles(id)` struct).
async function getContributionAmount(getContract, circleId) {
  const contract = await getContract('core');
  const c = await contract.circles(circleId);
  const amount = c.contributionAmount;
  if (amount === undefined || amount === null) {
    throw new Error(`Circle ${circleId} not found`);
  }
  return amount;
}

// Step 1 of every circle write: ensure CUSD allowance >= needed. Only
// submits an approve tx if allowance is insufficient. Prevents the UI from
// forcing users to pay gas on every join/contribute.
async function ensureApproval({ pushChainClient, userAddress, getContract, amountNeeded, label }) {
  const cusd = await getContract('cusd');
  const current = await cusd.allowance(userAddress, CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE);
  if (current >= amountNeeded) return; // already approved

  const approveData = cusdIface.encodeFunctionData('approve', [
    CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE,
    amountNeeded,
  ]);
  const res = await sendUniversalTx(pushChainClient, {
    to: CONTRACT_ADDRESSES.CUSD,
    data: approveData,
    value: 0n,
  }, { label: label || 'Approving CUSD' });
  if (res.status === 'pending') {
    const e = new Error('Approval still pending on origin chain — wait a minute and retry.');
    e.pending = true;
    throw e;
  }
}

export function useCreateCircle() {
  const { pushChainClient, isInitialized, userAddress, getContract } = useCircleContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, goalType, amount, duration, maxMembers, frequency }) => {
      requireWallet({ isInitialized, pushChainClient, userAddress });

      // Defensive arg coercion — form values arrive as strings. uint8 + uint256
      // in the ABI; ethers accepts numeric strings but we pin types here so a
      // bad form value gets a clear error instead of a BigNumberish TypeError.
      const trimmedName = String(name || '').trim();
      if (!trimmedName) throw new Error('Circle name is required');
      if (trimmedName.length > 64) throw new Error('Circle name too long (max 64 chars)');

      const goalTypeInt = Number(goalType);
      const durationInt = Number(duration);
      const maxMembersInt = Number(maxMembers);
      const frequencyInt = Number(frequency);
      if (!Number.isInteger(goalTypeInt) || goalTypeInt < 0 || goalTypeInt > 255) {
        throw new Error('Invalid goal type');
      }
      if (!Number.isInteger(durationInt) || durationInt < 3 || durationInt > 12) {
        throw new Error('Duration must be between 3 and 12 months');
      }
      if (!Number.isInteger(maxMembersInt) || maxMembersInt < 3 || maxMembersInt > 12) {
        throw new Error('Members must be between 3 and 12');
      }
      if (frequencyInt !== 0 && frequencyInt !== 1) {
        throw new Error('Frequency must be Weekly or Monthly');
      }

      const amountInWei = ethers.parseUnits(String(amount), 6);
      if (amountInWei <= 0n) throw new Error('Contribution amount must be positive');

      // Balance preflight — show a clear error instead of a confusing revert.
      const cusd = await getContract('cusd');
      const balance = await cusd.balanceOf(userAddress);
      if (balance < amountInWei) {
        throw new Error(
          `Insufficient CUSD. You have ${ethers.formatUnits(balance, 6)} ` +
          `but the first contribution requires ${ethers.formatUnits(amountInWei, 6)}. ` +
          `Claim from the faucet first.`
        );
      }

      // Creator joins immediately → needs allowance for the first contribution.
      await ensureApproval({
        pushChainClient, userAddress, getContract,
        amountNeeded: amountInWei,
        label: 'Approving CUSD',
      });

      const createData = coreIface.encodeFunctionData('createCircle', [
        trimmedName,
        goalTypeInt,
        amountInWei,
        durationInt,
        maxMembersInt,
        frequencyInt,
      ]);

      return await sendUniversalTx(pushChainClient, {
        to: CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE,
        data: createData,
        value: 0n,
      }, { label: 'Creating circle' });
    },
    onSuccess: () => {
      scheduleRefresh(queryClient);
    },
  });
}

export function useJoinCircle() {
  const { pushChainClient, isInitialized, userAddress, getContract } = useCircleContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (circleId) => {
      requireWallet({ isInitialized, pushChainClient, userAddress });
      if (circleId == null) throw new Error('Missing circleId');

      const amountNeeded = await getContributionAmount(getContract, circleId);

      // Balance preflight.
      const cusd = await getContract('cusd');
      const balance = await cusd.balanceOf(userAddress);
      if (balance < amountNeeded) {
        throw new Error(
          `Insufficient CUSD. Need ${ethers.formatUnits(amountNeeded, 6)} to join, ` +
          `you have ${ethers.formatUnits(balance, 6)}. Claim from the faucet first.`
        );
      }

      await ensureApproval({
        pushChainClient, userAddress, getContract, amountNeeded,
        label: 'Approving CUSD',
      });

      const joinData = coreIface.encodeFunctionData('joinCircle', [circleId]);
      return await sendUniversalTx(pushChainClient, {
        to: CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE,
        data: joinData,
        value: 0n,
      }, { label: 'Joining circle' });
    },
    onSuccess: () => {
      scheduleRefresh(queryClient);
    },
  });
}

export function useContribute() {
  const { pushChainClient, isInitialized, userAddress, getContract } = useCircleContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (circleId) => {
      requireWallet({ isInitialized, pushChainClient, userAddress });
      if (circleId == null) throw new Error('Missing circleId');

      const amountNeeded = await getContributionAmount(getContract, circleId);

      const cusd = await getContract('cusd');
      const balance = await cusd.balanceOf(userAddress);
      if (balance < amountNeeded) {
        throw new Error(
          `Insufficient CUSD. Need ${ethers.formatUnits(amountNeeded, 6)}, ` +
          `you have ${ethers.formatUnits(balance, 6)}.`
        );
      }

      await ensureApproval({
        pushChainClient, userAddress, getContract, amountNeeded,
        label: 'Approving CUSD',
      });

      const contributeData = coreIface.encodeFunctionData('contribute', [circleId]);
      return await sendUniversalTx(pushChainClient, {
        to: CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE,
        data: contributeData,
        value: 0n,
      }, { label: 'Contributing' });
    },
    onSuccess: () => {
      scheduleRefresh(queryClient);
    },
  });
}

// v2 withdrawPayout is the real pull — reads from pendingWithdrawals and
// emits PayoutWithdrawn (cross-chain via WalletPreferences routing).
export function useWithdrawPayout() {
  const { pushChainClient, isInitialized, userAddress } = useCircleContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (circleId) => {
      requireWallet({ isInitialized, pushChainClient, userAddress });
      if (circleId == null) throw new Error('Missing circleId');

      const data = coreIface.encodeFunctionData('withdrawPayout', [circleId]);
      return await sendUniversalTx(pushChainClient, {
        to: CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE,
        data,
        value: 0n,
      }, { label: 'Claiming payout' });
    },
    onSuccess: () => {
      scheduleRefresh(queryClient);
    },
  });
}

export function useEmergencyWithdraw() {
  const { pushChainClient, isInitialized, userAddress } = useCircleContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (circleId) => {
      requireWallet({ isInitialized, pushChainClient, userAddress });
      if (circleId == null) throw new Error('Missing circleId');

      const data = coreIface.encodeFunctionData('emergencyWithdraw', [circleId]);
      return await sendUniversalTx(pushChainClient, {
        to: CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE,
        data,
        value: 0n,
      }, { label: 'Emergency withdrawal' });
    },
    onSuccess: () => {
      scheduleRefresh(queryClient);
    },
  });
}

export function useMintCUSD() {
  const { pushChainClient, isInitialized, userAddress } = useCircleContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount = '1000') => {
      requireWallet({ isInitialized, pushChainClient, userAddress });
      const amountInWei = ethers.parseUnits(String(amount), 6);
      const data = cusdIface.encodeFunctionData('mint', [userAddress, amountInWei]);
      return await sendUniversalTx(pushChainClient, {
        to: CONTRACT_ADDRESSES.CUSD,
        data,
        value: 0n,
      }, { label: 'Minting CUSD' });
    },
    onSuccess: () => {
      scheduleRefresh(queryClient);
    },
  });
}

export function useCUSDBalance() {
  const { getContract, userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['cusdBalance', userAddress],
    queryFn: async () => {
      const contract = await getContract('cusd');
      const balance = await contract.balanceOf(userAddress);
      return ethers.formatUnits(balance, 6);
    },
    enabled: isConnected && !!userAddress,
    staleTime: 10_000,
  });
}
