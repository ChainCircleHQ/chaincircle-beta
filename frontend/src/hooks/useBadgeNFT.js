// Badge NFT hooks — rewritten against the real deployed contract.
// The original version called hasBadge(user, type) and getBadgeURI(type)
// which don't exist on BadgeNFT.sol. Real contract: one badge per user
// (single tokenId per address), tier is a string (Bronze/Silver/Gold),
// minted/upgraded automatically by ReputationManager.
//
// Reads go through Supabase (badges table populated by the indexer).
// No write hooks — users cannot mint directly; minting is cross-contract
// from ReputationManager on tier threshold crossings.

import { useQuery } from '@tanstack/react-query';
import { useCircleContract } from './useCircleContract';
import { supabase } from '../lib/supabase';

const lc = (a) => (a ? String(a).toLowerCase() : a);

// Returns the user's current badge (null if none minted yet).
// Shape: { tokenId, tier, mintedAt, txHash }
export function useUserBadge() {
    const { userAddress, isConnected } = useCircleContract();
    return useQuery({
        queryKey: ['userBadge.db', userAddress],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('badges')
                .select('*')
                .eq('user_address', lc(userAddress))
                .maybeSingle();
            if (error) throw error;
            if (!data) return null;
            return {
                tokenId: Number(data.token_id),
                tier: data.badge_type,
                mintedAt: data.minted_at,
                txHash: data.tx_hash,
            };
        },
        enabled: isConnected && !!userAddress,
        staleTime: 60_000,
    });
}

// All badges across the platform — for a future leaderboard / "who's got Gold"
// view. Ordered newest first. Not currently called anywhere.
export function useRecentBadgeMints(limit = 20) {
    return useQuery({
        queryKey: ['recentBadges.db', limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('badges')
                .select('*')
                .order('minted_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data ?? [];
        },
        staleTime: 60_000,
    });
}

// Cosmetic emoji lookup for UI. Matches ReputationManager tier strings.
export function getBadgeIcon(tier) {
    const icons = {
        Bronze: '🥉',
        Silver: '🥈',
        Gold: '🥇',
    };
    return icons[tier] || '🏆';
}

// Reputation tier thresholds — mirrors ReputationManager.sol for display.
// Source of truth for gating (e.g. "canVote") stays on-chain.
export function getReputationGuide() {
    return {
        title: 'How to earn reputation (out of 1000+)',
        ways: [
            { action: 'On-time payment', points: 15, frequency: 'per payment' },
            { action: 'Receive payout', points: 25, frequency: 'per payout' },
            { action: '5-payment streak bonus', points: 50, frequency: 'every 5 consecutive' },
            { action: 'Join subsequent circle', points: 100, frequency: 'per new circle' },
            { action: 'Complete full circle', points: 250, frequency: 'per completed circle' },
        ],
        penalties: [
            { action: 'Late payment (past grace period)', points: -75 },
        ],
        tiers: {
            none:   { min: 0,   max: 499,      name: 'None' },
            bronze: { min: 500, max: 699,      name: 'Bronze' },
            silver: { min: 700, max: 849,      name: 'Silver (unlocks voting)' },
            gold:   { min: 850, max: Infinity, name: 'Gold (elite)' },
        },
    };
}
