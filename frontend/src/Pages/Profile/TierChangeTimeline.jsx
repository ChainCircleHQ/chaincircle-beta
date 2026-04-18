// Rep tier progression for the connected user. Renders tier_changes rows
// (indexed from BadgeNFTV2.TierThresholdCrossed) as a vertical timeline.
// Hidden when the user has never crossed a threshold.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaCrown, FaMedal, FaTrophy, FaExternalLinkAlt } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import { useCircleContract } from '../../hooks/useCircleContract';
import { formatDate } from '../../utils/formatDate';
import { NETWORK_CONFIG } from '../../constants/contracts';

const lc = (addr) => (addr ? String(addr).toLowerCase() : addr);

const TIER_STYLE = {
    Gold:   { icon: FaCrown,  color: 'text-[#FDA318]', border: 'border-[#FDA318]/60', bg: 'bg-[#FDA318]/10' },
    Silver: { icon: FaMedal,  color: 'text-[#C0C0C0]', border: 'border-[#C0C0C0]/60', bg: 'bg-[#C0C0C0]/10' },
    Bronze: { icon: FaMedal,  color: 'text-[#CD7F32]', border: 'border-[#CD7F32]/60', bg: 'bg-[#CD7F32]/10' },
    None:   { icon: FaTrophy, color: 'text-[#707070]', border: 'border-[#333]',       bg: 'bg-[#111111]' },
};

const styleFor = (tier) => TIER_STYLE[tier] || TIER_STYLE.None;

function useTierChanges(address) {
    return useQuery({
        queryKey: ['tierChanges', lc(address)],
        queryFn: async () => {
            if (!address) return [];
            const { data, error } = await supabase
                .from('tier_changes')
                .select('*')
                .eq('user_address', lc(address))
                .order('block_timestamp', { ascending: false });
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!address,
        staleTime: 60_000,
    });
}

export default function TierChangeTimeline() {
    const { userAddress, isConnected } = useCircleContract();
    const { data: rows, isLoading } = useTierChanges(userAddress);
    if (!isConnected || isLoading || !rows || rows.length === 0) return null;

    return (
        <section className="flex flex-col gap-3 font-dm">
            <h2 className="text-[18px] lg:text-[22px] font-bold flex items-center gap-2">
                <FaMedal className="text-[#D548EC]" /> Tier history
            </h2>

            <ol className="relative flex flex-col gap-3 pl-5 border-l border-[#333]">
                {rows.map((r) => {
                    const style = styleFor(r.to_tier);
                    const Icon = style.icon;
                    const ts = Math.floor(new Date(r.block_timestamp).getTime() / 1000);
                    return (
                        <li key={`${r.tx_hash}-${r.user_address}`} className="relative">
                            <span className={`absolute -left-[27px] top-3 w-3 h-3 rounded-full border-2 border-black ${style.color.replace('text-', 'bg-')}`} />
                            <div className={`rounded-[10px] border ${style.border} ${style.bg} p-3 lg:p-4 flex items-center justify-between gap-3`}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <Icon className={`${style.color} shrink-0`} size={18} />
                                    <div className="min-w-0">
                                        <p className="text-[13px] lg:text-[15px] font-semibold">
                                            {r.from_tier
                                                ? <>Upgraded to <span className={style.color}>{r.to_tier}</span> from {r.from_tier}</>
                                                : <>Reached <span className={style.color}>{r.to_tier}</span></>}
                                        </p>
                                        <p className="text-[10px] lg:text-[11px] text-[#707070] mt-0.5">
                                            {formatDate(ts)}
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={`${NETWORK_CONFIG.explorerUrl}/tx/${r.tx_hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-full text-[#707070] hover:text-[#F4AEFF] hover:bg-[#F4AEFF]/10 shrink-0"
                                    title="View transaction"
                                >
                                    <FaExternalLinkAlt size={11} />
                                </a>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
