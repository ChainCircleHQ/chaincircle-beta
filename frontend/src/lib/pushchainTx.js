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

// Error-message patterns the SDK emits that mean "tx probably landed, keep
// polling" rather than "tx definitely failed." trackTransaction(hash) can
// recover from all of these by asking Push Chain's gateway directly.
const RETRYABLE_SUBSTRINGS = [
    'not confirmed with',                    // tx.wait() timeout
    'failed to retrieve push chain',         // gateway indexer lag (v5+)
    'transaction may have failed',           // gateway uncertainty
    'not been indexed yet',                  // indexer behind
    'gateway tx',                            // any gateway-scoped failure
];

function isRetryableError(err) {
    const msg = (err?.message || err?.shortMessage || '').toLowerCase();
    return RETRYABLE_SUBSTRINGS.some((s) => msg.includes(s));
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
        // If the error is a retryable gateway-lag case AND carries a tx hash
        // somewhere in the message, we can still track it. Otherwise it's a
        // hard failure (user rejected, insufficient funds, revert).
        const hashMatch = (err?.message || '').match(/0x[0-9a-fA-F]{64,130}/);
        if (isRetryableError(err) && hashMatch) {
            const maybeHash = hashMatch[0];
            setProgress({ stage: 'tracking', message: label ? `${label}: tracking…` : 'Tracking on-chain…', txHash: maybeHash });
            const tracked = await tryTrack(pushChainClient, maybeHash, options, progressHook);
            if (tracked) {
                setProgress({ stage: 'confirmed', message: label ? `${label}: confirmed` : 'Confirmed', txHash: maybeHash });
                setTimeout(() => { clearProgress(); }, 2500);
                return { status: 'confirmed', tx: tracked, receipt: tracked };
            }
            setProgress({ stage: 'failed', message: label ? `${label}: still pending` : 'Still pending — check later', txHash: maybeHash });
            setTimeout(() => { clearProgress(); }, 4000);
            return { status: 'pending', tx: null, hash: maybeHash };
        }
        clearProgress();
        throw err;
    }

    const hash = tx?.hash || tx?.transactionHash;
    setProgress({ stage: 'confirming', message: label ? `${label}: confirming…` : 'Waiting for confirmations…', txHash: hash });

    try {
        const receipt = await tx.wait();
        setProgress({ stage: 'confirmed', message: label ? `${label}: confirmed` : 'Confirmed', txHash: hash });
        setTimeout(() => { clearProgress(); }, 2500);
        return { status: 'confirmed', tx, receipt };
    } catch (err) {
        if (!isRetryableError(err)) {
            setProgress({ stage: 'failed', message: label ? `${label}: failed` : 'Failed', txHash: hash });
            setTimeout(() => { clearProgress(); }, 4000);
            throw err;
        }

        if (!hash) {
            clearProgress();
            return { status: 'pending', tx, hash: null };
        }

        setProgress({ stage: 'tracking', message: label ? `${label}: tracking…` : 'Tracking on-chain…', txHash: hash });
        const tracked = await tryTrack(pushChainClient, hash, options, progressHook);
        if (tracked) {
            setProgress({ stage: 'confirmed', message: label ? `${label}: confirmed` : 'Confirmed', txHash: hash });
            setTimeout(() => { clearProgress(); }, 2500);
            return { status: 'confirmed', tx: tracked, receipt: tracked };
        }
        setProgress({ stage: 'failed', message: label ? `${label}: still pending` : 'Still pending — check later', txHash: hash });
        setTimeout(() => { clearProgress(); }, 4000);
        return { status: 'pending', tx, hash };
    }
}

// trackTransaction with a generous timeout. Returns the tracked response on
// success, or null if it too errors / times out — caller treats null as
// "pending, not definitively failed."
async function tryTrack(pushChainClient, hash, options, progressHook) {
    try {
        return await pushChainClient.universal.trackTransaction(hash, {
            waitForCompletion: true,
            advanced: { pollingIntervalMs: 3_000, timeout: 240_000, ...(options.trackAdvanced || {}) },
            progressHook,
        });
    } catch (trackErr) {
        // Revert-type errors re-throw; retryable-looking errors = still pending.
        if (!isRetryableError(trackErr)) throw trackErr;
        return null;
    }
}
