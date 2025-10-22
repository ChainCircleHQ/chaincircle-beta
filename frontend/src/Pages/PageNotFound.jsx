import React from "react";
import { TbArrowRightFromArc } from "react-icons/tb";
import { CiGrid42 } from "react-icons/ci";
import { PiCirclesThreeBold } from "react-icons/pi";
import { MdOutlineCreditCard } from "react-icons/md";
import { FaRegUserCircle } from "react-icons/fa";
import { FaRegBell } from "react-icons/fa6";

import { Link, Outlet, useLocation, useNavigate } from "react-router";

export default function PageNotFound() {
  const location = useLocation();

  const navigate = useNavigate();

  const isMobile = window.innerWidth <= 800;

  console.log(isMobile);

  return (
    <>
      {isMobile ? (
        <div className="max-h-screen min-h-[calc(100vh-200px)] flex  flex-col gap-4">
          <header className="flex items-center justify-center py-8 gap-2 border-b border-b-[#F4AEFF] ">
            <img
              src="/assets/header-logo.png"
              alt=""
              className="w-[40%] h-[50px] "
            />
          </header>
          <ErrorContainer />
          <Link
            to="/"
            className="px-6 w-fit mx-auto font-bold text-[16px] py-3 bg-[#C935E2] rounded-full "
          >
            Back to Home
          </Link>
        </div>
      ) : (
        <div className="flex gap-[68px] h-screen text-[21px] font-dm ">
          {/* Sidebar */}
          <div
            className="w-[306px] p-10 h-full flex flex-col gap-[50px]"
            style={{
              background:
                "linear-gradient(to bottom, #111111 80%, #f2b4f8 100%)",
            }}
          >
            <Link to={'/'} className="flex items-center gap-2">
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
              onClick={() => navigate("/")}
              className={`p-2 rounded-[8px] flex items-center gap-4 w-full justify-center cursor-pointer `}
            >
              <TbArrowRightFromArc size={32} />
              <p>Log out</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto h-full flex flex-col gap-10 px-20 py-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 ">
                <img
                  src="/assets/User-pic.png"
                  alt="profile"
                  className="w-[40px] h-[40px] rounded-full"
                />
                <p className="font-dm text-[24px] "> Winszn </p>
              </div>
              <div className="flex items-center  gap-4 ">
                <div className="border rounded-full py-2 px-3 flex items-center gap-[13px] ">
                  <img src="/assets/Sent.png" alt="" className="h-10 w-10" />
                  <p className="text-[#aaaaaa] text-[21px] ">
                    Oxc4Ahsa77Hdskja9cE
                  </p>
                </div>
                <div className="relative">
                  <FaRegBell size={40} />
                  <div className="absolute rounded-full w-4 h-4 bg-[#DB0000] top-2 right-2 "></div>
                </div>
              </div>
            </div>
            <ErrorContainer />
          </div>
        </div>
      )}
    </>
  );
}

const ErrorContainer = () => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="h-[372px] w-[70%] relative flex items-end ">
        <img
          src="/assets/err404.png"
          alt=""
          className="absolute top-25 -z-10 animate-swing "
        />
        <p className="text-center pt-[56px] bg-[#000] pb-10 w-full border-t border-t-[#fff] ">
          OOPS... PAGE NOT FOUND
        </p>
      </div>
    </div>
  );
};
