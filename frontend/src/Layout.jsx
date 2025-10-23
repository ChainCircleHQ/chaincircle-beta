import React from 'react'
import { TbArrowRightFromArc } from "react-icons/tb";
import { CiGrid42 } from "react-icons/ci";
import { PiCirclesThreeBold } from "react-icons/pi";
import { MdOutlineCreditCard } from "react-icons/md";
import { FaRegUserCircle } from "react-icons/fa";
import { FaRegBell } from "react-icons/fa6";
import { PushUniversalAccountButton, usePushWalletContext } from '@pushchain/ui-kit';

import { Link, Outlet, useLocation, useNavigate } from 'react-router'

export default function chain() {
  const location = useLocation();
  const navigate = useNavigate();
  const { handleUserLogOutEvent } = usePushWalletContext();
  const [sidebarVisible, setSidebarVisible] = React.useState(true);

  const isTabletOrMobile = window.innerWidth <= 1014;
  const isOnNotificationPage = location.pathname === '/chain/notification';

  return (
    <div className="flex gap-[68px] h-screen text-[21px] font-dm ">
      {/* Sidebar */}
      {!isTabletOrMobile && sidebarVisible && (
        <div
          className="w-[306px] p-10 h-full flex flex-col gap-[50px]"
          style={{
            background: "linear-gradient(to bottom, #111111 80%, #f2b4f8 100%)",
          }}
        >
          <Link to={"/"} className="flex items-center gap-2">
            <img
              src="/assets/logo.png"
              alt="logo"
              className="w-[25px] h-[25px] "
            />
            <h3 className="">Chaincircle</h3>
          </Link>

          <div className="flex-1 flex flex-col gap-10">
            <Link
              to={"/chain/dashboard"}
              className={`py-2 px-4 rounded-[8px] flex items-center transition-all ease-in-out gap-4 w-full text-white ${
                location.pathname === "/chain" ||
                location.pathname === "/chain/dashboard"
                  ? "bg-[#D548EC] hover:bg-[#B83CC3]"
                  : "bg-transparent hover:bg-[#D548EC]"
              } `}
            >
              <CiGrid42 size={32} className="text-[#aaa] " />
              <p>Dashboard</p>
            </Link>
            <Link
              to={"/chain/circle"}
              className={`py-2 px-4 rounded-[8px] flex items-center transition-all ease-in-out gap-4 w-full text-white ${
                location.pathname === "/chain/circle"
                  ? "bg-[#D548EC] hover:bg-[#B83CC3]"
                  : "bg-transparent hover:bg-[#D548EC]"
              } `}
            >
              <PiCirclesThreeBold size={32} className="text-[#aaa] " />
              <p>Circle</p>
            </Link>
            <Link
              to={"/chain/payout"}
              className={`py-2 px-4 rounded-[8px] flex items-center transition-all ease-in-out gap-4 w-full text-white ${
                location.pathname === "/chain/payout"
                  ? "bg-[#D548EC] hover:bg-[#B83CC3]"
                  : "bg-transparent hover:bg-[#D548EC]"
              } `}
            >
              <MdOutlineCreditCard size={32} className="text-[#aaa] " />
              <p>Payouts</p>
            </Link>
            <Link
              to={"/chain/profile"}
              className={`py-2 px-4 rounded-[8px] flex items-center transition-all ease-in-out gap-4 w-full text-white ${
                location.pathname === "/chain/profile"
                  ? "bg-[#D548EC] hover:bg-[#B83CC3]"
                  : "bg-transparent hover:bg-[#D548EC]"
              } `}
            >
              <FaRegUserCircle size={32} className="text-[#aaa] " />
              <p>Profile</p>
            </Link>
          </div>

          <div
            onClick={() => {
              // Disconnect wallet and navigate to home
              if (handleUserLogOutEvent) {
                handleUserLogOutEvent();
              }
              navigate("/");
            }}
            className={`p-2 rounded-[8px] flex items-center gap-4 w-full justify-center cursor-pointer hover:bg-[#D548EC] transition-all `}
          >
            <TbArrowRightFromArc size={32} />
            <p>Log out</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto h-full flex flex-col gap-10 px-7 lg:px-20 py-10">
        <div className="flex items-center justify-between w-full">
          {/* Sidebar Toggle Button - Desktop Only */}
          {!isTabletOrMobile && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarVisible(!sidebarVisible)}
                className="p-2 rounded-lg hover:bg-[#D548EC]/20 transition-colors"
                title={sidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
              >
                {sidebarVisible ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="9" y1="3" x2="9" y2="21"/>
                    <line x1="14" y1="8" x2="19" y2="8"/>
                    <line x1="14" y1="12" x2="19" y2="12"/>
                    <line x1="14" y1="16" x2="19" y2="16"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                )}
              </button>
              {!sidebarVisible && (
                <Link to={"/"} className="flex items-center gap-2">
                  <img
                    src="/assets/logo.png"
                    alt="logo"
                    className="w-[25px] h-[25px]"
                  />
                  <h3>Chaincircle</h3>
                </Link>
              )}
            </div>
          )}

          {/* Right Side - Notifications & Account */}
          <div className={`${!isTabletOrMobile && !sidebarVisible ? 'ml-auto' : 'lg:ml-auto'} justify-between lg:justify-end lg:w-fit flex flex-row-reverse items-center gap-4`}>
            <div
              className="relative cursor-pointer hover:scale-110 transition-transform"
              onClick={() => {
                if (isOnNotificationPage) {
                  navigate(-1); // Go back to previous page
                } else {
                  navigate('/chain/notification');
                }
              }}
            >
              <FaRegBell size={isTabletOrMobile ? 24 : 35} />
              <div className="absolute rounded-full w-3 h-3 lg:w-4 lg:h-4 bg-[#DB0000] top-2 right-2 "></div>
            </div>
            <div className="max-w-[200px]">
              <PushUniversalAccountButton />
            </div>
          </div>
        </div>
        <div className="flex-1">
          <Outlet />
        </div>

        {/* Bottom Navigation */}
        <div className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 w-[80%] bg-[#d648ec43] backdrop-blur-md  z-50 flex items-center justify-evenly px-10 py-4 rounded-full ">
          <Link to={"/chain/dashboard"}>
            <CiGrid42
              size={32}
              className={`text-[#fff] p-1.5 rounded-[4px] ${
                location.pathname === "/chain" ||
                location.pathname === "/chain/dashboard"
                  ? "bg-[#D548EC] hover:bg-[#B83CC3]"
                  : "bg-transparent hover:bg-[#D548EC]"
              } transition-all ease-in-out`}
            />
          </Link>

          <Link to={"/chain/circle"}>
            <PiCirclesThreeBold
              size={32}
              className={`text-[#fff] p-1.5 rounded-[4px] ${
                location.pathname === "/chain/circle"
                  ? "bg-[#D548EC] hover:bg-[#B83CC3]"
                  : "bg-transparent hover:bg-[#D548EC]"
              } transition-all ease-in-out`}
            />
          </Link>

          <Link to={"/chain/payout"}>
            <MdOutlineCreditCard
              size={32}
              className={`text-[#fff] p-1.5 rounded-[4px] ${
                location.pathname === "/chain/payout"
                  ? "bg-[#D548EC] hover:bg-[#B83CC3]"
                  : "bg-transparent hover:bg-[#D548EC]"
              } transition-all ease-in-out`}
            />
          </Link>

          <Link to={"/chain/profile"}>
            <FaRegUserCircle
              size={32}
              className={`text-[#fff] p-1.5 rounded-[4px] ${
                location.pathname === "/chain/profile"
                  ? "bg-[#D548EC] hover:bg-[#B83CC3]"
                  : "bg-transparent hover:bg-[#D548EC]"
              } transition-all ease-in-out`}
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
