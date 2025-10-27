import React from 'react'
import { FiSearch } from "react-icons/fi";
import { TbArrowRightFromArc } from "react-icons/tb";
import { useNavigate } from 'react-router';
import { usePushWalletContext } from '@pushchain/ui-kit';
import LinkedWallets from './LinkedWallets';
import PayoutPreferences from './PayoutPreferences';
import NotificationSettings from './NotificationSettings';
import CircleHistory from './CircleHistory';
import StatsArchive from './StatsArchive';
import AccountAction from './AccountAction';

const isTabletOrMobile = window.innerWidth <= 1014;

export default function ProfileDetails() {
  const navigate = useNavigate();
  const { handleUserLogOutEvent } = usePushWalletContext();

  const handleLogout = () => {
    if (handleUserLogOutEvent) {
      handleUserLogOutEvent();
    }
    navigate("/");
  };

  return (
    <div className="p-6 pb-20 flex flex-col gap-6 font-dm ">
      <header className="flex items-center justify-between">
        <p className="text-[14px] lg:text-[24px]">Account Settings</p>
        <div className="w-[200px] lg:w-[418px] flex items-center gap-[13px] border px-4 py-3 rounded-[16px] border-[#F4AEFF] ">
          <FiSearch size={24} color="#AAAAAA" />
          <input
            type="text"
            className="border-none outline-none text-[14px]  flex-1 "
            placeholder="Search"
          />
        </div>
      </header>

      <div className="flex flex-col gap-5 ">
        <LinkedWallets />
        {/* Stroke */}
        <div className="w-full h-[1px] bg-white "></div>
        <PayoutPreferences />
        {/* Stroke */}
        <div className="w-full h-[1px] bg-white "></div>
        <NotificationSettings />
        {/* Stroke */}
        <div className="w-full h-[1px] bg-white "></div>
        <CircleHistory />
        {/* Stroke */}
        <div className="w-full h-[1px] bg-white "></div>
        <StatsArchive />
        {/* Stroke */}
        <div className="w-full h-[1px] bg-white "></div>
        <AccountAction />
        {/* Stroke */}
        <div className="w-full h-[1px] bg-white "></div>

        {/* Logout Button - Mobile Only */}
        {isTabletOrMobile && (
          <div
            onClick={handleLogout}
            className="p-4 rounded-[8px] flex items-center gap-4 justify-center cursor-pointer bg-[#D548EC] hover:bg-[#B83CC3] transition-all"
          >
            <TbArrowRightFromArc size={24} />
            <p className="text-[16px] font-semibold">Log out</p>
          </div>
        )}
      </div>
    </div>
  );
}
