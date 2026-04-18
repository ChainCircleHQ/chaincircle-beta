// Full transaction history for the connected user. Pulls from the
// activity_log materialized view so every indexed on-chain action the user
// has ever taken shows up: contributions, payouts, payouts accrued,
// reputation changes, badges, tier crossings, circle lifecycle events,
// governance proposals. Each row links to Push Chain explorer.
//
// Filter pills narrow by kind. Search narrows by tx hash or circle name.
// Infinite scroll via "Load more" — sub-second first paint, paginated to
// avoid shipping thousands of rows for heavy users.

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ethers } from 'ethers';
import {
    FaHistory, FaSearch, FaExternalLinkAlt, FaCopy, FaHandHoldingUsd,
    FaUserPlus, FaTrophy, FaMedal, FaExclamationTriangle,
    FaPlayCircle, FaPauseCircle, FaTimesCircle, FaCheckCircle, FaBalanceScale,
    FaCoins,
} from 'react-icons/fa';
import { FaSackDollar } from 'react-icons/fa6';
import { supabase } from '../lib/supabase';
import { useCircleContract } from '../hooks/useCircleContract';
import { NETWORK_CONFIG } from '../constants/contracts';
import { formatDate } from '../utils/formatDate';
import formatCurrency from '../utils/formatCurrency';
import { SkeletonRow } from '../Components/Skeleton';
import useIsTabletOrMobile from '../hooks/useIsTabletOrMobile';

const lc = (addr) => (addr ? String(addr).toLowerCase() : addr);
const unix = (iso) => Math.floor(new Date(iso).getTime() / 1000);
const fmtUnits = (raw) => (raw == null ? null : ethers.formatUnits(String(raw), 6));

// Groups of activity_log.kind → visual + copy.
const KIND_STYLE = {
    contribution:      { label: 'Contribution',       icon: FaHandHoldingUsd,    color: 'text-[#AEFFDA]', border: 'border-[#AEFFDA]/50', bg: 'bg-[#AEFFDA]/10',  group: 'contribution' },
    payout:            { label: 'Payout received',    icon: FaSackDollar,        color: 'text-[#D548EC]', border: 'border-[#D548EC]/50', bg: 'bg-[#D548EC]/10',  group: 'payout' },
    payout_accrued:    { label: 'Payout accrued',     icon: FaCoins,             color: 'text-[#F4AEFF]', border: 'border-[#F4AEFF]/50', bg: 'bg-[#F4AEFF]/10',  group: 'payout' },
    reputation:        { label: 'Reputation',         icon: FaTrophy,            color: 'text-[#FDA318]', border: 'border-[#FDA318]/50', bg: 'bg-[#FDA318]/10',  group: 'reputation' },
    badge:             { label: 'Badge',              icon: FaMedal,             color: 'text-[#F4AEFF]', border: 'border-[#F4AEFF]/50', bg: 'bg-[#F4AEFF]/10',  group: 'badge' },
    tier_change:       { label: 'Tier change',        icon: FaMedal,             color: 'text-[#FDA318]', border: 'border-[#FDA318]/50', bg: 'bg-[#FDA318]/10',  group: 'badge' },
    circle_started:    { label: 'Circle started',     icon: FaPlayCircle,        color: 'text-[#AEFFDA]', border: 'border-[#AEFFDA]/50', bg: 'bg-[#AEFFDA]/10',  group: 'circle' },
    circle_paused:     { label: 'Circle paused',      icon: FaPauseCircle,       color: 'text-[#FDA318]', border: 'border-[#FDA318]/50', bg: 'bg-[#FDA318]/10',  group: 'circle' },
    circle_unpaused:   { label: 'Circle resumed',     icon: FaPlayCircle,        color: 'text-[#F4AEFF]', border: 'border-[#F4AEFF]/50', bg: 'bg-[#F4AEFF]/10',  group: 'circle' },
    circle_cancelled:  { label: 'Circle cancelled',   icon: FaTimesCircle,       color: 'text-[#FFBDBD]', border: 'border-[#FFBDBD]/50', bg: 'bg-[#FFBDBD]/10',  group: 'circle' },
    circle_completed:  { label: 'Circle completed',   icon: FaCheckCircle,       color: 'text-[#D548EC]', border: 'border-[#D548EC]/50', bg: 'bg-[#D548EC]/10',  group: 'circle' },
    circle_emergency:  { label: 'Emergency exit',     icon: FaExclamationTriangle,color: 'text-[#FFA03B]', border: 'border-[#FFA03B]/50', bg: 'bg-[#FFA03B]/10',  group: 'circle' },
    governance:        { label: 'Governance',         icon: FaBalanceScale,      color: 'text-[#F4AEFF]', border: 'border-[#F4AEFF]/50', bg: 'bg-[#F4AEFF]/10',  group: 'governance' },
};
const defaultStyle = { label: 'Activity', icon: FaHistory, color: 'text-[#AAA]', border: 'border-[#333]', bg: 'bg-[#111111]', group: 'other' };
const styleFor = (kind) => KIND_STYLE[kind] || defaultStyle;

