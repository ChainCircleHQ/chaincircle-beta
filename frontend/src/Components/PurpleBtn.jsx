import React from 'react'
import { FaArrowRight } from "react-icons/fa6";
import { Link } from 'react-router';

export default function PurpleBtn( {text, font="normal", icon, to='/', action} ) {
  return (
    <>
      {action ? (
        <div
          className="bg-[#D548EC] hover:bg-[#B83CC3] flex items-center gap-2 cursor-pointer transition ease-in-out px-[31px] py-[12px] text-[17px] lg:text-[24px] text-white rounded-[16px] font-${font} hover:scale-x-105"
          onClick={action}
        >
          {text && <p>{text}</p>}
          {icon && icon === "rightArrow" && <FaArrowRight />}
        </div>
      ) : (
        <Link
          to={to}
          className={`bg-[#D548EC] hover:bg-[#B83CC3] flex items-center gap-2 cursor-pointer transition ease-in-out px-[31px] py-[12px] text-[17px] lg:text-[24px] text-white rounded-[16px] hover:scale-x-105 font-${font}`}
        >
          {text && <p>{text}</p>}
          {icon && icon === "rightArrow" && <FaArrowRight />}
        </Link>
      )}
    </>
  );
}
