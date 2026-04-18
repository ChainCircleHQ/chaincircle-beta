// Tiny module-level pub/sub for Push Chain SDK progressHook events.
// sendUniversalTx emits to the bus; <TxProgressBanner/> subscribes.
// No Redux/Zustand needed — one shared state, a handful of listeners.

let current = null; // { stage, message, chain, txHash } | null
const listeners = new Set();

function emit() {
    for (const fn of listeners) {
        try { fn(current); } catch { /* ignore listener errors */ }
    }
}

export function setProgress(next) {
    current = next;
    emit();
}

export function clearProgress() {
    if (current === null) return;
    current = null;
    emit();
}

export function getProgress() {
    return current;
}

export function subscribe(fn) {
    listeners.add(fn);
    // Prime new subscribers with current state so late-mounters see in-flight work.
    try { fn(current); } catch { /* ignore */ }
    return () => { listeners.delete(fn); };
}

// Best-effort mapping of raw Push SDK progress event → friendly stage.
// The SDK's exact ProgressEvent shape varies by version; we handle common fields.
export function normalizeEvent(event) {
    if (!event) return null;
    const name = String(event.name || event.type || event.stage || '').toLowerCase();
    const description = event.description || event.message || event.detail || '';
    const txHash = event.txHash || event.hash || event.transactionHash || null;

    let stage = 'working';
    let message = description || 'Working…';
    if (name.includes('sign')) { stage = 'signing'; message = 'Waiting for your signature…'; }
    else if (name.includes('submit') || name.includes('relay')) { stage = 'submitting'; message = 'Submitting to Push Chain…'; }
    else if (name.includes('confirm') || name.includes('wait')) { stage = 'confirming'; message = 'Waiting for confirmations…'; }
    else if (name.includes('track')) { stage = 'tracking'; message = 'Tracking on-chain…'; }
    else if (name.includes('success') || name.includes('complete') || name.includes('finaliz')) { stage = 'confirmed'; message = 'Confirmed'; }
    else if (name.includes('error') || name.includes('fail')) { stage = 'failed'; message = description || 'Failed'; }

    return { stage, message, txHash };
}
