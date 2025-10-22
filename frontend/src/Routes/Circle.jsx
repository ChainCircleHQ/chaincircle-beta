import { useState } from 'react'
import { FiSearch } from "react-icons/fi";
import { IoEllipsisHorizontalSharp } from "react-icons/io5";
import { FaPlus } from "react-icons/fa";
import { BsPin } from "react-icons/bs";
import { FiBellOff } from "react-icons/fi";
import { FaRegStopCircle } from "react-icons/fa";
import CreateCircleModal from '../Pages/Circle/CreateCircleModal';
import { useUserCircles } from '../hooks/useCircleData';
import { getGoalIcon, getGoalColors } from '../utils/circleHelpers';
import Spinner from '../Components/Spinner';

export default function Circle() {
  const { data, isLoading } = useUserCircles();
  const [activeModal, setActiveModal] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Filter circles by search term
  const filteredCircles = data?.filter(circle =>
    circle.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Only show spinner on initial load, not when refetching
  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

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
                className="flex items-center justify-between relative z-10"
              >
                <div className={`flex lg:items-center gap-6 flex-1`}>
                  <div className={`lg:w-[102px] lg:h-[102px] w-[80px] h-[80px] rounded-full flex items-center text-[33px] justify-center ${colors.bg} ${colors.text}`}>
                    <IconComponent size={isTabletOrMobile ? 24 : 33} />
                  </div>

                  <div className="flex flex-col lg:flex-row gap-5 lg:gap-20">
                    <div className="flex flex-col gap-2.5 lg:w-[300px] ">
                      <p className="text-[16px] lg:text-[24px]">{circle.name}</p>
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
                <div className="flex items-center gap-[25px] relative z-20">
                  <IoEllipsisHorizontalSharp
                    className="cursor-pointer hover:text-purple-500 transition-colors"
                    onClick={(e) => handleAction(index, e)}
                  />

                  {/* Show ActionModal for this specific item */}
                  {activeModal === index && (
                    <ActionModal onClose={closeModal} circle={circle} />
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

      {/* Create Button */}
      <button
        className="ml-auto px-4 hover:scale-110 transition ease-in-out py-2 rounded-[8px] bg-[#D548EC] cursor-pointer flex items-center gap-2 z-20 relative"
        onClick={handleShowCreate}
        type="button"
      >
        <FaPlus size={isTabletOrMobile ? 12 : 40} />
        <p className="lg:hidden text-[14px]">Create New</p>
      </button>

      {/* Background image */}
      <div className="absolute bottom-0 left-0 w-full h-[390px] translate-y-1/2 -z-10">
        <img src="/assets/Blur-oval.png" alt="" className="h-full w-full" />
      </div>

      {/* Click outside to close modal */}
      {activeModal !== null && (
        <div className="fixed inset-0 z-10" onClick={closeModal} />
      )}

      {/* Modal */}
      {showCreateModal && (
        <CreateCircleModal
          onClose={() => {
            setShowCreateModal(false);
          }}
          setShowCreateModal={setShowCreateModal}
        />
      )}
    </div>
  );
}

const ActionModal = ({ onClose, circle }) => {
  return (
    <div className="absolute top-full bg-[#70707026] backdrop-blur-md font-dm right-0 mt-2 border border-white rounded-[8px] text-[10px] lg:text-[16px] p-3 z-30 w-[119px]">
      <div className="flex flex-col gap-2">
        <button
          className="text-left flex cursor-pointer items-center gap-1 px-3 py-2 hover:text-black hover:bg-gray-100 rounded"
          onClick={(e) => {
            e.stopPropagation();
            // Add your pin/unpin logic here
          }}
        >
          <BsPin />
          <p>Pin Circle</p>
        </button>
        <button
          className="text-left flex cursor-pointer items-center gap-1 px-3 py-2 hover:text-black hover:bg-gray-100 rounded"
          onClick={(e) => {
            e.stopPropagation();
            // Add your stop reminders logic here
          }}
        >
          <FiBellOff />
          <p>Stop Reminders</p>
        </button>
        <button
          className="text-left flex cursor-pointer items-center gap-1 px-3 py-2 hover:bg-red-100 text-[#C68080] rounded"
          onClick={(e) => {
            e.stopPropagation();
            // Add your exit circle logic here
          }}
        >
          <FaRegStopCircle />
          <p>Exit Circle</p>
        </button>
      </div>
    </div>
  );
}
