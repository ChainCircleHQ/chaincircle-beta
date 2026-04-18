import React, { useState } from 'react';
import { Link } from 'react-router';
import { FaSearch, FaUsers, FaCompass } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useCircleContract } from '../../hooks/useCircleContract';
import { getGoalIcon, getGoalColors, formatFrequency } from '../../utils/circleHelpers';
import formatCurrency from '../../utils/formatCurrency';
import { SkeletonCard } from '../../Components/Skeleton';

import useIsTabletOrMobile from '../../hooks/useIsTabletOrMobile';

// Discover open circles (status = 0, not full). Orders by created_block desc.
// When search is empty, returns most recent; with a term, ilike name match.
function useOpenCircles({ search, limit = 12 }) {
    return useQuery({
        queryKey: ['openCircles.db', { search, limit }],
        queryFn: async () => {
            let q = supabase
                .from('circles_with_counts')
                .select('*')
                .eq('status', 0)
                .order('created_block', { ascending: false })
                .limit(limit);
            if (search && search.length >= 2) q = q.ilike('name', `%${search}%`);
            const { data, error } = await q;
            if (error) throw error;
            // Filter out circles where member_count >= member_cap (full but still "pending")
            return (data ?? []).filter((c) => (c.member_count ?? 0) < (c.member_cap ?? 0));
        },
        staleTime: 30_000,
    });
}

export default function DiscoverSection() {
  const isTabletOrMobile = useIsTabletOrMobile();
    const { userAddress } = useCircleContract();
    const [search, setSearch] = useState('');
    const { data: circles, isLoading } = useOpenCircles({ search });

    return (
        <section className="flex flex-col gap-4 font-dm">
            <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
                <div className="flex items-center gap-2">
                    <FaCompass className="text-[#D548EC]" size={isTabletOrMobile ? 18 : 22} />
                    <h3 className="text-[16px] lg:text-[21px] font-semibold">Discover circles</h3>
                    <span className="text-[11px] lg:text-[12px] text-[#707070]">open for new members</span>
                </div>
                <div className="relative w-full lg:w-[280px]">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#707070]" size={12} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name"
                        className="w-full bg-[#111111] border border-[#333] focus:border-[#D548EC] rounded-[10px] pl-9 pr-3 py-2 text-[13px] text-white placeholder-[#555] outline-none transition-colors"
                    />
                </div>
            </header>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : !circles?.length ? (
                <div className="rounded-[12px] border border-dashed border-[#F4AEFF]/30 bg-[#111111]/60 p-6 text-center text-[#707070] text-[13px]">
                    {search ? `No circles matching "${search}".` : 'No open circles right now — create one!'}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {circles.map((c) => {
                        const Icon = getGoalIcon(c.goal_type);
                        const colors = getGoalColors(c.goal_type);
                        const youIn = c.creator_address === userAddress?.toLowerCase();
                        const memberCount = Number(c.member_count ?? 0);
                        const maxMembers = Number(c.member_cap ?? 0);
                        return (
                            <Link
                                key={c.circle_id}
                                to={`/chain/circle/${c.circle_id}`}
                                className="group rounded-[12px] border border-[#333] hover:border-[#F4AEFF]/60 bg-[#111111] p-4 flex flex-col gap-3 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shrink-0 ${colors.bg}`}
                                    >
                                        <Icon className={colors.text} size={isTabletOrMobile ? 18 : 22} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[14px] lg:text-[16px] font-semibold truncate group-hover:text-[#F4AEFF]">
                                            {c.name || `Circle #${c.circle_id}`}
                                        </p>
                                        <p className="text-[11px] lg:text-[12px] text-[#707070]">
                                            {formatCurrency(c.contribution_amount ? String(Number(c.contribution_amount) / 1e6) : '0')} · {formatFrequency(c.frequency)} · {c.duration_months}mo
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-[11px] lg:text-[12px]">
                                    <span className="flex items-center gap-1 text-[#AAA]">
                                        <FaUsers size={10} /> {memberCount}/{maxMembers}
                                    </span>
                                    {youIn ? (
                                        <span className="text-[#D548EC]">your circle</span>
                                    ) : (
                                        <span className="text-[#F4AEFF] opacity-0 group-hover:opacity-100 transition-opacity">
                                            view →
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
