// Phase 5: read path swapped from on-chain event scans to Supabase.
// Writes still go on-chain via useCircleActions. Return shapes match the
// pre-Phase-5 hooks so call sites don't need changes.
//
// Still on-chain (for now):
//   - useUserStats — reputation data isn't indexed yet (ReputationManager
//     callbacks aren't wired at the contract level; see GAPS.md §2.3)
//   - useCircleByInviteCode — invite codes aren't in Supabase yet

import { useQuery } from '@tanstack/react-query';
import { useCircleContract } from './useCircleContract';
import { ethers } from 'ethers';
import { supabase } from '../lib/supabase';
import { formatActivityType, getActivityIconType, calculateProgress } from '../utils/circleHelpers';
import formatCurrency from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

// ---- helpers -------------------------------------------------------------

// contribution_amount is stored as raw base units (CUSD has 6 decimals).
// Supabase returns it as a string (bigint → json string to avoid precision loss).
const fmtUnits = (raw) => (raw == null ? '0' : ethers.formatUnits(String(raw), 6));
const lc = (addr) => (addr ? String(addr).toLowerCase() : addr);

// Maps a row from circles_with_counts view to the shape the UI expects.
// Note: `vaultBalance` is approximated from total_pooled (set at circle
// creation to contribution_amount * member_cap). Accurate live vault balance
// requires summing contributions - payouts; revisit in Phase 5.5.
function mapCircleRow(row) {
    if (!row) return null;
    const status = Number(row.status ?? 0);
    const isActive = status === 1;
    const calculatedProgress = calculateProgress(
        Number(row.current_round ?? 0),
        Number(row.duration_months ?? 0),
        Number(row.member_count ?? 0),
        Number(row.member_cap ?? 0),
        isActive,
        status,
    );
    return {
        id: String(row.circle_id),
        name: row.name ?? '',
        goalType: Number(row.goal_type ?? 0),
        amount: fmtUnits(row.contribution_amount),
        duration: Number(row.duration_months ?? 0),
        currentRound: Number(row.current_round ?? 0),
        maxMembers: Number(row.member_cap ?? 0),
        members: Number(row.member_count ?? 0),
        frequency: Number(row.frequency ?? 0),
        isActive,
        status,
        createdAt: Number(row.created_ts ?? 0),
        startAt: Number(row.started_ts ?? 0),
        vaultBalance: fmtUnits(row.total_pooled),
        creator: row.creator_address,
        progress: calculatedProgress,
        contractProgress: calculatedProgress,
        icon: null, // frontend can derive from goalType; contract's `getCircleProgress.icon` was never really used
    };
}

async function fetchMemberAddresses(circleId) {
    const { data, error } = await supabase
        .from('circle_members')
        .select('user_address, position')
        .eq('circle_id', circleId)
        .order('position', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data ?? []).map((r) => r.user_address);
}

// ---- hooks ---------------------------------------------------------------

export function useUserCircles() {
    const { userAddress, isConnected } = useCircleContract();
    return useQuery({
        queryKey: ['userCircles.db', userAddress],
        queryFn: async () => {
            const addr = lc(userAddress);
            // Circles where user is a member (creator is auto-added as member 0).
            const { data: memberRows, error: memberErr } = await supabase
                .from('circle_members')
                .select('circle_id')
                .eq('user_address', addr);
            if (memberErr) throw memberErr;
            const ids = [...new Set((memberRows ?? []).map((r) => r.circle_id))];
            if (!ids.length) return [];
            const { data: circles, error } = await supabase
                .from('circles_with_counts')
                .select('*')
                .in('circle_id', ids)
                .order('created_block', { ascending: false });
            if (error) throw error;
            return (circles ?? []).map(mapCircleRow);
        },
        enabled: isConnected && !!userAddress,
        staleTime: 20_000,
    });
}

export function useActiveCircles() {
    const { data: all, ...rest } = useUserCircles();
    return { ...rest, data: all?.filter((c) => c.isActive) ?? [] };
}

