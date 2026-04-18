// Query IUEAFactory to determine the origin chain for a Push Chain address.
//
// Returns:
//   { isUEA: false, chain: 'push' }                          — native Push Chain user (EOA on 42101)
//   { isUEA: true,  chain: 'ethereum' | 'base' | 'solana'...} — cross-chain user via UEA
//   null                                                      — address invalid or RPC failed
//
// Backed by a batch query so a roster of N members is one on-chain multicall-
// style Promise.all, not N sequential round-trips. Cached per-address for 10min
// (chain origin never changes once set).

import { useQueries } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { NETWORK_CONFIG } from '../constants/contracts';

const UEA_FACTORY = '0x00000000000000000000000000000000000000eA';

// Minimal ABI — just the view method we need. Actual UEAFactory is much larger.
const UEA_FACTORY_ABI = [
    'function getOriginForUEA(address addr) view returns (tuple(string chainNamespace, string chainId, bytes owner) account, bool isUEA)',
];

// Maps CAIP-2 (chainNamespace:chainId) to the display chain key.
function caipToChainKey(ns, id) {
    if (ns === 'solana') return 'solana';
    if (ns !== 'eip155') return 'unknown';
    switch (String(id)) {
        case '1':        return 'ethereum';
        case '11155111': return 'ethereum'; // Sepolia
        case '42101':    return 'push';
        case '84532':    return 'base';
        case '421614':   return 'arbitrum';
        case '10':
        case '11155420': return 'optimism';
        case '137':
        case '80002':    return 'polygon';
        case '56':
        case '97':       return 'bnb';
        default:         return 'evm';
    }
}

function makeProvider() {
    return new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
}

async function fetchOrigin(address) {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) return null;
    const provider = makeProvider();
    const factory = new ethers.Contract(UEA_FACTORY, UEA_FACTORY_ABI, provider);
    try {
        const [account, isUEA] = await factory.getOriginForUEA(address);
        if (!isUEA) {
            // Native Push Chain user — no wrapped origin
            return { isUEA: false, chain: 'push', chainNamespace: 'eip155', chainId: '42101', ownerHex: address };
        }
        const ownerHex = account.owner && account.owner !== '0x'
            ? ethers.hexlify(account.owner)
            : null;
        return {
            isUEA: true,
            chain: caipToChainKey(account.chainNamespace, account.chainId),
            chainNamespace: account.chainNamespace,
            chainId: String(account.chainId),
            ownerHex,
        };
    } catch {
        return null;
    }
}

// Single-address form. Prefer useChainOrigins for lists.
export function useChainOrigin(address) {
    const [q] = useQueries({
        queries: [{
            queryKey: ['chainOrigin', address?.toLowerCase()],
            queryFn: () => fetchOrigin(address),
            enabled: !!address,
            staleTime: 10 * 60_000,
        }],
    });
    return q;
}

// Batch form — returns a Map<address, origin> once all resolved.
export function useChainOrigins(addresses) {
    const lc = (addresses || []).map((a) => a?.toLowerCase()).filter(Boolean);
    const queries = useQueries({
        queries: lc.map((addr) => ({
            queryKey: ['chainOrigin', addr],
            queryFn: () => fetchOrigin(addr),
            staleTime: 10 * 60_000,
        })),
    });
    const map = new Map();
    queries.forEach((q, i) => {
        if (q.data) map.set(lc[i], q.data);
    });
    return {
        map,
        isLoading: queries.some((q) => q.isLoading),
    };
}
