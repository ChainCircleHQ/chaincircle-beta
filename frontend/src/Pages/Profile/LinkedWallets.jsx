import React from 'react'
import { RiWallet3Line } from "react-icons/ri";
import PurpleBtn from '../../Components/PurpleBtn';

  const isTabletOrMobile = window.innerWidth <= 1014;

export default function LinkedWallets() {
  return (
    <div className="flex flex-col gap-4 ">
      <header className="flex items-center text-[16px] lg:text-[24px] gap-3">
        <div className="p-3 rounded-full border  border-[#333] bg-[rgba(34, 34, 34, 0.702)] flex items-center justify-center ">
          <RiWallet3Line color="#87698C" size={isTabletOrMobile ? 24 : 30} />
        </div>
        <p>Linked Wallets</p>
      </header>

      {/* List */}
      <ul className="flex flex-col text-[#AAAAAA] gap-2 text-[14px] lg:text-[18px]">
        <li className="flex items-center justify-between p-2">
          <span>Primary Wallet</span>
        </li>
        <li className="flex items-center justify-between p-2">
          <span>Secondary Wallet</span>
        </li>
      </ul>

      <div className="w-fit ml-auto ">
      <PurpleBtn text={"Link New Wallet"} action={()=>{}} />
        
      </div>
    </div>
  );
}
