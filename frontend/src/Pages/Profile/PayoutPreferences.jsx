import React, { useEffect, useState } from 'react';
import { FaRegCreditCard, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { useWalletPreferences } from '../../hooks/useWalletPreferences';
import { usePushChainClient } from '@pushchain/ui-kit';
import { SkeletonRow } from '../../Components/Skeleton';

import useIsTabletOrMobile from '../../hooks/useIsTabletOrMobile';

const truncate = (addr) => {
    if (!addr) return '';
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
};

export default function PayoutPreferences() {
  const isTabletOrMobile = useIsTabletOrMobile();
    const { pushChainClient } = usePushChainClient();
    const { getAllWalletDetails, getPreferredWallet, setPreferredWallet } = useWalletPreferences();
    const currentWallet = pushChainClient?.universal?.account;

    const [wallets, setWallets] = useState([]);
    const [preferred, setPreferred] = useState(null);
    const [initialized, setInitialized] = useState(false);
    const [loading, setLoading] = useState(false);

    const refresh = async () => {
        if (!currentWallet) return;
        try {
            const [rows, pref] = await Promise.all([
                getAllWalletDetails(currentWallet),
                getPreferredWallet(currentWallet),
            ]);
            setWallets(rows ?? []);
            setPreferred(pref);
        } catch {
            setWallets([]);
            setPreferred(null);
        }
    };

    useEffect(() => {
        if (!currentWallet || initialized) return;
        (async () => {
            await refresh();
            setInitialized(true);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentWallet, initialized]);

    const pick = async (address) => {
        if (!currentWallet || preferred?.toLowerCase() === address.toLowerCase()) return;
        setLoading(true);
        try {
            await setPreferredWallet(address);
            await refresh();
            toast.success('Preferred wallet updated');
        } catch (err) {
            toast.error('Failed to update preference', { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 font-dm">
            {/* Header */}
            <header className="flex items-start gap-4">
                <div className="p-3 lg:p-4 rounded-full border border-[#F4AEFF]/40 bg-[#111111] flex items-center justify-center shrink-0">
                    <FaRegCreditCard className="text-[#D548EC]" size={isTabletOrMobile ? 22 : 28} />
                </div>
                <div className="flex flex-col gap-1">
                    <h2 className="text-[20px] lg:text-[28px] font-bold">Payout preferences</h2>
                    <p className="text-[#707070] text-[12px] lg:text-[14px]">
                        Pick which linked wallet should receive your circle payouts.
                    </p>
                </div>
            </header>

            {/* v2 live — payouts route through preferred wallet */}
            <div className="rounded-[12px] border border-[#F4AEFF]/30 bg-[#D548EC]/10 p-4 flex gap-3 text-[12px] lg:text-[14px]">
                <FaInfoCircle className="text-[#D548EC] mt-0.5 shrink-0" size={16} />
                <div className="text-[#AAA] leading-relaxed">
                    Your preference is stored on-chain and is read by ChainCircleCore at
                    payout time. If the preferred chain isn't Push Chain, the payout is
                    routed cross-chain via Push UEA.
                </div>
            </div>

            {/* Preferred receiving wallet picker */}
            <section className="flex flex-col gap-3">
                <h3 className="text-[#F4AEFF] font-semibold text-[14px] lg:text-[16px]">
                    Preferred receiving wallet
                </h3>

                {!initialized ? (
                    <ul className="flex flex-col gap-2">
                        {Array.from({ length: 2 }).map((_, i) => <SkeletonRow key={i} />)}
                    </ul>
                ) : wallets.length === 0 ? (
                    <div className="rounded-[12px] border border-dashed border-[#F4AEFF]/40 bg-[#111111]/60 p-8 flex flex-col items-center gap-3 text-center">
                        <p className="text-[#AAA] text-[14px]">No linked wallets yet.</p>
                        <Link
                            to="/chain/profile"
                            className="text-[#D548EC] hover:text-[#F4AEFF] text-[13px] lg:text-[14px] underline underline-offset-4"
                        >
                            Link one from the Linked Wallets tab →
                        </Link>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {wallets.map((w) => {
                            const isActive = preferred?.toLowerCase() === w.address?.toLowerCase();
                            return (
                                <li key={w.address}>
                                    <button
                                        type="button"
                                        disabled={loading || isActive}
                                        onClick={() => pick(w.address)}
                                        className={`w-full flex items-center justify-between p-4 rounded-[12px] border transition-colors bg-[#111111] text-left ${
                                            isActive
                                                ? 'border-[#D548EC] bg-[#D548EC]/10'
                                                : 'border-[#333] hover:border-[#F4AEFF]/60 disabled:opacity-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                                    isActive ? 'border-[#D548EC] bg-[#D548EC]' : 'border-[#707070]'
                                                }`}
                                            >
                                                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            </span>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-mono text-[#F4AEFF] text-[13px] lg:text-[15px] truncate">
                                                    {truncate(w.address)}
                                                </span>
                                                <span className="text-[#707070] text-[11px] lg:text-[12px]">
                                                    {w.chainName || 'Push Chain'}
                                                </span>
                                            </div>
                                        </div>
                                        {isActive && (
                                            <span className="flex items-center gap-1.5 text-[#D548EC] text-[12px] lg:text-[13px] font-semibold shrink-0 ml-2">
                                                <FaCheckCircle size={14} /> Preferred
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {/* Preferred token */}
            <section className="flex flex-col gap-3 pt-2">
                <h3 className="text-[#F4AEFF] font-semibold text-[14px] lg:text-[16px]">Preferred token</h3>
                <div className="rounded-[12px] border border-[#333] bg-[#111111] p-4 flex items-center justify-between">
                    <div>
                        <p className="text-[#AAA] text-[14px] lg:text-[16px]">CUSD (Circle USD)</p>
                        <p className="text-[#707070] text-[11px] lg:text-[12px]">
                            Testnet savings currency — only option today
                        </p>
                    </div>
                    <span className="text-[#707070] text-[11px] px-2 py-0.5 rounded-full border border-[#333]">
                        default
                    </span>
                </div>
            </section>
        </div>
    );
}
