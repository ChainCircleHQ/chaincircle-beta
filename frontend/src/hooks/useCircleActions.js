import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useCircleContract } from './useCircleContract';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../constants/contracts';
import ChainCircleCoreABI from '../abis/ChainCircleCore.json';
import CUSDABI from '../abis/CUSD.json';
import { sendUniversalTx } from '../lib/pushchainTx';

// Hook for creating a circle
export function useCreateCircle() {
  const { getContract, pushChainClient, isInitialized, userAddress } = useCircleContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, goalType, amount, duration, maxMembers, frequency }) => {
      if (!isInitialized || !pushChainClient) {
        throw new Error('Wallet not connected. Please ensure your wallet is connected via Push Chain.');
      }

      if (!pushChainClient.universal) {
        throw new Error('Push Chain universal client not available. Please reconnect your wallet.');
      }

      const cusdAddress = CONTRACT_ADDRESSES.CUSD;
      const coreAddress = CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE;
      const amountInWei = ethers.parseUnits(amount.toString(), 6);

      // Check balance using read-only provider
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const cusdReadOnly = new ethers.Contract(cusdAddress, CUSDABI.abi, provider);
      const balance = await cusdReadOnly.balanceOf(userAddress);

      // Note: Insufficient balance will be caught by the transaction

      // Step 1: Approve CUSD using Push Chain universal transaction
      const approveData = ethers.Interface.from(CUSDABI.abi).encodeFunctionData(
        'approve',
        [coreAddress, amountInWei]
      );

      const approveResult = await sendUniversalTx(pushChainClient, {
        to: cusdAddress, data: approveData, value: 0n,
      });
      if (approveResult.status === 'pending') {
        // Approve is still in flight — trying to submit the create before the
        // approve is mined will revert. Surface as still-pending so the UI
        // tells the user to wait + retry.
        const e = new Error('Approval still pending on origin chain — wait a minute and retry.');
        e.pending = true;
        throw e;
      }

      // Step 2: Create Circle using Push Chain universal transaction
      const createData = ethers.Interface.from(ChainCircleCoreABI.abi).encodeFunctionData(
        'createCircle',
        [name, goalType, amountInWei, duration, maxMembers, frequency]
      );

      const createResult = await sendUniversalTx(pushChainClient, {
        to: coreAddress, data: createData, value: 0n,
      });
      return createResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCircles'] });
      queryClient.invalidateQueries({ queryKey: ['globalStats'] });
      queryClient.invalidateQueries({ queryKey: ['activeCircles'] });
    }
  });
}

// Hook for joining a circle
export function useJoinCircle() {
  const { getContract, pushChainClient, isInitialized } = useCircleContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (circleId) => {
      if (!isInitialized || !pushChainClient) {
        throw new Error('Wallet not connected');
      }

      const cusdAddress = CONTRACT_ADDRESSES.CUSD;
      const coreAddress = CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE;

      // Get circle details to know contribution amount
      const contract = await getContract('core');
      const details = await contract.getCircleDetails(circleId);
      const amountNeeded = details.amount;

      // Step 1: Approve CUSD
      const approveData = ethers.Interface.from(CUSDABI.abi).encodeFunctionData(
        'approve',
        [coreAddress, amountNeeded]
      );

      const approveResult = await sendUniversalTx(pushChainClient, {
        to: cusdAddress, data: approveData, value: 0n,
      });
      if (approveResult.status === 'pending') {
        const e = new Error('Approval still pending on origin chain — wait a minute and retry.');
        e.pending = true;
        throw e;
      }

      // Step 2: Join circle
      const joinData = ethers.Interface.from(ChainCircleCoreABI.abi).encodeFunctionData(
        'joinCircle',
        [circleId]
      );

      return await sendUniversalTx(pushChainClient, {
        to: coreAddress, data: joinData, value: 0n,
      });
    },
    onSuccess: (_, circleId) => {
      queryClient.invalidateQueries({ queryKey: ['userCircles'] });
      queryClient.invalidateQueries({ queryKey: ['circleDetails', circleId] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
    }
  });
}

