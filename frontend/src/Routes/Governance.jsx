// Governance hub. Silver+ members propose; anyone with voteWeight > 0 votes;
// anyone can execute a passed proposal after the deadline.
//
// Reads on-chain via useAllProposals (bounded to last 50 ids); writes via
// useProposeEarlyExit / useProposeCancelCircle / useVote / useExecuteProposal.

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FaBalanceScale, FaCheckCircle, FaTimesCircle, FaClock, FaPlay, FaPlus } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import { BsMegaphone } from 'react-icons/bs';
import PurpleBtn from '../Components/PurpleBtn';
import TransBtn from '../Components/TransBtn';
import { SkeletonRow } from '../Components/Skeleton';
import useIsTabletOrMobile from '../hooks/useIsTabletOrMobile';
import { formatAddressOrName } from '../hooks/useNameRegistry';
import {
    useAllProposals,
    useHasVoted,
    useVoteWeight,
    useProposeEarlyExit,
    useProposeCancelCircle,
    useVote,
    useExecuteProposal,
    PROPOSAL_KIND,
    PROPOSAL_STATUS,
} from '../hooks/useGovernance';
import { useUserCircles } from '../hooks/useCircleData';

const TAB_ORDER = ['Active', 'Passed', 'Failed', 'Executed', 'All'];

const formatRemaining = (secs) => {
    if (secs <= 0) return 'ended';
    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
};

const weightLabel = (w) => {
    if (w === 2) return 'Gold · 2× vote';
    if (w === 1) return 'Silver · 1× vote';
    return 'No voting power yet — reach Silver';
};

