import { useState } from 'react'
import { FiSearch } from "react-icons/fi";
import { IoEllipsisHorizontalSharp } from "react-icons/io5";
import { FaPlus } from "react-icons/fa";
import { BsPin, BsPinFill } from "react-icons/bs";
import { FiBellOff } from "react-icons/fi";
import { FaRegStopCircle } from "react-icons/fa";
import { MdQrCode } from "react-icons/md";
import CreateCircleModal from '../Pages/Circle/CreateCircleModal';
import JoinByInviteCode from '../Pages/Circle/JoinByInviteCode';
import { useUserCircles } from '../hooks/useCircleData';
import { getGoalIcon, getGoalColors } from '../utils/circleHelpers';
import { useEmergencyWithdraw } from '../hooks/useCircleActions';
import { toast } from 'sonner';

export default function Circle() {
  const { data } = useUserCircles();
  const emergencyWithdraw = useEmergencyWithdraw();
  const [activeModal, setActiveModal] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [selectedCircleForExit, setSelectedCircleForExit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pinnedCircles, setPinnedCircles] = useState(() => {
    const saved = localStorage.getItem('pinnedCircles');
    return saved ? JSON.parse(saved) : [];
  });
  const [mutedCircles, setMutedCircles] = useState(() => {
    const saved = localStorage.getItem('mutedCircles');
    return saved ? JSON.parse(saved) : [];
  });
  const isTabletOrMobile = window.innerWidth <= 1014;

  const handleAction = (index, event) => {
    event.stopPropagation();
    setActiveModal(activeModal === index ? null : index);
  }

  const closeModal = () => {
    setActiveModal(null);
  }

  const handleShowCreate = (e) => {
    e.preventDefault();
    setShowCreateModal(true);
  }

  const handlePinCircle = (circleId) => {
    const newPinned = pinnedCircles.includes(circleId)
      ? pinnedCircles.filter(id => id !== circleId)
      : [...pinnedCircles, circleId];
    setPinnedCircles(newPinned);
    localStorage.setItem('pinnedCircles', JSON.stringify(newPinned));
    setActiveModal(null);
  }

  const handleMuteCircle = (circleId) => {
    const newMuted = mutedCircles.includes(circleId)
      ? mutedCircles.filter(id => id !== circleId)
      : [...mutedCircles, circleId];
    setMutedCircles(newMuted);
    localStorage.setItem('mutedCircles', JSON.stringify(newMuted));
    setActiveModal(null);
  }

  const handleExitCircle = (circleId) => {
    setSelectedCircleForExit(circleId);
    setShowEmergencyModal(true);
    setActiveModal(null);
  }

  const confirmEmergencyWithdraw = async () => {
    if (!selectedCircleForExit) return;

    try {
      await emergencyWithdraw.mutateAsync(selectedCircleForExit);
      setShowEmergencyModal(false);
      setSelectedCircleForExit(null);
    } catch (error) {
      console.error('Emergency withdrawal failed:', error);
      toast.error('Emergency withdrawal failed', { description: error.message });
    }
  }

  // Filter circles by search term and sort by pinned status
  const filteredCircles = (data?.filter(circle =>
    circle.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []).sort((a, b) => {
    const aIsPinned = pinnedCircles.includes(a.id);
    const bIsPinned = pinnedCircles.includes(b.id);
    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col gap-10 relative">
      <div className="flex items-center justify-between ">
        <h3 className="text-[21px] lg:text-[30px] font-bold ">
          Active Circles
        </h3>
        <div className="w-[205px] lg:w-[418px] flex items-center gap-[13px] border px-4 py-3 rounded-[16px] border-[#F4AEFF] ">
          <FiSearch size={32} />
          <input
            type="text"
            className="border-none outline-none text-[16px] lg:text-[24px] flex-1 bg-transparent"
            placeholder="Search for a circle"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className=" flex flex-col lg:gap-6 gap-10 ">
        {filteredCircles.length > 0 ? (
          filteredCircles.map((circle, index) => {
            const IconComponent = getGoalIcon(circle.goalType);
            const colors = getGoalColors(circle.goalType);
            const isPaymentDue = circle.status === "Payment due";

            return (
              <div
                key={circle.id}
                className="flex items-center justify-between relative"
              >
                <div className={`flex lg:items-center gap-6 flex-1`}>
                  <div className={`lg:w-[102px] lg:h-[102px] w-[80px] h-[80px] rounded-full flex items-center text-[33px] justify-center relative ${colors.bg} ${colors.text}`}>
                    <IconComponent size={isTabletOrMobile ? 24 : 33} />
                    {pinnedCircles.includes(circle.id) && (
                      <div className="absolute -top-1 -right-1 bg-[#D548EC] rounded-full p-1">
                        <BsPinFill size={12} />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col lg:flex-row gap-5 lg:gap-20">
                    <div className="flex flex-col gap-2.5 lg:w-[300px] ">
                      <div className="flex items-center gap-2">
                        <p className="text-[16px] lg:text-[24px]">{circle.name}</p>
                        {pinnedCircles.includes(circle.id) && (
                          <span className="text-xs lg:text-sm text-[#D548EC]">(Pinned)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ">
                        <div className="border p-1 w-[96px] lg:w-[147px] h-[20px] lg:h-[26px] rounded-[4px] border-[#F4AEFF] ">
                          <div
                            className="bg-[#D548EC] h-full rounded-[2px]"
                            style={{ width: `${circle.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-[16px]">{circle.progress}%</p>
                      </div>
                    </div>

                    {/* Status */}
                    <div
                      className={`lg:px-8 lg:py-2 px-3 py-1 h-fit rounded-full ${
                        isPaymentDue
                          ? "border border-[#FFBDBD] text-[#FFBDBD] "
                          : circle.progress >= 100
                          ? "border border-[#AEFFDA] text-[#AEFFDA]"
                          : "border border-[#F4AEFF] "
                      }`}
                    >
                      {circle.progress >= 100
                        ? "Completed"
                        : (isPaymentDue ? "Payment due" : "On track")
                      }
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="flex items-center gap-[25px] relative">
                  <IoEllipsisHorizontalSharp
                    className="cursor-pointer hover:text-purple-500 transition-colors z-10"
                    onClick={(e) => handleAction(index, e)}
                  />

                  {/* Show ActionModal for this specific item */}
                  {activeModal === index && (
                    <ActionModal
                      onClose={closeModal}
                      circle={circle}
                      isPinned={pinnedCircles.includes(circle.id)}
                      isMuted={mutedCircles.includes(circle.id)}
                      onPin={handlePinCircle}
                      onMute={handleMuteCircle}
                      onExit={handleExitCircle}
                    />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10">
            <p className="text-[#AAAAAA] text-[24px]">
              {searchTerm ? "No circles found matching your search" : "No circles yet"}
            </p>
            <p className="text-[14px] text-[#AAAAAA] mt-2">
              {!searchTerm && "Create your first circle to get started!"}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="ml-auto flex items-center gap-4 relative z-10">
        <button
          className="px-4 hover:scale-110 transition ease-in-out py-2 rounded-[8px] bg-[#7C3A87] cursor-pointer flex items-center gap-2"
          onClick={() => setShowInviteModal(true)}
          type="button"
          title="Join circle with invite code"
        >
          <MdQrCode size={isTabletOrMobile ? 12 : 40} />
          <p className="lg:hidden text-[14px]">Join by Code</p>
        </button>

        <button
          className="px-4 hover:scale-110 transition ease-in-out py-2 rounded-[8px] bg-[#D548EC] cursor-pointer flex items-center gap-2"
          onClick={handleShowCreate}
          type="button"
        >
          <FaPlus size={isTabletOrMobile ? 12 : 40} />
          <p className="lg:hidden text-[14px]">Create New</p>
        </button>
      </div>

      {/* Background image */}
      <div className="absolute bottom-0 left-0 w-full h-[390px] translate-y-1/2 -z-10">
        <img src="/assets/Blur-oval.png" alt="" className="h-full w-full" />
      </div>

      {/* Click outside to close modal */}
      {activeModal !== null && (
        <div className="fixed inset-0 z-10" onClick={closeModal} />
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateCircleModal
          onClose={() => {
            setShowCreateModal(false);
          }}
          setShowCreateModal={setShowCreateModal}
        />
      )}

      {showInviteModal && (
        <JoinByInviteCode
          onClose={() => {
            setShowInviteModal(false);
          }}
        />
      )}

      {/* Emergency Withdrawal Modal */}
      {showEmergencyModal && (
        <EmergencyWithdrawModal
          onClose={() => {
            setShowEmergencyModal(false);
            setSelectedCircleForExit(null);
          }}
          onConfirm={confirmEmergencyWithdraw}
          isLoading={emergencyWithdraw.isPending}
        />
      )}
    </div>
  );
}

const ActionModal = ({ onClose, circle, isPinned, isMuted, onPin, onMute, onExit }) => {
  return (
    <div className="absolute top-full bg-[#70707026] backdrop-blur-md font-dm right-0 mt-2 border border-white rounded-[8px] text-[10px] lg:text-[16px] p-3 z-50 w-[150px] lg:w-[200px]">
      <div className="flex flex-col gap-2">
        <button
          className="text-left flex cursor-pointer items-center gap-2 px-3 py-2 hover:text-black hover:bg-gray-100 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onPin(circle.id);
          }}
        >
          {isPinned ? <BsPinFill className="text-[#D548EC]" /> : <BsPin />}
          <p>{isPinned ? 'Unpin Circle' : 'Pin Circle'}</p>
        </button>
        <button
          className="text-left flex cursor-pointer items-center gap-2 px-3 py-2 hover:text-black hover:bg-gray-100 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onMute(circle.id);
          }}
        >
          <FiBellOff className={isMuted ? 'text-[#D548EC]' : ''} />
          <p>{isMuted ? 'Unmute' : 'Mute Reminders'}</p>
        </button>
        <button
          className="text-left flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-red-100 text-[#C68080] rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onExit(circle.id);
          }}
        >
          <FaRegStopCircle />
          <p>Emergency Withdraw</p>
        </button>
      </div>
    </div>
  );
}

const EmergencyWithdrawModal = ({ onClose, onConfirm, isLoading }) => {
  const isTabletOrMobile = window.innerWidth <= 1014;

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-red-500 rounded-[24px] max-w-md lg:max-w-xl w-full p-6 lg:p-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-red-500/20 rounded-full flex items-center justify-center">
            <FaRegStopCircle size={isTabletOrMobile ? 24 : 32} className="text-red-500" />
          </div>
          <h2 className="text-2xl lg:text-4xl font-bold text-red-500">Emergency Withdrawal</h2>
        </div>

        <div className="space-y-4 lg:space-y-6 mb-6 lg:mb-8">
          <div className="p-4 lg:p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
            <h3 className="text-lg lg:text-xl font-bold mb-3 text-red-400">⚠️ Warning: Serious Consequences</h3>
            <ul className="space-y-2 text-sm lg:text-base text-[#AAAAAA]">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span><strong className="text-white">10% Penalty:</strong> You will lose 10% of your contributions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span><strong className="text-white">Reputation Impact:</strong> Your reputation score will be severely affected</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span><strong className="text-white">Circle Impact:</strong> Other members are counting on your contributions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span><strong className="text-white">Permanent Exit:</strong> You cannot rejoin this circle after leaving</span>
              </li>
            </ul>
          </div>

          <p className="text-sm lg:text-base text-[#AAAAAA] text-center">
            This action is <strong className="text-red-500">irreversible</strong>. Are you absolutely sure?
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-6 py-3 lg:py-4 border border-[#F4AEFF] rounded-full hover:bg-[#F4AEFF]/10 transition-all font-bold text-base lg:text-xl disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-6 py-3 lg:py-4 bg-red-600 rounded-full hover:bg-red-700 transition-all font-bold text-base lg:text-xl disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Confirm Withdrawal'}
          </button>
        </div>
      </div>
    </div>
  );
}
