// Reads cross_chain_payouts table — one row per withdrawPayout where the
// user's preferred chain wasn't Push. relay_status tracks the delivery:
// pending → relayed → delivered, or failed.
//
// The indexer writes the initial row from CrossChainPayoutRequested; the
// relayer updates the row out-of-band as it progresses.

import { useQuery } from '@tanstack/react-query';
import { useCircleContract } from './useCircleContract';
import { supabase } from '../lib/supabase';
import { ethers } from 'ethers';
import { SUPPORTED_PAYOUT_CHAINS } from '../constants/contracts';
import formatCurrency from '../utils/formatCurrency';

const lc = (addr) => (addr ? String(addr).toLowerCase() : addr);
const fmtUnits = (raw) => ethers.formatUnits(String(raw || 0n), 6);
const chainName = (id) => SUPPORTED_PAYOUT_CHAINS.find((c) => c.chainId === Number(id))?.name || `Chain ${id}`;

export function useCrossChainPayouts({ limit = 20 } = {}) {
  const { userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['crossChainPayouts', userAddress, limit],
    queryFn: async () => {
      const addr = lc(userAddress);
      const { data, error } = await supabase
        .from('cross_chain_payouts')
        .select('*')
        .eq('recipient_address', addr)
        .order('block_timestamp', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        txHash: r.tx_hash,
        chainId: Number(r.destination_chain_id),
        chainName: chainName(r.destination_chain_id),
        amount: r.amount,
        amountFormatted: formatCurrency(fmtUnits(r.amount)),
        ref: r.ref,
        status: r.relay_status,
        blockNumber: r.block_number,
        blockTimestamp: r.block_timestamp,
        updatedAt: r.updated_at,
      }));
    },
    enabled: isConnected && !!userAddress,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
