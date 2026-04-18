// Circle preview modal. Opens from dashboard circle cards.
//
// Shows: hero (goal icon + name + status pill + role badge), progress,
// four-stat grid, current round card, roster preview (first 6 members
// + "N more"), invite code with copy, action block tailored to role
// (creator / member / visitor). Invite code is read on demand from the
// contract via useCircleInviteCode.

import React, { useRef } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as htmlToImage from 'html-to-image';
import { supabase } from '../../lib/supabase';
import {
    IoClose, IoShareSocial, IoDownload,
} from 'react-icons/io5';
import {
    FaCopy, FaUsers, FaClock, FaCalendarAlt, FaCoins, FaCheckCircle,
    FaCrown,
} from 'react-icons/fa';

import { useCircleDetails } from '../../hooks/useCircleData';
import { useJoinCircle, useContribute } from '../../hooks/useCircleActions';
import { useMemberStatus } from '../../hooks/useMemberStatus';
import { useCircleContract } from '../../hooks/useCircleContract';
import { useCircleInviteCode } from '../../hooks/useCircleInviteCode';
import { formatAddressOrName } from '../../hooks/useNameRegistry';
import { getGoalIcon, getGoalColors, formatFrequency } from '../../utils/circleHelpers';
import formatCurrency from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import PurpleBtn from '../../Components/PurpleBtn';
import useIsTabletOrMobile from '../../hooks/useIsTabletOrMobile';

const STATUS_LABELS = { 0: 'Pending', 1: 'Active', 2: 'Completed', 3: 'Cancelled', 4: 'Paused' };
const STATUS_TONE = {
    0: 'border-[#FDA318]/60 text-[#FDA318] bg-[#FDA318]/10',
    1: 'border-[#AEFFDA]/60 text-[#AEFFDA] bg-[#AEFFDA]/10',
    2: 'border-[#D548EC]/60 text-[#F4AEFF] bg-[#D548EC]/10',
    3: 'border-[#FFBDBD]/60 text-[#FFBDBD] bg-[#FFBDBD]/10',
    4: 'border-[#707070]/60 text-[#AAA] bg-[#707070]/10',
};

const truncateAddr = (addr) => {
    if (!addr) return '';
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
};

