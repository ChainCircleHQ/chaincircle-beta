// Cross-chain payout relay log. Rendered on the Payout page below the
// pending-payouts banner. Only appears if the user has >=1 cross-chain row.

import React from 'react';
import { FaExchangeAlt, FaCheckCircle, FaHourglassHalf, FaTimesCircle, FaPaperPlane, FaExternalLinkAlt } from 'react-icons/fa';
import { useCrossChainPayouts } from '../../hooks/useCrossChainPayouts';
import { NETWORK_CONFIG } from '../../constants/contracts';
import { formatDate } from '../../utils/formatDate';

const STATUS_STYLE = {
    pending:   { label: 'Relaying', color: 'text-[#FDA318]',  bg: 'bg-[#FDA318]/10',  border: 'border-[#FDA318]/40',  icon: FaHourglassHalf },
    relayed:   { label: 'Relayed',  color: 'text-[#F4AEFF]',  bg: 'bg-[#F4AEFF]/10',  border: 'border-[#F4AEFF]/40',  icon: FaPaperPlane },
    delivered: { label: 'Delivered',color: 'text-[#AEFFDA]',  bg: 'bg-[#AEFFDA]/10',  border: 'border-[#AEFFDA]/40',  icon: FaCheckCircle },
    failed:    { label: 'Failed',   color: 'text-[#FFBDBD]',  bg: 'bg-[#FFBDBD]/10',  border: 'border-[#FFBDBD]/40',  icon: FaTimesCircle },
};

const unix = (iso) => Math.floor(new Date(iso).getTime() / 1000);

export default function CrossChainRelaysSection() {
    const { data, isLoading } = useCrossChainPayouts({ limit: 20 });
    if (isLoading || !data || data.length === 0) return null;

    return (
        <section className="flex flex-col gap-4 font-dm">
            <header className="flex items-center gap-3">
                <div className="p-2.5 rounded-full border border-[#F4AEFF]/40 bg-[#111111]">
                    <FaExchangeAlt className="text-[#D548EC]" size={16} />
                </div>
                <div>
                    <h3 className="text-[16px] lg:text-[20px] font-bold">Cross-chain payouts</h3>
                    <p className="text-[11px] lg:text-[12px] text-[#707070]">
                        Push UEA relay delivers CUSD to your preferred chain after you claim.
                    </p>
                </div>
            </header>

            <ul className="flex flex-col gap-2">
                {data.map((row) => {
                    const style = STATUS_STYLE[row.status] || STATUS_STYLE.pending;
                    const Icon = style.icon;
                    const ts = unix(row.blockTimestamp);
                    return (
                        <li
                            key={row.txHash}
                            className="rounded-[10px] border border-[#333] bg-[#111111] p-3 lg:p-4 flex items-center gap-3 lg:gap-4"
                        >
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.border} border`}>
                                <Icon className={style.color} size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[13px] lg:text-[15px] font-semibold text-[#F4AEFF]">
                                        {row.amountFormatted}
                                    </span>
                                    <span className="text-[#707070] text-[11px] lg:text-[12px]">→</span>
                                    <span className="text-[12px] lg:text-[13px] text-[#AAA]">{row.chainName}</span>
                                </div>
                                <div className="text-[10px] lg:text-[11px] text-[#707070] mt-0.5">
                                    {formatDate(ts)}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[11px] lg:text-[12px] px-2.5 py-1 rounded-full border ${style.border} ${style.bg} ${style.color} flex items-center gap-1.5`}>
                                    <Icon size={10} /> {style.label}
                                </span>
                                <a
                                    href={`${NETWORK_CONFIG.explorerUrl}/tx/${row.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-full text-[#707070] hover:text-[#F4AEFF] hover:bg-[#F4AEFF]/10"
                                    title="View initiating tx on Push Chain explorer"
                                >
                                    <FaExternalLinkAlt size={11} />
                                </a>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
