// Banner that prompts the user to upgrade a stale Universal Executor Account.
// Shown on any /chain/* page when getAccountStatus reports requiresUpgrade.
// Upgrade is gasless — single signature, no native token required.

import React, { useState } from 'react';
import { FaArrowUp, FaTimes } from 'react-icons/fa';
import { usePushChainClient } from '@pushchain/ui-kit';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUeaStatus } from '../hooks/useUeaStatus';

export default function UeaUpgradeBanner() {
    const { data } = useUeaStatus();
    const { pushChainClient } = usePushChainClient();
    const queryClient = useQueryClient();
    const [dismissed, setDismissed] = useState(false);
    const [upgrading, setUpgrading] = useState(false);

    if (!data?.requiresUpgrade || dismissed) return null;

    const doUpgrade = async () => {
        if (!pushChainClient?.upgradeAccount) {
            toast.error('Upgrade method unavailable — refresh and retry.');
            return;
        }
        setUpgrading(true);
        try {
            await pushChainClient.upgradeAccount();
            toast.success('Account upgraded');
            queryClient.invalidateQueries({ queryKey: ['ueaStatus'] });
            setDismissed(true);
        } catch (err) {
            if (err?.message?.toLowerCase().includes('user rejected')) return;
            toast.error('Upgrade failed', { description: err?.message?.slice(0, 140) });
        } finally {
            setUpgrading(false);
        }
    };

    return (
        <div className="rounded-[12px] border border-[#FDA318]/40 bg-[#FDA318]/10 p-3 lg:p-4 flex items-center gap-3 font-dm">
            <FaArrowUp className="text-[#FDA318] shrink-0" size={16} />
            <div className="flex-1 min-w-0">
                <p className="text-[13px] lg:text-[14px] font-semibold">Account upgrade available</p>
                <p className="text-[11px] lg:text-[12px] text-[#AAA]">
                    Your Universal Executor Account is on {data.version || 'an older version'} — upgrade for the latest features. Gasless.
                </p>
            </div>
            <button
                onClick={doUpgrade}
                disabled={upgrading}
                className="px-3 py-1.5 rounded-full bg-[#FDA318] hover:bg-[#F69B0E] text-black text-[12px] lg:text-[13px] font-semibold disabled:opacity-50 shrink-0"
            >
                {upgrading ? 'Upgrading…' : 'Upgrade'}
            </button>
            <button
                onClick={() => setDismissed(true)}
                aria-label="Dismiss"
                className="p-1 text-[#707070] hover:text-white shrink-0"
            >
                <FaTimes size={12} />
            </button>
        </div>
    );
}
