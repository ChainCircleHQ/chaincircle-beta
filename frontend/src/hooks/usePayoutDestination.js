// Reads WalletPreferencesV2.getPayoutDestination(user) — the (wallet, chainId)
// pair ChainCircleCoreV2.withdrawPayout will route funds to. If the user has
// never linked a wallet this resolves to (userUEA, pushChainId) so the UI
// still has something to show.

import { useQuery } from '@tanstack/react-query';
import { useWalletPreferences } from './useWalletPreferences';
import { useCircleContract } from './useCircleContract';
import { SUPPORTED_PAYOUT_CHAINS, NETWORK_CONFIG } from '../constants/contracts';

const lookupChainName = (chainId) =>
  SUPPORTED_PAYOUT_CHAINS.find((c) => c.chainId === chainId)?.name
  || (chainId === NETWORK_CONFIG.chainId ? NETWORK_CONFIG.name : `Chain ${chainId}`);

export function usePayoutDestination() {
  const { getPayoutDestination } = useWalletPreferences();
  const { userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['payoutDestination', userAddress],
    queryFn: async () => {
      const { wallet, chainId } = await getPayoutDestination(userAddress);
      const isCrossChain = chainId !== NETWORK_CONFIG.chainId;
      return {
        wallet,
        chainId,
        chainName: lookupChainName(chainId),
        isCrossChain,
      };
    },
    enabled: isConnected && !!userAddress,
    staleTime: 30_000,
  });
}
