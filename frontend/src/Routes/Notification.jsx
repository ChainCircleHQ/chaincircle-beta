import React, { useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { TbArrowUpRight } from 'react-icons/tb'
import { BiDollarCircle } from 'react-icons/bi'
import { MdTrendingDown } from 'react-icons/md'

export default function Notification() {
  const [activeTab, setActiveTab] = useState('Transactions')
  const [searchTerm, setSearchTerm] = useState('')

  // Notification tabs
  const tabs = ['Transactions', 'Reminders', 'Services']

  // Sample notification data
  const notifications = {
    Transactions: [
      {
        id: 1,
        icon: <TbArrowUpRight className="text-white" size={20} />,
        iconBg: 'bg-green-600',
        title: 'You saved to Dream Ho...',
        time: '53 minutes ago',
        amount: '$500',
        type: 'save'
      },
      {
        id: 2,
        icon: <BiDollarCircle className="text-white" size={20} />,
        iconBg: 'bg-blue-600',
        title: 'You earned interest',
        time: '17 hours ago',
        amount: '$3.24',
        type: 'interest'
      },
      {
        id: 3,
        icon: <TbArrowUpRight className="text-white" size={20} />,
        iconBg: 'bg-green-600',
        title: 'You saved to Dream Ho...',
        time: '1 day ago',
        amount: '$500',
        type: 'save'
      },
      {
        id: 4,
        icon: <MdTrendingDown className="text-white" size={20} />,
        iconBg: 'bg-red-600',
        title: 'You withdrew money fr...',
        time: '3 days ago',
        amount: '$5000',
        type: 'withdraw'
      },
      {
        id: 5,
        icon: <BiDollarCircle className="text-white" size={20} />,
        iconBg: 'bg-blue-600',
        title: 'You earned interest',
        time: '7 days ago',
        amount: '$3.24',
        type: 'interest'
      },
      {
        id: 6,
        icon: <BiDollarCircle className="text-white" size={20} />,
        iconBg: 'bg-blue-600',
        title: 'You earned interest',
        time: '11 days ago',
        amount: '$3.24',
        type: 'interest'
      },
      {
        id: 7,
        icon: <TbArrowUpRight className="text-white" size={20} />,
        iconBg: 'bg-green-600',
        title: 'You saved to Dream Ho...',
        time: '18 days ago',
        amount: '$500',
        type: 'save'
      }
    ],
    Reminders: [
      {
        id: 1,
        icon: <BiDollarCircle className="text-white" size={20} />,
        iconBg: 'bg-orange-600',
        title: 'Payment due for Dream House Squad',
        time: 'Due in 2 days',
        amount: '$500',
        type: 'reminder'
      },
      {
        id: 2,
        icon: <BiDollarCircle className="text-white" size={20} />,
        iconBg: 'bg-orange-600',
        title: 'Payment due for Project G-Wagon',
        time: 'Due in 5 days',
        amount: '$750',
        type: 'reminder'
      }
    ],
    Services: [
      {
        id: 1,
        icon: <BiDollarCircle className="text-white" size={20} />,
        iconBg: 'bg-purple-600',
        title: 'System maintenance scheduled',
        time: '2 hours ago',
        amount: '',
        type: 'service'
      },
      {
        id: 2,
        icon: <TbArrowUpRight className="text-white" size={20} />,
        iconBg: 'bg-purple-600',
        title: 'New feature available',
        time: '1 day ago',
        amount: '',
        type: 'service'
      }
    ]
  }

  // Filter notifications based on search term
  const filteredNotifications = notifications[activeTab]?.filter(notification =>
    notification.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className="flex flex-col gap-6 lg:gap-10 h-full bg-black text-white p-4 lg:p-0">
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
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-[12px] pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#D548EC] transition-colors text-[14px] lg:text-[16px]"
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
                : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotifications.length > 0 ? (
          <div className="space-y-3 lg:space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-[#1a1a1a] rounded-[12px] lg:rounded-[16px] p-4 lg:p-6 flex items-center justify-between hover:bg-[#2a2a2a] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 lg:gap-4 flex-1">
                  {/* Icon */}
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full ${notification.iconBg} flex items-center justify-center flex-shrink-0`}>
                    {notification.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <h3 className="text-[14px] lg:text-[18px] font-medium text-white truncate">
                      {notification.title}
                    </h3>
                    <p className="text-[12px] lg:text-[14px] text-gray-400">
                      {notification.time}
                    </p>
                  </div>
                </div>

                {/* Amount */}
                {notification.amount && (
                  <div className="text-[14px] text-primary lg:text-[18px] font-semibold text-white ml-2 flex-shrink-0">
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
