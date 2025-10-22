import { useState, useMemo } from 'react'
import { usePayoutHistory, useUpcomingPayouts } from '../hooks/useCircleData';
import { getGoalIcon, getGoalColors } from '../utils/circleHelpers';
import { IoEllipsisHorizontalSharp } from "react-icons/io5";
import { BsPin } from "react-icons/bs";
import { FiBellOff } from "react-icons/fi";

export default function Payout() {
  const isTabletOrMobile = window.innerWidth <= 1014;
  const { data: payoutHistory } = usePayoutHistory();
  const { data: upcomingPayouts } = useUpcomingPayouts();

  const [filterType, setFilterType] = useState('only-upcoming');
  const [activeModal, setActiveModal] = useState(null);

  const handleAction = (index, event) => {
    event.stopPropagation(); // Prevent event bubbling
    setActiveModal(activeModal === index ? null : index); // Toggle modal for specific item
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  // Combine and filter payouts based on selection
  const displayedPayouts = useMemo(() => {
    if (filterType === 'only-upcoming') {
      return upcomingPayouts?.map(p => ({ ...p, type: 'upcoming' })) || [];
    } else {
      // Combine history and upcoming
      const history = payoutHistory?.map(p => ({ ...p, type: 'history' })) || [];
      const upcoming = upcomingPayouts?.map(p => ({ ...p, type: 'upcoming' })) || [];
      return [...upcoming, ...history].sort((a, b) => b.timestamp - a.timestamp);
    }
  }, [filterType, payoutHistory, upcomingPayouts]);

  return (
    <div className="flex flex-col gap-10 relative ">
      <div className="flex items-center justify-between ">
        <h3 className="text-[21px] lg:text-[30px] font-bold ">Your Payouts</h3>
        <div className="px-4 py-1 lg:py-3 border border-[#F4AEFF] rounded-[16px] ">
          <select
            className="pr-[13px] outline-none border-none bg-transparent text-[9px] lg:text-[21px] cursor-pointer"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="only-upcoming" className="bg-[#111111] text-white">Only Upcoming</option>
            <option value="history-upcoming" className="bg-[#111111] text-white">History + Upcoming</option>
          </select>
        </div>
      </div>

      <div className=" flex flex-col lg:gap-6 gap-10 ">
        {displayedPayouts && displayedPayouts.length > 0 ? (
          displayedPayouts.map((payout, index) => {
            // Get circle icon and colors based on circle goal type (we'll need to fetch this)
            const IconComponent = getGoalIcon(payout.goalType || 0);
            const colors = getGoalColors(payout.goalType || 0);

            return (
              <div
                key={`${payout.circleId}-${index}`}
                className=" flex  items-center justify-between relative"
              >
                <div className={`flex lg:items-center gap-6 flex-1`}>
                  <div className={`lg:w-[102px] lg:h-[102px] w-[80px] h-[80px] rounded-full flex items-center justify-center ${colors.bg} ${colors.text}`}>
                    <IconComponent size={isTabletOrMobile ? 24 : 33} />
                  </div>

                  <div className="flex flex-col lg:flex-row gap-5 lg:gap-20">
                    <div className="flex flex-col gap-2.5 lg:w-[300px] ">
                      <p className="text-[16px] lg:text-[24px]">
                        {payout.amount || 'TBD'}
                      </p>
                      <div className="flex items-center gap-2 ">
                        <p className="text-[16px]">{payout.circleName}</p>
                      </div>
                    </div>

                    {/* date */}
                    <div className={`lg:px-8 lg:py-2 px-3 py-1 h-fit rounded-full border text-[11px] lg:text-[21px] ${
                      payout.type === 'upcoming'
                        ? 'border-[#F4AEFF]'
                        : payout.claimed
                        ? 'border-[#AEFFDA] text-[#AEFFDA]'
                        : 'border-[#FFBDBD] text-[#FFBDBD]'
                    }`}>
                      {payout.type === 'upcoming' ? payout.estimatedDate : payout.date}
                      {payout.type === 'history' && (
                        <span className="ml-2">
                          {payout.claimed ? '✓ Claimed' : '⚠ Unclaimed'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div
                  className="flex items-center gap-[25px] relative"
                  onClick={(e) => handleAction(index, e)}
                >
                  <IoEllipsisHorizontalSharp className="cursor-pointer hover:text-purple-500 transition-colors" />

                  {/* Show ActionModal for this specific item */}
                  {activeModal === index && (
                    <ActionModal payout={payout} />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10">
            <p className="text-[#AAAAAA] text-[24px]">No payouts yet</p>
            <p className="text-[14px] text-[#AAAAAA] mt-2">
              Your payouts will appear here when you're eligible
            </p>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 w-full h-[390px] translate-y-1/2 ">
        <img src="/assets/Blur-oval.png" alt="" className="h-full w-full" />
      </div>

      {activeModal !== null && (
        <div className="fixed inset-0 z-10" onClick={closeModal} />
      )}
    </div>
  );
}

const ActionModal = ({ payout }) => {
  return (
    <div className="absolute top-full bg-[#70707026] backdrop-blur-md font-dm right-0 mt-2 border border-white rounded-[8px] text-[10px] lg:text-[16px] p-3 z-20 w-[119px]">
      <div className="flex flex-col gap-2">
        <button className="text-left flex cursor-pointer items-center gap-1 px-3 py-2 hover:text-black hover:bg-gray-100 rounded">
          <BsPin />
          <p>Pin payout</p>
        </button>
        <button className="text-left flex cursor-pointer items-center gap-1 px-3 py-2 hover:text-black hover:bg-gray-100 rounded">
          <FiBellOff />
          <p>Stop Reminders</p>
        </button>
        {payout.type === 'history' && !payout.claimed && (
          <button className="text-left flex cursor-pointer items-center gap-1 px-3 py-2 hover:bg-green-100 text-[#AEFFDA] rounded">
            <p>Claim Payout</p>
          </button>
        )}
      </div>
    </div>
  );
}