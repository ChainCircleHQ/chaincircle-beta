import React from 'react';
import { Link } from 'react-router';
import { FaRegClock, FaChevronRight } from 'react-icons/fa';
import { useNotifications } from '../../hooks/useNotifications';

function formatDue(seconds) {
    if (seconds < 3600) return 'due in under an hour';
    const hours = Math.floor(seconds / 3600);
    if (hours < 24) return `due in ${hours}h`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'due tomorrow' : `due in ${days}d`;
}

// Top-of-dashboard banner — only renders if there's at least one contribution
// due in the next 7 days. The reminder data comes from useNotifications
// (on-chain, since Supabase doesn't yet know "when is the next round due").
export default function RemindersBanner() {
    const { data } = useNotifications();
    const reminders = data?.reminders ?? [];
    if (!reminders.length) return null;

    const top = reminders.slice(0, 3);
    const more = reminders.length - top.length;

    return (
        <div className="rounded-[16px] border border-[#FDA318]/40 bg-gradient-to-r from-[#FDA318]/15 via-[#D548EC]/10 to-transparent p-4 lg:p-5 flex flex-col gap-3 font-dm">
            <div className="flex items-center gap-2 text-[14px] lg:text-[16px] font-semibold">
                <FaRegClock className="text-[#FDA318]" />
                <span>Upcoming contributions</span>
            </div>
            <ul className="flex flex-col gap-2">
                {top.map((r) => (
                    <li
                        key={r.id}
                        className="flex items-center justify-between rounded-[10px] border border-[#333] bg-black/30 px-3 lg:px-4 py-2.5 text-[12px] lg:text-[14px]"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-[#F4AEFF]">#{r.circleId}</span>
                            <span className="truncate text-[#AAA]">
                                ${r.amount} CUSD · {formatDue(r.timeUntilDue)}
                            </span>
                        </div>
                        <Link
                            to={`/chain/circle/${r.circleId}`}
                            className="flex items-center gap-1 text-[#D548EC] hover:text-[#F4AEFF] shrink-0"
                        >
                            View <FaChevronRight size={10} />
                        </Link>
                    </li>
                ))}
            </ul>
            {more > 0 && (
                <Link
                    to="/chain/notification"
                    className="self-start text-[12px] lg:text-[13px] text-[#D548EC] hover:text-[#F4AEFF] underline underline-offset-4"
                >
                    + {more} more
                </Link>
            )}
        </div>
    );
}
