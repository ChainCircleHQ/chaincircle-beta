import React, { useState } from 'react'
import { Link } from 'react-router';
import { IoEyeOutline } from "react-icons/io5";
import { IoEyeOffOutline } from "react-icons/io5";
import { FaPlus, FaCompass, FaKey, FaHandHoldingUsd } from "react-icons/fa";
import DashboardTable from '../Pages/Dashboard/DashboardTable';
import RemindersBanner from '../Pages/Dashboard/RemindersBanner';
import PendingPayoutsBanner from '../Pages/Dashboard/PendingPayoutsBanner';
import DiscoverSection from '../Pages/Dashboard/DiscoverSection';
import ActivityFeed from '../Pages/Dashboard/ActivityFeed';
import AiRecommendations from '../Pages/Dashboard/AiRecommendations';
import WeeklySummary from '../Pages/Dashboard/WeeklySummary';
import CreateCircleModal from '../Pages/Circle/CreateCircleModal';
import CirclePreview from '../Pages/Circle/CirclePreview';
import PurpleBtn from '../Components/PurpleBtn';
import TransBtn from '../Components/TransBtn';
import Skeleton from '../Components/Skeleton';
import useIsTabletOrMobile from '../hooks/useIsTabletOrMobile';
import { useUserStats, useUserCircles } from '../hooks/useCircleData';
import { getGoalIcon, getGoalColors } from '../utils/circleHelpers';
import { PiCirclesThreeBold } from "react-icons/pi";

export default function Dashboard() {
  const [showBalance, setShowBalance] = React.useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCircleId, setSelectedCircleId] = useState(null);

  const { data: stats } = useUserStats();
  const { data: userCircles, isLoading: circlesLoading } = useUserCircles();

  const isTabletOrMobile = useIsTabletOrMobile();

  const totalSaved = stats?.totalSaved ? parseFloat(stats.totalSaved) : 0;
  const totalCircleCount = userCircles?.length || 0;
  const totalInterest = stats?.totalInterest ? parseFloat(stats.totalInterest) : 0;

  return (
    <div className="h-full overflow-auto flex flex-col gap-10 ">
      <RemindersBanner />
      <PendingPayoutsBanner />
      <header
        className="px-6 py-4 rounded-[16px] flex flex-col items-center gap-3 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/dashboard-bg-card.png')" }}
      >
        <div className="flex flex-col items-center gap-1 ">
          <p className="font-dm text-[12px] lg:text-[16px] ">Total Saved</p>
          <div className="flex items-center gap-2 ">
            <h3 className="font-bold text-[32px] lg:text-[40px] ">
              {showBalance
                ? `$${totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
              <span className="text-[12px]">{totalCircleCount}</span> {totalCircleCount === 1 ? 'circle' : 'circles'}
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center rounded-[8px] gap-2 px-5 py-2 bg-[#853094] text-[12px] lg:text-[16px] font-dm ">
            <img src="/assets/money-interest.png" alt="Interest earned" className="w-6 h-6" width="24" height="24" />
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
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-[11px] justify-center items-center">
                  <Skeleton className="lg:w-[102px] lg:h-[102px] w-[80px] h-[80px] rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </>
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
          ) : null}
        </div>

        {/* First-time user onboarding — shows only when the user has no circles yet. */}
        {!circlesLoading && (!userCircles || userCircles.length === 0) && (
          <div className="rounded-[16px] border border-[#F4AEFF]/30 bg-gradient-to-br from-[#D548EC]/10 via-[#111111] to-[#111111] p-6 lg:p-8 flex flex-col gap-5 font-dm">
            <div>
              <p className="text-[#F4AEFF] text-[13px] lg:text-[14px] uppercase tracking-wider">Welcome to ChainCircle</p>
              <h4 className="text-[20px] lg:text-[26px] font-bold mt-1">Pick how you want to start saving</h4>
              <p className="text-[#AAA] text-[13px] lg:text-[15px] mt-2 max-w-2xl">
                A circle is a group of friends who save together — each month one person receives the pot plus
                4% APR yield. Three paths to get going:
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="group text-left rounded-[12px] border border-[#333] hover:border-[#D548EC] bg-[#111111] p-4 flex flex-col gap-2 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#D548EC]/20 flex items-center justify-center">
                  <FaPlus className="text-[#D548EC]" size={16} />
                </div>
                <p className="font-semibold text-[15px] lg:text-[16px] group-hover:text-[#F4AEFF]">Create your first circle</p>
                <p className="text-[12px] lg:text-[13px] text-[#707070] leading-relaxed">
                  Set a goal, amount, duration, and members. You'll get a shareable invite code.
                </p>
              </button>
              <Link
                to="/chain/circle"
                className="group text-left rounded-[12px] border border-[#333] hover:border-[#D548EC] bg-[#111111] p-4 flex flex-col gap-2 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#F4AEFF]/20 flex items-center justify-center">
                  <FaKey className="text-[#F4AEFF]" size={16} />
                </div>
                <p className="font-semibold text-[15px] lg:text-[16px] group-hover:text-[#F4AEFF]">Join with an invite code</p>
                <p className="text-[12px] lg:text-[13px] text-[#707070] leading-relaxed">
                  A friend sent you a code? Paste it on the Circle page and join their savings.
                </p>
              </Link>
              <button
                onClick={() => {
                  const el = document.getElementById('discover-section');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="group text-left rounded-[12px] border border-[#333] hover:border-[#D548EC] bg-[#111111] p-4 flex flex-col gap-2 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#FDA318]/20 flex items-center justify-center">
                  <FaCompass className="text-[#FDA318]" size={16} />
                </div>
                <p className="font-semibold text-[15px] lg:text-[16px] group-hover:text-[#F4AEFF]">Browse open circles</p>
                <p className="text-[12px] lg:text-[13px] text-[#707070] leading-relaxed">
                  Scroll down to Discover — find public circles looking for new members.
                </p>
              </button>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-[#333] text-[12px] lg:text-[13px] text-[#707070]">
              <FaHandHoldingUsd className="text-[#D548EC]" />
              <span>Need testnet CUSD? <Link to="/faucet" className="text-[#D548EC] hover:text-[#F4AEFF] underline underline-offset-4">Claim from the faucet</Link>.</span>
            </div>
          </div>
        )}
      </section>

      <WeeklySummary />

      <DashboardTable />

      <AiRecommendations />

      <div id="discover-section">
        <DiscoverSection />
      </div>

      <ActivityFeed />

      {showCreateModal && (
        <CreateCircleModal
          onClose={() => {
            setShowCreateModal(false);
          }}
          setShowCreateModal={setShowCreateModal}
        />
      )}

      {selectedCircleId && (
        <CirclePreview
          circleId={selectedCircleId}
          onClose={() => setSelectedCircleId(null)}
        />
      )}
    </div>
  );
}
