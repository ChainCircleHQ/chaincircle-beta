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
import { formatAddressOrName } from '../hooks/useNameRegistry';
import { supabase } from '../lib/supabase';
import PurpleBtn from '../Components/PurpleBtn';
import { getGoalIcon, getGoalColors, formatFrequency, calculateProgress } from '../utils/circleHelpers';
import formatCurrency from '../utils/formatCurrency';

const isTabletOrMobile = window.innerWidth <= 1014;

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
    const { userAddress } = useCircleContract();
    const { data: circle, isLoading } = useCircleDetails(id);
    const { data: roster } = useCircleRoster(id);

    const GoalIcon = circle ? getGoalIcon(circle.goalType) : null;
    const goalColors = circle ? getGoalColors(circle.goalType) : null;
    const isMember = roster?.some((m) => m.user_address === userAddress?.toLowerCase());
    const canJoin = circle && !isMember && circle.status === 0 && (circle.members ?? 0) < (circle.maxMembers ?? 0);

    if (isLoading || !circle) {
        return (
            <div className="flex flex-col gap-6 font-dm">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#AAA] hover:text-white w-fit">
                    <FaArrowLeft size={14} /> Back
                </button>
                <div className="rounded-[12px] border border-[#333] bg-[#111111] p-12 text-center text-[#707070]">
                    {isLoading ? 'Loading circle…' : 'Circle not found.'}
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

            {/* Join CTA (only if joinable) */}
            {canJoin && (
                <div className="rounded-[12px] border border-[#D548EC] bg-[#D548EC]/10 p-5 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                    <div>
                        <p className="text-[15px] lg:text-[17px] font-semibold">Open for new members</p>
                        <p className="text-[12px] lg:text-[14px] text-[#AAA]">
                            {circle.maxMembers - circle.members} seat{circle.maxMembers - circle.members === 1 ? '' : 's'} left.
                            First contribution is {formatCurrency(circle.amount)} CUSD.
                        </p>
                    </div>
                    <PurpleBtn
                        text="Join this circle"
                        icon="rightArrow"
                        action={() => navigate(`/chain/circle?join=${circle.id}`)}
                    />
                </div>
            )}

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
