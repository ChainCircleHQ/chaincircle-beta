// Phase 5: read path swapped from on-chain event scans to Supabase.
// Writes still go on-chain via useCircleActions. Return shapes match the
// pre-Phase-5 hooks so call sites don't need changes.
//
// v2 note: every circle-facing read below filters `core_version = 2` so
// legacy v1 rows (created before the block-13762869 deploy) don't appear as
// interactable. v1 circles are kept in the table for historical /stats
// reference, but the current ChainCircleCore has no record of them so any
// on-chain write against a v1 id would revert with CircleDoesNotExist.
//
// Still on-chain (for now):
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
                .eq('core_version', 2)
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
                .eq('core_version', 2)
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
                .eq('core_version', 2)
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

// useUserStats — prefers on-chain reputation (from v2 ReputationManagerV2
// callbacks indexed into reputation_events + tier_changes), falls back to
// the off-chain user_reputation estimate view for counts the contract
// doesn't expose (e.g. circles_joined).
//
// Why: v2 contracts emit ScoreChanged with the authoritative score_after
// every time a user contributes / completes / gets a payout. The latest
// row in reputation_events is the truth. Previously we read from the
// user_reputation view which recomputed from indexed contribution counts;
// that drifts from chain when the indexer lags or the formula mismatches
// (e.g. the view doesn't know about streak bonuses).
export function useUserStats() {
    const { userAddress, isConnected } = useCircleContract();
    return useQuery({
        queryKey: ['userStats.db', userAddress],
        queryFn: async () => {
            const addr = lc(userAddress);

            // Latest on-chain reputation row (most recent ScoreChanged) — this
            // is what v2 ReputationManagerV2 holds authoritatively.
            const { data: latestRep } = await supabase
                .from('reputation_events')
                .select('score_after, block_timestamp')
                .eq('user_address', addr)
                .order('block_number', { ascending: false })
                .limit(1)
                .maybeSingle();
            const { data: latestTier } = await supabase
                .from('tier_changes')
                .select('to_tier')
                .eq('user_address', addr)
                .order('block_number', { ascending: false })
                .limit(1)
                .maybeSingle();

            // Off-chain estimate view — still useful for counts + totals the
            // contract doesn't expose (circles_joined, total_contributions_amount).
            const { data: estimate } = await supabase
                .from('user_reputation')
                .select('*')
                .eq('address', addr)
                .maybeSingle();

            // Active-circle count (status = 1 among memberships)
            const { data: activeMembers } = await supabase
                .from('circle_members')
                .select('circles!inner(status)')
                .eq('user_address', addr);
            const activeCircles = (activeMembers ?? []).filter(
                (m) => m.circles?.status === 1,
            ).length;

            const hasOnChain = !!latestRep;
            const derivedTier = (score) =>
                score >= 850 ? 'Gold'
                : score >= 700 ? 'Silver'
                : score >= 500 ? 'Bronze'
                : 'None';
            const score = hasOnChain
                ? Number(latestRep.score_after ?? 0)
                : Number(estimate?.score ?? 0);
            const tier = latestTier?.to_tier
                || (hasOnChain ? derivedTier(score) : (estimate?.tier ?? 'None'));

            return {
                totalSaved: fmtUnits(estimate?.total_contributions_amount),
                totalInterest: fmtUnits(estimate?.total_payouts_amount),
                activeCircles,
                totalCircles: Number(estimate?.circles_joined ?? 0),
                reputation: {
                    source: hasOnChain ? 'on-chain' : 'off-chain',
                    score,
                    tier,
                    completedCircles: Number(estimate?.circles_completed ?? 0),
                    onTimeRate: 100,
                    totalSaved: fmtUnits(estimate?.total_contributions_amount),
                    accountAge: Number(estimate?.first_action_ts ?? 0),
                    longestStreak: 0,
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
                .eq('status', 1) // Active only
                .eq('core_version', 2);
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
                .eq('core_version', 2)
                .limit(50);
            if (error) throw error;
            return (data ?? []).map(mapCircleRow);
        },
        enabled: !!searchTerm && searchTerm.length >= 3,
        staleTime: 20_000,
    });
}

// useCircleByInviteCode — on-chain fallback (v2-compat).
// Invite codes aren't in Supabase yet. v2 exposes them via the public
// `circleInviteCode(uint256)` mapping, and circles + members via `circles(id)`
// + `getCircleMembers(id)`. Capped at the first 500 circles to bound the
// batch — once indexer column lands, this goes to Supabase.
export function useCircleByInviteCode(inviteCode) {
    const { getContract, isConnected } = useCircleContract();
    return useQuery({
        queryKey: ['circleByInviteCode', inviteCode],
        queryFn: async () => {
            const contract = await getContract('core');
            const circleCounter = await contract.circleCounter();
            const totalCircles = Math.min(Number(circleCounter), 500);
            const BATCH_SIZE = 100;
            const normalizedInviteCode = inviteCode.toLowerCase();

            for (let start = 1; start <= totalCircles; start += BATCH_SIZE) {
                const end = Math.min(start + BATCH_SIZE, totalCircles + 1);
                const checkPromises = [];
                for (let i = start; i < end; i++) {
                    checkPromises.push(
                        contract
                            .circleInviteCode(i)
                            .then((code) => ({ id: i, code: (code || '').toLowerCase() }))
                            .catch(() => ({ id: i, code: null })),
                    );
                }
                const results = await Promise.all(checkPromises);
                const match = results.find((r) => r.code === normalizedInviteCode);
                if (match) {
                    const [c, memberAddresses] = await Promise.all([
                        contract.circles(match.id),
                        contract.getCircleMembers(match.id),
                    ]);
                    const maxMembers = Number(c.maxMembers);
                    const currentRound = Number(c.currentRound);
                    const duration = Number(c.duration);
                    const status = Number(c.status);
                    const progressPct = calculateProgress(
                        currentRound, duration,
                        memberAddresses.length, maxMembers,
                        status === 1, status,
                    );
                    return {
                        id: match.id.toString(),
                        name: c.name,
                        goalType: Number(c.goalType),
                        amount: ethers.formatUnits(c.contributionAmount, 6),
                        duration,
                        currentRound,
                        maxMembers,
                        members: memberAddresses.length,
                        frequency: Number(c.frequency),
                        isActive: status === 1,
                        status,
                        createdAt: Number(c.createdAt),
                        startAt: Number(c.startAt),
                        vaultBalance: ethers.formatUnits(c.vaultBalance, 6),
                        creator: c.creator,
                        progress: progressPct,
                        icon: null,
                        inviteCode: match.code,
                        memberAddresses: [...memberAddresses],
                    };
                }
            }
            return null;
        },
        // v2 invite codes are short alphanumerics (~8 chars). Gate at 6 so
        // the query only runs once the user has pasted something plausible
        // but doesn't require them to type past the actual code length.
        enabled: isConnected && !!inviteCode && inviteCode.trim().length >= 6,
        staleTime: 60_000,
    });
}
