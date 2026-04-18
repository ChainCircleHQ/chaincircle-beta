import { PiCirclesThreeBold } from "react-icons/pi";
import { FaSackDollar } from "react-icons/fa6";
import ProfileDetails from "../Pages/Profile/ProfileDetails";
import CountUp from "../Components/CountUp";
import { useUserStats } from "../hooks/useCircleData";
import { formatDate } from "../utils/formatDate";
import useIsTabletOrMobile from "../hooks/useIsTabletOrMobile";

// Tier badge mapping
const getTierBadge = (tier, totalCircles) => {
  const tierLower = tier?.toLowerCase() || 'none';

  if (tierLower.includes('gold')) {
    return {
      image: '/assets/Gold-Badge.png',
      bg: 'bg-[rgba(253,170,27,0.77)]',
      border: 'border-[#FDA318]',
      text: 'text-[#FFC24C]',
      name: 'Gold Tier'
    };
  } else if (tierLower.includes('silver')) {
    return {
      image: '/assets/Silver-Badge.png',
      bg: 'bg-[rgba(192,192,192,0.77)]',
      border: 'border-[#C0C0C0]',
      text: 'text-[#E8E8E8]',
      name: 'Silver Tier'
    };
  } else if (tierLower.includes('bronze')) {
    return {
      image: '/assets/Bronze-Badge.png',
      bg: 'bg-[rgba(205,127,50,0.77)]',
      border: 'border-[#CD7F32]',
      text: 'text-[#E5A76F]',
      name: 'Bronze Tier'
    };
  } else if (totalCircles >= 1) {
    // Welcome badge for first-time users who created at least one circle
    return {
      image: '/assets/icons8-welcome-96.png',
      bg: 'bg-[rgba(212,72,236,0.77)]',
      border: 'border-[#D548EC]',
      text: 'text-[#F4AEFF]',
      name: 'Welcome Badge'
    };
  } else {
    // No badge for users with no circles
    return {
      image: '/assets/Badge.png',
      bg: 'bg-[rgba(128,128,128,0.77)]',
      border: 'border-[#808080]',
      text: 'text-[#AAAAAA]',
      name: 'No Badge'
    };
  }
};

export default function Profile() {
  const { data: stats } = useUserStats();
  const isTabletOrMobile = useIsTabletOrMobile();

  const reputation = stats?.reputation || {};
  const totalCircles = stats?.totalCircles || 0;
  const tierInfo = getTierBadge(reputation.tier, totalCircles);

  // Use the same totalSaved as dashboard (from core contract, not reputation contract)
  const totalSaved = stats?.totalSaved ? parseFloat(stats.totalSaved) : 0;

  return (
    <div className="flex flex-col gap-12">
      <header
        className="px-8 py-[26px] rounded-[16px] flex lg:items-stretch items-center flex-col lg:flex-row gap-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/dashboard-bg-card.png')" }}
      >
        <div className="flex items-center  gap-4 ">
          <div className="relative">
            <img
              src={tierInfo.image}
              alt={`${tierInfo.name} badge`}
              className={`w-[60px] h-[60px] lg:w-[120px] lg:h-[120px] ${tierInfo.isWelcome ? 'animate-bounce' : 'animate-pulse'}`}
              width="120"
              height="120"
            />
            {tierInfo.isWelcome && (
              <div className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2">
                <span className="text-[20px] lg:text-[30px] animate-pulse">🎉</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-bold text-[20px] lg:text-[30px] ">
              <CountUp target={reputation.score || 0} duration={2000} />
              /1000
            </h1>
            <div
              className={`px-2.5 py-2 rounded-full font-dm text-[12px] lg:text-[21px] text-center border ${tierInfo.bg} ${tierInfo.border} ${tierInfo.text}`}
            >
              {tierInfo.name}
            </div>
            {reputation.source === 'off-chain' && (
              <span
                className="mt-1 self-start text-[10px] lg:text-[11px] font-dm px-2 py-0.5 rounded-full border border-[#F4AEFF]/40 bg-black/40 text-[#F4AEFF]/70"
                title="Computed from indexed on-chain events. Will migrate on-chain after the next ChainCircleCore redeploy."
              >
                off-chain · testnet
              </span>
            )}
          </div>
        </div>

        <div className="lg:w-[480px] w-[90%] grid grid-cols-2 gap-x-4.5 gap-y-4 font-dm text-[12px] lg:text-[16px] ">
          <div className="w-full bg-[#ad3dc0] py-2 rounded-[8px]  flex items-center justify-center gap-2">
            <p>User since {reputation.accountAge && reputation.accountAge > 0 ? formatDate(reputation.accountAge) : 'New user'}</p>
          </div>
          <div className="w-full bg-[#ad3dc0] py-2 rounded-[8px]  flex items-center justify-center gap-2">
            <PiCirclesThreeBold size={isTabletOrMobile ? 12 : 24} color="#AEFFDA" />
            <div className="flex items-center gap-1">
              <CountUp target={Number(reputation.completedCircles) || 0} duration={300} />
              <p> completed circles</p>
            </div>
          </div>
          <div className="w-full bg-[#ad3dc0] py-2 rounded-[8px]  flex items-center justify-center gap-2">
            <FaSackDollar size={isTabletOrMobile ? 12 : 24} color="#FBFFAE" />
            <div className="flex items-center gap-1">
              <p>$</p>
              <CountUp target={totalSaved} duration={2500} />
              <p> total saved</p>
            </div>
          </div>
          <div className="w-full bg-[#ad3dc0] py-2 rounded-[8px]  flex items-center justify-center gap-2">
            <FaSackDollar size={isTabletOrMobile ? 12 : 24} color="#FBFFAE" />
            <p>{Number(reputation.onTimeRate) || 0}% On-time rate</p>
          </div>
        </div>
      </header>

      <ProfileDetails />
    </div>
  );
}
