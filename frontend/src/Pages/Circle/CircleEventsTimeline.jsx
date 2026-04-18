// Vertical event timeline for a circle — started / paused / unpaused /
// cancelled / completed / emergency. Reads from the circle_events table
// (populated by the v2 indexer). Hidden when there are no events yet.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaPlayCircle, FaPauseCircle, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaHistory, FaExternalLinkAlt } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../utils/formatDate';
import { NETWORK_CONFIG } from '../../constants/contracts';

const STYLE = {
    started:   { icon: FaPlayCircle,        label: 'Circle started',   color: 'text-[#AEFFDA]', dot: 'bg-[#AEFFDA]' },
    paused:    { icon: FaPauseCircle,       label: 'Paused',           color: 'text-[#FDA318]', dot: 'bg-[#FDA318]' },
    unpaused:  { icon: FaPlayCircle,        label: 'Resumed',          color: 'text-[#F4AEFF]', dot: 'bg-[#F4AEFF]' },
    cancelled: { icon: FaTimesCircle,       label: 'Cancelled',        color: 'text-[#FFBDBD]', dot: 'bg-[#FFBDBD]' },
    completed: { icon: FaCheckCircle,       label: 'Completed',        color: 'text-[#D548EC]', dot: 'bg-[#D548EC]' },
    emergency: { icon: FaExclamationTriangle,label: 'Emergency exit',  color: 'text-[#FFA03B]', dot: 'bg-[#FFA03B]' },
};

function useCircleEvents(circleId) {
    return useQuery({
        queryKey: ['circleEvents', circleId],
        queryFn: async () => {
            if (!circleId) return [];
            const { data, error } = await supabase
                .from('circle_events')
                .select('*')
                .eq('circle_id', Number(circleId))
                .order('block_timestamp', { ascending: false });
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!circleId,
        staleTime: 30_000,
    });
}

// EmergencyWithdrawal reason is "refund=X;penalty=Y;member=0x…" — extract
// member address so the UI can name who exited.
function parseEmergencyReason(reason) {
    if (!reason) return {};
    const out = {};
    for (const part of reason.split(';')) {
        const [k, v] = part.split('=');
        if (k && v) out[k.trim()] = v.trim();
    }
    return out;
}

export default function CircleEventsTimeline({ circleId }) {
    const { data: events, isLoading } = useCircleEvents(circleId);
    if (isLoading) return null;
    if (!events || events.length === 0) return null;

    return (
        <section className="flex flex-col gap-3 font-dm">
            <h2 className="text-[18px] lg:text-[22px] font-bold flex items-center gap-2">
                <FaHistory className="text-[#D548EC]" /> Circle history
            </h2>

            <ol className="relative flex flex-col gap-3 pl-5 border-l border-[#333]">
                {events.map((e) => {
                    const style = STYLE[e.event_type] || STYLE.started;
                    const Icon = style.icon;
                    const ts = Math.floor(new Date(e.block_timestamp).getTime() / 1000);
                    const emergency = e.event_type === 'emergency'
                        ? parseEmergencyReason(e.reason)
                        : null;
                    return (
                        <li key={`${e.tx_hash}-${e.event_type}`} className="relative">
                            <span className={`absolute -left-[27px] top-2 w-3 h-3 rounded-full ${style.dot} border-2 border-black`} />
                            <div className="rounded-[10px] border border-[#333] bg-[#111111] p-3 lg:p-4 flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    <Icon className={`${style.color} mt-0.5 shrink-0`} size={16} />
                                    <div className="min-w-0">
                                        <p className="text-[13px] lg:text-[15px] font-semibold">
                                            {style.label}
                                        </p>
                                        {e.reason && e.event_type !== 'emergency' && (
                                            <p className="text-[11px] lg:text-[12px] text-[#AAA] mt-0.5 break-words">
                                                {e.reason}
                                            </p>
                                        )}
                                        {emergency && (
                                            <p className="text-[11px] lg:text-[12px] text-[#AAA] mt-0.5">
                                                {emergency.member && (
                                                    <>by <span className="font-mono text-[#F4AEFF]">
                                                        {emergency.member.slice(0, 6)}…{emergency.member.slice(-4)}
                                                    </span></>
                                                )}
                                            </p>
                                        )}
                                        <p className="text-[10px] lg:text-[11px] text-[#707070] mt-1">
                                            {formatDate(ts)}
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={`${NETWORK_CONFIG.explorerUrl}/tx/${e.tx_hash}`}
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