// Filter groups exposed to the user (All + one pill per group above).
const FILTERS = [
    { key: 'all',          label: 'All' },
    { key: 'contribution', label: 'Contributions' },
    { key: 'payout',       label: 'Payouts' },
    { key: 'membership',   label: 'Membership' },
    { key: 'reputation',   label: 'Reputation' },
    { key: 'badge',        label: 'Badges' },
    { key: 'circle',       label: 'Circle events' },
    { key: 'governance',   label: 'Governance' },
];

// circle_members has no entry in activity_log; we fetch separately + merge.
function useHistoryRows({ address, limit }) {
    return useQuery({
        queryKey: ['history.db', lc(address), limit],
        queryFn: async () => {
            const addr = lc(address);
            // activity_log rolls up contributions/payouts/reputation/badges/
            // tier_changes/circle_events/governance by default.
            const { data: logRows, error } = await supabase
                .from('activity_log')
                .select('*')
                .eq('actor_address', addr)
                .order('ts', { ascending: false })
                .limit(limit);
            if (error) throw error;

            // Joins (MemberJoined) aren't in activity_log — fetch separately so
            // the user sees every circle they've ever joined, including ones
            // they haven't touched since.
            const { data: memberRows } = await supabase
                .from('circle_members')
                .select('circle_id, joined_block, joined_at')
                .eq('user_address', addr)
                .order('joined_at', { ascending: false })
                .limit(100);

            const rows = [...(logRows ?? [])];
            for (const m of memberRows ?? []) {
                rows.push({
                    kind: 'joined',
                    actor_address: addr,
                    circle_id: m.circle_id,
                    amount: null,
                    tx_hash: null,
                    block_number: m.joined_block,
                    ts: m.joined_at,
                });
            }

            // Enrich every row with circle name (single batched lookup).
            const circleIds = [...new Set(rows.filter((r) => r.circle_id).map((r) => r.circle_id))];
            let nameById = new Map();
            if (circleIds.length) {
                const { data: circles } = await supabase
                    .from('circles')
                    .select('circle_id, name, goal_type')
                    .in('circle_id', circleIds);
                nameById = new Map((circles ?? []).map((c) => [c.circle_id, c]));
            }

            rows.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
            return rows.map((r) => ({
                ...r,
                circleName: r.circle_id ? (nameById.get(r.circle_id)?.name ?? null) : null,
                ts_unix: unix(r.ts),
                amount_fmt: fmtUnits(r.amount),
            }));
        },
        enabled: !!address,
        staleTime: 20_000,
        refetchInterval: 45_000,
    });
}

