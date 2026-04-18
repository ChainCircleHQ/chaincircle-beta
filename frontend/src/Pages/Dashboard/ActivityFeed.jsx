import React, { useEffect } from 'react';
import { Link } from 'react-router';
import { FaBolt, FaCoins, FaArrowDown, FaTrophy, FaMedal } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { formatAddressOrName } from '../../hooks/useNameRegistry';
import formatCurrency from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

// Live global activity from activity_log materialized view + name join.
function useGlobalActivity({ limit = 10 }) {
    const query = useQuery({
        queryKey: ['globalActivity.db', limit],
        queryFn: async () => {
            const { data: events, error } = await supabase
                .from('activity_log')
                .select('*')
                .order('ts', { ascending: false })
                .limit(limit);
            if (error) throw error;
            const addrs = [...new Set((events ?? []).map((e) => e.actor_address).filter(Boolean))];
            const cIds = [...new Set((events ?? []).map((e) => e.circle_id).filter(Boolean))];
            const [users, circles] = await Promise.all([
                addrs.length
                    ? supabase.from('users').select('address, display_name').in('address', addrs)
                    : { data: [] },
                cIds.length
                    ? supabase.from('circles').select('circle_id, name').in('circle_id', cIds)
                    : { data: [] },
            ]);
            const userMap = new Map((users.data ?? []).map((u) => [u.address, u.display_name]));
            const circleMap = new Map((circles.data ?? []).map((c) => [c.circle_id, c.name]));
            return (events ?? []).map((e) => ({
                ...e,
                _displayName: userMap.get(e.actor_address),
                _circleName: circleMap.get(e.circle_id),
            }));
        },
        staleTime: 15_000,
        refetchInterval: 30_000,
    });

    // Subscribe to new contributions/payouts so the feed stays fresh.
    useEffect(() => {
        const ch = supabase
            .channel('global-activity')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contributions' }, () => query.refetch())
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payouts' }, () => query.refetch())
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [query.refetch]);

    return query;
}

const KIND_META = {
    contribution: { Icon: FaCoins,    color: 'text-[#FDA318]', verb: 'contributed' },
    payout:       { Icon: FaArrowDown,color: 'text-[#D548EC]', verb: 'received payout' },
    reputation:   { Icon: FaTrophy,   color: 'text-[#F4AEFF]', verb: 'earned rep' },
    badge:        { Icon: FaMedal,    color: 'text-[#FDA318]', verb: 'earned a badge' },
};

export default function ActivityFeed() {
    const { data: events, isLoading } = useGlobalActivity({ limit: 10 });

    return (
        <section className="flex flex-col gap-4 font-dm">
            <header className="flex items-center gap-2">
                <FaBolt className="text-[#D548EC]" size={20} />
                <h3 className="text-[16px] lg:text-[21px] font-semibold">Live activity</h3>
                <span className="text-[10px] lg:text-[11px] px-2 py-0.5 rounded-full border border-[#F4AEFF]/40 bg-[#D548EC]/10 text-[#F4AEFF]/80">
                    realtime
                </span>
            </header>

            {isLoading ? (
                <div className="rounded-[12px] border border-[#333] bg-[#111111] p-6 text-center text-[#707070] text-[13px]">
                    Loading…
                </div>
            ) : !events?.length ? (
                <div className="rounded-[12px] border border-dashed border-[#F4AEFF]/30 bg-[#111111]/60 p-6 text-center text-[#707070] text-[13px]">
                    Nothing yet.
                </div>
            ) : (
                <ul className="flex flex-col gap-2">
                    {events.map((e, i) => {
                        const meta = KIND_META[e.kind] || KIND_META.contribution;
                        const Icon = meta.Icon;
                        const ts = Math.floor(new Date(e.ts).getTime() / 1000);
                        return (
                            <li
                                key={`${e.tx_hash}-${i}`}
                                className="rounded-[10px] border border-[#333] bg-[#111111] px-3 lg:px-4 py-2.5 flex items-center gap-3 text-[13px] lg:text-[14px]"
                            >
                                <Icon className={`${meta.color} shrink-0`} size={14} />
                                <div className="flex-1 min-w-0 truncate">
                                    <span className="text-white font-semibold">
                                        {formatAddressOrName(e.actor_address, e._displayName)}
                                    </span>
                                    <span className="text-[#707070]"> {meta.verb} </span>
                                    {(e.kind === 'contribution' || e.kind === 'payout') && (
                                        <span className="text-[#F4AEFF]">{formatCurrency(String(Number(e.amount) / 1e6))}</span>
                                    )}
                                    {e._circleName && (
                                        <>
                                            <span className="text-[#707070]"> · </span>
                                            <Link to={`/chain/circle/${e.circle_id}`} className="text-[#D548EC] hover:text-[#F4AEFF]">
                                                {e._circleName}
                                            </Link>
                                        </>
                                    )}
                                </div>
                                <span className="text-[#707070] text-[11px] lg:text-[12px] shrink-0">
                                    {formatDate(ts)}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
