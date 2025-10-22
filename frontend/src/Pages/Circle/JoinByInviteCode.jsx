import React, { useState } from 'react';
import { useCircleByInviteCode } from '../../hooks/useCircleData';
import { useJoinCircle } from '../../hooks/useCircleActions';
import { getGoalIcon, getGoalColors } from '../../utils/circleHelpers';
import formatCurrency from '../../utils/formatCurrency';
import PurpleBtn from '../../Components/PurpleBtn';
import { IoClose } from "react-icons/io5";

export default function JoinByInviteCode({ onClose }) {
  const [inviteCode, setInviteCode] = useState('');
  const [searchTriggered, setSearchTriggered] = useState(false);
  const { data: circle, isLoading, error } = useCircleByInviteCode(searchTriggered ? inviteCode : null);
  const joinCircle = useJoinCircle();

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
      alert(`Successfully joined circle: ${circle.name}!`);
      onClose();
    } catch (error) {
      console.error('Failed to join circle:', error);
      alert(`Failed to join circle: ${error.message || 'Please try again.'}`);
    }
  };

  const IconComponent = circle ? getGoalIcon(circle.goalType) : null;
  const colors = circle ? getGoalColors(circle.goalType) : {};
  const isTabletOrMobile = window.innerWidth <= 1014;

  return (
    <div className="fixed inset-0 z-[110] bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#F4AEFF] rounded-[24px] max-w-md w-full p-8 relative">
        <IoClose
          onClick={onClose}
          className="absolute top-4 right-4 cursor-pointer hover:scale-110 transition-all"
          size={24}
        />

        <h2 className="text-[28px] font-bold mb-6">Join by Invite Code</h2>

        <form onSubmit={handleSearch} className="space-y-6">
          <div>
            <label className="block text-sm text-[#AAAAAA] mb-2">
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
              className="w-full px-4 py-3 bg-[#222] border border-[#F4AEFF] rounded-lg outline-none text-sm font-mono"
            />
            <p className="text-xs text-[#AAAAAA] mt-1">
              Paste the invite code shared by the circle creator
            </p>
          </div>

          <button
            type="submit"
            disabled={inviteCode.length < 20 || isLoading}
            className="w-full px-6 py-3 bg-[#D548EC] rounded-full hover:bg-[#B83CC3] transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Searching...' : 'Search Circle'}
          </button>
        </form>

        {/* Circle Found */}
        {circle && (
          <div className="mt-6 p-4 border border-green-500 rounded-lg bg-green-500/10">
            <p className="text-green-400 text-sm mb-4">✓ Circle Found!</p>

            <div className="flex items-center gap-3 mb-4">
              {IconComponent && (
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${colors.bg} ${colors.text}`}>
                  <IconComponent size={24} />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg">{circle.name}</h3>
                <p className="text-sm text-[#AAAAAA]">
                  {circle.members || 0}/{circle.maxMembers} members
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
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

            <button
              onClick={handleJoin}
              disabled={joinCircle.isPending}
              className="w-full px-6 py-3 bg-[#D548EC] rounded-full hover:bg-[#B83CC3] transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joinCircle.isPending ? "Joining..." : "Join Circle"}
            </button>
          </div>
        )}

        {/* No Circle Found */}
        {searchTriggered && !isLoading && !circle && !error && (
          <div className="mt-6 p-4 border border-red-500 rounded-lg bg-red-500/10">
            <p className="text-red-400 text-sm">
              ✗ No circle found with this invite code
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 border border-red-500 rounded-lg bg-red-500/10">
            <p className="text-red-400 text-sm">
              ✗ Error searching for circle
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
