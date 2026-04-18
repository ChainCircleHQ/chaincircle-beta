// Reads ChainCircleCoreV2.memberStatus(circleId, user) — the per-round
// source of truth for "is this user paid up / due / expected". Used to
// decide whether to show the Contribute button on CircleDetail / CirclePreview.

import { useQuery } from '@tanstack/react-query';
import { useCircleContract } from './useCircleContract';

export function useMemberStatus(circleId) {
  const { getContract, userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['memberStatus', circleId, userAddress],
    queryFn: async () => {
      const core = await getContract('core');
      const [isActive, paymentsMade, paymentsExpected, hasReceivedPayout, isPaymentDue] =
        await core.memberStatus(circleId, userAddress);
      const made = Number(paymentsMade);
      const expected = Number(paymentsExpected);
      return {
        isActive,
        paymentsMade: made,
        paymentsExpected: expected,
        hasReceivedPayout,
        isPaymentDue,
        // Derived: is this round's contribution still outstanding?
        owesCurrentRound: isPaymentDue,
        // How many payments left before circle finish (for UI hints).
        remainingPayments: Math.max(0, expected - made),
      };
    },
    enabled: isConnected && !!userAddress && circleId != null,
    staleTime: 10_000,
    refetchInterval: 20_000,
  });
}
