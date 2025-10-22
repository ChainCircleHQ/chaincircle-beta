// This file is deprecated - use hooks/useCircleData.js instead
// Keeping for backward compatibility during migration

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../constants/contracts';
import ChainCircleCoreABI from '../abis/ChainCircleCore.json';

const getProvider = () => {
  return new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
};

const getCircles = async (userAddress) => {
    if (!userAddress) return [];

    try {
      const provider = getProvider();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE,
        ChainCircleCoreABI.abi,
        provider
      );

      const circleIds = await contract.getUserCircles(userAddress);

      const circles = await Promise.all(
        circleIds.map(async (id) => {
          const details = await contract.getCircleDetails(id);
          const progress = await contract.getCircleProgress(id);
          const memberStatus = await contract.getMemberStatus(id, userAddress);

          return {
            id: id.toString(),
            name: details.name,
            percentage: Number(progress.percentage),
            type: memberStatus.isPaymentDue ? "Payment due" : "On track",
            pin: false, // Can be added to contract later
            goalType: Number(details.goalType),
            amount: ethers.formatUnits(details.amount, 6),
            isActive: details.isActive
          };
        })
      );

      return circles;
    } catch (error) {
      console.error('Error fetching circles:', error);
      return [];
    }
}

export { getCircles };