export default function History() {
    const isTabletOrMobile = useIsTabletOrMobile();
    const { userAddress, isConnected } = useCircleContract();
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(100);

    const { data: rows, isLoading } = useHistoryRows({ address: userAddress, limit });

    const filtered = useMemo(() => {
        if (!rows) return [];
        const q = search.trim().toLowerCase();
        return rows.filter((r) => {
            if (filter !== 'all') {
                const group = r.kind === 'joined' ? 'membership' : styleFor(r.kind).group;
                if (group !== filter) return false;
            }
            if (q) {
                const hay = [r.tx_hash ?? '', r.circleName ?? '', r.kind ?? ''].join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [rows, filter, search]);

    const copy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied');
        } catch {
            toast.error('Copy failed');
        }
    };

    if (!isConnected) {
        return (
            <div className="rounded-[12px] border border-[#333] bg-[#111111] p-12 text-center text-[#707070] font-dm">
                Connect your wallet to see your history.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 font-dm">
            <header className="flex flex-col lg:flex-row lg:items-end gap-4 lg:justify-between">
                <div className="flex items-start gap-4">
                    <div className="p-3 lg:p-4 rounded-full border border-[#F4AEFF]/40 bg-[#111111] flex items-center justify-center shrink-0">
                        <FaHistory className="text-[#D548EC]" size={isTabletOrMobile ? 22 : 28} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h2 className="text-[20px] lg:text-[30px] font-bold">Transaction history</h2>
                        <p className="text-[#707070] text-[12px] lg:text-[14px] max-w-[640px]">
                            Every indexed on-chain action for <span className="font-mono text-[#AAA]">{userAddress?.slice(0, 6)}…{userAddress?.slice(-4)}</span>.
                            Click the link icon on any row to open it in the Push Chain explorer.
                        </p>
                    </div>
                </div>
                <div className="relative w-full lg:w-[320px]">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707070]" size={14} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search tx hash, circle name, kind…"
                        className="w-full bg-[#111111] border border-[#333] focus:border-[#D548EC] rounded-[10px] pl-9 pr-3 py-2.5 text-[12px] lg:text-[14px] text-white outline-none"
                    />
                </div>
            </header>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {FILTERS.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-4 py-1.5 rounded-full text-[12px] lg:text-[13px] border transition-colors whitespace-nowrap ${
                            filter === f.key
                                ? 'bg-[#D548EC] border-[#D548EC] text-white'
                                : 'border-[#333] text-[#AAA] hover:border-[#F4AEFF]/60'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <ul className="flex flex-col gap-2">
                    {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                </ul>
            ) : filtered.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[#F4AEFF]/40 bg-[#111111]/60 p-12 flex flex-col items-center gap-3 text-center">
                    <FaHistory className="text-[#F4AEFF]/60" size={28} />
                    <p className="text-[#AAA] text-[14px] lg:text-[16px]">No transactions match.</p>
                    <p className="text-[#707070] text-[12px] lg:text-[13px] max-w-md">
                        {search || filter !== 'all'
                            ? 'Try clearing the filter or search.'
                            : 'Your on-chain activity will appear here once you create or join a circle.'}
                    </p>
                </div>
            ) : (
                <ol className="flex flex-col gap-2">
                    {filtered.map((row) => {
                        const style = row.kind === 'joined'
                            ? { label: 'Joined circle', icon: FaUserPlus, color: 'text-[#F4AEFF]', border: 'border-[#F4AEFF]/50', bg: 'bg-[#F4AEFF]/10' }
                            : styleFor(row.kind);
                        const Icon = style.icon;
                        return (
                            <li
                                key={`${row.kind}-${row.tx_hash ?? row.block_number}-${row.circle_id ?? 'x'}-${row.ts_unix}`}
                                className={`rounded-[12px] border ${style.border} ${style.bg} p-3 lg:p-4 flex items-center gap-3 lg:gap-4`}
                            >
                                <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.border} border`}>
                                    <Icon className={style.color} size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[13px] lg:text-[15px] font-semibold ${style.color}`}>
                                            {style.label}
                                        </span>
                                        {row.circleName && row.circle_id && (
                                            <Link
                                                to={`/chain/circle/${row.circle_id}`}
                                                className="text-[#F4AEFF] hover:text-white text-[12px] lg:text-[13px] truncate"
                                                title={row.circleName}
                                            >
                                                {row.circleName}
                                            </Link>
                                        )}
                                        {row.circle_id && !row.circleName && (
                                            <span className="text-[#707070] text-[11px] lg:text-[12px]">Circle #{row.circle_id}</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] lg:text-[11px] text-[#707070] mt-0.5">
                                        {formatDate(row.ts_unix)} · block {row.block_number}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {row.amount_fmt && Number(row.amount_fmt) !== 0 && (
                                        <span className={`text-[12px] lg:text-[14px] font-semibold ${style.color}`}>
                                            {formatCurrency(row.amount_fmt)}
                                        </span>
                                    )}
                                    {row.tx_hash && (
                                        <>
                                            <button
                                                onClick={() => copy(row.tx_hash)}
                                                className="p-2 rounded-full text-[#707070] hover:text-[#F4AEFF] hover:bg-[#F4AEFF]/10"
                                                title="Copy tx hash"
                                            >
                                                <FaCopy size={11} />
                                            </button>
                                            <a
                                                href={`${NETWORK_CONFIG.explorerUrl}/tx/${row.tx_hash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-full text-[#707070] hover:text-[#F4AEFF] hover:bg-[#F4AEFF]/10"
                                                title="Open in explorer"
                                            >
                                                <FaExternalLinkAlt size={11} />
                                            </a>
                                        </>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}

            {!isLoading && rows && rows.length >= limit && (
                <div className="flex justify-center pt-2">
                    <button
                        onClick={() => setLimit((l) => l + 100)}
                        className="px-5 py-2 rounded-full border border-[#333] hover:border-[#F4AEFF]/60 text-[12px] lg:text-[13px] text-[#AAA]"
                    >
                        Load 100 more
                    </button>
                </div>
            )}
        </div>
    );
}
