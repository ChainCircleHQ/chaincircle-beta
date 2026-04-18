// Wrapper around pushChainClient.universal.sendTransaction that survives
// the 120s "not confirmed with N ms" timeout by falling back to
// trackTransaction(hash). The tx may have actually landed on Push Chain
// even if the origin chain (often Solana) didn't return confirmations fast
// enough — trackTransaction polls Push Chain directly.
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

const TIMEOUT_SUBSTR = 'not confirmed with';

function isTimeoutError(err) {
    return typeof err?.message === 'string' && err.message.toLowerCase().includes(TIMEOUT_SUBSTR);
}

export async function sendUniversalTx(pushChainClient, txParams, options = {}) {
    if (!pushChainClient?.universal?.sendTransaction) {
        throw new Error('Push Chain universal client not available');
    }

    const tx = await pushChainClient.universal.sendTransaction({
        ...txParams,
        ...(options.progressHook ? { progressHook: options.progressHook } : {}),
    });

    try {
        const receipt = await tx.wait();
        return { status: 'confirmed', tx, receipt };
    } catch (err) {
        if (!isTimeoutError(err)) throw err;

        // Origin-chain confirmations slow; fall back to tracking by hash.
        const hash = tx?.hash || tx?.transactionHash;
        if (!hash) return { status: 'pending', tx, hash: null };

        try {
            const tracked = await pushChainClient.universal.trackTransaction(hash, {
                waitForCompletion: true,
                advanced: {
                    pollingIntervalMs: 3_000,
                    timeout: 180_000,
                    ...(options.trackAdvanced || {}),
                },
                ...(options.progressHook ? { progressHook: options.progressHook } : {}),
            });
            return { status: 'confirmed', tx: tracked, receipt: tracked };
        } catch (trackErr) {
            if (isTimeoutError(trackErr)) {
                return { status: 'pending', tx, hash };
            }
            // trackTransaction reported a definitive failure (reverted on-chain).
            throw trackErr;
        }
    }
}
