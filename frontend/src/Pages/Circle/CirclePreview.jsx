import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { useCircleDetails } from '../../hooks/useCircleData';
import { useJoinCircle } from '../../hooks/useCircleActions';
import { getGoalIcon, getGoalColors, formatFrequency, calculateProgress } from '../../utils/circleHelpers';
import formatCurrency from '../../utils/formatCurrency';
import PurpleBtn from '../../Components/PurpleBtn';
import Spinner from '../../Components/Spinner';
import { IoClose } from "react-icons/io5";

export default function CirclePreview({ circleId, onClose, fromLink = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: circle, isLoading, error } = useCircleDetails(circleId);
  const joinCircle = useJoinCircle();

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner />
      </div>
    );
  }

  if (error || !circle) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-red-500">Circle not found</p>
        <button onClick={() => navigate('/chain/circle')} className="text-primary underline">
          Go back to Circles
        </button>
      </div>
    );
  }

  const IconComponent = getGoalIcon(circle.goalType);
  const colors = getGoalColors(circle.goalType);
  const isTabletOrMobile = window.innerWidth <= 1014;

  return (
    <div className="fixed inset-0 z-90 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#F4AEFF] rounded-[24px] max-w-2xl w-full p-8 relative">
        {onClose && (
          <IoClose
            onClick={onClose}
            className="absolute top-4 right-4 cursor-pointer hover:scale-110 transition-all"
            size={24}
          />
        )}

        <div className="flex flex-col gap-6">
          {/* Circle Icon and Name */}
          <div className="flex items-center gap-4">
            <div className={`w-[102px] h-[102px] rounded-full flex items-center justify-center ${colors.bg} ${colors.text}`}>
              <IconComponent size={isTabletOrMobile ? 33 : 44} />
            </div>
            <div>
              <h2 className="text-[32px] font-bold">{circle.name}</h2>
              <p className="text-[#AAAAAA]">{circle.members || 0}/{circle.maxMembers} members</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-[#AAAAAA]">Progress</span>
              <span className="text-sm text-primary">{circle.progress}%</span>
            </div>
            <div className="w-full h-3 bg-[#333] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#D548EC] to-[#F4AEFF] transition-all duration-300"
                style={{ width: `${circle.progress}%` }}
              />
            </div>
          </div>

          {/* Circle Details */}
          <div className="grid grid-cols-2 gap-4 font-dm">
            <div>
              <p className="text-[#AAAAAA] text-sm">Contribution Amount</p>
              <p className="text-xl font-bold">{formatCurrency(circle.amount)}</p>
            </div>
            <div>
              <p className="text-[#AAAAAA] text-sm">Duration</p>
              <p className="text-xl font-bold">{circle.duration} months</p>
            </div>
            <div>
              <p className="text-[#AAAAAA] text-sm">Frequency</p>
              <p className="text-xl font-bold">{formatFrequency(circle.frequency)}</p>
            </div>
            <div>
              <p className="text-[#AAAAAA] text-sm">Total Pool</p>
              <p className="text-xl font-bold">{formatCurrency(circle.vaultBalance)}</p>
            </div>
          </div>

          {/* Action Buttons */}
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

          {!circle.isActive && (
            <p className="text-center text-red-500 text-sm">This circle is not accepting new members</p>
          )}
        </div>
      </div>
    </div>
  );
}
