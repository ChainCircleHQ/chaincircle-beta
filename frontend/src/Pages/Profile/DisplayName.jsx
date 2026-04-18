import React, { useEffect, useState } from 'react';
import { FaUserEdit, FaCheck, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { toast } from 'sonner';
import PurpleBtn from '../../Components/PurpleBtn';
import useIsTabletOrMobile from '../../hooks/useIsTabletOrMobile';
import {
    useMyDisplayName,
    useIsNameAvailable,
    useSetName,
} from '../../hooks/useNameRegistry';

// Debounce hook — keeps the "is this name available?" query from firing on every keystroke.
function useDebounced(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

const MIN = 1;
const MAX = 32;

export default function DisplayName() {
  const isTabletOrMobile = useIsTabletOrMobile();
    const { data: currentName } = useMyDisplayName();
    const [input, setInput] = useState('');
    const [editing, setEditing] = useState(false);
    const setName = useSetName();
    const debouncedInput = useDebounced(input, 350);
    const { data: isAvailable, isFetching: checkingAvailability } = useIsNameAvailable(debouncedInput);

    useEffect(() => {
        if (!editing) setInput(currentName || '');
    }, [currentName, editing]);

    const trimmed = input.trim();
    const tooShort = trimmed.length < MIN;
    const tooLong = trimmed.length > MAX;
    const sameAsCurrent = trimmed && trimmed === currentName;
    const canSave =
        trimmed.length >= MIN &&
        trimmed.length <= MAX &&
        !sameAsCurrent &&
        isAvailable !== false &&
        !setName.isPending;

    const submit = async () => {
        if (!canSave) return;
        try {
            await setName.mutateAsync(trimmed);
            toast.success(currentName ? 'Name updated' : 'Name registered', {
                description: `You'll show up as "${trimmed}" in circles.`,
            });
            setEditing(false);
        } catch (err) {
            toast.error('Failed to save name', { description: err.message });
        }
    };

    return (
        <div className="flex flex-col gap-6 font-dm">
            <header className="flex items-start gap-4">
                <div className="p-3 lg:p-4 rounded-full border border-[#F4AEFF]/40 bg-[#111111] flex items-center justify-center shrink-0">
                    <FaUserEdit className="text-[#D548EC]" size={isTabletOrMobile ? 22 : 28} />
                </div>
                <div className="flex flex-col gap-1">
                    <h2 className="text-[20px] lg:text-[28px] font-bold">Display name</h2>
                    <p className="text-[#707070] text-[12px] lg:text-[14px]">
                        Shown in circle rosters instead of your wallet address.
                    </p>
                </div>
            </header>

            {!editing && currentName ? (
                <div className="rounded-[12px] border border-[#333] bg-[#111111] p-4 lg:p-5 flex items-center justify-between gap-4">
                    <div className="flex flex-col min-w-0">
                        <span className="text-[#F4AEFF] text-[12px] lg:text-[13px]">Current name</span>
                        <span className="text-white text-[18px] lg:text-[22px] font-semibold truncate">
                            {currentName}
                        </span>
                    </div>
                    <button
                        onClick={() => setEditing(true)}
                        className="text-[#D548EC] hover:text-[#F4AEFF] text-[13px] lg:text-[14px] font-semibold underline underline-offset-4 shrink-0"
                    >
                        Change
                    </button>
                </div>
            ) : (
                <div className="rounded-[12px] border border-[#333] bg-[#111111] p-4 lg:p-5 flex flex-col gap-3">
                    <label className="flex flex-col gap-2">
                        <span className="text-[13px] lg:text-[14px] text-[#AAA]">
                            {currentName ? 'New name' : 'Pick a name'}
                        </span>
                        <div className="relative">
                            <input
                                autoFocus={editing}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="e.g. satoshi, nomadgirl, builder42"
                                maxLength={MAX}
                                className="w-full bg-black/40 border border-[#333] focus:border-[#D548EC] rounded-[10px] px-4 py-3 text-[14px] lg:text-[16px] text-white placeholder-[#555] outline-none transition-colors"
                            />
                            {trimmed.length >= MIN && !tooLong && !sameAsCurrent && !checkingAvailability && (
                                <span
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] lg:text-[12px] ${
                                        isAvailable ? 'text-green-400' : 'text-red-400'
                                    }`}
                                >
                                    {isAvailable ? <FaCheck size={10} /> : <FaTimes size={10} />}
                                    {isAvailable ? 'available' : 'taken'}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] lg:text-[12px] text-[#707070]">
                            <span>{trimmed.length}/{MAX}</span>
                            {sameAsCurrent && <span>same as your current name</span>}
                            {tooShort && !sameAsCurrent && <span className="text-red-400">at least 1 character</span>}
                            {tooLong && <span className="text-red-400">max 32 characters</span>}
                        </div>
                    </label>

                    <div className="flex items-center justify-end gap-2 pt-1">
                        {editing && currentName && (
                            <button
                                onClick={() => { setEditing(false); setInput(currentName || ''); }}
                                className="px-4 py-2 rounded-full border border-[#333] text-[#AAA] text-[13px] lg:text-[14px] hover:border-[#F4AEFF]/60"
                            >
                                Cancel
                            </button>
                        )}
                        <PurpleBtn
                            text={setName.isPending ? 'Saving…' : currentName ? 'Save changes' : 'Register name'}
                            icon={setName.isPending ? null : 'rightArrow'}
                            action={submit}
                            disabled={!canSave}
                        />
                    </div>
                </div>
            )}

            <div className="rounded-[12px] border border-[#333] bg-[#111111] p-4 flex gap-3 text-[12px] lg:text-[13px]">
                <FaInfoCircle className="text-[#D548EC] mt-0.5 shrink-0" size={14} />
                <div className="text-[#AAA] leading-relaxed">
                    Names are stored on-chain via the Name Registry contract. They're
                    free, 1–32 characters, and globally unique. Updating your name
                    requires a signature but no gas token on Push Chain.
                </div>
            </div>
        </div>
    );
}
