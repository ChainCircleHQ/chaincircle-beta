import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { useCircleDetails } from '../../hooks/useCircleData';
import { useJoinCircle } from '../../hooks/useCircleActions';
import { useCircleContract } from '../../hooks/useCircleContract';
import { getGoalIcon, getGoalColors, formatFrequency, calculateProgress } from '../../utils/circleHelpers';
import formatCurrency from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import PurpleBtn from '../../Components/PurpleBtn';
import { IoClose } from "react-icons/io5";
import { FaCopy } from "react-icons/fa";

export default function CirclePreview({ circleId, onClose, fromLink = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: circle, isLoading, error } = useCircleDetails(circleId);
  const { userAddress } = useCircleContract();
  const joinCircle = useJoinCircle();

  const isCreator = circle?.creator?.toLowerCase() === userAddress?.toLowerCase();

  const handleJoin = async () => {
    try {
      await joinCircle.mutateAsync(circleId);
      alert('Successfully joined circle!');
      if (onClose) onClose();
      navigate('/chain/circle');
    } catch (error) {
      console.error('Failed to join circle:', error);
      alert('Failed to join circle. Please try again.');
    }
  };

  const handleShare = () => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/chain/circle/${circleId}?preview=true`;

    if (navigator.share) {
      navigator.share({
        title: circle.name,
        text: `Join my savings circle: ${circle.name}`,
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Circle link copied to clipboard!');
    }
  };

  const copyInviteCode = () => {
    if (circle?.inviteCode) {
      navigator.clipboard.writeText(circle.inviteCode);
      alert('Invite code copied to clipboard!');
    }
  };

  const copyCreatorAddress = () => {
    if (circle?.creator) {
      navigator.clipboard.writeText(circle.creator);
      alert('Creator address copied to clipboard!');
    }
  };

  // Show error only if there's an actual error, not just loading
  if (error) {
    console.error('Circle preview error details:', error);
    return (
      <div className="fixed inset-0 z-90 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-[#111111] border border-[#F4AEFF] rounded-[24px] p-8 max-w-md">
          <div className="flex flex-col items-center gap-4">
            <p className="text-red-500 text-xl font-bold">Circle not found</p>
            <p className="text-[#AAAAAA] text-sm text-center">
              Circle ID: {circleId}
            </p>
            <p className="text-[#AAAAAA] text-xs text-center font-mono">
              {error?.message || 'Unknown error'}
            </p>
            <button
              onClick={onClose || (() => navigate('/chain/circle'))}
              className="mt-4 px-6 py-2 bg-[#D548EC] rounded-full hover:bg-[#B83CC3] transition-all"
            >
              {onClose ? 'Close' : 'Go back to Circles'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show minimal loading state if no data yet
  if (!circle) {
    return (
      <div className="fixed inset-0 z-90 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-[#111111] border border-[#F4AEFF] rounded-[24px] p-8">
          <p className="text-[#AAAAAA]">Loading circle details...</p>
        </div>
      </div>
    );
  }

  const IconComponent = getGoalIcon(circle.goalType || 0);
  const colors = getGoalColors(circle.goalType || 0);
  const isTabletOrMobile = window.innerWidth <= 1014;

  return (
    <div className="fixed inset-0 z-90 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#F4AEFF] rounded-[24px] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative">
        {onClose && (
          <IoClose
            onClick={onClose}
            className="absolute top-4 right-4 cursor-pointer hover:scale-110 transition-all"
            size={24}
          />
        )}

        <div className="flex flex-col gap-6">
          {/* Circle Icon and Name */}
          <div className="flex items-center gap-4 lg:gap-6">
            <div className={`w-[80px] h-[80px] lg:w-[120px] lg:h-[120px] rounded-full flex items-center justify-center ${colors.bg} ${colors.text}`}>
              <IconComponent size={isTabletOrMobile ? 33 : 55} />
            </div>
            <div className="flex-1">
              <h2 className="text-[24px] lg:text-[38px] font-bold">{circle.name}</h2>
              <p className="text-[14px] lg:text-[18px] text-[#AAAAAA]">{circle.members || 0}/{circle.maxMembers} members</p>
              {isCreator && (
                <span className="inline-block mt-1 px-3 py-1 bg-[#D548EC] text-xs lg:text-sm rounded-full">
                  Your Circle
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full">
            <div className="flex justify-between mb-2">
              <span className="text-sm lg:text-lg text-[#AAAAAA]">Progress</span>
              <span className="text-sm lg:text-lg text-primary">{circle.progress}%</span>
            </div>
            <div className="w-full h-3 lg:h-4 bg-[#333] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#D548EC] to-[#F4AEFF] transition-all duration-300"
                style={{ width: `${circle.progress}%` }}
              />
            </div>
          </div>

          {/* Circle Details - Grid 1 */}
          <div className="grid grid-cols-2 gap-4 lg:gap-6 font-dm">
            <div>
              <p className="text-[#AAAAAA] text-sm lg:text-base">Contribution Amount</p>
              <p className="text-lg lg:text-2xl font-bold">{formatCurrency(circle.amount)}</p>
            </div>
            <div>
              <p className="text-[#AAAAAA] text-sm lg:text-base">Duration</p>
              <p className="text-lg lg:text-2xl font-bold">{circle.duration} months</p>
            </div>
            <div>
              <p className="text-[#AAAAAA] text-sm lg:text-base">Frequency</p>
              <p className="text-lg lg:text-2xl font-bold">{formatFrequency(circle.frequency)}</p>
            </div>
            <div>
              <p className="text-[#AAAAAA] text-sm lg:text-base">Total Pool</p>
              <p className="text-lg lg:text-2xl font-bold">{formatCurrency(circle.vaultBalance)}</p>
            </div>
          </div>

          {/* Additional Details - Grid 2 */}
          <div className="grid grid-cols-2 gap-4 lg:gap-6 font-dm">
            <div>
              <p className="text-[#AAAAAA] text-sm lg:text-base">Current Round</p>
              <p className="text-base lg:text-xl font-semibold">{circle.currentRound}/{circle.duration}</p>
            </div>
            <div>
              <p className="text-[#AAAAAA] text-sm lg:text-base">Status</p>
              <p className={`text-base lg:text-xl font-semibold ${circle.isActive ? 'text-green-400' : 'text-red-400'}`}>
                {circle.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div>
              <p className="text-[#AAAAAA] text-sm lg:text-base">Created</p>
              <p className="text-base lg:text-xl font-semibold">{formatDate(circle.createdAt)}</p>
            </div>
            <div>
              <p className="text-[#AAAAAA] text-sm lg:text-base">Started</p>
              <p className="text-base lg:text-xl font-semibold">
                {circle.startAt > 0 ? formatDate(circle.startAt) : 'Not started'}
              </p>
            </div>
          </div>

          {/* Creator & Invite Code */}
          <div className="border-t border-[#333] pt-4 space-y-3 lg:space-y-4">
            <div>
              <p className="text-[#AAAAAA] text-sm lg:text-base mb-1">Creator Address</p>
              <div className="flex items-center gap-2">
                <p className="text-xs lg:text-sm font-mono bg-[#222] px-3 py-2 rounded flex-1 truncate">
                  {circle.creator}
                </p>
                <button
                  onClick={copyCreatorAddress}
                  className="p-2 hover:bg-[#333] rounded transition-all"
                  title="Copy creator address"
                >
                  <FaCopy size={isTabletOrMobile ? 16 : 20} />
                </button>
              </div>
            </div>

            {circle.inviteCode && (
              <div>
                <p className="text-[#AAAAAA] text-sm lg:text-base mb-1">Invite Code</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm lg:text-base font-mono bg-[#222] px-3 py-2 rounded flex-1 break-all">
                    {circle.inviteCode}
                  </p>
                  <button
                    onClick={copyInviteCode}
                    className="p-2 hover:bg-[#333] rounded transition-all"
                    title="Copy invite code"
                  >
                    <FaCopy size={isTabletOrMobile ? 16 : 20} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!isCreator && (
            <div className="flex gap-4 mt-4">
              <div className="flex-1" onClick={handleJoin}>
                <PurpleBtn
                  text={joinCircle.isPending ? "Joining..." : "Join Circle"}
                  font="bold"
                  disabled={joinCircle.isPending || !circle.isActive}
                />
              </div>
              <button
                onClick={handleShare}
                className="px-6 py-3 border border-[#F4AEFF] rounded-full hover:bg-[#F4AEFF]/10 transition-all"
              >
                Share
              </button>
            </div>
          )}

          {isCreator && (
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleShare}
                className="flex-1 px-6 py-3 bg-[#D548EC] rounded-full hover:bg-[#B83CC3] transition-all font-bold"
              >
                Share Circle
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 border border-[#F4AEFF] rounded-full hover:bg-[#F4AEFF]/10 transition-all"
              >
                Close
              </button>
            </div>
          )}

          {!circle.isActive && !isCreator && (
            <p className="text-center text-red-500 text-sm lg:text-base">This circle is not accepting new members</p>
          )}
        </div>
      </div>
    </div>
  );
}
