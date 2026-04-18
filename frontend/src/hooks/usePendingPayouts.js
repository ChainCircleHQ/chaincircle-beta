// Pending-payout reads for the v2 pull flow.
//
// v2 architecture: when a round finalizes, ChainCircleCoreV2 escrows the net
// payout (principal + interest − 10% protocol) in
//   pendingWithdrawals[user][circleId]
// and emits PayoutAccrued. The member pulls later via withdrawPayout(circleId),
// which routes the CUSD cross-chain via WalletPreferencesV2 if the preferred
// destination chain isn't Push Chain. PayoutWithdrawn fires on success.
//
// This hook returns:
//   total: aggregate CUSD pending across all circles (bigint, 6 decimals)
//   items: [{ circleId, circleName, goalType, amountRaw, amountFormatted }]
// items are only surfaced for circles where the user actually has a non-zero
// entry — so the UI can render a "claim" banner when items.length > 0.

import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { useCircleContract } from './useCircleContract';
import { supabase } from '../lib/supabase';
import formatCurrency from '../utils/formatCurrency';

const lc = (addr) => (addr ? String(addr).toLowerCase() : addr);
const fmtUnits = (raw) => ethers.formatUnits(String(raw || 0n), 6);

export function usePendingPayouts() {
  const { getContract, userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['pendingPayouts', userAddress],
    queryFn: async () => {
      const core = await getContract('core');
      const total = await core.totalPendingWithdrawals(userAddress);
      if (total === 0n) return { total: 0n, totalFormatted: '0', items: [] };

      // We need to know *which* circles hold a pending payout. The contract
      // doesn't expose a per-user circle list, so we derive candidates from
      // the user's memberships (indexed) + any PayoutAccrued events for them.
      const addr = lc(userAddress);
      const { data: memberships, error } = await supabase
        .from('circle_members')
        .select('circle_id')
        .eq('user_address', addr);
      if (error) throw error;

      const candidateIds = [...new Set((memberships ?? []).map((m) => Number(m.circle_id)))];
      if (!candidateIds.length) {
        return { total, totalFormatted: formatCurrency(fmtUnits(total)), items: [] };
      }

      // Query the contract for each candidate — bounded by membership count
      // (few per user, so this is a short batch).
      const perCircle = await Promise.all(
        candidateIds.map(async (id) => {
          try {
            const amt = await core.getPendingFor(userAddress, id);
            return { id, amountRaw: amt };
          } catch {
            return { id, amountRaw: 0n };
          }
        })
      );

      const nonZero = perCircle.filter((x) => x.amountRaw > 0n);
      if (!nonZero.length) {
        return { total, totalFormatted: formatCurrency(fmtUnits(total)), items: [] };
      }

      const ids = nonZero.map((x) => x.id);
      const { data: circles } = await supabase
        .from('circles')
        .select('circle_id, name, goal_type')
        .in('circle_id', ids);
      const byId = new Map((circles ?? []).map((c) => [c.circle_id, c]));

      const items = nonZero.map((x) => {
        const c = byId.get(x.id) || {};
        return {
          circleId: String(x.id),
          circleName: c.name ?? `Circle #${x.id}`,
          goalType: Number(c.goal_type ?? 0),
          amountRaw: x.amountRaw,
          amountFormatted: formatCurrency(fmtUnits(x.amountRaw)),
        };
      });

      return {
        total,
        totalFormatted: formatCurrency(fmtUnits(total)),
        items,
      };
    },
    enabled: isConnected && !!userAddress,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
