// Small pill showing a member's origin chain (or 'Push' for native users).
// Used in circle rosters + leaderboard to make the cross-chain pitch visible.

import React from 'react';
import { FaEthereum } from 'react-icons/fa';
import { SiSolana, SiBinance, SiPolygon } from 'react-icons/si';

const STYLES = {
    ethereum: { label: 'Ethereum', Icon: FaEthereum,  color: 'text-[#627EEA]', bg: 'bg-[#627EEA]/10', border: 'border-[#627EEA]/40' },
    base:     { label: 'Base',     Icon: null,        color: 'text-[#0052FF]', bg: 'bg-[#0052FF]/10', border: 'border-[#0052FF]/40' },
    arbitrum: { label: 'Arbitrum', Icon: null,        color: 'text-[#28A0F0]', bg: 'bg-[#28A0F0]/10', border: 'border-[#28A0F0]/40' },
    optimism: { label: 'Optimism', Icon: null,        color: 'text-[#FF0420]', bg: 'bg-[#FF0420]/10', border: 'border-[#FF0420]/40' },
    solana:   { label: 'Solana',   Icon: SiSolana,    color: 'text-[#14F195]', bg: 'bg-[#14F195]/10', border: 'border-[#14F195]/40' },
    bnb:      { label: 'BNB',      Icon: SiBinance,   color: 'text-[#F3BA2F]', bg: 'bg-[#F3BA2F]/10', border: 'border-[#F3BA2F]/40' },
    polygon:  { label: 'Polygon',  Icon: SiPolygon,   color: 'text-[#8247E5]', bg: 'bg-[#8247E5]/10', border: 'border-[#8247E5]/40' },
    push:     { label: 'Push',     Icon: null,        color: 'text-[#D548EC]', bg: 'bg-[#D548EC]/10', border: 'border-[#D548EC]/40' },
    evm:      { label: 'EVM',      Icon: null,        color: 'text-[#AAA]',    bg: 'bg-[#333]/50',    border: 'border-[#555]' },
    unknown:  { label: '—',        Icon: null,        color: 'text-[#707070]', bg: 'bg-[#222]',       border: 'border-[#333]' },
};

export default function ChainBadge({ origin, size = 'sm' }) {
    if (!origin) return null;
    const style = STYLES[origin.chain] || STYLES.unknown;
    const Icon = style.Icon;
    const isCompact = size === 'sm';
    return (
        <span
            title={origin.isUEA ? `Cross-chain from ${style.label}` : `Native ${style.label} account`}
            className={`inline-flex items-center gap-1 rounded-full border ${style.bg} ${style.border} ${style.color} ${
                isCompact ? 'px-1.5 py-0.5 text-[10px] lg:text-[11px]' : 'px-2 py-1 text-[12px] lg:text-[13px]'
            }`}
        >
            {Icon && <Icon size={isCompact ? 10 : 12} />}
            <span className="font-medium">{style.label}</span>
        </span>
    );
}
