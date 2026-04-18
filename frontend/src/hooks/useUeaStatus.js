// Checks whether the connected user's Universal Executor Account needs
// upgrading to the current implementation. Drives the <UEAUpgradeBanner/>
// in Layout. Upgrade is gasless per Push Chain docs.

import { useQuery } from '@tanstack/react-query';
import { usePushChainClient } from '@pushchain/ui-kit';

export function useUeaStatus() {
    const { pushChainClient, isInitialized } = usePushChainClient();
    return useQuery({
        queryKey: ['ueaStatus', pushChainClient?.universal?.account],
        queryFn: async () => {
            if (!pushChainClient?.getAccountStatus) return null;
            const status = await pushChainClient.getAccountStatus();
            return {
                mode: status?.mode,
                deployed: status?.uea?.deployed ?? false,
                version: status?.uea?.version ?? null,
                requiresUpgrade: status?.uea?.requiresUpgrade ?? false,
            };
        },
        enabled: !!isInitialized && !!pushChainClient,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
    });
}
