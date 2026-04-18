// App-wide error boundary so a thrown render error in any route doesn't
// blank the whole page. Logs to console + shows a branded fallback with
// a reset affordance. Wraps the <Routes> tree in App.jsx.

import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        // eslint-disable-next-line no-console
        console.error('ErrorBoundary caught:', error, info?.componentStack);
    }

    reset = () => this.setState({ error: null });

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div className="min-h-screen bg-black text-white font-dm flex items-center justify-center p-6">
                <div className="max-w-lg w-full rounded-[16px] border border-[#F4AEFF]/40 bg-[#111111] p-6 lg:p-8 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#D548EC]/20 flex items-center justify-center shrink-0">
                            <FaExclamationTriangle className="text-[#F4AEFF]" size={22} />
                        </div>
                        <div>
                            <h2 className="text-[20px] lg:text-[24px] font-bold">Something broke</h2>
                            <p className="text-[#707070] text-[12px] lg:text-[13px]">
                                An unexpected error crashed this page. Refresh to try again.
                            </p>
                        </div>
                    </div>
                    <details className="bg-black/40 border border-[#333] rounded-[10px] p-3 text-[11px] lg:text-[12px] font-mono text-[#AAA] max-h-40 overflow-auto">
                        <summary className="cursor-pointer text-[#D548EC] text-[12px] lg:text-[13px] select-none">
                            Error details
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap break-all">
                            {String(this.state.error?.message || this.state.error)}
                        </pre>
                    </details>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={this.reset}
                            className="px-5 py-2.5 rounded-full bg-[#D548EC] hover:bg-[#B83CC3] text-white text-[13px] lg:text-[14px] font-semibold transition-colors"
                        >
                            Try again
                        </button>
                        <button
                            onClick={() => { window.location.href = '/'; }}
                            className="px-5 py-2.5 rounded-full border border-[#333] hover:border-[#F4AEFF]/60 text-[#AAA] text-[13px] lg:text-[14px] transition-colors"
                        >
                            Back to home
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
