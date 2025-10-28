import React from 'react'
import { MdOutlineCreditCard } from "react-icons/md";
import PurpleBtn from '../../Components/PurpleBtn';

const isTabletOrMobile = window.innerWidth <= 1014;
  
export default function PayoutPreferences() {
  return (
    <div className="flex flex-col gap-4 ">
      <header className="flex items-center text-[16px] lg:text-[24px] gap-3">
        <div className="p-3 rounded-full border border-[#333] bg-[rgba(34, 34, 34, 0.702)] flex items-center justify-center ">
          <MdOutlineCreditCard
            color="#87698C"
            size={isTabletOrMobile ? 24 : 30}
          />
        </div>
        <p>Payout Preferences</p>
      </header>

      {/* List */}
      <ul className="flex flex-col text-[14px] lg:text-[18px] text-[#AAAAAA] gap-2">
        <li className="flex items-center justify-between p-2">
          <span>Preferred receiving wallet</span>
        </li>
        <li className="flex items-center justify-between p-2">
          <span>Preferred token</span>
        </li>
      </ul>

      <div className="w-fit ml-auto ">
        <PurpleBtn
          text={"Save preferences"}
          action={() => {}}
        />
      </div>
    </div>
  );
}
