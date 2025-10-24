import { useQuery } from '@tanstack/react-query';
import { useCircleContract } from './useCircleContract';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../constants/contracts';
import ChainCircleCoreABI from '../abis/ChainCircleCore.json';
import ReputationManagerABI from '../abis/ReputationManager.json';
import BadgeNFTABI from '../abis/BadgeNFT.json';

// Hook to fetch user notifications from blockchain events
export function useNotifications() {
  const { userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['notifications', userAddress],
    queryFn: async () => {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const circleContract = new ethers.Contract(CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE, ChainCircleCoreABI.abi, provider);
      const reputationContract = new ethers.Contract(CONTRACT_ADDRESSES.REPUTATION_MANAGER, ReputationManagerABI.abi, provider);
      const badgeContract = new ethers.Contract(CONTRACT_ADDRESSES.BADGE_NFT, BadgeNFTABI.abi, provider);

      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10000 blocks

      const notifications = {
        transactions: [],
        reminders: []
      };

      try {
        // Helper function to safely process events
        const safelyProcessEvent = async (event, type, processArgs) => {
          try {
            const block = await provider.getBlock(event.blockNumber);
            return {
              ...processArgs(event),
              timestamp: block.timestamp,
              txHash: event.transactionHash
            };
          } catch (e) {
            return null; // Skip failed events
          }
        };

        // Fetch CircleCore events
        const contributionFilter = circleContract.filters.ContributionMade(null, userAddress);
        const contributionEvents = await circleContract.queryFilter(contributionFilter, fromBlock, currentBlock);

        const payoutFilter = circleContract.filters.PayoutProcessed(null, userAddress);
        const payoutEvents = await circleContract.queryFilter(payoutFilter, fromBlock, currentBlock);

        const interestFilter = circleContract.filters.InterestDistributed(null, userAddress);
        const interestEvents = await circleContract.queryFilter(interestFilter, fromBlock, currentBlock);

        const emergencyFilter = circleContract.filters.EmergencyWithdrawal(null, userAddress);
        const emergencyEvents = await circleContract.queryFilter(emergencyFilter, fromBlock, currentBlock);

        const memberJoinedFilter = circleContract.filters.MemberJoined(null, userAddress);
        const memberJoinedEvents = await circleContract.queryFilter(memberJoinedFilter, fromBlock, currentBlock);

        const circleCompletedFilter = circleContract.filters.CircleCompleted();
        const circleCompletedEvents = await circleContract.queryFilter(circleCompletedFilter, fromBlock, currentBlock);

        // Fetch Reputation events
        const scoreChangedFilter = reputationContract.filters.ScoreChanged(userAddress);
        const scoreChangedEvents = await reputationContract.queryFilter(scoreChangedFilter, fromBlock, currentBlock);

        const tierChangedFilter = reputationContract.filters.TierChanged(userAddress);
        const tierChangedEvents = await reputationContract.queryFilter(tierChangedFilter, fromBlock, currentBlock);

        // Fetch Badge events
        const badgeMintedFilter = badgeContract.filters.BadgeMinted(userAddress);
        const badgeMintedEvents = await badgeContract.queryFilter(badgeMintedFilter, fromBlock, currentBlock);

        const badgeUpgradedFilter = badgeContract.filters.BadgeUpgraded(null, userAddress);
        const badgeUpgradedEvents = await badgeContract.queryFilter(badgeUpgradedFilter, fromBlock, currentBlock);

        // Process Contribution events
        for (const event of contributionEvents) {
          try {
            const block = await provider.getBlock(event.blockNumber);
            const circleId = event.args.circleId.toString();
            const amount = ethers.formatUnits(event.args.amount, 6);

            notifications.transactions.push({
              id: `contribution-${event.transactionHash}-${event.logIndex}`,
              type: 'contribution',
              circleId,
              amount,
              timestamp: block.timestamp,
              txHash: event.transactionHash
            });
          } catch (e) {
            // Skip this event if we can't process it
            continue;
          }
        }

        // Process Payout events
        for (const event of payoutEvents) {
          const block = await provider.getBlock(event.blockNumber);
          const circleId = event.args.circleId.toString();
          const amount = ethers.formatUnits(event.args.amount, 6);

          notifications.transactions.push({
            id: `payout-${event.transactionHash}-${event.logIndex}`,
            type: 'payout',
            circleId,
            amount,
            timestamp: block.timestamp,
            txHash: event.transactionHash
          });
        }

        // Process Interest events
        for (const event of interestEvents) {
          const block = await provider.getBlock(event.blockNumber);
          const circleId = event.args.circleId.toString();
          const amount = ethers.formatUnits(event.args.amount, 6);

          notifications.transactions.push({
            id: `interest-${event.transactionHash}-${event.logIndex}`,
            type: 'interest',
            circleId,
            amount,
            timestamp: block.timestamp,
            txHash: event.transactionHash
          });
        }

        // Process Emergency Withdrawal events
        for (const event of emergencyEvents) {
          const block = await provider.getBlock(event.blockNumber);
          const circleId = event.args.circleId.toString();
          const amount = ethers.formatUnits(event.args.amount, 6);

          notifications.transactions.push({
            id: `emergency-${event.transactionHash}-${event.logIndex}`,
            type: 'emergency',
            circleId,
            amount,
            timestamp: block.timestamp,
            txHash: event.transactionHash
          });
        }

        // Process Member Joined events
        for (const event of memberJoinedEvents) {
          const block = await provider.getBlock(event.blockNumber);
          const circleId = event.args.circleId.toString();

          notifications.transactions.push({
            id: `joined-${event.transactionHash}-${event.logIndex}`,
            type: 'joined',
            circleId,
            timestamp: block.timestamp,
            txHash: event.transactionHash
          });
        }

        // Process Score Changed events
        for (const event of scoreChangedEvents) {
          const block = await provider.getBlock(event.blockNumber);
          const newScore = event.args.newScore.toString();
          const reason = event.args.reason;

          notifications.transactions.push({
            id: `score-${event.transactionHash}-${event.logIndex}`,
            type: 'scoreChange',
            newScore,
            reason,
            timestamp: block.timestamp,
            txHash: event.transactionHash
          });
        }

        // Process Tier Changed events
        for (const event of tierChangedEvents) {
          const block = await provider.getBlock(event.blockNumber);
          const newTier = event.args.newTier;

          notifications.transactions.push({
            id: `tier-${event.transactionHash}-${event.logIndex}`,
            type: 'tierChange',
            newTier,
            timestamp: block.timestamp,
            txHash: event.transactionHash
          });
        }

        // Process Badge Minted events
        for (const event of badgeMintedEvents) {
          const block = await provider.getBlock(event.blockNumber);
          const badgeType = event.args.badgeType;

          notifications.transactions.push({
            id: `badge-minted-${event.transactionHash}-${event.logIndex}`,
            type: 'badgeMinted',
            badgeType,
            timestamp: block.timestamp,
            txHash: event.transactionHash
          });
        }

        // Process Badge Upgraded events
        for (const event of badgeUpgradedEvents) {
          const block = await provider.getBlock(event.blockNumber);
          const badgeType = event.args.badgeType;
          const newLevel = event.args.newLevel.toString();

          notifications.transactions.push({
            id: `badge-upgraded-${event.transactionHash}-${event.logIndex}`,
            type: 'badgeUpgraded',
            badgeType,
            newLevel,
            timestamp: block.timestamp,
            txHash: event.transactionHash
          });
        }

        // Fetch user's active circles for reminders
        const userCircles = await circleContract.getUserCircles(userAddress);
        const currentTime = Math.floor(Date.now() / 1000);

        for (const circleId of userCircles) {
          try {
            const circle = await circleContract.getCircle(circleId);

            // Only create reminders for active circles
            if (circle.status === 1) { // Active status
              const contributionAmount = ethers.formatUnits(circle.contributionAmount, 6);
              const contributionPeriod = Number(circle.contributionPeriod);
              const lastContribution = Number(circle.lastContributionTime);

              // Calculate next contribution due time
              const nextDueTime = lastContribution + contributionPeriod;
              const timeUntilDue = nextDueTime - currentTime;

              // Create reminder if due within 7 days
              if (timeUntilDue > 0 && timeUntilDue < 7 * 24 * 60 * 60) {
                notifications.reminders.push({
                  id: `reminder-${circleId}`,
                  type: 'contributionDue',
                  circleId: circleId.toString(),
                  amount: contributionAmount,
                  dueTime: nextDueTime,
                  timeUntilDue
                });
              }
            }
          } catch (err) {
            // Silent error handling
          }
        }

        // Sort by timestamp (newest first)
        notifications.transactions.sort((a, b) => b.timestamp - a.timestamp);
        notifications.reminders.sort((a, b) => a.timeUntilDue - b.timeUntilDue);

        return notifications;
      } catch (error) {
        console.warn('Error fetching notifications:', error);
        return { transactions: [], reminders: [] };
      }
    },
    enabled: isConnected && !!userAddress,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 2, // Retry twice on failure
    retryDelay: 1000, // Wait 1 second between retries
  });
}
