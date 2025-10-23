import React from "react";
import { Link } from "react-router";

export default function Dashboard404() {
  return (
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
  );
};
