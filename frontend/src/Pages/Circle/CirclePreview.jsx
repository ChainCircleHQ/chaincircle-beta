import React, { useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { useCircleDetails } from '../../hooks/useCircleData';
import { useJoinCircle, useContribute } from '../../hooks/useCircleActions';
import { useMemberStatus } from '../../hooks/useMemberStatus';
import { useCircleContract } from '../../hooks/useCircleContract';
import { getGoalIcon, getGoalColors, formatFrequency, calculateProgress } from '../../utils/circleHelpers';
import formatCurrency from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import PurpleBtn from '../../Components/PurpleBtn';
import { IoClose, IoShareSocial, IoDownload } from "react-icons/io5";
import { FaCopy } from "react-icons/fa";
import * as htmlToImage from 'html-to-image';
import { toast } from 'sonner';

import useIsTabletOrMobile from '../../hooks/useIsTabletOrMobile';
export default function CirclePreview({ circleId, onClose, fromLink = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: circle, isLoading, error } = useCircleDetails(circleId);
  const { userAddress } = useCircleContract();
  const joinCircle = useJoinCircle();
  const contribute = useContribute();
  const { data: memberStatus } = useMemberStatus(circleId);
  const isTabletOrMobile = useIsTabletOrMobile();
  const previewRef = useRef(null);

  const isCreator = circle?.creator?.toLowerCase() === userAddress?.toLowerCase();

  // Check if user is already a member - check both ways to be safe
  const isMember = circle?.memberAddresses?.some(
    addr => addr?.toLowerCase() === userAddress?.toLowerCase()
  ) || false;

  // Simple logic: can join if NOT creator and NOT already a member
  // Let the smart contract handle all other validations (full, completed, etc)
  const canJoin = !isCreator && !isMember;

  const handleJoin = async () => {
    try {
      const result = await joinCircle.mutateAsync(circleId);
      if (result?.status === 'pending') {
        toast.info('Still pending on origin chain', {
          description: 'Signature submitted, confirmations are slow. Refresh in a minute.',
          duration: 10_000,
        });
      } else {
        toast.success('Joined circle');
      }
      if (onClose) onClose();
      navigate('/chain/circle');
    } catch (error) {
      if (error?.pending) {
        toast.info('Approval still pending', { description: error.message, duration: 10_000 });
        return;
      }
      const raw = error?.message || '';
      const lower = raw.toLowerCase();
      if (lower.includes('user rejected')) return;
      if (
        (lower.includes('not confirmed with') && lower.includes('ms')) ||
        lower.includes('failed to retrieve push chain') ||
        lower.includes('not been indexed yet')
      ) {
        toast.error('Transaction still pending', {
          description: 'Your wallet chain took too long to confirm. Wait 30s and refresh — if you do not see yourself in the roster, try again.',
          duration: 10_000,
        });
        return;
      }
      if (lower.includes('insufficient')) {
        toast.error('Insufficient CUSD', { description: 'Claim from the faucet first.' });
        return;
      }
      const short = raw.length > 180 ? raw.slice(0, 180) + '…' : raw;
      toast.error('Failed to join circle', { description: short });
    }
  };

  const handleContribute = async () => {
    try {
      const result = await contribute.mutateAsync(Number(circleId));
      if (result?.status === 'pending') {
        toast.info('Contribution pending', {
          description: 'Signature submitted, confirmations are slow. Refresh in a minute.',
          duration: 10_000,
        });
      } else {
        toast.success('Contribution sent');
      }
    } catch (error) {
      if (error?.pending) {
        toast.info('Approval still pending', { description: error.message, duration: 10_000 });
        return;
      }
      const raw = error?.message || '';
      const lower = raw.toLowerCase();
      if (lower.includes('user rejected')) return;
      if (lower.includes('insufficient')) {
        toast.error('Insufficient CUSD', { description: 'Claim from the faucet first.' });
        return;
      }
      const short = raw.length > 180 ? raw.slice(0, 180) + '…' : raw;
      toast.error('Contribution failed', { description: short });
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
    }
  };

  const copyInviteCode = async () => {
    if (circle?.inviteCode) {
      try {
        await navigator.clipboard.writeText(circle.inviteCode);
        toast.success('Invite code copied');
      } catch {
        toast.error('Failed to copy invite code');
      }
    }
  };

  const copyCreatorAddress = async () => {
    if (circle?.creator) {
      try {
        await navigator.clipboard.writeText(circle.creator);
        toast.success('Creator address copied');
      } catch {
        toast.error('Failed to copy creator address');
      }
    }
  };

  const exportAsImage = async () => {
    if (!previewRef.current || !circle) return;

    try {
      const element = previewRef.current;

      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: '#111111',
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `${circle.name.replace(/\s+/g, '-')}-circle.png`;
      link.href = dataUrl;
      link.click();

    } catch (error) {
      toast.error('Failed to export image', { description: error.message || 'Unknown error' });
    }
  };

  // Show error only if there's an actual error, not just loading
  if (error) {
    return (
      <div className="fixed inset-0 z-90 bg-black/60 backdrop-blur-lg flex items-center justify-center p-4">
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
      <div className="fixed inset-0 z-90 bg-black/60 backdrop-blur-lg flex items-center justify-center p-4">
        <div className="bg-[#111111] border border-[#F4AEFF] rounded-[24px] p-8">
          <p className="text-[#AAAAAA]">Loading circle details...</p>
        </div>
      </div>
    );
  }

  const IconComponent = getGoalIcon(circle.goalType || 0);
  const colors = getGoalColors(circle.goalType || 0);
  return (
    <div className="fixed inset-0 z-90 bg-black/60 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {onClose && (
          <IoClose
            onClick={onClose}
            className="absolute -top-2 -right-2 cursor-pointer hover:scale-110 transition-all z-10 bg-[#D548EC] rounded-full p-2"
            size={24}
          />
        )}

        <div ref={previewRef} className="bg-[#111111] border border-[#F4AEFF] rounded-[24px] p-8">
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
                  onClick={(e) => {
                    e.stopPropagation();
                    copyCreatorAddress();
                  }}
                  className="p-3 hover:bg-[#333] rounded transition-all cursor-pointer flex-shrink-0 active:scale-95"
                  title="Copy creator address"
                  type="button"
                >
                  <FaCopy size={isTabletOrMobile ? 18 : 20} />
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
                    onClick={(e) => {
                      e.stopPropagation();
                      copyInviteCode();
                    }}
                    className="p-3 hover:bg-[#333] rounded transition-all cursor-pointer flex-shrink-0 active:scale-95"
                    title="Copy invite code"
                    type="button"
                  >
                    <FaCopy size={isTabletOrMobile ? 18 : 20} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!isCreator && !isMember && (
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex-1" onClick={canJoin ? handleJoin : undefined}>
                <PurpleBtn
                  text={joinCircle.isPending ? "Joining..." : "Join Circle"}
                  font="bold"
                  disabled={joinCircle.isPending || !canJoin}
                />
              </div>
              <div className="flex gap-3 items-center justify-between">
                <button
                  onClick={handleShare}
                  className="flex-1 px-4 py-2 lg:px-6 lg:py-3 border border-[#F4AEFF] rounded-full hover:bg-[#F4AEFF]/10 transition-all flex items-center justify-center gap-2"
                >
                  <IoShareSocial size={20} />
                  <span className="text-sm lg:text-base font-semibold">Share</span>
                </button>
                <button
                  onClick={exportAsImage}
                  className="p-3 lg:p-4 border border-[#F4AEFF] rounded-full hover:bg-[#F4AEFF]/10 transition-all"
                  title="Download as image"
                >
                  <IoDownload size={20} />
                </button>
              </div>
            </div>
          )}

          {!isCreator && isMember && (
            <div className="flex flex-col gap-3 mt-4">
              {circle.isActive && memberStatus?.owesCurrentRound && (
                <div onClick={contribute.isPending ? undefined : handleContribute}>
                  <PurpleBtn
                    text={contribute.isPending
                      ? 'Contributing…'
                      : `Contribute ${formatCurrency(circle.amount)} this round`}
                    font="bold"
                    disabled={contribute.isPending}
                  />
                </div>
              )}
              {circle.isActive && memberStatus && !memberStatus.owesCurrentRound && !memberStatus.hasReceivedPayout && (
                <div className="text-center text-[#AEFFDA] text-sm lg:text-base border border-[#AEFFDA]/40 bg-[#AEFFDA]/10 rounded-full px-4 py-2">
                  ✓ Paid up for round {circle.currentRound}
                </div>
              )}
              <button
                onClick={onClose || (() => navigate('/chain/circle'))}
                className="w-full px-6 py-3 border border-[#F4AEFF] rounded-full hover:bg-[#F4AEFF]/10 transition-all font-semibold"
              >
                View in My Circles
              </button>
              <div className="flex gap-3 items-center justify-between">
                <button
                  onClick={handleShare}
                  className="flex-1 px-4 py-2 lg:px-6 lg:py-3 border border-[#F4AEFF] rounded-full hover:bg-[#F4AEFF]/10 transition-all flex items-center justify-center gap-2"
                >
                  <IoShareSocial size={20} />
                  <span className="text-sm lg:text-base font-semibold">Share</span>
                </button>
                <button
                  onClick={exportAsImage}
                  className="p-3 lg:p-4 border border-[#F4AEFF] rounded-full hover:bg-[#F4AEFF]/10 transition-all"
                  title="Download as image"
                >
                  <IoDownload size={20} />
                </button>
              </div>
            </div>
          )}

          {isCreator && (
            <div className="flex flex-col gap-3 mt-4">
              {circle.isActive && memberStatus?.owesCurrentRound && (
                <div onClick={contribute.isPending ? undefined : handleContribute}>
                  <PurpleBtn
                    text={contribute.isPending
                      ? 'Contributing…'
                      : `Contribute ${formatCurrency(circle.amount)} this round`}
                    font="bold"
                    disabled={contribute.isPending}
                  />
                </div>
              )}
              {circle.isActive && memberStatus && !memberStatus.owesCurrentRound && !memberStatus.hasReceivedPayout && (
                <div className="text-center text-[#AEFFDA] text-sm lg:text-base border border-[#AEFFDA]/40 bg-[#AEFFDA]/10 rounded-full px-4 py-2">
                  ✓ Paid up for round {circle.currentRound}
                </div>
              )}
              <div className="flex gap-3 items-center justify-between">
                <button
                  onClick={handleShare}
                  className="flex-1 px-4 py-2 lg:px-6 lg:py-3 bg-[#D548EC] rounded-full hover:bg-[#B83CC3] transition-all font-bold flex items-center justify-center gap-2"
                >
                  <IoShareSocial size={20} />
                  <span className="text-sm lg:text-base">Share</span>
                </button>
                <button
                  onClick={exportAsImage}
                  className="p-3 lg:p-4 bg-[#D548EC] rounded-full hover:bg-[#B83CC3] transition-all"
                  title="Download as image"
                >
                  <IoDownload size={20} />
                </button>
              </div>
              <button
                onClick={onClose}
                className="w-full px-6 py-3 border border-[#F4AEFF] rounded-full hover:bg-[#F4AEFF]/10 transition-all"
              >
                Close
              </button>
            </div>
          )}

          {!canJoin && !isCreator && (
            <p className="text-center text-yellow-500 text-sm lg:text-base">
              {isMember ? "You are already a member of this circle" : "Cannot join this circle"}
            </p>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
