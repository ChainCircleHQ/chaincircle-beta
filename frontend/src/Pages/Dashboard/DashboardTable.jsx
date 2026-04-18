import React from 'react'
import { useRecentActivities } from '../../hooks/useCircleData';
import { MdOutlineArrowOutward } from "react-icons/md";
import { FiArrowDownLeft } from "react-icons/fi";
import { FaSackDollar } from "react-icons/fa6";
import { NETWORK_CONFIG } from '../../constants/contracts';
import { useCircleContract } from '../../hooks/useCircleContract';
import { SkeletonRow } from '../../Components/Skeleton';

export default function DashboardTable() {
  const { data, isLoading, error } = useRecentActivities(10);
  const { userAddress } = useCircleContract();

  const handleActivityClick = (activity) => {
    // If we have a transaction hash, link to the specific transaction
    // Otherwise, fall back to the user's address page
    let explorerUrl;
    if (activity.txHash) {
      explorerUrl = `${NETWORK_CONFIG.explorerUrl}/tx/${activity.txHash}`;
    } else {
      explorerUrl = `${NETWORK_CONFIG.explorerUrl}/address/${userAddress}`;
    }
    window.open(explorerUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-3 text-[16px] lg:text-[24px] font-dm">
        <p>Recent Activity</p>
        {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-red-500">Error loading activities</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 text-[16px] lg:text-[24px] font-dm ">
      <p>Recent Activity</p>

      <div>
        {data && data.length > 0 ? (
          data.map((item, index) => (
            <div
              className={`flex justify-between lg:text-[24px] text-[14px] items-center pt-2 pb-12 cursor-pointer hover:bg-[#ffffff05] transition-colors rounded-lg px-2 ${
                index !== data.length - 1 ? "border-b border-b-[#D9D9D9]" : ""
              }`}
              key={item.id}
              onClick={() => handleActivityClick(item)}
              title={item.txHash ? "Click to view transaction details on Push Chain explorer" : "Click to view your transactions on Push Chain explorer"}
            >
              <div className="flex items-center gap-4 ">
                <div className="h-20 w-20 rounded-full border border-[#333333] flex items-center justify-center ">
                  {item.type === "save" && (
                    <MdOutlineArrowOutward className="text-[#87698C]" />
                  )}
                  {item.type === "withdraw" && (
                    <FiArrowDownLeft className="text-[#87698C]" />
                  )}
                  {item.type === "interest" && (
                    <FaSackDollar className="text-[#698C74]" />
                  )}
                </div>
                <div className="">
                  <p>{item.title}</p>
                  <p className="text-[10px] lg:text-[12px]">{item.timeAgo}</p>
                </div>
              </div>
              <div className="text-[16px] lg:text-[24px] text-primary ">
                <p>{item.amount}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-[#AAAAAA]">No recent activity</p>
            <p className="text-[14px] text-[#AAAAAA] mt-2">
              Make your first contribution to see your activity here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