export function useCircleDetails(circleId) {
    const { isConnected } = useCircleContract();
    return useQuery({
        queryKey: ['circleDetails.db', circleId],
        queryFn: async () => {
            const id = Number(circleId);
            const { data, error } = await supabase
                .from('circles_with_counts')
                .select('*')
                .eq('circle_id', id)
                .maybeSingle();
            if (error) throw error;
            if (!data) return null;
            const memberAddresses = await fetchMemberAddresses(id);
            return {
                ...mapCircleRow(data),
                memberAddresses,
                // inviteCode is still fetched from chain in the UI where needed
                // (useCircleByInviteCode) — not in Supabase yet.
                inviteCode: null,
            };
        },
        enabled: isConnected && !!circleId,
        staleTime: 15_000,
        retry: 1,
    });
}

export function useCircleByName(name) {
    const { isConnected } = useCircleContract();
    return useQuery({
        queryKey: ['circleByName.db', name],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('circles_with_counts')
                .select('*')
                .eq('name', name)
                .maybeSingle();
            if (error) throw error;
            return mapCircleRow(data);
        },
        enabled: isConnected && !!name,
        staleTime: 30_000,
    });
}

export function useRecentActivities(limit = 10) {
    const { userAddress, isConnected } = useCircleContract();
    return useQuery({
        queryKey: ['recentActivities.db', userAddress, limit],
        queryFn: async () => {
            const addr = lc(userAddress);
            const { data, error } = await supabase
                .from('activity_log')
                .select('*')
                .eq('actor_address', addr)
                .order('ts', { ascending: false })
                .limit(limit);
            if (error) throw error;

            // Enrich with circle names where circle_id is known (batch one query)
            const ids = [...new Set((data ?? []).filter((r) => r.circle_id).map((r) => r.circle_id))];
            let nameById = new Map();
            if (ids.length) {
                const { data: cRows } = await supabase
                    .from('circles')
                    .select('circle_id, name')
                    .in('circle_id', ids);
                nameById = new Map((cRows ?? []).map((c) => [c.circle_id, c.name]));
            }

            // Reshape to the UI's legacy activity format.
            return (data ?? []).map((r) => {
                const circleName = nameById.get(r.circle_id) || (r.circle_id ? 'a circle' : '');
                const unix = r.ts ? Math.floor(new Date(r.ts).getTime() / 1000) : 0;
                let title;
                const typeMap = {
                    contribution: `You contributed to ${circleName}`,
                    payout: `You received a payout from ${circleName}`,
                    reputation: 'Reputation changed',
                    badge: 'Badge minted',
                };
                title = typeMap[r.kind] || formatActivityType(r.kind?.toUpperCase() || 'ACTIVITY');
                return {
                    id: `${r.circle_id ?? 'x'}-${unix}-${r.tx_hash?.slice(2, 10) ?? ''}`,
                    type: getActivityIconType(
                        r.kind === 'contribution' ? 'CONTRIBUTE' :
                        r.kind === 'payout' ? 'WITHDRAW' :
                        r.kind === 'reputation' ? 'INTEREST' :
                        r.kind === 'badge' ? 'COMPLETED' : 'ACTIVITY',
                    ),
                    title,
                    timeAgo: formatDate(unix),
                    amount: formatCurrency(fmtUnits(r.amount)),
                    circleId: r.circle_id ? String(r.circle_id) : null,
                    circleName,
                    timestamp: unix,
                    txHash: r.tx_hash || null,
                };
            });
        },
        enabled: isConnected && !!userAddress,
        staleTime: 10_000,
        refetchInterval: 30_000,
    });
}

