import React from 'react'
import { TbShieldStar } from "react-icons/tb";
import { RxCaretRight } from "react-icons/rx";
import { Link } from 'react-router';

import useIsTabletOrMobile from '../../hooks/useIsTabletOrMobile';

export default function AccountAction() {
  const isTabletOrMobile = useIsTabletOrMobile();
  return (
    <div className="flex flex-col gap-4 ">
      <header className="flex items-center text-[16px] lg:text-[24px] gap-3">
        <div className="p-3 rounded-full border border-[#333] bg-[rgba(34, 34, 34, 0.702)] flex items-center justify-center ">
          <TbShieldStar color="#87698C" size={isTabletOrMobile ? 24 : 30} />
        </div>
        <p>Account Action</p>
      </header>

      {/* List */}
      <ul className="flex flex-col text-[#AAAAAA] gap-2 text-[14px] lg:text-[18px] ">
        <li className="flex items-center justify-between p-2">
          <span>Export Data</span>
          <Link to="/chain/circle">
            <RxCaretRight cursor="pointer" />
          </Link>
        </li>
        <li className="flex items-center justify-between p-2">
          <span>Disconnect wallets</span>
        </li>
        <li className="flex items-center justify-between p-2">
          <span>Delete account</span>
        </li>
      </ul>
    </div>
  );
}
