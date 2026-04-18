// Public peer view of a single circle — roster with display names, tiers,
// reputation, current-round status. This is the trust surface for ROSCAs:
// seeing who's in a circle and their track record decides whether someone
// joins. Readable without a wallet connection.

import React from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
    FaArrowLeft, FaCrown, FaMedal, FaTrophy, FaCheckCircle,
    FaClock, FaUsers, FaCalendarAlt, FaCoins, FaHashtag,
} from 'react-icons/fa';
import { useCircleDetails } from '../hooks/useCircleData';
import { useCircleContract } from '../hooks/useCircleContract';
import { useJoinCircle, useContribute } from '../hooks/useCircleActions';
import { useMemberStatus } from '../hooks/useMemberStatus';
import { formatAddressOrName } from '../hooks/useNameRegistry';
import { useChainOrigins } from '../hooks/useChainOrigin';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import PurpleBtn from '../Components/PurpleBtn';
import ChainBadge from '../Components/ChainBadge';
import { getGoalIcon, getGoalColors, formatFrequency, calculateProgress } from '../utils/circleHelpers';
import formatCurrency from '../utils/formatCurrency';
import Skeleton, { SkeletonRow } from '../Components/Skeleton';
import CircleEventsTimeline from '../Pages/Circle/CircleEventsTimeline';
import useIsTabletOrMobile from '../hooks/useIsTabletOrMobile';

const TIER_STYLES = {
    Gold:   { icon: FaCrown,  color: 'text-[#FDA318]' },
    Silver: { icon: FaMedal,  color: 'text-[#C0C0C0]' },
    Bronze: { icon: FaMedal,  color: 'text-[#CD7F32]' },
    None:   { icon: FaTrophy, color: 'text-[#707070]' },
};

// Fetch member rows with their reputation joined in one query.
function useCircleRoster(circleId) {
    return useQuery({
        queryKey: ['circleRoster.db', circleId],
        queryFn: async () => {
            if (!circleId) return [];
            const id = Number(circleId);
            const { data: members, error } = await supabase
                .from('circle_members')
                .select('user_address, position, joined_at, has_contributed_current_round, has_received_payout')
                .eq('circle_id', id)
                .order('position', { ascending: true, nullsFirst: false });
            if (error) throw error;
            const addrs = (members ?? []).map((m) => m.user_address);
            if (!addrs.length) return [];
            const { data: reps } = await supabase
                .from('user_reputation')
                .select('address, display_name, score, tier, circles_completed, total_contributions_count')
                .in('address', addrs);
            const byAddr = new Map((reps ?? []).map((r) => [r.address, r]));
            return members.map((m) => ({
                ...m,
                reputation: byAddr.get(m.user_address) || null,
            }));
        },
        enabled: !!circleId,
        staleTime: 20_000,
    });
}

const STATUS_LABELS = { 0: 'Pending', 1: 'Active', 2: 'Completed', 3: 'Paused', 4: 'Cancelled' };
const STATUS_COLORS = {
    0: 'bg-[#FDA318]/20 text-[#FDA318] border-[#FDA318]/40',
    1: 'bg-green-500/20 text-green-400 border-green-500/40',
    2: 'bg-[#D548EC]/20 text-[#F4AEFF] border-[#D548EC]/40',
    3: 'bg-[#707070]/20 text-[#AAA] border-[#707070]/40',
    4: 'bg-red-500/20 text-red-400 border-red-500/40',
};

