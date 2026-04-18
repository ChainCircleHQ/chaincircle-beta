// Inline AI tips above Profile details. Reads the ai-insights Edge Function
// with kind='reputation', falls back to a stub that invites the operator to
// enable the feature if ANTHROPIC_API_KEY isn't set on the function.

import React from 'react';
import { FaLightbulb, FaArrowRight } from 'react-icons/fa';
import { useAiInsights } from '../../hooks/useAiInsights';
import Skeleton from '../../Components/Skeleton';

export default function ReputationInsights() {
    const { data, isLoading, error } = useAiInsights('reputation');

    // Graceful no-op on unconfigured / error — don't clutter the page
    // with operator-only messaging. Just hide.
    if (error) return null;
    if (data && data.configured === false) return null;

    const insights = data?.insights ?? [];

    return (
        <section className="rounded-[16px] border border-[#F4AEFF]/30 bg-gradient-to-br from-[#D548EC]/10 via-[#111111] to-[#111111] p-5 lg:p-6 flex flex-col gap-4 font-dm">
            <header className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#D548EC]/20 flex items-center justify-center">
                    <FaLightbulb className="text-[#FDA318]" size={14} />
                </div>
                <h3 className="text-[15px] lg:text-[17px] font-semibold">Insights for you</h3>
                <span className="text-[10px] lg:text-[11px] px-2 py-0.5 rounded-full border border-[#F4AEFF]/40 bg-black/40 text-[#F4AEFF]/80">
                    AI · testnet
                </span>
            </header>

            {isLoading ? (
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-2/3" />
                </div>
            ) : insights.length === 0 ? (
                <p className="text-[#707070] text-[13px] lg:text-[14px]">
                    Start a circle or contribute once to unlock personalized tips.
                </p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {insights.map((ins, i) => (
                        <li key={i} className="rounded-[10px] border border-[#333] bg-black/30 p-3 lg:p-4">
                            <p className="text-[14px] lg:text-[15px] font-semibold text-[#F4AEFF]">{ins.title}</p>
                            <p className="text-[12px] lg:text-[13px] text-[#AAA] mt-1 leading-relaxed">{ins.body}</p>
                            {ins.cta && (
                                <p className="text-[11px] lg:text-[12px] text-[#D548EC] mt-2 flex items-center gap-1">
                                    <FaArrowRight size={10} /> {ins.cta}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
