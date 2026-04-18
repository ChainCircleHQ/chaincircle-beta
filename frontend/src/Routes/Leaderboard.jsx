import React, { useEffect, useState } from 'react';
import { FaTrophy, FaCrown, FaMedal, FaSearch } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useCircleContract } from '../hooks/useCircleContract';
import { formatAddressOrName } from '../hooks/useNameRegistry';
import CountUp from '../Components/CountUp';

const isTabletOrMobile = window.innerWidth <= 1014;

const TIER_STYLES = {
    Gold:   { icon: FaCrown, color: 'text-[#FDA318]',  bg: 'bg-[rgba(253,170,27,0.15)]',  border: 'border-[#FDA318]/40' },
    Silver: { icon: FaMedal, color: 'text-[#C0C0C0]',  bg: 'bg-[rgba(192,192,192,0.15)]', border: 'border-[#C0C0C0]/40' },
    Bronze: { icon: FaMedal, color: 'text-[#CD7F32]',  bg: 'bg-[rgba(205,127,50,0.15)]',  border: 'border-[#CD7F32]/40' },
    None:   { icon: FaTrophy, color: 'text-[#707070]', bg: 'bg-[#111111]',                 border: 'border-[#333]' },
};

function useLeaderboard({ tier, search, limit = 100 }) {
    return useQuery({
        queryKey: ['leaderboard', { tier, search, limit }],
        queryFn: async () => {
            let q = supabase
                .from('user_reputation')
                .select('address, display_name, score, tier, circles_joined, circles_completed, total_contributions_count')
                .order('score', { ascending: false })
                .limit(limit);
            if (tier && tier !== 'All') q = q.eq('tier', tier);
            if (search) {
                const s = search.toLowerCase();
                q = q.or(`display_name.ilike.%${s}%,address.ilike.%${s}%`);
            }
            const { data, error } = await q;
            if (error) throw error;
            return data ?? [];
        },
        staleTime: 20_000,
        refetchInterval: 60_000,
    });
}

export default function Leaderboard() {
    const { userAddress } = useCircleContract();
    const [tier, setTier] = useState('All');
    const [search, setSearch] = useState('');
    const { data: rows, isLoading } = useLeaderboard({ tier, search });

    // Separate your row for a "you are here" pin, if outside top N.
    const youRow = rows?.find((r) => r.address === userAddress?.toLowerCase());

    return (
        <div className="flex flex-col gap-6 font-dm">
            <header className="flex flex-col lg:flex-row lg:items-end gap-4 lg:justify-between">
                <div className="flex items-start gap-4">
                    <div className="p-3 lg:p-4 rounded-full border border-[#F4AEFF]/40 bg-[#111111] flex items-center justify-center shrink-0">
                        <FaTrophy className="text-[#FDA318]" size={isTabletOrMobile ? 22 : 28} />
                    </div>
                    <div>
                        <h1 className="text-[24px] lg:text-[32px] font-bold">Leaderboard</h1>
                        <p className="text-[#707070] text-[12px] lg:text-[14px] mt-1">
                            Top reputation scores across ChainCircle.
                            <span className="ml-2 text-[#F4AEFF]/70 text-[11px] lg:text-[12px]">off-chain · testnet</span>
                        </p>
                    </div>
                </div>
                <div className="relative w-full lg:w-[320px]">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#707070]" size={14} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or address"
                        className="w-full bg-[#111111] border border-[#333] focus:border-[#D548EC] rounded-[10px] pl-10 pr-4 py-2.5 text-[13px] lg:text-[14px] text-white placeholder-[#555] outline-none transition-colors"
                    />
                </div>
            </header>

            {/* Tier tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {['All', 'Gold', 'Silver', 'Bronze', 'None'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setTier(t)}
                        className={`px-4 py-2 rounded-full text-[12px] lg:text-[14px] whitespace-nowrap border transition-colors ${
                            tier === t
                                ? 'bg-[#D548EC] border-[#D548EC] text-white'
                                : 'bg-transparent border-[#333] text-[#AAA] hover:border-[#F4AEFF]/60'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* You-are-here card */}
            {youRow && (
                <div className="rounded-[12px] border border-[#D548EC] bg-[#D548EC]/10 p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#D548EC] flex items-center justify-center text-white font-bold shrink-0">
                        #{(rows?.findIndex((r) => r.address === youRow.address) ?? 0) + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-[#F4AEFF]">Your rank</p>
                        <p className="text-[16px] lg:text-[18px] font-semibold truncate">
                            {formatAddressOrName(youRow.address, youRow.display_name)}
                        </p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[20px] lg:text-[24px] font-bold text-[#D548EC]">
                            <CountUp target={Number(youRow.score)} duration={800} />
                        </p>
                        <p className="text-[10px] lg:text-[11px] text-[#F4AEFF]/70">{youRow.tier}</p>
                    </div>
                </div>
            )}

            {/* Rows */}
            {isLoading ? (
                <div className="rounded-[12px] border border-[#333] bg-[#111111] p-8 text-center text-[#707070]">
                    Loading…
                </div>
            ) : !rows?.length ? (
                <div className="rounded-[12px] border border-dashed border-[#F4AEFF]/40 bg-[#111111]/60 p-10 text-center text-[#AAA]">
                    No users match.
                </div>
            ) : (
                <ul className="flex flex-col gap-2">
                    {rows.map((r, idx) => {
                        const rank = idx + 1;
                        const style = TIER_STYLES[r.tier] ?? TIER_STYLES.None;
                        const Icon = style.icon;
                        const isMe = r.address === userAddress?.toLowerCase();
                        return (
                            <li
                                key={r.address}
                                className={`rounded-[12px] border p-3 lg:p-4 flex items-center gap-3 lg:gap-4 transition-colors ${style.bg} ${
                                    isMe ? 'border-[#D548EC]' : style.border
                                }`}
                            >
                                <div
                                    className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center shrink-0 text-[13px] lg:text-[15px] font-bold ${
                                        rank <= 3 ? `${style.color} bg-black/40 border ${style.border}` : 'text-[#707070] bg-black/30'
                                    }`}
                                >
                                    {rank}
                                </div>
                                <Icon className={`${style.color} shrink-0`} size={18} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[14px] lg:text-[16px] font-semibold truncate">
                                        {formatAddressOrName(r.address, r.display_name)}
                                        {isMe && <span className="ml-2 text-[#D548EC] text-[11px]">(you)</span>}
                                    </p>
                                    <p className="text-[11px] lg:text-[12px] text-[#707070]">
                                        {r.circles_joined} circle{r.circles_joined === 1 ? '' : 's'} · {r.total_contributions_count} contribution{r.total_contributions_count === 1 ? '' : 's'}
                                        {r.circles_completed > 0 && ` · ${r.circles_completed} completed`}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[16px] lg:text-[20px] font-bold text-white">
                                        {Number(r.score).toLocaleString()}
                                    </p>
                                    <p className={`text-[10px] lg:text-[11px] ${style.color}`}>{r.tier}</p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
