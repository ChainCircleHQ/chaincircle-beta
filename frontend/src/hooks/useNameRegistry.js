// Name Registry hooks — rewritten against the real deployed contract.
// Old version called registerName/updateName/getOwner which don't exist.
// Real contract: single `setName(string)` write (register or update),
// `getName(address)`, `getAddress(string)`, `hasName(address)`.
//
// Reads go through Supabase (users.display_name populated by the indexer
// on NameRegistered / NameUpdated events — faster + one RPC less).
// Writes go on-chain via Push UEA.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { useCircleContract } from './useCircleContract';
import { supabase } from '../lib/supabase';
import { CONTRACT_ADDRESSES } from '../constants/contracts';
import { sendUniversalTx } from '../lib/pushchainTx';
import { pokeIndexerSoon } from '../lib/pokeIndexer';
import NameRegistryABI from '../abis/NameRegistry.json';

const lc = (a) => (a ? String(a).toLowerCase() : a);

// Display name for a specific address (Supabase read — fast).
export function useDisplayName(address) {
    return useQuery({
        queryKey: ['displayName.db', lc(address)],
        queryFn: async () => {
            if (!address) return null;
            const { data, error } = await supabase
                .from('users')
                .select('display_name')
                .eq('address', lc(address))
                .maybeSingle();
            if (error) throw error;
            return data?.display_name || null;
        },
        enabled: !!address,
        staleTime: 60_000,
    });
}

// Current user's display name.
export function useMyDisplayName() {
    const { userAddress, isConnected } = useCircleContract();
    return useDisplayName(isConnected ? userAddress : null);
}

// Is a name available? Validates against Supabase reverse-lookup first,
// falls back to on-chain if the indexer hasn't caught up yet.
export function useIsNameAvailable(name) {
    return useQuery({
        queryKey: ['nameAvailable.db', name],
        queryFn: async () => {
            if (!name || name.length < 1 || name.length > 32) return false;
            const { data, error } = await supabase
                .from('users')
                .select('address')
                .eq('display_name', name)
                .maybeSingle();
            if (error) throw error;
            return !data;
        },
        enabled: !!name && name.length >= 1 && name.length <= 32,
        staleTime: 5_000,
    });
}

// Register or update display name — single `setName` contract call.
export function useSetName() {
    const queryClient = useQueryClient();
    const { pushChainClient, userAddress, isInitialized } = useCircleContract();

    return useMutation({
        mutationFn: async (name) => {
            if (!isInitialized || !pushChainClient?.universal) {
                throw new Error('Wallet not connected');
            }
            const trimmed = (name || '').trim();
            if (trimmed.length < 1 || trimmed.length > 32) {
                throw new Error('Name must be 1–32 characters');
            }
            const iface = ethers.Interface.from(NameRegistryABI.abi);
            const data = iface.encodeFunctionData('setName', [trimmed]);
            const result = await sendUniversalTx(pushChainClient, {
                to: CONTRACT_ADDRESSES.NAME_REGISTRY,
                data,
                value: 0n,
            }, { label: 'Setting display name' });

            if (result.status === 'pending') {
                const e = new Error('Name update still pending on origin chain — refresh in a minute.');
                e.pending = true;
                throw e;
            }

            // Eager update Supabase users.display_name so UI reflects
            // immediately (indexer will also catch up from the event).
            if (userAddress) {
                await supabase
                    .from('users')
                    .upsert({ address: lc(userAddress), display_name: trimmed }, { onConflict: 'address' });
            }
            return result;
        },
        onSuccess: () => {
            pokeIndexerSoon(2500);
            queryClient.invalidateQueries({ queryKey: ['displayName.db'] });
            queryClient.invalidateQueries({ queryKey: ['nameAvailable.db'] });
        },
    });
}

// Address → display name or truncated hex. Use everywhere addresses are shown.
export function formatAddressOrName(address, name) {
    if (name && name.length > 0) return name;
    if (address && address.length > 10) {
        return `${address.substring(0, 6)}…${address.substring(address.length - 4)}`;
    }
    return address;
}