export default function CircleDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userAddress, isConnected } = useCircleContract();
    const isTabletOrMobile = useIsTabletOrMobile();
    const { data: circle, isLoading, refetch } = useCircleDetails(id);
    const { data: roster, refetch: refetchRoster } = useCircleRoster(id);
    const rosterAddresses = (roster ?? []).map((m) => m.user_address);
    const { map: originMap } = useChainOrigins(rosterAddresses);
    const joinCircle = useJoinCircle();
    const contribute = useContribute();
    const { data: memberStatus } = useMemberStatus(id);

    const handleContribute = async () => {
        if (!isConnected) {
            toast.error('Connect your wallet first');
            return;
        }
        try {
            const result = await contribute.mutateAsync(Number(id));
            if (result?.status === 'pending') {
                toast.info('Contribution pending', {
                    description: 'Signature submitted, confirmations are slow. Refresh in a minute.',
                    duration: 10_000,
                });
            } else {
                toast.success('Contribution sent');
            }
            await Promise.all([refetch(), refetchRoster()]);
        } catch (err) {
            if (err?.pending) {
                toast.info('Approval still pending', { description: err.message, duration: 10_000 });
                return;
            }
            const raw = err?.message || '';
            const lower = raw.toLowerCase();
            if (lower.includes('user rejected')) return;
            if (lower.includes('insufficient')) {
                toast.error('Insufficient CUSD', { description: 'Claim from the faucet first.' });
                return;
            }
            const short = raw.length > 180 ? raw.slice(0, 180) + '…' : raw;
            toast.error('Contribution failed', { description: short });
        }
    };

    const handleJoin = async () => {
        if (!isConnected) {
            toast.error('Connect your wallet first');
            return;
        }
        try {
            const result = await joinCircle.mutateAsync(id);
            if (result?.status === 'pending') {
                toast.info('Still pending on origin chain', {
                    description: 'Your signature is submitted but confirmations are slow. Refresh in a minute — if you are in the roster the join landed.',
                    duration: 10_000,
                });
            } else {
                toast.success('Joined circle', {
                    description: 'Your first contribution has been sent on-chain.',
                });
            }
            // Refetch the roster + circle state so the UI updates to "you"
            // in the members list and hides the Join CTA.
            await Promise.all([refetch(), refetchRoster()]);
        } catch (err) {
            if (err?.pending) {
                toast.info('Approval still pending', { description: err.message, duration: 10_000 });
                return;
            }
            const raw = err?.message || '';
            const lower = raw.toLowerCase();
            if (lower.includes('user rejected')) return; // silent on cancel
            if (
                (lower.includes('not confirmed with') && lower.includes('ms')) ||
                lower.includes('failed to retrieve push chain') ||
                lower.includes('not been indexed yet')
            ) {
                // Push UEA cross-chain relay timeout (typically Solana side congested).
                // Contract may still have processed — tell the user to wait + retry.
                toast.error('Transaction still pending', {
                    description:
                        'Your wallet chain took too long to confirm. Wait 30s and refresh — if you do not see yourself in the roster, try joining again.',
                    duration: 10_000,
                });
                return;
            }
            if (lower.includes('insufficient')) {
                toast.error('Insufficient CUSD', { description: 'Claim from the faucet first.' });
                return;
            }
            // Fallback — truncate the ugly hex/base58 hashes in error text
            const short = raw.length > 180 ? raw.slice(0, 180) + '…' : raw;
            toast.error('Failed to join circle', { description: short });
        }
    };

    const GoalIcon = circle ? getGoalIcon(circle.goalType) : null;
    const goalColors = circle ? getGoalColors(circle.goalType) : null;
    const isMember = roster?.some((m) => m.user_address === userAddress?.toLowerCase());
    const canJoin = circle && !isMember && circle.status === 0 && (circle.members ?? 0) < (circle.maxMembers ?? 0);

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 font-dm">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#AAA] hover:text-white w-fit">
                    <FaArrowLeft size={14} /> Back
                </button>
                {/* Hero skeleton */}
                <div className="rounded-[16px] border border-[#333] bg-[#111111] p-6 lg:p-8 flex flex-col lg:flex-row gap-6 lg:items-center">
                    <div className="flex items-center gap-4 shrink-0">
                        <Skeleton className="w-16 h-16 lg:w-20 lg:h-20 rounded-full" />
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-6 lg:h-8 w-48" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex flex-col gap-2">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-5 w-20" />
                            </div>
                        ))}
                    </div>
                </div>
                {/* Progress + roster skeleton */}
                <div className="rounded-[12px] border border-[#333] bg-[#111111] p-4 lg:p-5 flex flex-col gap-2">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-2 w-full rounded-full" />
                </div>
                <ul className="flex flex-col gap-2">
                    {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                </ul>
            </div>
        );
    }
    if (!circle) {
        return (
            <div className="flex flex-col gap-6 font-dm">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#AAA] hover:text-white w-fit">
                    <FaArrowLeft size={14} /> Back
                </button>
                <div className="rounded-[12px] border border-[#333] bg-[#111111] p-12 text-center text-[#707070]">
                    Circle not found.
                </div>
            </div>
        );
    }

    const progressPct = calculateProgress(
        circle.currentRound, circle.duration, circle.members,
        circle.maxMembers, circle.isActive, circle.status,
    );

    return (
        <div className="flex flex-col gap-6 font-dm">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-[#AAA] hover:text-white w-fit text-[13px] lg:text-[14px]"
            >
                <FaArrowLeft size={14} /> Back
            </button>

            {/* Hero card */}
            <section
                className="rounded-[16px] border border-[#F4AEFF]/30 p-6 lg:p-8 flex flex-col lg:flex-row gap-6 lg:items-center bg-[#111111]"
                style={goalColors ? { background: `linear-gradient(135deg, ${goalColors.bg} 0%, #111111 60%)` } : undefined}
            >
                <div className="flex items-center gap-4 shrink-0">
                    {GoalIcon && (
                        <div
                            className="w-16 h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: goalColors?.iconBg, color: goalColors?.iconColor }}
                        >
                            <GoalIcon size={isTabletOrMobile ? 26 : 32} />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[22px] lg:text-[32px] font-bold truncate">{circle.name}</h1>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                            <span className={`text-[11px] lg:text-[12px] px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[circle.status]}`}>
                                {STATUS_LABELS[circle.status]}
                            </span>
                            <span className="text-[11px] lg:text-[12px] text-[#707070]">
                                Circle #{circle.id}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3 text-[12px] lg:text-[14px]">
                    <Stat icon={<FaCoins />}  label="Contribution" value={formatCurrency(circle.amount)} />
                    <Stat icon={<FaUsers />}   label="Members"      value={`${circle.members}/${circle.maxMembers}`} />
                    <Stat icon={<FaClock />}   label="Frequency"    value={formatFrequency(circle.frequency)} />
                    <Stat icon={<FaCalendarAlt />} label="Duration" value={`${circle.duration} ${circle.duration === 1 ? 'mo' : 'mos'}`} />
                </div>
            </section>

            {/* Progress bar */}
            <section className="rounded-[12px] border border-[#333] bg-[#111111] p-4 lg:p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[12px] lg:text-[14px]">
                    <span className="text-[#AAA]">Progress · Round {circle.currentRound} of {circle.duration}</span>
                    <span className="text-[#F4AEFF] font-semibold">{progressPct}%</span>
                </div>
                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-[#D548EC] to-[#F4AEFF] transition-all"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </section>

            {/* Roster */}
            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-[18px] lg:text-[22px] font-bold flex items-center gap-2">
                        <FaUsers className="text-[#D548EC]" /> Roster
                    </h2>
                    <span className="text-[12px] text-[#707070]">
                        {circle.members}/{circle.maxMembers} seats
                    </span>
                </div>

                {!roster?.length ? (
                    <div className="rounded-[12px] border border-dashed border-[#F4AEFF]/30 p-8 text-center text-[#707070]">
                        No members yet.
                    </div>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {roster.map((m, idx) => {
                            const rep = m.reputation;
                            const tier = rep?.tier || 'None';
                            const style = TIER_STYLES[tier];
                            const Icon = style.icon;
                            const isYou = m.user_address === userAddress?.toLowerCase();
                            const isCreator = m.user_address === circle.creator?.toLowerCase();
                            return (
                                <li
                                    key={m.user_address}
                                    className={`rounded-[12px] border p-3 lg:p-4 flex items-center gap-3 lg:gap-4 bg-[#111111] ${
                                        isYou ? 'border-[#D548EC]' : 'border-[#333]'
                                    }`}
                                >
                                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-black/40 border border-[#333] flex items-center justify-center shrink-0 text-[13px] text-[#707070] font-mono">
                                        {m.position ?? idx + 1}
                                    </div>
                                    <Icon className={`${style.color} shrink-0`} size={18} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Link
                                                to={`/chain/leaderboard?search=${m.user_address}`}
                                                className="text-[14px] lg:text-[16px] font-semibold truncate hover:text-[#F4AEFF]"
                                            >
                                                {formatAddressOrName(m.user_address, rep?.display_name)}
                                            </Link>
                                            {isCreator && <span className="text-[10px] lg:text-[11px] px-2 py-0.5 rounded-full bg-[#F4AEFF]/20 text-[#F4AEFF]">creator</span>}
                                            {isYou && <span className="text-[10px] lg:text-[11px] px-2 py-0.5 rounded-full bg-[#D548EC]/20 text-[#D548EC]">you</span>}
                                            <ChainBadge origin={originMap.get(m.user_address)} />
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] lg:text-[12px] text-[#707070] mt-0.5">
                                            <span className={style.color}>{rep?.score ?? 0} pts</span>
                                            <span>· {rep?.circles_completed ?? 0} completed</span>
                                            {circle.isActive && (
                                                <span
                                                    className={`flex items-center gap-1 ${
                                                        m.has_contributed_current_round ? 'text-green-400' : 'text-[#FDA318]'
                                                    }`}
                                                >
                                                    <FaCheckCircle size={10} />
                                                    {m.has_contributed_current_round ? 'paid this round' : 'pending'}
                                                </span>
                                            )}
                                            {m.has_received_payout && (
                                                <span className="text-[#D548EC]">· received payout</span>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {/* Contribute CTA (member + circle active + round outstanding) */}
            {isMember && circle.status === 1 && memberStatus?.owesCurrentRound && (
                <div className="rounded-[12px] border border-[#AEFFDA] bg-[#AEFFDA]/10 p-5 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                    <div>
                        <p className="text-[15px] lg:text-[17px] font-semibold">Contribution due this round</p>
                        <p className="text-[12px] lg:text-[14px] text-[#AAA]">
                            Send {formatCurrency(circle.amount)} CUSD to stay on-time.
                            Round {circle.currentRound} of {circle.duration} ·{' '}
                            {memberStatus.remainingPayments} payment{memberStatus.remainingPayments === 1 ? '' : 's'} left after this.
                        </p>
                    </div>
                    <PurpleBtn
                        text={contribute.isPending ? 'Contributing…' : 'Contribute now'}
                        icon={contribute.isPending ? null : 'rightArrow'}
                        action={handleContribute}
                        disabled={contribute.isPending}
                    />
                </div>
            )}

            {/* Member but fully paid this round — gentle confirmation */}
            {isMember && circle.status === 1 && memberStatus && !memberStatus.owesCurrentRound && !memberStatus.hasReceivedPayout && (
                <div className="rounded-[12px] border border-[#333] bg-[#111111] p-4 flex items-center gap-3 text-[12px] lg:text-[13px] text-[#AAA]">
                    <FaCheckCircle className="text-[#AEFFDA] shrink-0" />
                    <span>
                        You're paid up for round {circle.currentRound}.
                        {memberStatus.remainingPayments > 0 && ` ${memberStatus.remainingPayments} payment${memberStatus.remainingPayments === 1 ? '' : 's'} remaining.`}
                    </span>
                </div>
            )}

            {/* Join CTA (only if joinable) */}
            {canJoin && (
                <div className="rounded-[12px] border border-[#D548EC] bg-[#D548EC]/10 p-5 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                    <div>
                        <p className="text-[15px] lg:text-[17px] font-semibold">Open for new members</p>
                        <p className="text-[12px] lg:text-[14px] text-[#AAA]">
                            {circle.maxMembers - circle.members} seat{circle.maxMembers - circle.members === 1 ? '' : 's'} left.
                            First contribution is {formatCurrency(circle.amount)} CUSD (auto-approved + sent).
                        </p>
                    </div>
                    <PurpleBtn
                        text={joinCircle.isPending ? 'Joining…' : 'Join this circle'}
                        icon={joinCircle.isPending ? null : 'rightArrow'}
                        action={handleJoin}
                        disabled={joinCircle.isPending}
                    />
                </div>
            )}

            {/* Event timeline (history of state transitions) */}
            <CircleEventsTimeline circleId={id} />

            {/* Creator identity footnote */}
            <div className="rounded-[12px] border border-[#333] bg-[#111111] p-4 flex items-center gap-3 text-[12px] lg:text-[13px] text-[#AAA]">
                <FaHashtag className="text-[#707070]" />
                <span className="font-mono">{circle.creator}</span>
                <span className="text-[#707070]">· creator address</span>
            </div>
        </div>
    );
}

function Stat({ icon, label, value }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-[#D548EC]">{icon}</span>
            <div className="min-w-0">
                <p className="text-[10px] lg:text-[11px] text-[#707070] uppercase tracking-wider">{label}</p>
                <p className="text-[14px] lg:text-[16px] font-semibold truncate">{value}</p>
            </div>
        </div>
    );
}
