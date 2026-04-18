// Reactive viewport hook replacing `const isTabletOrMobile = window.innerWidth <= 1014`
// scattered across the codebase. The old pattern read once at module load and
// never updated — resizing the window or rotating a device was invisible to
// the UI. This hook is stateful, subscribed via resize, and replaces the
// stale constant everywhere it gets plumbed.

import { useEffect, useState } from 'react';

const BREAKPOINT = 1014;

function isMobile() {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= BREAKPOINT;
}

export function useIsTabletOrMobile() {
    const [mobile, setMobile] = useState(isMobile);
    useEffect(() => {
        const handle = () => setMobile(isMobile());
        window.addEventListener('resize', handle);
        window.addEventListener('orientationchange', handle);
        return () => {
            window.removeEventListener('resize', handle);
            window.removeEventListener('orientationchange', handle);
        };
    }, []);
    return mobile;
}

export default useIsTabletOrMobile;
