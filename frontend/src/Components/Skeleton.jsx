// Brand-themed skeleton placeholders. Use while waiting on async data.
// <Skeleton /> is a single block. <SkeletonRow /> + <SkeletonCard /> are
// common list/grid shapes.

import React from 'react';

const BASE =
    "bg-gradient-to-r from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] " +
    "bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]";

export function Skeleton({ className = '', as: As = 'div', ...rest }) {
    return <As className={`${BASE} rounded-[8px] ${className}`} aria-hidden="true" {...rest} />;
}

export function SkeletonRow({ className = '' }) {
    return (
        <div className={`rounded-[12px] border border-[#333] bg-[#111111] p-3 lg:p-4 flex items-center gap-3 ${className}`} aria-hidden="true">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-2 min-w-0">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="w-14 h-5 shrink-0" />
        </div>
    );
}

export function SkeletonCard({ className = '' }) {
    return (
        <div className={`rounded-[12px] border border-[#333] bg-[#111111] p-4 flex flex-col gap-3 ${className}`} aria-hidden="true">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 flex flex-col gap-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
        </div>
    );
}

export default Skeleton;