export default function Governance() {
    const isTabletOrMobile = useIsTabletOrMobile();
    const [tab, setTab] = useState('Active');
    const [showCreate, setShowCreate] = useState(false);

    const { data: proposals, isLoading } = useAllProposals({ limit: 50 });
    const { data: voteWeight = 0 } = useVoteWeight();

    const filtered = useMemo(() => {
        if (!proposals) return [];
        if (tab === 'All') return proposals;
        const byLabel = {
            Active: (p) => p.isOpen,
            Passed: (p) => p.status === PROPOSAL_STATUS.PASSED,
            Failed: (p) => p.status === PROPOSAL_STATUS.FAILED,
            Executed: (p) => p.status === PROPOSAL_STATUS.EXECUTED,
        };
        return proposals.filter(byLabel[tab]);
    }, [proposals, tab]);

    return (
        <div className="flex flex-col gap-6 font-dm">
            {/* Header */}
            <header className="flex flex-col lg:flex-row lg:items-end gap-4 lg:justify-between">
                <div className="flex items-start gap-4">
                    <div className="p-3 lg:p-4 rounded-full border border-[#F4AEFF]/40 bg-[#111111] flex items-center justify-center shrink-0">
                        <FaBalanceScale className="text-[#D548EC]" size={isTabletOrMobile ? 22 : 28} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h2 className="text-[20px] lg:text-[30px] font-bold">Governance</h2>
                        <p className="text-[#707070] text-[12px] lg:text-[14px] max-w-[640px]">
                            Silver / Gold members can propose relief for a stuck circle. Anyone
                            with voting power votes; quorum resolves on the deadline.
                        </p>
                        <p className="text-[#D548EC]/80 text-[11px] lg:text-[13px] mt-1">
                            Your voting power: <span className="text-[#F4AEFF]">{weightLabel(voteWeight)}</span>
                        </p>
                    </div>
                </div>
                <PurpleBtn text="New proposal" icon="rightArrow" action={() => setShowCreate(true)} />
            </header>

            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {TAB_ORDER.map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 rounded-full text-[12px] lg:text-[13px] border transition-colors whitespace-nowrap ${
                            tab === t
                                ? 'bg-[#D548EC] border-[#D548EC] text-white'
                                : 'border-[#333] text-[#AAA] hover:border-[#F4AEFF]/60'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Proposals */}
            {isLoading ? (
                <ul className="flex flex-col gap-3">
                    {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
                </ul>
            ) : filtered.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[#F4AEFF]/40 bg-[#111111]/60 p-10 flex flex-col items-center gap-3 text-center">
                    <BsMegaphone className="text-[#F4AEFF]/60" size={28} />
                    <p className="text-[#AAA] text-[14px] lg:text-[16px]">No {tab.toLowerCase()} proposals.</p>
                    <p className="text-[#707070] text-[12px] lg:text-[13px] max-w-md">
                        {tab === 'Active'
                            ? 'When a circle gets stuck, a Silver+ member can open a proposal here.'
                            : 'Check other tabs or create one to get things moving.'}
                    </p>
                </div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {filtered.map((p) => (
                        <ProposalCard key={p.id} proposal={p} voteWeight={voteWeight} />
                    ))}
                </ul>
            )}

            {showCreate && (
                <CreateProposalModal onClose={() => setShowCreate(false)} voteWeight={voteWeight} />
            )}
        </div>
    );
}

function ProposalCard({ proposal, voteWeight }) {
    const { data: hasVoted } = useHasVoted(proposal.id);
    const vote = useVote();
    const execute = useExecuteProposal();

    const onVote = async (support) => {
        try {
            await vote.mutateAsync({ proposalId: proposal.id, support });
            toast.success(support ? 'Voted yes' : 'Voted no');
        } catch (err) {
            toast.error('Vote failed', { description: err.message });
        }
    };

    const onExecute = async () => {
        try {
            await execute.mutateAsync(proposal.id);
            toast.success('Proposal executed');
        } catch (err) {
            toast.error('Execute failed', { description: err.message });
        }
    };

    const statusTone =
        proposal.statusLabel === 'Active' ? 'border-[#F4AEFF] text-[#F4AEFF]' :
        proposal.statusLabel === 'Passed' ? 'border-[#AEFFDA] text-[#AEFFDA]' :
        proposal.statusLabel === 'Failed' ? 'border-[#FFBDBD] text-[#FFBDBD]' :
        'border-[#D548EC] text-[#D548EC]';

    const canVote = proposal.isOpen && voteWeight > 0 && !hasVoted;
    const canExecute = proposal.status === PROPOSAL_STATUS.PASSED;

    const kindIcon = proposal.kind === PROPOSAL_KIND.CANCEL_CIRCLE ? <FaTimesCircle /> : <FaCheckCircle />;

    return (
        <li className="rounded-[12px] border border-[#333] bg-[#111111] p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 text-[12px] lg:text-[13px] text-[#AAA]">
                        <span className="text-[#D548EC] flex items-center gap-1">{kindIcon} {proposal.kindLabel}</span>
                        <span>·</span>
                        <span>Circle #{proposal.circleId}</span>
                        <span>·</span>
                        <span>Proposal #{proposal.id}</span>
                    </div>
                    <p className="text-[#F4AEFF] text-[14px] lg:text-[16px] font-semibold break-words">
                        {proposal.justification}
                    </p>
                    <p className="text-[#707070] text-[11px] lg:text-[12px]">
                        Proposed by <span className="font-mono text-[#AAA]">{formatAddressOrName(proposal.proposer)}</span>
                        {proposal.kind === PROPOSAL_KIND.EARLY_EXIT && (
                            <>
                                {' · '}Target <span className="font-mono text-[#AAA]">{formatAddressOrName(proposal.target)}</span>
                                {' · '}Reduction {(proposal.reductionBps / 100).toFixed(2)}%
                            </>
                        )}
                    </p>
                </div>
                <span className={`px-3 py-1 rounded-full border text-[11px] lg:text-[12px] flex items-center gap-1.5 whitespace-nowrap ${statusTone}`}>
                    <FaClock size={10} /> {proposal.statusLabel} · {formatRemaining(proposal.secondsRemaining)}
                </span>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 text-[12px] lg:text-[13px] text-[#AAA]">
                    <span>YES <span className="text-[#AEFFDA] font-semibold">{proposal.yesWeight.toString()}</span></span>
                    <span>NO <span className="text-[#FFBDBD] font-semibold">{proposal.noWeight.toString()}</span></span>
                </div>
                <div className="flex items-center gap-2">
                    {canVote ? (
                        <>
                            <button
                                disabled={vote.isPending}
                                onClick={() => onVote(true)}
                                className="px-4 py-1.5 rounded-full bg-[#AEFFDA]/20 border border-[#AEFFDA]/60 text-[#AEFFDA] text-[12px] lg:text-[13px] hover:bg-[#AEFFDA]/30 disabled:opacity-50"
                            >
                                Vote YES
                            </button>
                            <button
                                disabled={vote.isPending}
                                onClick={() => onVote(false)}
                                className="px-4 py-1.5 rounded-full bg-[#FFBDBD]/20 border border-[#FFBDBD]/60 text-[#FFBDBD] text-[12px] lg:text-[13px] hover:bg-[#FFBDBD]/30 disabled:opacity-50"
                            >
                                Vote NO
                            </button>
                        </>
                    ) : hasVoted && proposal.isOpen ? (
                        <span className="text-[#707070] text-[12px]">You voted</span>
                    ) : null}
                    {canExecute && (
                        <button
                            disabled={execute.isPending}
                            onClick={onExecute}
                            className="px-4 py-1.5 rounded-full bg-[#D548EC]/20 border border-[#D548EC]/60 text-[#F4AEFF] text-[12px] lg:text-[13px] hover:bg-[#D548EC]/30 disabled:opacity-50 flex items-center gap-1.5"
                        >
                            <FaPlay size={10} /> Execute
                        </button>
                    )}
                </div>
            </div>
        </li>
    );
}

function CreateProposalModal({ onClose, voteWeight }) {
    const { data: circles } = useUserCircles();
    const [kind, setKind] = useState(PROPOSAL_KIND.EARLY_EXIT);
    const [circleId, setCircleId] = useState('');
    const [target, setTarget] = useState('');
    const [reductionPct, setReductionPct] = useState('50');
    const [justification, setJustification] = useState('');
    const [durationDays, setDurationDays] = useState(3);
    const [error, setError] = useState('');

    const propEarly = useProposeEarlyExit();
    const propCancel = useProposeCancelCircle();
    const pending = propEarly.isPending || propCancel.isPending;

    const canPropose = voteWeight > 0;

    const submit = async (e) => {
        e?.preventDefault();
        if (!canPropose) {
            setError('You need at least Silver tier to open a proposal.');
            return;
        }
        if (!circleId) {
            setError('Pick a circle.');
            return;
        }
        if (!justification || justification.trim().length < 10) {
            setError('Justification must be at least 10 characters.');
            return;
        }
        const duration = Number(durationDays) * 86400;
        try {
            setError('');
            if (kind === PROPOSAL_KIND.EARLY_EXIT) {
                if (!target) { setError('Target member address is required.'); return; }
                const bps = Math.round(Number(reductionPct) * 100);
                if (isNaN(bps) || bps < 0 || bps > 10000) {
                    setError('Reduction must be 0–100%.');
                    return;
                }
                await propEarly.mutateAsync({
                    circleId: Number(circleId),
                    target,
                    reductionBps: bps,
                    justification,
                    duration,
                });
            } else {
                await propCancel.mutateAsync({
                    circleId: Number(circleId),
                    justification,
                    duration,
                });
            }
            toast.success('Proposal submitted');
            onClose();
        } catch (err) {
            toast.error('Proposal failed', { description: err.message });
            setError(err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-dm">
            <div className="relative w-full max-w-[560px] bg-[#111111] rounded-[20px] border border-[#F4AEFF] overflow-hidden">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-2 rounded-full hover:bg-[#D548EC]/20 text-[#AAA] hover:text-white z-10"
                >
                    <IoClose size={22} />
                </button>

                <div className="px-6 pt-6 pb-4 border-b border-[#F4AEFF]/30">
                    <h2 className="text-[20px] lg:text-[24px] font-bold flex items-center gap-2">
                        <FaPlus className="text-[#D548EC]" size={16} /> New proposal
                    </h2>
                    <p className="text-[#707070] text-[12px] lg:text-[13px] mt-1">
                        Open a governance vote to unstick a circle or relieve a member.
                    </p>
                </div>

                <form onSubmit={submit} className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
                    <label className="flex flex-col gap-2">
                        <span className="text-[13px] lg:text-[14px] text-[#AAA]">Kind</span>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setKind(PROPOSAL_KIND.EARLY_EXIT)}
                                className={`rounded-[10px] border p-3 text-[12px] lg:text-[13px] text-left transition-colors ${
                                    kind === PROPOSAL_KIND.EARLY_EXIT
                                        ? 'border-[#D548EC] bg-[#D548EC]/10 text-[#F4AEFF]'
                                        : 'border-[#333] text-[#AAA] hover:border-[#F4AEFF]/60'
                                }`}
                            >
                                <div className="font-semibold">Early exit relief</div>
                                <div className="text-[11px] text-[#707070] mt-0.5">Reduce one member's emergency penalty.</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setKind(PROPOSAL_KIND.CANCEL_CIRCLE)}
                                className={`rounded-[10px] border p-3 text-[12px] lg:text-[13px] text-left transition-colors ${
                                    kind === PROPOSAL_KIND.CANCEL_CIRCLE
                                        ? 'border-[#D548EC] bg-[#D548EC]/10 text-[#F4AEFF]'
                                        : 'border-[#333] text-[#AAA] hover:border-[#F4AEFF]/60'
                                }`}
                            >
                                <div className="font-semibold">Cancel circle</div>
                                <div className="text-[11px] text-[#707070] mt-0.5">Refund everyone from the current vault.</div>
                            </button>
                        </div>
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-[13px] lg:text-[14px] text-[#AAA]">Circle</span>
                        <select
                            value={circleId}
                            onChange={(e) => setCircleId(e.target.value)}
                            className="w-full bg-black/40 border border-[#333] focus:border-[#D548EC] rounded-[10px] px-4 py-3 text-[13px] lg:text-[14px] text-white outline-none transition-colors"
                        >
                            <option value="">Select a circle…</option>
                            {(circles ?? []).map((c) => (
                                <option key={c.id} value={c.id}>#{c.id} — {c.name}</option>
                            ))}
                        </select>
                    </label>

                    {kind === PROPOSAL_KIND.EARLY_EXIT && (
                        <>
                            <label className="flex flex-col gap-2">
                                <span className="text-[13px] lg:text-[14px] text-[#AAA]">Target member address</span>
                                <input
                                    value={target}
                                    onChange={(e) => setTarget(e.target.value)}
                                    placeholder="0x…"
                                    className="w-full bg-black/40 border border-[#333] focus:border-[#D548EC] rounded-[10px] px-4 py-3 font-mono text-[13px] lg:text-[14px] text-white outline-none"
                                />
                            </label>
                            <label className="flex flex-col gap-2">
                                <span className="text-[13px] lg:text-[14px] text-[#AAA]">
                                    Penalty reduction (%) — 0 = keep full 10% penalty, 100 = no penalty
                                </span>
                                <input
                                    type="number"
                                    value={reductionPct}
                                    onChange={(e) => setReductionPct(e.target.value)}
                                    min={0} max={100} step={1}
                                    className="w-full bg-black/40 border border-[#333] focus:border-[#D548EC] rounded-[10px] px-4 py-3 text-[13px] lg:text-[14px] text-white outline-none"
                                />
                            </label>
                        </>
                    )}

                    <label className="flex flex-col gap-2">
                        <span className="text-[13px] lg:text-[14px] text-[#AAA]">Justification (public, on-chain)</span>
                        <textarea
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            rows={3}
                            placeholder="Explain the situation so voters can judge…"
                            className="w-full bg-black/40 border border-[#333] focus:border-[#D548EC] rounded-[10px] px-4 py-3 text-[13px] lg:text-[14px] text-white outline-none resize-none"
                        />
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-[13px] lg:text-[14px] text-[#AAA]">Voting window (days)</span>
                        <input
                            type="number"
                            value={durationDays}
                            onChange={(e) => setDurationDays(e.target.value)}
                            min={1} max={7} step={1}
                            className="w-full bg-black/40 border border-[#333] focus:border-[#D548EC] rounded-[10px] px-4 py-3 text-[13px] lg:text-[14px] text-white outline-none"
                        />
                    </label>

                    {!canPropose && (
                        <div className="text-[#FFBDBD] text-[12px] bg-[#FFBDBD]/10 border border-[#FFBDBD]/30 rounded-[8px] px-3 py-2">
                            You need Silver or Gold reputation to open a proposal.
                        </div>
                    )}
                    {error && (
                        <div className="text-red-400 text-[12px] lg:text-[13px] bg-red-500/10 border border-red-500/30 rounded-[8px] px-3 py-2">
                            {error}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <TransBtn text="Cancel" action={onClose} />
                        <PurpleBtn
                            text={pending ? 'Submitting…' : 'Submit proposal'}
                            icon="rightArrow"
                            action={submit}
                            disabled={pending || !canPropose}
                        />
                    </div>
                </form>
            </div>
        </div>
    );
}
