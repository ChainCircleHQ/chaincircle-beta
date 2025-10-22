import React, { useState } from 'react'
import { IoEyeOutline } from "react-icons/io5";
import { IoEyeOffOutline } from "react-icons/io5";
import { FaPlus } from "react-icons/fa";
import DashboardTable from '../Pages/Dashboard/DashboardTable';
import CreateCircleModal from '../Pages/Circle/CreateCircleModal';
import CirclePreview from '../Pages/Circle/CirclePreview';
import { useUserStats, useUserCircles } from '../hooks/useCircleData';
import { getGoalIcon, getGoalColors } from '../utils/circleHelpers';
import { PiCirclesThreeBold } from "react-icons/pi";
import Spinner from '../Components/Spinner';

export default function Dashboard() {
  const [showBalance, setShowBalance] = React.useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCircleId, setSelectedCircleId] = useState(null);

  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: userCircles, isLoading: circlesLoading } = useUserCircles();

  const isTabletOrMobile = window.innerWidth <= 1014;

  // Only show spinner on initial load, not when refetching
  if (statsLoading && !stats) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const totalSaved = stats?.totalSaved ? parseFloat(stats.totalSaved) : 0;
  const totalCircleCount = userCircles?.length || 0;
  const totalInterest = stats?.totalInterest ? parseFloat(stats.totalInterest) : 0;

  return (
    <div className="h-full overflow-auto flex flex-col gap-10 ">
      <header
        className="px-6 py-4 rounded-[16px] flex flex-col items-center gap-3 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/dashboard-bg-card.png')" }}
      >
        <div className="flex flex-col items-center gap-1 ">
          <p className="font-dm text-[12px] lg:text-[16px] ">Total Saved</p>
          <div className="flex items-center gap-2 ">
            <h3 className="font-bold text-[32px] lg:text-[40px] ">
              {showBalance
                ? `$${totalSaved.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                : "******"}
            </h3>
            <div
              className="cursor-pointer"
              onClick={() => setShowBalance(!showBalance)}
            >
              {showBalance ? <IoEyeOutline /> : <IoEyeOffOutline />}
            </div>
          </div>
        </div>

        {/* Stroke */}
        <div className="w-full h-[1px] bg-white "></div>

        <div className="flex items-center gap-4 w-full ">
          <div className="flex-1 flex items-center justify-center rounded-[8px] gap-2 px-5 py-2 bg-[#853094] text-[12px] lg:text-[16px] font-dm ">
            <PiCirclesThreeBold
              className="text-[#AEFFDA]  "
              size={isTabletOrMobile ? 16 : 24}
            />
            <p>
              {" "}
              <span className="text-[12px]">{totalCircleCount}</span> circles
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center rounded-[8px] gap-2 px-5 py-2 bg-[#853094] text-[12px] lg:text-[16px] font-dm ">
            <img src="/assets/money-interest.png" alt="" className="w-6 h-6" />
            <p>
              {" "}
              <span className="text-[12px]">${totalInterest.toFixed(2)}</span> interest earned
            </p>
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-5">
        <h3 className="font-dm text-[16px] lg:text-[21px] ">Active Circles</h3>

        <div className="flex items-start font-dm text-[16px] pb-6 gap-10 overflow-x-scroll  ">
          {/* Create New Circle Button */}
          <div
            className="flex flex-col gap-[11px] justify-center items-center text-[12px] lg:text-[21px] hover:font-bold "
            onClick={() => setShowCreateModal(true)}
          >
            <div className="lg:w-[102px] cursor-pointer lg:h-[102px] w-[80px] hover:rotate-90 transition ease-in-out bg-[#64d35e] h-[80px]  rounded-full flex items-center justify-center ">
              <FaPlus color="#fff" size={isTabletOrMobile ? 27 : 33} />
            </div>
            <p className="text-center text-primary  ">Create New</p>
          </div>

          {/* User Circles from Blockchain */}
          {circlesLoading ? (
            <div className="flex items-center justify-center w-full">
              <p className="text-[#AAAAAA]">Loading circles...</p>
            </div>
          ) : userCircles && userCircles.length > 0 ? (
            userCircles.map((circle) => {
              const IconComponent = getGoalIcon(circle.goalType);
              const colors = getGoalColors(circle.goalType);

              return (
                <div
                  key={circle.id}
                  className="flex flex-col gap-[11px] justify-center items-center cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setSelectedCircleId(circle.id)}
                >
                  <div className={`lg:w-[102px] lg:h-[102px] w-[80px] h-[80px] ${colors.bg} rounded-full flex items-center justify-center`}>
                    <IconComponent
                      className={colors.text}
                      size={isTabletOrMobile ? 27 : 33}
                    />
                  </div>
                  <p className="text-center text-[12px] lg:text-[21px] max-w-[120px] truncate">
                    {circle.name}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center w-full">
              <p className="text-[#AAAAAA]">No active circles. Create one to get started!</p>
            </div>
          )}
        </div>
      </section>

      <DashboardTable />

      {showCreateModal && (
        <CreateCircleModal
          onClose={() => {
            setShowCreateModal(false);
          }}
          setShowCreateModal={setShowCreateModal}
        />
      )}

      {selectedCircleId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CirclePreview
              circleId={selectedCircleId}
              onClose={() => setSelectedCircleId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
