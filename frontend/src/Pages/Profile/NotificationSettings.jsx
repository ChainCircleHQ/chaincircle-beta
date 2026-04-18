import React from 'react'
import { FaRegBell } from "react-icons/fa";

import useIsTabletOrMobile from '../../hooks/useIsTabletOrMobile';
export default function NotificationSettings() {
  const isTabletOrMobile = useIsTabletOrMobile();
    const [emailNotifications, setEmailNotifications] = React.useState(true);
    const [pushNotifications, setPushNotifications] = React.useState(false);
    const [paymentReminders, setPaymentReminders] = React.useState(false);
    const [payoutAlerts, setPayoutAlerts] = React.useState(false);
    const [circleUpdates, setCircleUpdates] = React.useState(false);
  const [marketing, setMarketing] = React.useState(false);
  

  return (
    <div className="flex flex-col gap-4 ">
      <header className="flex items-center text-[16px] lg:text-[24px] gap-3">
        <div className="p-3 rounded-full border border-[#333] bg-[rgba(34, 34, 34, 0.702)] flex items-center justify-center ">
          <FaRegBell color="#87698C" size={isTabletOrMobile ? 24 : 30} />
        </div>
        <p>Notification Settings</p>
      </header>

      {/* List */}
      <ul className="flex flex-col text-[#AAAAAA] gap-2">
        <li className="flex text-[14px] lg:text-[18px] items-center justify-between p-2">
          <span>Email notifications</span>
          <div
            className={`lg:w-[51px] lg:h-[28px] w-[25px] h-[14px] flex items-center rounded-full p-1.5 cursor-pointer transition-all duration-1000 ${
              emailNotifications
                ? "justify-end bg-[#D548EC]"
                : "justify-start bg-white"
            }`}
            onClick={() => setEmailNotifications(!emailNotifications)}
          >
            <div
              className={`lg:w-[22px] lg:h-[22px] w-[11px] h-[11px] rounded-full border transition-all duration-200 ${
                emailNotifications ? "bg-white" : "bg-[#AAAAAA]"
              }`}
            ></div>
          </div>
        </li>
        <li className="flex flex-col text-[14px] lg:text-[18px] gap-3">
          <div className="flex items-center justify-between p-2">
            <span>Push notifications</span>
            <div
              className={`lg:w-[51px] lg:h-[28px] w-[25px] h-[14px] flex items-center rounded-full p-1.5 cursor-pointer transition-all duration-1000 ${
                pushNotifications
                  ? "justify-end bg-[#D548EC]"
                  : "justify-start bg-white"
              }`}
              onClick={() => {
                setPushNotifications(!pushNotifications);
                if (!pushNotifications === false) {
                  setPaymentReminders(false);
                }
              }}
            >
              <div
                className={`lg:w-[22px] lg:h-[22px] w-[11px] h-[11px] rounded-full border transition-all duration-200 ${
                  pushNotifications ? "bg-white" : "bg-[#AAAAAA]"
                }`}
              ></div>
            </div>
          </div>

          <div className="flex flex-col gap-3 ml-12">
            {/* Payment Reminders */}
            <div
              className={`flex items-center justify-between p-2 ${
                !pushNotifications ? "opacity-50" : ""
              }`}
            >
              <span>Payment Reminders</span>
              <div
                className={`lg:w-[51px] lg:h-[28px] w-[25px] h-[14px] flex items-center rounded-full px-1 lg:px-1.5 p-1.5 transition-all duration-1000 ${
                  !pushNotifications
                    ? "cursor-not-allowed justify-start bg-gray-300"
                    : paymentReminders
                    ? "cursor-pointer justify-end bg-[#D548EC]"
                    : "cursor-pointer justify-start bg-white"
                }`}
                onClick={() =>
                  pushNotifications && setPaymentReminders(!paymentReminders)
                }
              >
                <div
                  className={`lg:w-[22px] lg:h-[22px] w-[11px] h-[11px] rounded-full border transition-all duration-200 ${
                    !pushNotifications
                      ? "bg-gray-400"
                      : paymentReminders
                      ? "bg-white"
                      : "bg-[#AAAAAA]"
                  }`}
                ></div>
              </div>
            </div>

            {/* Payout Alerts */}
            <div
              className={`flex items-center justify-between p-2 ${
                !pushNotifications ? "opacity-50" : ""
              }`}
            >
              <span>Payout Alerts</span>
              <div
                className={`lg:w-[51px] lg:h-[28px] w-[25px] h-[14px] flex items-center rounded-full px-1 lg:px-1.5 p-1.5 transition-all duration-1000 ${
                  !pushNotifications
                    ? "cursor-not-allowed justify-start bg-gray-300"
                    : payoutAlerts
                    ? "cursor-pointer justify-end bg-[#D548EC]"
                    : "cursor-pointer justify-start bg-white"
                }`}
                onClick={() =>
                  pushNotifications && setPayoutAlerts(!payoutAlerts)
                }
              >
                <div
                  className={`lg:w-[22px] lg:h-[22px] w-[11px] h-[11px] rounded-full border transition-all duration-200 ${
                    !pushNotifications
                      ? "bg-gray-400"
                      : payoutAlerts
                      ? "bg-white"
                      : "bg-[#AAAAAA]"
                  }`}
                ></div>
              </div>
            </div>

            {/* Circle Updates */}
            <div
              className={`flex items-center justify-between p-2 ${
                !pushNotifications ? "opacity-50" : ""
              }`}
            >
              <span>Circle Updates</span>
              <div
                className={`lg:w-[51px] lg:h-[28px] w-[25px] h-[14px] flex items-center rounded-full px-1 lg:px-1.5 p-1.5 transition-all duration-1000 ${
                  !pushNotifications
                    ? "cursor-not-allowed justify-start bg-gray-300"
                    : circleUpdates
                    ? "cursor-pointer justify-end bg-[#D548EC]"
                    : "cursor-pointer justify-start bg-white"
                }`}
                onClick={() =>
                  pushNotifications && setCircleUpdates(!circleUpdates)
                }
              >
                <div
                  className={`lg:w-[22px] lg:h-[22px] w-[11px] h-[11px] rounded-full border transition-all duration-200 ${
                    !pushNotifications
                      ? "bg-gray-400"
                      : circleUpdates
                      ? "bg-white"
                      : "bg-[#AAAAAA]"
                  }`}
                ></div>
              </div>
            </div>

            {/* Marketing */}
            <div
              className={`flex items-center justify-between p-2 ${
                !pushNotifications ? "opacity-50" : ""
              }`}
            >
              <span>Marketing</span>
              <div
                className={`lg:w-[51px] lg:h-[28px] w-[25px] h-[14px] flex items-center rounded-full px-1 lg:px-1.5 p-1.5 transition-all duration-1000 ${
                  !pushNotifications
                    ? "cursor-not-allowed justify-start bg-gray-300"
                    : marketing
                    ? "cursor-pointer justify-end bg-[#D548EC]"
                    : "cursor-pointer justify-start bg-white"
                }`}
                onClick={() => pushNotifications && setMarketing(!marketing)}
              >
                <div
                  className={`lg:w-[22px] lg:h-[22px] w-[11px] h-[11px] rounded-full border transition-all duration-200 ${
                    !pushNotifications
                      ? "bg-gray-400"
                      : marketing
                      ? "bg-white"
                      : "bg-[#AAAAAA]"
                  }`}
                ></div>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
}