// useUserStats — OFF-CHAIN reputation computation.
// On-chain ReputationManager isn't wired to the deployed ChainCircleCore
// bytecode (see GAPS.md §2.3), so getUserReputation() returns zeros.
// We compute score/tier/etc. from indexed contribution+payout+membership
// events via the user_reputation Supabase view. When ChainCircleCore is
// redeployed in Phase 6, switch this back to on-chain reads — at that
// point this view becomes a historical-estimate mirror.
//
// `reputation.source` in the return surfaces this so UI can show "off-chain"
// indicator where appropriate.
export function useUserStats() {
    const { userAddress, isConnected } = useCircleContract();
    return useQuery({
        queryKey: ['userStats.db', userAddress],
        queryFn: async () => {
            const addr = lc(userAddress);
            const { data, error } = await supabase
                .from('user_reputation')
                .select('*')
                .eq('address', addr)
                .maybeSingle();
            if (error) throw error;

            // Also pull the active-circle count (status = 1 among memberships)
            const { data: activeMembers } = await supabase
                .from('circle_members')
                .select('circles!inner(status)')
                .eq('user_address', addr);
            const activeCircles = (activeMembers ?? []).filter(
                (m) => m.circles?.status === 1,
            ).length;

            if (!data) {
                return {
                    totalSaved: '0',
                    totalInterest: '0',
                    activeCircles,
                    totalCircles: 0,
                    reputation: {
                        source: 'off-chain',
                        score: 0,
                        tier: 'None',
                        completedCircles: 0,
                        onTimeRate: 100,
                        totalSaved: '0',
                        accountAge: 0,
                        longestStreak: 0,
                    },
                };
            }

            return {
                totalSaved: fmtUnits(data.total_contributions_amount),
                totalInterest: fmtUnits(data.total_payouts_amount),
                activeCircles,
                totalCircles: Number(data.circles_joined ?? 0),
                reputation: {
                    source: 'off-chain',
                    score: Number(data.score ?? 0),
                    tier: data.tier ?? 'None',
                    completedCircles: Number(data.circles_completed ?? 0),
                    // On-time rate isn't computable yet (ContributionMade event
                    // doesn't carry an onTime flag). Defaulting to 100 until we
                    // wire deadline comparisons against circle.startAt + round interval.
                    onTimeRate: 100,
                    totalSaved: fmtUnits(data.total_contributions_amount),
                    accountAge: Number(data.first_action_ts ?? 0),
                    longestStreak: 0, // Streak computation deferred — requires window fn
                },
            };
        },
        enabled: isConnected && !!userAddress,
        staleTime: 20_000,
    });
}

export function useGlobalStats() {
    return useQuery({
        queryKey: ['globalStats.db'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('global_stats')
                .select('*')
                .maybeSingle();
            if (error) throw error;
            if (!data) return { totalPooled: '0', activeCircles: 0, totalCircles: 0 };
            return {
                totalPooled: fmtUnits(data.total_pooled_raw),
                activeCircles: Number(data.active_circles ?? 0),
                totalCircles: Number(data.total_circles ?? 0),
            };
        },
        staleTime: 60_000,
        refetchInterval: 60_000,
    });
}

export function usePayoutHistory() {
    const { userAddress, isConnected } = useCircleContract();
    return useQuery({
        queryKey: ['payoutHistory.db', userAddress],
        queryFn: async () => {
            const addr = lc(userAddress);
            const { data: payouts, error } = await supabase
                .from('payouts')
                .select('*')
                .eq('recipient_address', addr)
                .order('block_number', { ascending: false });
            if (error) throw error;
            if (!payouts?.length) return [];
            const ids = [...new Set(payouts.map((p) => p.circle_id))];
            const { data: circles } = await supabase
                .from('circles')
                .select('circle_id, name, goal_type')
                .in('circle_id', ids);
            const byId = new Map((circles ?? []).map((c) => [c.circle_id, c]));
            return payouts.map((p) => {
                const c = byId.get(p.circle_id) || {};
                const ts = Math.floor(new Date(p.block_timestamp).getTime() / 1000);
                return {
                    circleId: String(p.circle_id),
                    circleName: c.name ?? 'a circle',
                    goalType: Number(c.goal_type ?? 0),
                    amount: formatCurrency(fmtUnits(p.amount)),
                    date: formatDate(ts),
                    claimed: true, // payouts in our DB are completed transfers
                    timestamp: ts,
                };
            });
        },
        enabled: isConnected && !!userAddress,
        staleTime: 30_000,
    });
}

