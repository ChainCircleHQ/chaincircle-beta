import React from "react";
import { Link } from "react-router";

export default function General404() {
  const isMobile = window.innerWidth <= 800;

  return (
    <>
      {isMobile ? (
        <div className="max-h-screen min-h-[calc(100vh-200px)] flex flex-col gap-4">
          <header className="flex items-center justify-center py-8 gap-2 border-b border-b-[#F4AEFF]">
            <img
              src="/assets/header-logo.png"
              alt=""
              className="h-[50px] object-contain"
            />
          </header>
          <div className="flex-1 flex items-center justify-center">
            <div className="h-[372px] w-[70%] relative flex items-end">
              <img
                src="/assets/err404.png"
                alt=""
                className="absolute top-0 left-0 w-full h-full object-contain -z-10 animate-swing"
              />
              <p className="text-center pt-[56px] bg-[#000] pb-10 w-full border-t border-t-[#fff]">
                OOPS... PAGE NOT FOUND
              </p>
            </div>
          </div>
          <Link
            to="/"
            className="px-6 w-fit mx-auto font-bold text-[16px] py-3 bg-[#C935E2] rounded-full"
          >
            Back to Home
          </Link>
        </div>
      ) : (
        <div className="h-screen flex flex-col">
          {/* Fixed Header */}
          <header className="flex items-center justify-between px-20 py-8 border-b border-b-[#F4AEFF]">
            <div className="flex items-center gap-2">
              <img
                src="/assets/logo.png"
                alt="logo"
                className="w-[25px] h-[25px]"
              />
              <h3>Chaincircle</h3>
            </div>
            <Link
              to="/"
              className="px-6 py-3 bg-[#C935E2] rounded-full font-bold"
            >
              Go Home
            </Link>
          </header>

          {/* Error Content */}
          <div className="flex-1 flex items-center justify-center">
            <div className="h-[372px] w-[70%] relative flex items-end">
              <img
                src="/assets/err404.png"
                alt=""
                className="absolute top-0 left-0 w-full h-full object-contain -z-10 animate-swing"
              />
              <p className="text-center pt-[56px] bg-[#000] pb-10 w-full border-t border-t-[#fff]">
                OOPS... PAGE NOT FOUND
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}