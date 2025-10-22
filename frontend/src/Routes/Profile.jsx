import { PiCirclesThreeBold } from "react-icons/pi";
import { FaSackDollar } from "react-icons/fa6";
import ProfileDetails from "../Pages/Profile/ProfileDetails";
import CountUp from "../Components/CountUp";
import { useUserStats } from "../hooks/useCircleData";
import { formatDate } from "../utils/formatDate";

const isTabletOrMobile = window.innerWidth <= 1014;

// Tier badge mapping
const getTierBadge = (tier) => {
  const tierLower = tier?.toLowerCase() || 'bronze';

  if (tierLower.includes('gold')) {
    return {
      image: '/assets/Gold-Badge.png',
      bg: 'bg-[rgba(253, 170, 27, 0.77)]',
      border: 'border-[#FDA318]',
      text: 'text-[#FFC24C]'
    };
  } else if (tierLower.includes('silver')) {
    return {
      image: '/assets/Silver-Badge.png',
      bg: 'bg-[rgba(192, 192, 192, 0.77)]',
      border: 'border-[#C0C0C0]',
      text: 'text-[#E8E8E8]'
    };
  } else {
    return {
      image: '/assets/Bronze-Badge.png',
      bg: 'bg-[rgba(205, 127, 50, 0.77)]',
      border: 'border-[#CD7F32]',
      text: 'text-[#E5A76F]'
    };
  }
};

export default function Profile() {
  const { data: stats } = useUserStats();

  const reputation = stats?.reputation || {};
  const tierInfo = getTierBadge(reputation.tier);

  // Use the same totalSaved as dashboard (from core contract, not reputation contract)
  const totalSaved = stats?.totalSaved ? parseFloat(stats.totalSaved) : 0;

  return (
    <div className="flex flex-col gap-12">
      <header
        className="px-8 py-[26px] rounded-[16px] flex lg:items-stretch items-center flex-col lg:flex-row gap-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/dashboard-bg-card.png')" }}
      >
        <div className="flex items-center  gap-4 ">
          <img
            src={tierInfo.image}
            alt="profile"
            className="w-[60px] h-[60px] lg:w-[120px] lg:h-[120px] animate-pulse "
          />
          <div className="flex flex-col gap-1">
            <h1 className="font-bold text-[20px] lg:text-[30px] ">
              <CountUp target={reputation.score || 0} duration={2000} />
              /1000
            </h1>
            <div
              className={`px-2.5 py-2 rounded-full font-dm text-[12px] lg:text-[21px] text-center border ${tierInfo.bg} ${tierInfo.border} ${tierInfo.text}`}
            >
              {reputation.tier || 'Bronze Tier'}
            </div>
          </div>
        </div>

        <div className="lg:w-[480px] w-[90%] grid grid-cols-2 gap-x-4.5 gap-y-4 font-dm text-[12px] lg:text-[16px] ">
          <div className="w-full bg-[#ad3dc0] py-2 rounded-[8px]  flex items-center justify-center gap-2">
            <p>User since {reputation.accountAge && reputation.accountAge > 0 ? formatDate(reputation.accountAge) : 'New user'}</p>
          </div>
          <div className="w-full bg-[#ad3dc0] py-2 rounded-[8px]  flex items-center justify-center gap-2">
            <PiCirclesThreeBold size={isTabletOrMobile? 12 : 24} color="#AEFFDA" />
            <div className="flex items-center gap-1">
              <CountUp target={Number(reputation.completedCircles) || 0} duration={300} />
              <p> completed circles</p>
            </div>
          </div>
          <div className="w-full bg-[#ad3dc0] py-2 rounded-[8px]  flex items-center justify-center gap-2">
            <FaSackDollar size={isTabletOrMobile? 12 : 24} color="#FBFFAE" />
            <div className="flex items-center gap-1">
              <p>$</p>
              <CountUp target={totalSaved} duration={2500} />
              <p> total saved</p>
            </div>
          </div>
          <div className="w-full bg-[#ad3dc0] py-2 rounded-[8px]  flex items-center justify-center gap-2">
            <FaSackDollar size={isTabletOrMobile? 12 : 24} color="#FBFFAE" />
            <p>{Number(reputation.onTimeRate) || 0}% On-time rate</p>
          </div>
        </div>
      </header>

      <ProfileDetails />
    </div>
  );
}
