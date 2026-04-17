import React, { useState, useMemo } from 'react'
import { FiSearch } from 'react-icons/fi'
import { TbArrowUpRight } from 'react-icons/tb'
import { BiDollarCircle } from 'react-icons/bi'
import { MdTrendingDown } from 'react-icons/md'
import { FaTrophy, FaMedal, FaUserPlus } from 'react-icons/fa'
import { useNotifications } from '../hooks/useNotifications'

export default function Notification() {
  const [activeTab, setActiveTab] = useState('Transactions')
  const [searchTerm, setSearchTerm] = useState('')
  const { data: blockchainNotifications, isLoading } = useNotifications()

  // Notification tabs
  const tabs = ['Transactions', 'Reminders', 'Services']

  // Helper function to format time ago
  const formatTimeAgo = (timestamp) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return `${Math.floor(diff / 604800)} weeks ago`;
  };

  // Helper function to format time until due
  const formatTimeUntil = (seconds) => {
    if (seconds < 3600) return `Due in ${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `Due in ${Math.floor(seconds / 3600)} hours`;
    return `Due in ${Math.floor(seconds / 86400)} days`;
  };

  // Transform blockchain notifications into UI format
  const transformedNotifications = useMemo(() => {
    if (!blockchainNotifications) return { Transactions: [], Reminders: [], Services: [] };

    const transactions = blockchainNotifications.transactions.map(notif => {
      switch (notif.type) {
        case 'contribution':
          return {
            id: notif.id,
            icon: <TbArrowUpRight className="text-white" size={20} />,
            iconBg: 'bg-green-600',
            title: `You contributed to Circle #${notif.circleId}`,
            time: formatTimeAgo(notif.timestamp),
            amount: `${notif.amount} CUSD`,
            type: 'save'
          };

        case 'payout':
          return {
            id: notif.id,
            icon: <BiDollarCircle className="text-white" size={20} />,
            iconBg: 'bg-blue-600',
            title: `You received payout from Circle #${notif.circleId}`,
            time: formatTimeAgo(notif.timestamp),
            amount: `${notif.amount} CUSD`,
            type: 'payout'
          };

        case 'interest':
          return {
            id: notif.id,
            icon: <BiDollarCircle className="text-white" size={20} />,
            iconBg: 'bg-blue-600',
            title: `You earned interest from Circle #${notif.circleId}`,
            time: formatTimeAgo(notif.timestamp),
            amount: `${notif.amount} CUSD`,
            type: 'interest'
          };

        case 'emergency':
          return {
            id: notif.id,
            icon: <MdTrendingDown className="text-white" size={20} />,
            iconBg: 'bg-red-600',
            title: `Emergency withdrawal from Circle #${notif.circleId}`,
            time: formatTimeAgo(notif.timestamp),
            amount: `${notif.amount} CUSD`,
            type: 'withdraw'
          };

        case 'joined':
          return {
            id: notif.id,
            icon: <FaUserPlus className="text-white" size={20} />,
            iconBg: 'bg-purple-600',
            title: `You joined Circle #${notif.circleId}`,
            time: formatTimeAgo(notif.timestamp),
            amount: '',
            type: 'joined'
          };

        case 'scoreChange':
          return {
            id: notif.id,
            icon: <FaTrophy className="text-white" size={20} />,
            iconBg: 'bg-yellow-600',
            title: `Reputation score updated: ${notif.reason}`,
            time: formatTimeAgo(notif.timestamp),
            amount: `Score: ${notif.newScore}`,
            type: 'reputation'
          };

        case 'tierChange':
          return {
            id: notif.id,
            icon: <FaMedal className="text-white" size={20} />,
            iconBg: 'bg-yellow-600',
            title: `Tier upgraded to ${notif.newTier}`,
            time: formatTimeAgo(notif.timestamp),
            amount: '',
            type: 'tier'
          };

        case 'badgeMinted':
          return {
            id: notif.id,
            icon: <FaMedal className="text-white" size={20} />,
            iconBg: 'bg-indigo-600',
            title: `You earned a ${notif.badgeType} badge`,
            time: formatTimeAgo(notif.timestamp),
            amount: '',
            type: 'badge'
          };

        case 'badgeUpgraded':
          return {
            id: notif.id,
            icon: <FaMedal className="text-white" size={20} />,
            iconBg: 'bg-indigo-600',
            title: `${notif.badgeType} badge upgraded to Level ${notif.newLevel}`,
            time: formatTimeAgo(notif.timestamp),
            amount: '',
            type: 'badge'
          };

        default:
          return null;
      }
    }).filter(Boolean);

    const reminders = blockchainNotifications.reminders.map(notif => {
      if (notif.type === 'contributionDue') {
        return {
          id: notif.id,
          icon: <BiDollarCircle className="text-white" size={20} />,
          iconBg: 'bg-orange-600',
          title: `Payment due for Circle #${notif.circleId}`,
          time: formatTimeUntil(notif.timeUntilDue),
          amount: `${notif.amount} CUSD`,
          type: 'reminder'
        };
      }
      return null;
    }).filter(Boolean);

    return { Transactions: transactions, Reminders: reminders, Services: [] };
  }, [blockchainNotifications]);

  // Services tab is a placeholder for future system announcements (e.g.
  // maintenance windows, feature launches). No data source yet — a
  // service_announcements Supabase table + admin UI would feed it.
  const notifications = {
    Transactions: transformedNotifications.Transactions,
    Reminders: transformedNotifications.Reminders,
    Services: [],
  };


  // Filter notifications based on search term
  const filteredNotifications = notifications[activeTab]?.filter(notification =>
    notification.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className="flex flex-col gap-6 lg:gap-10 h-full p-4 lg:p-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <h1 className="text-[24px] lg:text-[30px] font-bold">
          Notifications
        </h1>
        
        {/* Search Bar */}
        <div className="relative w-full lg:w-[300px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search notifications"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1a1a1a] dark:bg-[#1a1a1a] light:bg-white border border-gray-700 dark:border-gray-700 light:border-[#D548EC] rounded-[12px] pl-10 pr-4 py-3 placeholder-gray-400 focus:outline-none focus:border-[#D548EC] transition-colors text-[14px] lg:text-[16px]"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 lg:gap-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 lg:px-6 py-2 lg:py-3 rounded-[20px] lg:rounded-[25px] text-[12px] lg:text-[16px] font-medium transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-[#D548EC] text-white'
                : 'bg-[#2a2a2a] dark:bg-[#2a2a2a] light:bg-gray-100 text-gray-300 dark:text-gray-300 light:text-gray-700 hover:bg-[#3a3a3a] dark:hover:bg-[#3a3a3a] light:hover:bg-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 lg:py-20">
            <div className="text-gray-400 text-center">
              <div className="text-[48px] lg:text-[64px] mb-4">⏳</div>
              <h3 className="text-[16px] lg:text-[20px] font-medium mb-2">
                Loading notifications...
              </h3>
            </div>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-3 lg:space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-[#1a1a1a] dark:bg-[#1a1a1a] light:bg-gray-50 rounded-[12px] lg:rounded-[16px] p-4 lg:p-6 flex items-center justify-between hover:bg-[#2a2a2a] dark:hover:bg-[#2a2a2a] light:hover:bg-gray-100 transition-colors cursor-pointer border light:border-gray-200 dark:border-transparent"
              >
                <div className="flex items-center gap-3 lg:gap-4 flex-1">
                  {/* Icon */}
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full ${notification.iconBg} flex items-center justify-center flex-shrink-0`}>
                    {notification.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <h3 className="text-[14px] lg:text-[18px] font-medium truncate">
                      {notification.title}
                    </h3>
                    <p className="text-[12px] lg:text-[14px] text-gray-400 dark:text-gray-400 light:text-gray-600">
                      {notification.time}
                    </p>
                  </div>
                </div>

                {/* Amount */}
                {notification.amount && (
                  <div className="text-[14px] lg:text-[18px] font-semibold ml-2 flex-shrink-0">
                    {notification.amount}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 lg:py-20">
            <div className="text-gray-400 text-center">
              <div className="text-[48px] lg:text-[64px] mb-4">🔔</div>
              <h3 className="text-[16px] lg:text-[20px] font-medium mb-2">
                No notifications found
              </h3>
              <p className="text-[12px] lg:text-[14px]">
                {searchTerm ? `No results for "${searchTerm}"` : `No ${activeTab.toLowerCase()} notifications yet`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Background decorative elements for mobile */}
      <div className="fixed bottom-0 left-0 w-full h-[200px] -z-10 lg:hidden">
        <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-[#D548EC]/10 to-transparent"></div>
      </div>
    </div>
  )
}