export function useUpcomingPayouts() {
    const { userAddress, isConnected } = useCircleContract();
    return useQuery({
        queryKey: ['upcomingPayouts.db', userAddress],
        queryFn: async () => {
            const addr = lc(userAddress);
            // Active circles where user is a member AND hasn't received payout yet.
            const { data: memberships, error } = await supabase
                .from('circle_members')
                .select('circle_id, has_received_payout')
                .eq('user_address', addr)
                .eq('has_received_payout', false);
            if (error) throw error;
            if (!memberships?.length) return [];
            const ids = memberships.map((m) => m.circle_id);
            const { data: circles } = await supabase
                .from('circles_with_counts')
                .select('*')
                .in('circle_id', ids)
                .eq('status', 1); // Active only
            return (circles ?? []).map((c) => {
                // rough estimate: next payout = started_at + (currentRound+1) * frequency
                const freqDays = c.frequency === 1 ? 7 : 30;
                const startTs = Number(c.started_ts ?? 0);
                const nextTs = startTs
                    ? startTs + (Number(c.current_round ?? 0) + 1) * freqDays * 86400
                    : Math.floor(Date.now() / 1000);
                return {
                    circleId: String(c.circle_id),
                    circleName: c.name,
                    goalType: Number(c.goal_type ?? 0),
                    estimatedDate: formatDate(nextTs),
                    timestamp: nextTs,
                };
            });
        },
        enabled: isConnected && !!userAddress,
        staleTime: 30_000,
    });
}

export function useSearchCircles(searchTerm) {
    return useQuery({
        queryKey: ['searchCircles.db', searchTerm],
        queryFn: async () => {
            if (!searchTerm || searchTerm.length < 3) return [];
            const { data, error } = await supabase
                .from('circles_with_counts')
                .select('*')
                .ilike('name', `%${searchTerm}%`)
                .limit(50);
            if (error) throw error;
            return (data ?? []).map(mapCircleRow);
        },
        enabled: !!searchTerm && searchTerm.length >= 3,
        staleTime: 20_000,
    });
}

// useCircleByInviteCode — STILL ON-CHAIN.
// Invite codes aren't in Supabase yet. To migrate, backfill needs to call
// getCircleInviteCode(id) during circle enrichment and store in an
// invite_code column on circles. Tracked as Phase 5 follow-up.
export function useCircleByInviteCode(inviteCode) {
    const { getContract, isConnected } = useCircleContract();
    return useQuery({
        queryKey: ['circleByInviteCode', inviteCode],
        queryFn: async () => {
            const contract = await getContract('core');
            const circleCounter = await contract.circleCounter();
            const totalCircles = Number(circleCounter);
            const BATCH_SIZE = 100;
            const normalizedInviteCode = inviteCode.toLowerCase();

            for (let start = 1; start <= totalCircles; start += BATCH_SIZE) {
                const end = Math.min(start + BATCH_SIZE, totalCircles + 1);
                const checkPromises = [];
                for (let i = start; i < end; i++) {
                    checkPromises.push(
                        contract
                            .getCircleInviteCode(i)
                            .then((code) => ({ id: i, code: code.toLowerCase() }))
                            .catch(() => ({ id: i, code: null })),
                    );
                }
                const results = await Promise.all(checkPromises);
                const match = results.find((r) => r.code === normalizedInviteCode);
                if (match) {
                    const [details, progress] = await Promise.all([
                        contract.getCircleDetails(match.id),
                        contract.getCircleProgress(match.id),
                    ]);
                    const maxMembers = Number(details.maxMembers);
                    const memberPromises = [];
                    for (let j = 0; j < maxMembers; j++) {
                        memberPromises.push(
                            contract
                                .circleMembers(match.id, j)
                                .then((addr) => (addr !== '0x0000000000000000000000000000000000000000' ? addr : null))
                                .catch(() => null),
                        );
                    }
                    const memberResults = await Promise.all(memberPromises);
                    const memberAddresses = memberResults.filter((a) => a !== null);
                    return {
                        id: match.id.toString(),
                        name: details.name,
                        goalType: Number(details.goalType),
                        amount: ethers.formatUnits(details.amount, 6),
                        duration: Number(details.duration),
                        currentRound: Number(details.currentRound),
                        maxMembers,
                        members: memberAddresses.length,
                        frequency: Number(details.frequency),
                        isActive: details.isActive,
                        status: Number(details.status),
                        createdAt: Number(details.createdAt),
                        startAt: Number(details.startAt),
                        vaultBalance: ethers.formatUnits(details.vaultBalance, 6),
                        creator: details.creator,
                        progress: Number(progress.percentage),
                        icon: progress.icon,
                        inviteCode: match.code,
                        memberAddresses,
                    };
                }
            }
            return null;
        },
        enabled: isConnected && !!inviteCode && inviteCode.length > 20,
        staleTime: 60_000,
    });
}
