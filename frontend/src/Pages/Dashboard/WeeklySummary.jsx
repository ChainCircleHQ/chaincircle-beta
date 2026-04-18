// Weekly AI activity digest — compact card.

import React from 'react';
import { FaCalendarWeek } from 'react-icons/fa';
import { useAiInsights } from '../../hooks/useAiInsights';
import Skeleton from '../../Components/Skeleton';

export default function WeeklySummary() {
    const { data, isLoading } = useAiInsights('summary');

    if (data?.configured === false) return null;

    return (
        <section className="rounded-[12px] border border-[#333] bg-[#111111] p-4 lg:p-5 flex flex-col gap-3 font-dm">
            <header className="flex items-center gap-2">
                <FaCalendarWeek className="text-[#F4AEFF]" size={14} />
                <h3 className="text-[14px] lg:text-[16px] font-semibold">Your week</h3>
                <span className="text-[10px] lg:text-[11px] px-2 py-0.5 rounded-full border border-[#F4AEFF]/40 bg-[#D548EC]/10 text-[#F4AEFF]/80">
                    AI
                </span>
            </header>
            {isLoading ? (
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-5/6" />
                </div>
            ) : data?.headline || data?.body ? (
                <div className="flex flex-col gap-2">
                    {data.headline && <p className="text-[15px] lg:text-[16px] font-semibold text-[#F4AEFF]">{data.headline}</p>}
                    {data.body && <p className="text-[12px] lg:text-[13px] text-[#AAA] leading-relaxed">{data.body}</p>}
                    {data.stat && (
                        <div className="mt-1 flex items-center gap-2 text-[11px] lg:text-[12px]">
                            <span className="text-[#707070]">{data.stat.label}:</span>
                            <span className="text-[#D548EC] font-semibold">{data.stat.value}</span>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-[#707070] text-[12px] lg:text-[13px]">No activity this week.</p>
            )}
        </section>
    );
}
