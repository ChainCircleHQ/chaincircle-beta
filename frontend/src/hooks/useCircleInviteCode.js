// Invite codes aren't indexed into Supabase (would need a contract read during
// the CircleCreated handler to enrich the row), so fetch directly from the
// ChainCircleCoreV2 public mapping `circleInviteCode(uint256)`. One RPC call
// per open preview — cheap, cached by react-query.

import { useQuery } from '@tanstack/react-query';
import { useCircleContract } from './useCircleContract';

export function useCircleInviteCode(circleId) {
    const { getContract, isConnected } = useCircleContract();
    return useQuery({
        queryKey: ['circleInviteCode', circleId],
        queryFn: async () => {
            const core = await getContract('core');
            const code = await core.circleInviteCode(circleId);
            return code || null;
        },
        enabled: isConnected && circleId != null,
        staleTime: 5 * 60_000,
    });
}
