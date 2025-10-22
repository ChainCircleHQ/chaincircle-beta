import React from 'react'
import { PiCirclesThreeBold } from "react-icons/pi";
import { RxCaretRight } from "react-icons/rx";
import { Link } from 'react-router';

export default function CircleHistory() {
const isTabletOrMobile = window.innerWidth <= 1014;
  return (
    <div className="flex flex-col gap-4 ">
      <header className="flex items-center text-[16px] lg:text-[24px] gap-3">
        <div className="p-3 rounded-full border border-[#333] bg-[rgba(34, 34, 34, 0.702)] flex items-center justify-center ">
          <PiCirclesThreeBold
            color="#87698C"
            size={isTabletOrMobile ? 24 : 30}
          />
        </div>
        <p>Circle History</p>
      </header>

      {/* List */}
      <ul className="flex flex-col text-[#AAAAAA] gap-2">
        <li className="flex items-center justify-between p-2 text-[14px] lg:text-[18px] ">
          <span>Table of past Circles</span>
          <Link to="/chain/circle">
            <RxCaretRight cursor="pointer" size={isTabletOrMobile ? 20 : 25} />
          </Link>
        </li>
      </ul>
    </div>
  );
}
