// This file is deprecated - use hooks/useCircleData.js (useRecentActivities) instead
// Keeping for backward compatibility during migration

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../constants/contracts';
import ChainCircleCoreABI from '../abis/ChainCircleCore.json';
import formatCurrency from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

const getProvider = () => {
  return new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
};

const getActivityType = (activityType) => {
  if (activityType === 'CONTRIBUTE') return 'save';
  if (activityType === 'WITHDRAW') return 'withdraw';
  if (activityType === 'INTEREST') return 'interest';
  return 'save';
};

const formatActivityTitle = (activityType, circleName) => {
  if (activityType === 'CONTRIBUTE') return `You saved to ${circleName || 'a circle'}`;
  if (activityType === 'WITHDRAW') return `You withdrew from ${circleName || 'a circle'}`;
  if (activityType === 'INTEREST') return 'You earned interest';
  return activityType;
};

const getRecentActivities = async (userAddress, limit = 10) => {
    if (!userAddress) return [];

    try {
      const provider = getProvider();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE,
        ChainCircleCoreABI.abi,
        provider
      );

      const activities = await contract.getRecentActivity(userAddress, limit);

      // Get circle names for activities
      const activitiesWithNames = await Promise.all(
        activities.map(async (activity) => {
          let circleName = '';
          try {
            if (activity.circleId && activity.circleId.toString() !== '0') {
              const circleDetails = await contract.getCircleDetails(activity.circleId);
              circleName = circleDetails.name;
            }
          } catch (e) {
            // Circle might not exist anymore
          }

          return {
            id: `${activity.circleId}-${activity.timestamp}`,
            ŸŸ
            type: getActivityType(activity.activityType),
            title: formatActivityTitle(activity.activityType, circleName),
            timeAgo: formatDate(Number(activity.timestamp)),
            amount: formatCurrency(ethers.formatUnits(activity.amount, 6)),
            timestamp: Number(activity.timestamp)
          };
        })
      );

      return activitiesWithNames;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
};

export { getRecentActivities };