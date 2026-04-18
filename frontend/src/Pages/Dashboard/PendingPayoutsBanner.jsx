// Banner shown on Dashboard + Payout page when the v2 core has a non-zero
// pendingWithdrawals[user][circle] entry — clicking "Claim" calls
// withdrawPayout(circleId) which routes CUSD to the preferred wallet
// (cross-chain via Push UEA if needed).

import React from 'react';
import { toast } from 'sonner';
import { FaHandHoldingUsd } from 'react-icons/fa';
import { usePendingPayouts } from '../../hooks/usePendingPayouts';
import { usePayoutDestination } from '../../hooks/usePayoutDestination';
import { useWithdrawPayout } from '../../hooks/useCircleActions';

const truncate = (addr) => {
    if (!addr) return '';
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
};

export default function PendingPayoutsBanner({ compact = false }) {
    const { data, isLoading } = usePendingPayouts();
    const { data: destination } = usePayoutDestination();
    const withdraw = useWithdrawPayout();

    if (isLoading || !data || data.items.length === 0) return null;

    const handleClaim = async (item) => {
        try {
            const res = await withdraw.mutateAsync(Number(item.circleId));
            if (res?.status === 'pending') {
                toast.info('Claim is still pending — refresh in a minute.');
                return;
            }
            toast.success(`Claimed ${item.amountFormatted} from ${item.circleName}`);
        } catch (err) {
            toast.error('Claim failed', { description: err.message });
        }
    };

    return (
        <div className={`rounded-[16px] border border-[#AEFFDA]/60 bg-gradient-to-br from-[#AEFFDA]/10 via-[#111111] to-[#111111] font-dm ${compact ? 'p-4' : 'p-5 lg:p-6'} flex flex-col gap-4`}>
            <header className="flex items-start gap-4">
                <div className="p-3 rounded-full border border-[#AEFFDA]/40 bg-[#111111] flex items-center justify-center shrink-0">
                    <FaHandHoldingUsd className="text-[#AEFFDA]" size={compact ? 18 : 22} />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                    <h3 className={`font-bold ${compact ? 'text-[16px]' : 'text-[18px] lg:text-[22px]'}`}>
                        You have {data.items.length} payout{data.items.length > 1 ? 's' : ''} to claim
                    </h3>
                    <p className="text-[#AAA] text-[12px] lg:text-[13px]">
                        Total <span className="text-[#AEFFDA] font-semibold">{data.totalFormatted}</span>{' '}
                        escrowed on-chain.
                        {destination ? (
                            <> Delivery to <span className="text-[#F4AEFF]">{destination.chainName}</span>{' '}
                            at <span className="font-mono text-[#AAA]">{truncate(destination.wallet)}</span>
                            {destination.isCrossChain && <span className="text-[#D548EC]"> · cross-chain via Push UEA</span>}.</>
                        ) : ' Delivery address loading…'}
                    </p>
                </div>
            </header>

            <ul className="flex flex-col gap-2">
                {data.items.map((item) => (
                    <li
                        key={item.circleId}
                        className="flex items-center justify-between gap-3 rounded-[10px] border border-[#333] bg-[#111111] px-4 py-3"
                    >
                        <div className="flex flex-col min-w-0">
                            <span className="text-[13px] lg:text-[15px] text-[#F4AEFF] font-semibold truncate">
                                {item.circleName}
                            </span>
                            <span className="text-[11px] lg:text-[12px] text-[#707070]">Circle #{item.circleId}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[#AEFFDA] font-semibold text-[13px] lg:text-[15px]">
                                {item.amountFormatted}
                            </span>
                            <button
                                onClick={() => handleClaim(item)}
                                disabled={withdraw.isPending}
                                className="px-4 py-1.5 rounded-full bg-[#AEFFDA] text-black text-[12px] lg:text-[13px] font-semibold hover:opacity-90 disabled:opacity-50"
                            >
                                {withdraw.isPending ? 'Claiming…' : 'Claim'}
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
