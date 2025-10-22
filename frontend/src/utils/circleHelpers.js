import { RiHome4Fill } from "react-icons/ri";
import { FaCar, FaFaceSmileBeam, FaUserAstronaut, FaGraduationCap, FaBriefcase } from "react-icons/fa6";
import { MdCelebration, MdOutlineHealthAndSafety } from "react-icons/md";
import { GOAL_TYPES } from './constants';

// Goal type to icon component mapping
export const GOAL_ICON_MAP = {
  [GOAL_TYPES.HOME]: RiHome4Fill,
  [GOAL_TYPES.EDUCATION]: FaGraduationCap,
  [GOAL_TYPES.BUSINESS]: FaBriefcase,
  [GOAL_TYPES.EMERGENCY]: MdOutlineHealthAndSafety,
  [GOAL_TYPES.TRAVEL]: FaCar,
  [GOAL_TYPES.OTHER]: MdCelebration
};

// Goal type to color scheme mapping
export const GOAL_COLOR_MAP = {
  [GOAL_TYPES.HOME]: {
    bg: 'bg-[#CCE0FF]',
    text: 'text-[#4887EC]'
  },
  [GOAL_TYPES.EDUCATION]: {
    bg: 'bg-[#FFE8CC]',
    text: 'text-[#EC9D48]'
  },
  [GOAL_TYPES.BUSINESS]: {
    bg: 'bg-[#FFCCCC]',
    text: 'text-[#EC4848]'
  },
  [GOAL_TYPES.EMERGENCY]: {
    bg: 'bg-[#FFD4D4]',
    text: 'text-[#FF5555]'
  },
  [GOAL_TYPES.TRAVEL]: {
    bg: 'bg-[#D9FFCC]',
    text: 'text-[#48EC4D]'
  },
  [GOAL_TYPES.OTHER]: {
    bg: 'bg-[#F6CCFF]',
    text: 'text-[#B848EC]'
  }
};

// Get icon component for a goal type
export function getGoalIcon(goalType) {
  return GOAL_ICON_MAP[goalType] || GOAL_ICON_MAP[GOAL_TYPES.OTHER];
}

// Get color scheme for a goal type
export function getGoalColors(goalType) {
  return GOAL_COLOR_MAP[goalType] || GOAL_COLOR_MAP[GOAL_TYPES.OTHER];
}

// Get goal type name
export function getGoalTypeName(goalType) {
  const names = {
    [GOAL_TYPES.HOME]: 'Home',
    [GOAL_TYPES.EDUCATION]: 'Education',
    [GOAL_TYPES.BUSINESS]: 'Business',
    [GOAL_TYPES.EMERGENCY]: 'Emergency',
    [GOAL_TYPES.TRAVEL]: 'Travel',
    [GOAL_TYPES.OTHER]: 'Other'
  };
  return names[goalType] || 'Other';
}

// Format circle status
export function formatCircleStatus(status) {
  const statuses = ['Pending', 'Active', 'Completed', 'Paused', 'Cancelled'];
  return statuses[status] || 'Unknown';
}

// Calculate circle progress percentage
export function calculateProgress(currentRound, duration) {
  if (!duration || duration === 0) return 0;
  return Math.min(100, Math.round((Number(currentRound) / Number(duration)) * 100));
}

// Format activity type for display
export function formatActivityType(type) {
  const typeMap = {
    'CONTRIBUTE': 'Contribution',
    'WITHDRAW': 'Payout Withdrawn',
    'INTEREST': 'Interest Earned',
    'JOINED': 'Joined Circle',
    'COMPLETED': 'Circle Completed'
  };
  return typeMap[type] || type;
}

// Get activity icon type
export function getActivityIconType(activityType) {
  if (activityType === 'CONTRIBUTE') return 'save';
  if (activityType === 'WITHDRAW') return 'withdraw';
  if (activityType === 'INTEREST') return 'interest';
  return 'save';
}

// Generate shareable circle link
export function generateCircleLink(circleId, circleName) {
  const baseUrl = window.location.origin;
  const encodedName = encodeURIComponent(circleName);
  return `${baseUrl}/chain/circle/${circleId}?name=${encodedName}`;
}

// Generate circle invite code URL
export function generateInviteUrl(inviteCode) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/join/${inviteCode}`;
}

// Format frequency for display
export function formatFrequency(frequency) {
  return frequency === 0 ? 'Monthly' : 'Weekly';
}

// Calculate estimated next payment date
export function calculateNextPaymentDate(startAt, currentRound, frequency) {
  const intervalDays = frequency === 0 ? 30 : 7;
  const nextRoundTimestamp = Number(startAt) + (Number(currentRound) + 1) * intervalDays * 24 * 60 * 60;
  return new Date(nextRoundTimestamp * 1000);
}

// Format reputation tier
export function getReputationTier(score) {
  const numScore = Number(score);
  if (numScore >= 850) return 'Gold';
  if (numScore >= 700) return 'Silver';
  if (numScore >= 500) return 'Bronze';
  return 'None';
}

// Get tier color
export function getTierColor(tier) {
  const colors = {
    'Gold': 'text-[#FFD700]',
    'Silver': 'text-[#C0C0C0]',
    'Bronze': 'text-[#CD7F32]',
    'None': 'text-[#AAAAAA]'
  };
  return colors[tier] || colors['None'];
}

// Calculate on-time payment rate
export function calculateOnTimeRate(onTimePayments, totalPayments) {
  if (!totalPayments || totalPayments === 0) return 0;
  return Math.round((Number(onTimePayments) / Number(totalPayments)) * 100);
}
