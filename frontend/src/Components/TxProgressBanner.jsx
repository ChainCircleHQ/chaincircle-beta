// Top-of-Layout banner showing Push Chain tx lifecycle while a mutation is
// in-flight. Subscribes to txProgressBus which sendUniversalTx emits to.

import React, { useEffect, useState } from 'react';
import { FaCircleNotch, FaCircleCheck, FaCircleExclamation } from 'react-icons/fa6';
import { subscribe } from '../lib/txProgressBus';

const STAGE_STYLE = {
    signing:    { Icon: FaCircleNotch,       color: 'text-[#F4AEFF]', border: 'border-[#F4AEFF]/40', bg: 'bg-[#D548EC]/10', spin: true },
    submitting: { Icon: FaCircleNotch,       color: 'text-[#F4AEFF]', border: 'border-[#F4AEFF]/40', bg: 'bg-[#D548EC]/10', spin: true },
    confirming: { Icon: FaCircleNotch,       color: 'text-[#FDA318]', border: 'border-[#FDA318]/40', bg: 'bg-[#FDA318]/10', spin: true },
    tracking:   { Icon: FaCircleNotch,       color: 'text-[#FDA318]', border: 'border-[#FDA318]/40', bg: 'bg-[#FDA318]/10', spin: true },
    working:    { Icon: FaCircleNotch,       color: 'text-[#AAA]',    border: 'border-[#333]',       bg: 'bg-[#111111]',    spin: true },
    confirmed:  { Icon: FaCircleCheck,       color: 'text-green-400', border: 'border-green-400/40', bg: 'bg-green-400/10', spin: false },
    failed:     { Icon: FaCircleExclamation, color: 'text-red-400',   border: 'border-red-400/40',   bg: 'bg-red-400/10',   spin: false },
};

export default function TxProgressBanner() {
    const [state, setState] = useState(null);
    useEffect(() => subscribe(setState), []);

    if (!state) return null;
    const style = STAGE_STYLE[state.stage] || STAGE_STYLE.working;
    const { Icon } = style;

    return (
        <div
            className={`rounded-[10px] border ${style.border} ${style.bg} px-3 lg:px-4 py-2.5 flex items-center gap-3 font-dm`}
            role="status"
            aria-live="polite"
        >
            <Icon className={`${style.color} shrink-0 ${style.spin ? 'animate-spin' : ''}`} size={14} />
            <span className={`text-[12px] lg:text-[13px] ${style.color}`}>
                {state.message}
            </span>
            {state.txHash && (
                <span className="text-[10px] lg:text-[11px] text-[#707070] font-mono truncate">
                    {state.txHash.slice(0, 10)}…{state.txHash.slice(-6)}
                </span>
            )}
        </div>
    );
}
