import React, { useEffect, useState } from 'react';
import { FaWallet, FaCrown, FaStar, FaRegTrashAlt, FaPlus, FaInfoCircle } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import { toast } from 'sonner';
import PurpleBtn from '../../Components/PurpleBtn';
import TransBtn from '../../Components/TransBtn';
import { SkeletonRow } from '../../Components/Skeleton';
import { useWalletPreferences } from '../../hooks/useWalletPreferences';
import { usePushChainClient, usePushWalletContext, PushUI } from '@pushchain/ui-kit';

import useIsTabletOrMobile from '../../hooks/useIsTabletOrMobile';

const truncate = (addr) => {
    if (!addr) return '';
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
};

const isValidEvmAddress = (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr?.trim() || '');

export default function LinkedWallets() {
  const isTabletOrMobile = useIsTabletOrMobile();
    const { pushChainClient } = usePushChainClient();
    const { connectionStatus } = usePushWalletContext();
    const { getAllWalletDetails, removeWallet: removeWalletOnChain, addWallet } = useWalletPreferences();
    const masterAccount = pushChainClient?.universal?.account;

    const [wallets, setWallets] = useState([]);
    const [initialized, setInitialized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [removingAddr, setRemovingAddr] = useState(null); // inline confirm state

    const refreshWallets = async () => {
        if (!masterAccount) return;
        try {
            const rows = await getAllWalletDetails(masterAccount);
            setWallets(rows ?? []);
        } catch {
            setWallets([]);
        }
    };

    useEffect(() => {
        if (!masterAccount || initialized) return;
        (async () => {
            await refreshWallets();
            setInitialized(true);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [masterAccount, initialized]);

    const handleAdd = async (address, chainName) => {
        if (connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED || !masterAccount) {
            toast.error('Connect your wallet first');
            return false;
        }
        setLoading(true);
        try {
            await addWallet(address, chainName);
            await refreshWallets();
            toast.success('Wallet linked');
            return true;
        } catch (err) {
            if (err.message?.includes('already linked')) {
                toast.info('This wallet is already linked');
            } else {
                toast.error('Failed to link wallet', { description: err.message });
            }
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (address) => {
        if (wallets.length <= 1) {
            toast.error("Can't remove your last wallet");
            return;
        }
        setLoading(true);
        try {
            await removeWalletOnChain(address);
            await refreshWallets();
            toast.success('Wallet removed');
        } catch (err) {
            toast.error('Failed to remove wallet', { description: err.message });
        } finally {
            setLoading(false);
            setRemovingAddr(null);
        }
    };

    return (
        <div className="flex flex-col gap-6 font-dm">
            {/* Header */}
            <header className="flex items-start gap-4">
                <div className="p-3 lg:p-4 rounded-full border border-[#F4AEFF]/40 bg-[#111111] flex items-center justify-center shrink-0">
                    <FaWallet className="text-[#D548EC]" size={isTabletOrMobile ? 22 : 28} />
                </div>
                <div className="flex flex-col gap-1">
                    <h2 className="text-[20px] lg:text-[28px] font-bold">Linked wallets</h2>
                    <p className="text-[#707070] text-[12px] lg:text-[14px]">
                        Master account: <span className="font-mono text-[#AAA]">{masterAccount ? truncate(masterAccount) : '…'}</span>
                    </p>
                </div>
            </header>

            {/* Testnet + not-yet-wired disclaimer */}
            <div className="rounded-[12px] border border-[#F4AEFF]/30 bg-[#D548EC]/10 p-4 flex gap-3 text-[12px] lg:text-[14px]">
                <FaInfoCircle className="text-[#D548EC] mt-0.5 shrink-0" size={16} />
                <div className="text-[#AAA] leading-relaxed">
                    Linked wallets are stored on-chain, but the current ChainCircleCore doesn't
                    yet route payouts through your preferred wallet — this ships with the
                    Phase 6 redeploy. For now, this list is <span className="text-[#F4AEFF]">informational</span>.
                </div>
            </div>

            {/* Wallet list */}
            {!initialized ? (
                <ul className="flex flex-col gap-3">
                    {Array.from({ length: 2 }).map((_, i) => <SkeletonRow key={i} />)}
                </ul>
            ) : wallets.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[#F4AEFF]/40 bg-[#111111]/60 p-10 flex flex-col items-center gap-3 text-center">
                    <FaWallet className="text-[#F4AEFF]/60" size={32} />
                    <p className="text-[#AAA] text-[14px] lg:text-[16px]">No linked wallets yet.</p>
                    <p className="text-[#707070] text-[12px] lg:text-[13px] max-w-md">
                        Link any EVM address to mark it as a payout destination. Your master
                        account always controls the list.
                    </p>
                    <div className="mt-2">
                        <PurpleBtn text="Link your first wallet" action={() => setShowAddModal(true)} />
                    </div>
                </div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {wallets.map((w) => {
                        const isMaster = w.address?.toLowerCase() === masterAccount?.toLowerCase();
                        const isRemoving = removingAddr === w.address;
                        return (
                            <li
                                key={w.address}
                                className={`rounded-[12px] border p-4 lg:p-5 flex items-center gap-4 transition-colors bg-[#111111] ${
                                    w.isPreferred
                                        ? 'border-[#D548EC]'
                                        : 'border-[#333] hover:border-[#F4AEFF]/60'
                                }`}
                            >
                                <div className="flex items-center gap-2 shrink-0">
                                    {isMaster && <FaCrown className="text-[#F4AEFF]" size={18} title="Master account" />}
                                    {w.isPreferred && <FaStar className="text-[#D548EC]" size={18} title="Preferred payout wallet" />}
                                    {!isMaster && !w.isPreferred && (
                                        <FaWallet className="text-[#707070]" size={18} />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[#F4AEFF] text-[13px] lg:text-[15px] font-semibold">
                                            {isMaster ? 'Master account' : w.isPreferred ? 'Preferred payout' : 'Linked wallet'}
                                        </span>
                                        <span className="text-[#707070] text-[11px] lg:text-[12px] font-mono bg-black/40 px-2 py-0.5 rounded-full">
                                            {w.chainName || 'Push Chain'}
                                        </span>
                                    </div>
                                    <span className="font-mono text-[#AAA] text-[12px] lg:text-[14px] truncate">
                                        {w.address}
                                    </span>
                                </div>

                                {wallets.length > 1 && !isMaster && (
                                    isRemoving ? (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => handleRemove(w.address)}
                                                disabled={loading}
                                                className="px-3 py-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white text-[12px] lg:text-[13px] font-semibold disabled:opacity-50"
                                            >
                                                {loading ? 'Removing…' : 'Confirm'}
                                            </button>
                                            <button
                                                onClick={() => setRemovingAddr(null)}
                                                disabled={loading}
                                                className="px-3 py-1.5 rounded-full border border-[#333] text-[#AAA] text-[12px] lg:text-[13px] hover:border-[#F4AEFF]/60"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setRemovingAddr(w.address)}
                                            className="p-2 rounded-full text-[#707070] hover:text-[#D548EC] hover:bg-[#D548EC]/10 transition-colors shrink-0"
                                            title="Remove wallet"
                                        >
                                            <FaRegTrashAlt size={16} />
                                        </button>
                                    )
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* Add CTA (hidden when empty state renders its own) */}
            {wallets.length > 0 && (
                <div className="flex justify-end">
                    <PurpleBtn
                        text="Link new wallet"
                        icon="rightArrow"
                        action={() => setShowAddModal(true)}
                        disabled={loading}
                    />
                </div>
            )}

            {/* Info panel */}
            <section className="rounded-[12px] border border-[#333] bg-[#111111] p-5 flex flex-col gap-3 text-[13px] lg:text-[14px] text-[#AAA] leading-relaxed">
                <h3 className="text-[#F4AEFF] font-semibold text-[15px] lg:text-[17px] flex items-center gap-2">
                    <FaInfoCircle size={16} />
                    What linked wallets are for
                </h3>
                <p>
                    These are destination addresses where you'd like circle payouts to land.
                    They are <span className="text-[#F4AEFF]">not</span> login credentials —
                    your master account stays in control.
                </p>
                <p>
                    Any EVM-compatible address works (must start with <span className="font-mono text-[#AAA]">0x</span>
                    and be 42 characters). When Phase 6 ships, the <span className="text-[#D548EC]">preferred
                    wallet</span> is the one payouts arrive in, resolved cross-chain via Push UEA.
                </p>
            </section>

            {/* Add wallet modal */}
            {showAddModal && (
                <AddWalletModal
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleAdd}
                    existing={wallets.map((w) => w.address?.toLowerCase())}
                    loading={loading}
                />
            )}
        </div>
    );
}

function AddWalletModal({ onClose, onSubmit, existing, loading }) {
    const [address, setAddress] = useState('');
    const [chainName, setChainName] = useState('Push Chain');
    const [error, setError] = useState('');

    const submit = async (e) => {
        e?.preventDefault();
        const trimmed = address.trim();
        if (!isValidEvmAddress(trimmed)) {
            setError('Must be a valid 0x… address (42 characters).');
            return;
        }
        if (existing.includes(trimmed.toLowerCase())) {
            setError('This wallet is already linked.');
            return;
        }
        setError('');
        const ok = await onSubmit(trimmed, chainName);
        if (ok) onClose();
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-dm">
            <div className="relative w-full max-w-[480px] bg-[#111111] rounded-[20px] border border-[#F4AEFF] overflow-hidden">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-2 rounded-full hover:bg-[#D548EC]/20 text-[#AAA] hover:text-white"
                >
                    <IoClose size={22} />
                </button>

                <div className="px-6 pt-6 pb-4 border-b border-[#F4AEFF]/30">
                    <h2 className="text-[20px] lg:text-[24px] font-bold">Link a new wallet</h2>
                    <p className="text-[#707070] text-[12px] lg:text-[13px] mt-1">
                        Add an EVM-compatible address to receive payouts.
                    </p>
                </div>

                <form onSubmit={submit} className="px-6 py-5 flex flex-col gap-4">
                    <label className="flex flex-col gap-2">
                        <span className="text-[13px] lg:text-[14px] text-[#AAA]">Wallet address</span>
                        <input
                            autoFocus
                            type="text"
                            value={address}
                            onChange={(e) => { setAddress(e.target.value); setError(''); }}
                            placeholder="0x…"
                            className="w-full bg-black/40 border border-[#333] focus:border-[#D548EC] rounded-[10px] px-4 py-3 font-mono text-[13px] lg:text-[14px] text-white placeholder-[#555] outline-none transition-colors"
                        />
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-[13px] lg:text-[14px] text-[#AAA]">Source chain</span>
                        <select
                            value={chainName}
                            onChange={(e) => setChainName(e.target.value)}
                            className="w-full bg-black/40 border border-[#333] focus:border-[#D548EC] rounded-[10px] px-4 py-3 text-[13px] lg:text-[14px] text-white outline-none transition-colors"
                        >
                            <option value="Push Chain">Push Chain</option>
                            <option value="Ethereum">Ethereum</option>
                            <option value="Base">Base</option>
                            <option value="Arbitrum">Arbitrum</option>
                            <option value="Optimism">Optimism</option>
                            <option value="Polygon">Polygon</option>
                            <option value="BSC">BSC</option>
                            <option value="Solana">Solana</option>
                        </select>
                    </label>

                    {error && (
                        <div className="text-red-400 text-[12px] lg:text-[13px] bg-red-500/10 border border-red-500/30 rounded-[8px] px-3 py-2">
                            {error}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <TransBtn text="Cancel" action={onClose} />
                        <PurpleBtn
                            text={loading ? 'Linking…' : 'Link wallet'}
                            icon="rightArrow"
                            action={submit}
                            disabled={loading || !address.trim()}
                        />
                    </div>
                </form>
            </div>
        </div>
    );
}
