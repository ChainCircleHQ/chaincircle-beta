// Wrapper around pushChainClient.universal.sendTransaction that:
//   1. Emits lifecycle events to txProgressBus so <TxProgressBanner/> can
//      render Signing → Submitted → Confirming → Confirmed across the app
//      without every caller managing its own toast.
//   2. Survives the 120s "not confirmed with N ms" timeout by falling back
//      to trackTransaction(hash). The tx may have landed on Push Chain
//      even if the origin chain (often Solana) didn't return confirmations
//      fast enough — trackTransaction polls Push Chain directly.
//
// Returns:
//   { status: 'confirmed', tx, receipt? }   — wait succeeded
//   { status: 'confirmed', tx, receipt? }   — initial wait timed out but
//                                              trackTransaction resolved
//   { status: 'pending',   tx, hash }        — both timed out; caller UI
//                                              should show "still pending,
//                                              refresh to check"
//
// On any other kind of error (user rejection, insufficient funds, revert)
// the error is re-thrown unchanged so callers can classify it.

import { setProgress, clearProgress, normalizeEvent } from './txProgressBus';

const TIMEOUT_SUBSTR = 'not confirmed with';

function isTimeoutError(err) {
    return typeof err?.message === 'string' && err.message.toLowerCase().includes(TIMEOUT_SUBSTR);
}

function buildProgressHook(label, userHook) {
    return (event) => {
        const normalized = normalizeEvent(event);
        if (normalized) setProgress({ ...normalized, message: label ? `${label}: ${normalized.message}` : normalized.message });
        if (userHook) userHook(event);
    };
}

export async function sendUniversalTx(pushChainClient, txParams, options = {}) {
    if (!pushChainClient?.universal?.sendTransaction) {
        throw new Error('Push Chain universal client not available');
    }

    const label = options.label || null;
    const progressHook = buildProgressHook(label, options.progressHook);

    // Fire an initial "signing" state so the banner appears the moment the
    // wallet modal opens, not only after the first SDK-emitted event.
    setProgress({ stage: 'signing', message: label ? `${label}: waiting for signature…` : 'Waiting for your signature…' });

    let tx;
    try {
        tx = await pushChainClient.universal.sendTransaction({ ...txParams, progressHook });
    } catch (err) {
        // User rejection / insufficient funds — clear banner and re-throw.
        clearProgress();
        throw err;
    }

    const hash = tx?.hash || tx?.transactionHash;
    setProgress({ stage: 'confirming', message: label ? `${label}: confirming…` : 'Waiting for confirmations…', txHash: hash });

    try {
        const receipt = await tx.wait();
        setProgress({ stage: 'confirmed', message: label ? `${label}: confirmed` : 'Confirmed', txHash: hash });
        // Auto-clear after a moment so the banner fades out on success.
        setTimeout(() => { clearProgress(); }, 2500);
        return { status: 'confirmed', tx, receipt };
    } catch (err) {
        if (!isTimeoutError(err)) {
            setProgress({ stage: 'failed', message: label ? `${label}: failed` : 'Failed', txHash: hash });
            setTimeout(() => { clearProgress(); }, 4000);
            throw err;
        }

        if (!hash) {
            clearProgress();
            return { status: 'pending', tx, hash: null };
        }

        // Origin-chain confirmations slow; fall back to tracking by hash.
        setProgress({ stage: 'tracking', message: label ? `${label}: tracking…` : 'Tracking on-chain…', txHash: hash });
        try {
            const tracked = await pushChainClient.universal.trackTransaction(hash, {
                waitForCompletion: true,
                advanced: { pollingIntervalMs: 3_000, timeout: 180_000, ...(options.trackAdvanced || {}) },
                progressHook,
            });
            setProgress({ stage: 'confirmed', message: label ? `${label}: confirmed` : 'Confirmed', txHash: hash });
            setTimeout(() => { clearProgress(); }, 2500);
            return { status: 'confirmed', tx: tracked, receipt: tracked };
        } catch (trackErr) {
            if (isTimeoutError(trackErr)) {
                setProgress({ stage: 'failed', message: label ? `${label}: still pending` : 'Still pending — check later', txHash: hash });
                setTimeout(() => { clearProgress(); }, 4000);
                return { status: 'pending', tx, hash };
            }
            setProgress({ stage: 'failed', message: label ? `${label}: reverted` : 'Transaction reverted', txHash: hash });
            setTimeout(() => { clearProgress(); }, 4000);
            throw trackErr;
        }
    }
}
