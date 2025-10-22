import { PiCirclesThreeBold } from "react-icons/pi";
import { RxCaretRight } from "react-icons/rx";
import { Link } from 'react-router';
import CountUp from '../../Components/CountUp';
import { useUserStats } from '../../hooks/useCircleData';

const isTabletOrMobile = window.innerWidth <= 1014;

export default function StatsArchive() {
  const { data: stats } = useUserStats();
  const reputation = stats?.reputation || {};

  // Calculate success rate: completed circles / total circles * 100
  const totalCircles = stats?.totalCircles || 0;
  const completedCircles = reputation.completedCircles || 0;
  const successRate = totalCircles > 0 ? Math.round((completedCircles / totalCircles) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 ">
      <header className="flex items-center text-[16px] lg:text-[24px] gap-3">
        <div className="p-3 rounded-full border border-[#333] bg-[rgba(34, 34, 34, 0.702)] flex items-center justify-center ">
          <PiCirclesThreeBold
            color="#87698C"
            size={isTabletOrMobile ? 24 : 30}
          />
        </div>
        <p>Stats & Achievements</p>
      </header>

      {/* List */}
      <ul className="flex flex-col text-[#AAAAAA] text-[14px] lg:text-[18px]  gap-2">
        <li className="flex items-center justify-between p-2">
          <span>Total Circles</span>
          <div className="px-4 py-2 border rounded-full  ">
            <CountUp target={totalCircles} duration={500} />
          </div>
        </li>
        <li className="flex items-center justify-between p-2">
          <span>Success rate</span>
          <div className="px-4 py-2 border rounded-full  ">
            <CountUp target={successRate} duration={500} /> %
          </div>
        </li>
        <li className="flex items-center justify-between p-2">
          <span>Longest Streak</span>
          <div className="px-4 py-2 border rounded-full  ">
            <CountUp target={reputation.longestStreak || 0} duration={500} /> on-time payments
          </div>
        </li>
        <li className="flex items-center justify-between p-2">
          <span>Table of past Circles</span>
          <Link to="/chain/circle">
            <RxCaretRight cursor="pointer" size={isTabletOrMobile ? 24 : 30}  />
          </Link>
        </li>
      </ul>
    </div>
  );
}