// Deterministic HSL fill per address — gives each avatar a stable,
// distinguishable color without any backend lookup.
function avatarColor(addr) {
    if (!addr) return { bg: '#333', fg: '#fff' };
    let hash = 0;
    for (let i = 0; i < addr.length; i++) hash = (hash * 31 + addr.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    return { bg: `hsl(${hue}, 50%, 25%)`, fg: `hsl(${hue}, 80%, 75%)` };
}

function MemberAvatar({ address, isCreator, isYou, size = 36 }) {
    const { bg, fg } = avatarColor(address);
    const initials = (address || '').slice(2, 4).toUpperCase();
    return (
        <div
            className="relative rounded-full flex items-center justify-center shrink-0 font-mono font-semibold border-2 border-[#111111]"
            style={{ width: size, height: size, backgroundColor: bg, color: fg, fontSize: size * 0.36 }}
            title={address}
        >
            {initials}
            {isCreator && (
                <FaCrown
                    className="absolute -top-1.5 -right-1.5 text-[#FDA318] drop-shadow"
                    size={size * 0.36}
                    title="Creator"
                />
            )}
            {isYou && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-[#D548EC] text-white px-1.5 py-0 rounded-full border border-[#111111]">
                    you
                </span>
            )}
        </div>
    );
}

// Fetch display names for a batch of addresses (Supabase users table).
function useDisplayNames(addresses) {
    const key = (addresses ?? []).map((a) => a?.toLowerCase()).sort().join(',');
    return useQuery({
        queryKey: ['displayNames.batch', key],
        queryFn: async () => {
            const addrs = (addresses ?? []).map((a) => a?.toLowerCase()).filter(Boolean);
            if (!addrs.length) return new Map();
            const { data } = await supabase
                .from('users')
                .select('address, display_name')
                .in('address', addrs);
            return new Map((data ?? []).map((r) => [r.address, r.display_name]));
        },
        enabled: (addresses ?? []).length > 0,
        staleTime: 60_000,
    });
}

export default function CirclePreview({ circleId, onClose }) {
    const navigate = useNavigate();
    const isTabletOrMobile = useIsTabletOrMobile();
    const { userAddress } = useCircleContract();

    const { data: circle, isLoading, error } = useCircleDetails(circleId);
    const { data: inviteCode } = useCircleInviteCode(circleId);
    const { data: memberStatus } = useMemberStatus(circleId);
    const joinCircle = useJoinCircle();
    const contribute = useContribute();
    const previewRef = useRef(null);

    const lcUser = userAddress?.toLowerCase() ?? '';
    const isCreator = circle?.creator?.toLowerCase() === lcUser;
    const isMember = circle?.memberAddresses?.some(
        (a) => a?.toLowerCase() === lcUser,
    ) || false;
    const canJoin = !isCreator && !isMember && circle?.status === 0
        && (circle?.members ?? 0) < (circle?.maxMembers ?? 0);

    const members = circle?.memberAddresses ?? [];
    const { data: nameMap } = useDisplayNames(members);

    const handleJoin = async () => {
        try {
            const res = await joinCircle.mutateAsync(circleId);
            if (res?.status === 'pending') {
                toast.info('Still pending on origin chain', {
                    description: 'Signature submitted, confirmations are slow. Refresh in a minute.',
                    duration: 10_000,
                });
            } else {
                toast.success('Joined circle');
            }
            onClose?.();
            navigate('/chain/circle');
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
            toast.error('Failed to join circle', { description: raw.slice(0, 200) });
        }
    };

    const handleContribute = async () => {
        try {
            const res = await contribute.mutateAsync(Number(circleId));
            if (res?.status === 'pending') {
                toast.info('Contribution pending', { description: 'Signature submitted. Refresh in a minute.', duration: 10_000 });
            } else {
                toast.success('Contribution sent');
            }
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
            toast.error('Contribution failed', { description: raw.slice(0, 200) });
        }
    };

    const handleShare = () => {
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/chain/circle/${circleId}`;
        if (navigator.share) {
            navigator.share({ title: circle?.name, text: `Join my savings circle: ${circle?.name}`, url: shareUrl });
        } else {
            navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied');
        }
    };

    const copyText = async (text, label) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copied`);
        } catch {
            toast.error('Copy failed');
        }
    };

    const exportAsImage = async () => {
        if (!previewRef.current || !circle) return;
        try {
            const dataUrl = await htmlToImage.toPng(previewRef.current, {
                quality: 1, pixelRatio: 3, backgroundColor: '#111111', cacheBust: true,
            });
            const link = document.createElement('a');
            link.download = `${circle.name.replace(/\s+/g, '-')}-circle.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            toast.error('Failed to export image', { description: err.message || 'Unknown error' });
        }
    };

    // ---- Early returns (all hooks above) ----------------------------------

    if (error) {
        return (
            <ModalShell onClose={onClose}>
                <div className="flex flex-col items-center gap-4 p-8 text-center">
                    <p className="text-red-400 text-xl font-bold">Circle not found</p>
                    <p className="text-[#707070] text-sm">Circle ID: {circleId}</p>
                    <p className="text-[#707070] text-xs font-mono max-w-sm break-all">
                        {error?.message || 'Unknown error'}
                    </p>
                    <button
                        onClick={onClose || (() => navigate('/chain/circle'))}
                        className="mt-2 px-6 py-2 bg-[#D548EC] rounded-full hover:bg-[#B83CC3] transition-all text-white"
                    >
                        {onClose ? 'Close' : 'Back to Circles'}
                    </button>
                </div>
            </ModalShell>
        );
    }

    if (!circle) {
        return (
            <ModalShell onClose={onClose}>
                <div className="p-8 text-center text-[#AAA]">Loading circle…</div>
            </ModalShell>
        );
    }

    const Icon = getGoalIcon(circle.goalType || 0);
    const colors = getGoalColors(circle.goalType || 0);
    const iconSize = isTabletOrMobile ? 26 : 34;
    const statusLabel = STATUS_LABELS[circle.status] || 'Unknown';
    const statusTone = STATUS_TONE[circle.status] || STATUS_TONE[0];
    const roleLabel = isCreator ? 'Your Circle' : isMember ? 'Member' : null;

    return (
        <ModalShell onClose={onClose}>
            <div ref={previewRef} className="flex flex-col">

                {/* Hero */}
                <section
                    className="relative p-6 lg:p-8 flex items-center gap-4 lg:gap-5 border-b border-[#F4AEFF]/20"
                    style={{ background: `linear-gradient(135deg, ${colors.bg} 0%, #111111 85%)` }}
                >
                    <div
                        className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: colors.iconBg ?? '#00000055', color: colors.iconColor ?? '#fff' }}
                    >
                        <Icon size={iconSize} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <h2 className="text-[20px] lg:text-[28px] font-bold truncate">{circle.name}</h2>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[11px] lg:text-[12px] px-2.5 py-0.5 rounded-full border ${statusTone}`}>
                                {statusLabel}
                            </span>
                            <span className="text-[11px] lg:text-[12px] text-[#707070]">
                                Circle #{circle.id}
                            </span>
                            {roleLabel && (
                                <span className="text-[11px] lg:text-[12px] px-2.5 py-0.5 rounded-full bg-[#D548EC]/20 text-[#F4AEFF] border border-[#D548EC]/40">
                                    {roleLabel}
                                </span>
                            )}
                        </div>
                    </div>
                </section>

                {/* Body */}
                <section className="p-6 lg:p-7 flex flex-col gap-6">

                    {/* Progress */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[12px] lg:text-[14px]">
                            <span className="text-[#AAA]">
                                Round <span className="text-white font-semibold">{circle.currentRound}</span> of {circle.duration}
                            </span>
                            <span className="text-[#F4AEFF] font-semibold">{circle.progress ?? 0}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#D548EC] to-[#F4AEFF] transition-all"
                                style={{ width: `${circle.progress ?? 0}%` }}
                            />
                        </div>
                    </div>

                    {/* Stat grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Stat icon={<FaCoins />}       label="Contribution" value={formatCurrency(circle.amount)} />
                        <Stat icon={<FaCalendarAlt />} label="Duration"     value={`${circle.duration} ${circle.duration === 1 ? 'mo' : 'mos'}`} />
                        <Stat icon={<FaClock />}       label="Frequency"    value={formatFrequency(circle.frequency)} />
                        <Stat icon={<FaCoins />}       label="Total pool"   value={formatCurrency(circle.vaultBalance)} />
                    </div>

                    {/* Per-round status for members */}
                    {isMember && circle.status === 1 && memberStatus && (
                        <div className={`rounded-[10px] border p-3 flex items-center gap-3 text-[12px] lg:text-[13px] ${
                            memberStatus.owesCurrentRound
                                ? 'border-[#FDA318]/50 bg-[#FDA318]/10 text-[#FDA318]'
                                : 'border-[#AEFFDA]/50 bg-[#AEFFDA]/10 text-[#AEFFDA]'
                        }`}>
                            <FaCheckCircle />
                            {memberStatus.owesCurrentRound
                                ? <span>Contribution due this round ({formatCurrency(circle.amount)}).</span>
                                : <span>Paid up for round {circle.currentRound}. {memberStatus.remainingPayments > 0 && `${memberStatus.remainingPayments} left.`}</span>}
                        </div>
                    )}

                    {/* Roster preview */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[12px] lg:text-[13px] text-[#AAA]">
                            <span className="flex items-center gap-2"><FaUsers className="text-[#D548EC]" /> Members</span>
                            <span>{circle.members ?? 0}/{circle.maxMembers ?? 0}</span>
                        </div>
                        {members.length === 0 ? (
                            <div className="rounded-[10px] border border-dashed border-[#333] bg-[#0a0a0a] p-3 text-center text-[#707070] text-[12px]">
                                No members yet.
                            </div>
                        ) : (
                            <>
                                <ul className="flex flex-col gap-1.5">
                                    {members.slice(0, 5).map((addr) => {
                                        const isCreatorRow = addr?.toLowerCase() === circle.creator?.toLowerCase();
                                        const isYou = addr?.toLowerCase() === lcUser;
                                        const name = nameMap?.get(addr?.toLowerCase());
                                        return (
                                            <li
                                                key={addr}
                                                className="flex items-center gap-2.5 rounded-[8px] bg-[#0a0a0a] border border-[#222] px-2.5 py-1.5"
                                            >
                                                <MemberAvatar
                                                    address={addr}
                                                    isCreator={isCreatorRow}
                                                    isYou={isYou}
                                                    size={isTabletOrMobile ? 28 : 32}
                                                />
                                                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                                    <span className="text-[13px] lg:text-[14px] text-white truncate">
                                                        {name || truncateAddr(addr)}
                                                    </span>
                                                    {name && (
                                                        <span className="font-mono text-[10px] lg:text-[11px] text-[#707070]">
                                                            {truncateAddr(addr)}
                                                        </span>
                                                    )}
                                                    {isCreatorRow && (
                                                        <span className="text-[10px] px-1.5 py-0 rounded-full bg-[#FDA318]/20 text-[#FDA318] border border-[#FDA318]/40">
                                                            creator
                                                        </span>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                                {members.length > 5 && (
                                    <button
                                        onClick={() => { onClose?.(); navigate(`/chain/circle/${circle.id}`); }}
                                        className="text-[#F4AEFF] text-[12px] lg:text-[13px] hover:text-white underline underline-offset-4 self-start"
                                    >
                                        + {members.length - 5} more — view full roster →
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Invite code */}
                    {inviteCode && (
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[#AAA] text-[12px] lg:text-[13px]">Invite code</span>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0 font-mono text-[12px] lg:text-[13px] bg-black/40 border border-[#333] px-3 py-2.5 rounded-[10px] truncate">
                                    {inviteCode}
                                </div>
                                <button
                                    onClick={() => copyText(inviteCode, 'Invite code')}
                                    className="p-2.5 rounded-[10px] border border-[#333] hover:border-[#F4AEFF]/60 text-[#AAA] hover:text-[#F4AEFF]"
                                    title="Copy invite code"
                                >
                                    <FaCopy size={14} />
                                </button>
                            </div>
                            <p className="text-[#707070] text-[11px] lg:text-[12px]">
                                Share this code. Anyone with it can join this circle from the Circle page.
                            </p>
                        </div>
                    )}

                    {/* Created / started subtle line */}
                    <div className="flex items-center gap-4 text-[11px] lg:text-[12px] text-[#707070]">
                        <span>Created {formatDate(circle.createdAt)}</span>
                        <span className="text-[#333]">·</span>
                        <span>{circle.startAt > 0 ? `Started ${formatDate(circle.startAt)}` : 'Not started'}</span>
                    </div>

                    {/* Creator address — muted */}
                    <div className="flex items-center gap-2 text-[11px] lg:text-[12px] text-[#707070]">
                        <span>Creator</span>
                        <span className="font-mono text-[#AAA]">{truncateAddr(circle.creator)}</span>
                        <button
                            onClick={() => copyText(circle.creator, 'Creator address')}
                            className="p-1 rounded hover:text-[#F4AEFF]"
                            title="Copy creator address"
                        >
                            <FaCopy size={11} />
                        </button>
                    </div>
                </section>

                {/* Action block */}
                <footer className="px-6 lg:px-7 pb-6 lg:pb-7 pt-0 flex flex-col gap-3">
                    {/* Primary action */}
                    {canJoin && (
                        <div onClick={joinCircle.isPending ? undefined : handleJoin}>
                            <PurpleBtn
                                text={joinCircle.isPending ? 'Joining…' : `Join · first contribution ${formatCurrency(circle.amount)}`}
                                font="bold"
                                disabled={joinCircle.isPending}
                            />
                        </div>
                    )}
                    {(isMember || isCreator) && circle.status === 1 && memberStatus?.owesCurrentRound && (
                        <div onClick={contribute.isPending ? undefined : handleContribute}>
                            <PurpleBtn
                                text={contribute.isPending ? 'Contributing…' : `Contribute ${formatCurrency(circle.amount)}`}
                                font="bold"
                                disabled={contribute.isPending}
                            />
                        </div>
                    )}
                    {!canJoin && !isMember && !isCreator && (
                        <p className="text-center text-[#707070] text-[12px] lg:text-[13px]">
                            This circle isn't open to new members right now.
                        </p>
                    )}

                    {/* Secondary row */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleShare}
                            className="flex-1 px-4 py-2.5 rounded-full border border-[#F4AEFF]/40 hover:bg-[#F4AEFF]/10 transition-colors flex items-center justify-center gap-2 text-[13px] lg:text-[14px]"
                        >
                            <IoShareSocial size={16} /> Share
                        </button>
                        <button
                            onClick={exportAsImage}
                            className="px-4 py-2.5 rounded-full border border-[#F4AEFF]/40 hover:bg-[#F4AEFF]/10 transition-colors flex items-center justify-center gap-2 text-[13px] lg:text-[14px]"
                            title="Download preview as image"
                        >
                            <IoDownload size={16} />
                        </button>
                        {(isMember || isCreator) && (
                            <button
                                onClick={() => { onClose?.(); navigate(`/chain/circle/${circle.id}`); }}
                                className="flex-1 px-4 py-2.5 rounded-full bg-[#D548EC] hover:bg-[#B83CC3] text-white font-semibold text-[13px] lg:text-[14px]"
                            >
                                Open full view
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </ModalShell>
    );
}

function ModalShell({ children, onClose }) {
    return (
        <div
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-lg flex items-center justify-center p-4 font-dm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <div className="relative w-full max-w-[560px] max-h-[92vh] overflow-y-auto rounded-[20px] border border-[#F4AEFF]/40 bg-[#111111]">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/40 hover:bg-[#D548EC]/30 text-[#AAA] hover:text-white backdrop-blur"
                    >
                        <IoClose size={18} />
                    </button>
                )}
                {children}
            </div>
        </div>
    );
}

function Stat({ icon, label, value }) {
    return (
        <div className="rounded-[10px] border border-[#333] bg-[#0a0a0a] p-3 flex flex-col gap-1">
            <span className="text-[#D548EC] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                {icon} {label}
            </span>
            <span className="text-[15px] lg:text-[17px] font-semibold truncate">{value}</span>
        </div>
    );
}