// Hook for contributing to a circle
export function useContribute() {
  const { getContract, pushChainClient, isInitialized } = useCircleContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (circleId) => {
      if (!isInitialized || !pushChainClient) {
        throw new Error('Wallet not connected');
      }

      const cusdAddress = CONTRACT_ADDRESSES.CUSD;
      const coreAddress = CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE;

      // Get contribution amount
      const contract = await getContract('core');
      const details = await contract.getCircleDetails(circleId);
      const contributionAmount = details.amount;

      // Step 1: Approve CUSD
      const approveData = ethers.Interface.from(CUSDABI.abi).encodeFunctionData(
        'approve',
        [coreAddress, contributionAmount]
      );

      const approveResult = await sendUniversalTx(pushChainClient, {
        to: cusdAddress, data: approveData, value: 0n,
      });
      if (approveResult.status === 'pending') {
        const e = new Error('Approval still pending on origin chain — wait a minute and retry.');
        e.pending = true;
        throw e;
      }

      // Step 2: Make contribution
      const contributeData = ethers.Interface.from(ChainCircleCoreABI.abi).encodeFunctionData(
        'contribute',
        [circleId]
      );

      return await sendUniversalTx(pushChainClient, {
        to: coreAddress, data: contributeData, value: 0n,
      });
    },
    onSuccess: (_, circleId) => {
      queryClient.invalidateQueries({ queryKey: ['userCircles'] });
      queryClient.invalidateQueries({ queryKey: ['circleDetails', circleId] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
      queryClient.invalidateQueries({ queryKey: ['globalStats'] });
    }
  });
}

// Hook for withdrawing payout
export function useWithdrawPayout() {
  const { pushChainClient, isInitialized } = useCircleContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (circleId) => {
      if (!isInitialized || !pushChainClient) {
        throw new Error('Wallet not connected');
      }

      const coreAddress = CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE;

      const withdrawData = ethers.Interface.from(ChainCircleCoreABI.abi).encodeFunctionData(
        'withdrawPayout',
        [circleId]
      );

      return await sendUniversalTx(pushChainClient, {
        to: coreAddress, data: withdrawData, value: 0n,
      });
    },
    onSuccess: (_, circleId) => {
      queryClient.invalidateQueries({ queryKey: ['userCircles'] });
      queryClient.invalidateQueries({ queryKey: ['circleDetails', circleId] });
      queryClient.invalidateQueries({ queryKey: ['payoutHistory'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingPayouts'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
    }
  });
}

// Hook for emergency withdrawal
export function useEmergencyWithdraw() {
  const { pushChainClient, isInitialized } = useCircleContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (circleId) => {
      if (!isInitialized || !pushChainClient) {
        throw new Error('Wallet not connected');
      }

      const coreAddress = CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE;

      const emergencyData = ethers.Interface.from(ChainCircleCoreABI.abi).encodeFunctionData(
        'emergencyWithdraw',
        [circleId]
      );

      return await sendUniversalTx(pushChainClient, {
        to: coreAddress, data: emergencyData, value: 0n,
      });
    },
    onSuccess: (_, circleId) => {
      queryClient.invalidateQueries({ queryKey: ['userCircles'] });
      queryClient.invalidateQueries({ queryKey: ['circleDetails', circleId] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
    }
  });
}

// Hook for minting CUSD from faucet
export function useMintCUSD() {
  const { pushChainClient, isInitialized, userAddress } = useCircleContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount = '1000') => {
      if (!isInitialized || !pushChainClient) {
        throw new Error('Wallet not connected');
      }

      const cusdAddress = CONTRACT_ADDRESSES.CUSD;
      const amountInWei = ethers.parseUnits(amount, 6);

      const mintData = ethers.Interface.from(CUSDABI.abi).encodeFunctionData(
        'mint',
        [userAddress, amountInWei]
      );

      const tx = await pushChainClient.universal.sendTransaction({
        to: cusdAddress,
        data: mintData,
        value: 0n
      });

      return await tx.wait();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cusdBalance'] });
    }
  });
}

// Hook to get CUSD balance
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
    staleTime: 10000,
  });
}
