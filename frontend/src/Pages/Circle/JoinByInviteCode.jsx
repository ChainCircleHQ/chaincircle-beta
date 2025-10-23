import React, { useState } from 'react';
import { useCircleByInviteCode } from '../../hooks/useCircleData';
import { useJoinCircle } from '../../hooks/useCircleActions';
import { useCircleContract } from '../../hooks/useCircleContract';
import { getGoalIcon, getGoalColors } from '../../utils/circleHelpers';
import formatCurrency from '../../utils/formatCurrency';
import PurpleBtn from '../../Components/PurpleBtn';
import { IoClose } from "react-icons/io5";

export default function JoinByInviteCode({ onClose }) {
  const [inviteCode, setInviteCode] = useState('');
  const [searchTriggered, setSearchTriggered] = useState(false);
  const { data: circle, isLoading, error } = useCircleByInviteCode(searchTriggered ? inviteCode : null);
  const joinCircle = useJoinCircle();
  const { userAddress } = useCircleContract();

  const handleSearch = (e) => {
    e.preventDefault();
    if (inviteCode.length > 20) {
      setSearchTriggered(true);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!circle) return;

    try {
      await joinCircle.mutateAsync(circle.id);
      onClose();
    } catch (error) {
      console.error('Failed to join circle:', error);
    }
  };

  const IconComponent = circle ? getGoalIcon(circle.goalType) : null;
  const colors = circle ? getGoalColors(circle.goalType) : {};
  const isTabletOrMobile = window.innerWidth <= 1014;

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#F4AEFF] rounded-[24px] max-w-md lg:max-w-2xl w-full p-6 lg:p-10 relative">
        <IoClose
          onClick={onClose}
          className="absolute top-4 right-4 cursor-pointer hover:scale-110 transition-all"
          size={isTabletOrMobile ? 24 : 32}
        />

        <h2 className="text-2xl lg:text-4xl font-bold mb-6 lg:mb-8">Join by Invite Code</h2>

        <form onSubmit={handleSearch} className="space-y-6 lg:space-y-8">
          <div>
            <label className="block text-sm lg:text-xl text-[#AAAAAA] mb-2 lg:mb-3">
              Enter Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value);
                setSearchTriggered(false); // Reset search when typing
              }}
              placeholder="ab2532341da33ed9d093ed90f00f8183..."
              className="w-full px-4 lg:px-6 py-3 lg:py-4 bg-[#222] border border-[#F4AEFF] rounded-lg outline-none text-sm lg:text-lg font-mono"
            />
            <p className="text-xs lg:text-base text-[#AAAAAA] mt-1 lg:mt-2">
              Paste the invite code shared by the circle creator
            </p>
          </div>

          <button
            type="submit"
            disabled={inviteCode.length < 20 || isLoading}
            className="w-full px-6 lg:px-8 py-3 lg:py-4 bg-[#D548EC] rounded-full hover:bg-[#B83CC3] transition-all font-bold text-base lg:text-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Searching...' : 'Search Circle'}
          </button>
        </form>

        {/* Circle Found */}
        {circle && (() => {
          const isCreator = circle.creator?.toLowerCase() === userAddress?.toLowerCase();
          const isMember = circle.memberAddresses?.some(
            addr => addr?.toLowerCase() === userAddress?.toLowerCase()
          ) || false;
          const isFull = circle.members >= circle.maxMembers;
          const isCompleted = circle.status === 2;
          const canJoin = !isCreator && !isMember && !isFull && !isCompleted;

          return (
          <div className="mt-6 lg:mt-8 p-4 lg:p-6 border border-green-500 rounded-lg bg-green-500/10">
            <p className="text-green-400 text-sm lg:text-xl mb-4 lg:mb-6 font-semibold">✓ Circle Found!</p>

            <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6">
              {IconComponent && (
                <div className={`w-16 h-16 lg:w-24 lg:h-24 rounded-full flex items-center justify-center ${colors.bg} ${colors.text}`}>
                  <IconComponent size={isTabletOrMobile ? 24 : 40} />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg lg:text-3xl">{circle.name}</h3>
                <p className="text-sm lg:text-lg text-[#AAAAAA]">
                  {circle.members || 0}/{circle.maxMembers} members
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:gap-4 text-sm lg:text-lg mb-4 lg:mb-6">
              <div>
                <p className="text-[#AAAAAA]">Amount</p>
                <p className="font-semibold">{formatCurrency(circle.amount)}</p>
              </div>
              <div>
                <p className="text-[#AAAAAA]">Duration</p>
                <p className="font-semibold">{circle.duration} months</p>
              </div>
              <div>
                <p className="text-[#AAAAAA]">Status</p>
                <p className={`font-semibold ${circle.isActive ? 'text-green-400' : 'text-red-400'}`}>
                  {circle.isActive ? 'Active' : 'Inactive'} ({circle.status})
                </p>
              </div>
              <div>
                <p className="text-[#AAAAAA]">Round</p>
                <p className="font-semibold">{circle.currentRound}/{circle.duration}</p>
              </div>
            </div>

            {/* Warning for full or completed circles */}
            {!canJoin && (
              <div className="mb-4 p-3 lg:p-4 border border-yellow-500 rounded-lg bg-yellow-500/10">
                <p className="text-yellow-400 text-sm lg:text-lg">
                  {isCreator
                    ? "⚠ You created this circle."
                    : isMember
                    ? "⚠ You are already a member of this circle."
                    : isFull
                    ? "⚠ This circle is full and cannot accept new members."
                    : isCompleted
                    ? "⚠ This circle has been completed."
                    : "⚠ Cannot join this circle."}
                </p>
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={joinCircle.isPending || !canJoin}
              className="w-full px-6 lg:px-8 py-3 lg:py-4 bg-[#D548EC] rounded-full hover:bg-[#B83CC3] transition-all font-bold text-base lg:text-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joinCircle.isPending ? "Joining..." : (canJoin ? "Join Circle" : "Cannot Join")}
            </button>
          </div>
          );
        })()}

        {/* No Circle Found */}
        {searchTriggered && !isLoading && !circle && !error && (
          <div className="mt-6 lg:mt-8 p-4 lg:p-6 border border-red-500 rounded-lg bg-red-500/10">
            <p className="text-red-400 text-sm lg:text-lg">
              ✗ No circle found with this invite code
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 lg:mt-8 p-4 lg:p-6 border border-red-500 rounded-lg bg-red-500/10">
            <p className="text-red-400 text-sm lg:text-lg">
              ✗ Error searching for circle
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
