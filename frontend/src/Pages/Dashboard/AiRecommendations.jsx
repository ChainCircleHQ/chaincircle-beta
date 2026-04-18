// AI circle recommendations — "3 open circles matched to you".
// Shown above DiscoverSection. Hidden when unconfigured or no matches.

import React from 'react';
import { Link } from 'react-router';
import { FaCompass, FaArrowRight } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAiInsights } from '../../hooks/useAiInsights';
import { SkeletonCard } from '../../Components/Skeleton';

function useCirclesById(ids) {
    return useQuery({
        queryKey: ['circlesById', ids],
        queryFn: async () => {
            if (!ids?.length) return [];
            const { data, error } = await supabase
                .from('circles_with_counts')
                .select('*')
                .in('circle_id', ids);
            if (error) throw error;
            return data ?? [];
        },
        enabled: ids?.length > 0,
        staleTime: 30_000,
    });
}

export default function AiRecommendations() {
    const { data, isLoading } = useAiInsights('recommendations');

    if (data?.configured === false) return null;

    const recs = data?.recommendations ?? [];
    const ids = recs.map((r) => Number(r.circle_id)).filter(Number.isFinite);
    const { data: circles } = useCirclesById(ids);
    const circleById = new Map((circles ?? []).map((c) => [c.circle_id, c]));

    if (!isLoading && !recs.length) return null;

    return (
        <section className="flex flex-col gap-3 font-dm">
            <header className="flex items-center gap-2">
                <FaCompass className="text-[#D548EC]" size={18} />
                <h3 className="text-[15px] lg:text-[17px] font-semibold">Matched for you</h3>
                <span className="text-[10px] lg:text-[11px] px-2 py-0.5 rounded-full border border-[#F4AEFF]/40 bg-[#D548EC]/10 text-[#F4AEFF]/80">
                    AI
                </span>
            </header>
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : (
                <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {recs.slice(0, 3).map((r) => {
                        const c = circleById.get(Number(r.circle_id));
                        if (!c) return null;
                        const amount = Number(c.contribution_amount || 0) / 1e6;
                        return (
                            <li key={r.circle_id}>
                                <Link
                                    to={`/chain/circle/${r.circle_id}`}
                                    className="group rounded-[12px] border border-[#F4AEFF]/30 hover:border-[#D548EC] bg-[#111111] p-4 flex flex-col gap-2 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[14px] lg:text-[16px] font-semibold truncate group-hover:text-[#F4AEFF]">
                                            {c.name || `Circle #${c.circle_id}`}
                                        </span>
                                    </div>
                                    <p className="text-[11px] lg:text-[12px] text-[#707070]">
                                        ${amount.toLocaleString()} · {c.duration_months}mo · {c.member_count}/{c.member_cap}
                                    </p>
                                    <p className="text-[12px] lg:text-[13px] text-[#AAA] leading-relaxed flex-1">
                                        {r.reason}
                                    </p>
                                    <span className="text-[11px] text-[#D548EC] flex items-center gap-1 mt-1">
                                        <FaArrowRight size={10} /> view circle
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
