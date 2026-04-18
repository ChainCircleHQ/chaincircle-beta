import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCircleContract } from './useCircleContract';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../constants/contracts';
import CUSDABI from '../abis/CUSD.json';
import { sendUniversalTx } from '../lib/pushchainTx';

// Hook to get CUSD balance
export function useCUSDBalance() {
  const { userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['cusdBalance', userAddress],
    queryFn: async () => {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const cusd = new ethers.Contract(CONTRACT_ADDRESSES.CUSD, CUSDABI.abi, provider);
      const balance = await cusd.balanceOf(userAddress);
      return ethers.formatUnits(balance, 6);
    },
    enabled: isConnected && !!userAddress,
    staleTime: 10000,
    refetchInterval: 15000, // Refetch every 15 seconds
  });
}

// Hook to get time until next claim
export function useTimeUntilNextClaim() {
  const { userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['timeUntilNextClaim', userAddress],
    queryFn: async () => {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const cusd = new ethers.Contract(CONTRACT_ADDRESSES.CUSD, CUSDABI.abi, provider);
      const time = await cusd.getTimeUntilNextClaim(userAddress);
      return Number(time);
    },
    enabled: isConnected && !!userAddress,
    staleTime: 10000,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Hook to claim from faucet
export function useClaimFaucet() {
  const { pushChainClient, isInitialized, userAddress } = useCircleContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!isInitialized || !pushChainClient) {
        throw new Error('Wallet not connected. Please ensure your wallet is connected.');
      }

      if (!pushChainClient.universal) {
        throw new Error('Push Chain universal client not available. Please reconnect your wallet.');
      }

      const cusdAddress = CONTRACT_ADDRESSES.CUSD;

      // Encode the claimFromFaucet function call
      const claimData = ethers.Interface.from(CUSDABI.abi).encodeFunctionData('claimFromFaucet', []);


      // Send tx with trackTransaction fallback for origin-chain timeouts
      return await sendUniversalTx(pushChainClient, {
        to: cusdAddress, data: claimData, value: 0n,
      }, { label: 'Claiming CUSD' });
    },
    onSuccess: () => {
      // Invalidate and refetch balance and time queries
      queryClient.invalidateQueries(['cusdBalance', userAddress]);
      queryClient.invalidateQueries(['timeUntilNextClaim', userAddress]);
    }
  });
}
