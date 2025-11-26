import { useQuery } from '@tanstack/react-query';
import { useCircleContract } from './useCircleContract';
import { ethers } from 'ethers';
import { formatActivityType, getActivityIconType, calculateProgress } from '../utils/circleHelpers';
import formatCurrency from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

// Hook to fetch user's circles
export function useUserCircles() {
  const { getContract, userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['userCircles', userAddress],
    queryFn: async () => {
      const contract = await getContract('core');
      const circleIds = await contract.getUserCircles(userAddress);


      // Fetch details for each circle
      const circles = await Promise.all(
        circleIds.map(async (id) => {
          const details = await contract.getCircleDetails(id);
          const progress = await contract.getCircleProgress(id);

          // Get member count for progress calculation
          const maxMembers = Number(details.maxMembers);
          const memberAddresses = [];

          for (let i = 0; i < maxMembers; i++) {
            try {
              const memberAddress = await contract.circleMembers(id, i);
              if (memberAddress !== '0x0000000000000000000000000000000000000000') {
                memberAddresses.push(memberAddress);
              }
            } catch (e) {
              break;
            }
          }

          // Calculate progress based on circle status
          const calculatedProgress = calculateProgress(
            Number(details.currentRound),
            Number(details.duration),
            memberAddresses.length,
            maxMembers,
            details.isActive,
            Number(details.status)
          );

          return {
            id: id.toString(),
            name: details.name,
            goalType: Number(details.goalType),
            amount: ethers.formatUnits(details.amount, 6),
            duration: Number(details.duration),
            currentRound: Number(details.currentRound),
            maxMembers: maxMembers,
            members: memberAddresses.length,
            frequency: Number(details.frequency),
            isActive: details.isActive,
            status: Number(details.status),
            createdAt: Number(details.createdAt),
            startAt: Number(details.startAt),
            vaultBalance: ethers.formatUnits(details.vaultBalance, 6),
            creator: details.creator,
            progress: calculatedProgress,
            contractProgress: Number(progress.percentage), // Keep contract value for reference
            icon: progress.icon
          };
        })
      );


      return circles;
    },
    enabled: isConnected && !!userAddress,
    staleTime: 30000, // 30 seconds
  });
}

// Hook to fetch user's active circles
export function useActiveCircles() {
  const { data: allCircles, ...rest } = useUserCircles();

  return {
    ...rest,
    data: allCircles?.filter(circle => circle.isActive) || []
  };
}

// Hook to fetch circle details by ID
export function useCircleDetails(circleId) {
  const { getContract, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['circleDetails', circleId],
    queryFn: async () => {
      try {
        const contract = await getContract('core');
        const details = await contract.getCircleDetails(circleId);
        const progress = await contract.getCircleProgress(circleId);
        const inviteCode = await contract.getCircleInviteCode(circleId);

        // Fetch all members by looping through the array
        // maxMembers tells us how many to check
        const maxMembers = Number(details.maxMembers);
        const memberAddresses = [];

        for (let i = 0; i < maxMembers; i++) {
          try {
            const memberAddress = await contract.circleMembers(circleId, i);
            // Check if address is not zero address (empty slot)
            if (memberAddress !== '0x0000000000000000000000000000000000000000') {
              memberAddresses.push(memberAddress);
            }
          } catch (e) {
            // Stop when we hit an out of bounds error
            break;
          }
        }

        // Calculate progress based on circle status
        const calculatedProgress = calculateProgress(
          Number(details.currentRound),
          Number(details.duration),
          memberAddresses.length,
          Number(details.maxMembers),
          details.isActive,
          Number(details.status)
        );

        return {
          id: circleId,
          name: details.name,
          goalType: Number(details.goalType),
          amount: ethers.formatUnits(details.amount, 6),
          duration: Number(details.duration),
          currentRound: Number(details.currentRound),
          maxMembers: Number(details.maxMembers),
          frequency: Number(details.frequency),
          isActive: details.isActive,
          status: Number(details.status),
          createdAt: Number(details.createdAt),
          startAt: Number(details.startAt),
          vaultBalance: ethers.formatUnits(details.vaultBalance, 6),
          creator: details.creator,
          progress: calculatedProgress,
          contractProgress: Number(progress.percentage), // Keep contract value for reference
          icon: progress.icon,
          members: memberAddresses.length,
          memberAddresses: memberAddresses,
          inviteCode
        };
      } catch (error) {
        console.error('Error fetching circle details:', error);
        throw error;
      }
    },
    enabled: isConnected && !!circleId,
    staleTime: 20000,
    retry: 1, // Only retry once to fail faster
  });
}

// Hook to fetch circle by name
export function useCircleByName(name) {
  const { getContract, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['circleByName', name],
    queryFn: async () => {
      const contract = await getContract('core');
      const circleId = await contract.getCircleByName(name);
      if (circleId.toString() === '0') return null;

      const details = await contract.getCircleDetails(circleId);
      const progress = await contract.getCircleProgress(circleId);

      return {
        id: circleId.toString(),
        name: details.name,
        goalType: Number(details.goalType),
        amount: ethers.formatUnits(details.amount, 6),
        duration: Number(details.duration),
        currentRound: Number(details.currentRound),
        maxMembers: Number(details.maxMembers),
        frequency: Number(details.frequency),
        isActive: details.isActive,
        status: Number(details.status),
        vaultBalance: ethers.formatUnits(details.vaultBalance, 6),
        progress: Number(progress.percentage)
      };
    },
    enabled: isConnected && !!name,
  });
}

// Hook to fetch recent activities with transaction hashes and circle names
export function useRecentActivities(limit = 10) {
  const { getContract, userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['recentActivities', userAddress, limit],
    queryFn: async () => {
      try {
        const contract = await getContract('core');
        const activities = await contract.getRecentActivity(userAddress, limit);

        // Fetch transaction hashes from ActivityLogged events (optional, non-blocking)
        let txHashMap = {};
        try {
          const provider = contract.runner.provider;
          const currentBlock = await provider.getBlockNumber();
          const fromBlock = Math.max(0, currentBlock - 10000);

          const filter = contract.filters.ActivityLogged(userAddress);
          const events = await contract.queryFilter(filter, fromBlock, currentBlock);

          for (const event of events) {
            try {
              const block = await event.getBlock();
              txHashMap[block.timestamp] = event.transactionHash;
            } catch (e) {
              // Skip if we can't get block info for this event
              continue;
            }
          }
        } catch (eventError) {
          console.warn('Could not fetch transaction hashes, continuing without them:', eventError);
          // Continue without transaction hashes - not critical
        }

        // Fetch circle names and format activities with descriptive titles
        const activitiesWithDetails = await Promise.all(
          activities.map(async (activity) => {
            const timestamp = Number(activity.timestamp);
            let circleName = '';

            // Fetch circle name if circleId exists
            try {
              if (activity.circleId && activity.circleId.toString() !== '0') {
                const circleDetails = await contract.getCircleDetails(activity.circleId);
                circleName = circleDetails.name;
              }
            } catch (e) {
              // Circle might not exist anymore
              circleName = 'a circle';
            }

            // Format title based on activity type and circle name
            let title;
            const activityType = activity.activityType;
            if (activityType === 'CONTRIBUTE') {
              title = `You contributed to ${circleName}`;
            } else if (activityType === 'WITHDRAW') {
              title = `You withdrew from ${circleName}`;
            } else if (activityType === 'INTEREST') {
              title = 'You earned interest';
            } else if (activityType === 'JOINED') {
              title = `You joined ${circleName}`;
            } else if (activityType === 'COMPLETED') {
              title = `${circleName} completed`;
            } else if (activityType === 'CREATE') {
              title = `You created ${circleName}`;
            } else {
              title = formatActivityType(activityType);
            }

            return {
              id: `${activity.circleId}-${timestamp}`,
              type: getActivityIconType(activityType),
              title: title,
              timeAgo: formatDate(timestamp),
              amount: formatCurrency(ethers.formatUnits(activity.amount, 6)),
              circleId: activity.circleId.toString(),
              circleName: circleName,
              timestamp: timestamp,
              txHash: txHashMap[timestamp] || null
            };
          })
        );

        return activitiesWithDetails;
      } catch (error) {
        console.error('Error fetching recent activities:', error);
        // Return empty array instead of throwing to prevent UI errors
        return [];
      }
    },
    enabled: isConnected && !!userAddress,
    staleTime: 15000,
    retry: 2, // Retry twice on failure
  });
}

// Hook to fetch user stats
export function useUserStats() {
  const { getContract, userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['userStats', userAddress],
    queryFn: async () => {
      const contract = await getContract('core');
      const reputationContract = await getContract('reputation');

      const [
        totalContributions,
        totalInterest,
        activeCircleCount,
        userCircles,
        reputation
      ] = await Promise.all([
        contract.getUserTotalContributions(userAddress),
        contract.getUserTotalInterest(userAddress),
        contract.getUserActiveCircleCount(userAddress),
        contract.getUserCircles(userAddress),
        reputationContract.getUserReputation(userAddress)
      ]);

      // If accountAge is 0 but user has circles, get the first circle's creation date
      let accountAge = Number(reputation.accountAge);
      if (accountAge === 0 && userCircles.length > 0) {
        try {
          const firstCircleDetails = await contract.getCircleDetails(userCircles[0]);
          accountAge = Number(firstCircleDetails.createdAt);
        } catch (error) {
          console.error('Error fetching first circle creation date:', error);
        }
      }

      return {
        totalSaved: ethers.formatUnits(totalContributions, 6),
        totalInterest: ethers.formatUnits(totalInterest, 6),
        activeCircles: Number(activeCircleCount),
        totalCircles: userCircles.length,
        reputation: {
          score: Number(reputation.score),
          tier: reputation.tier,
          completedCircles: Number(reputation.completedCircles),
          onTimeRate: Number(reputation.onTimeRate),
          totalSaved: ethers.formatUnits(reputation.totalSaved, 6),
          accountAge: accountAge,
          longestStreak: Number(reputation.longestStreak)
        }
      };
    },
    enabled: isConnected && !!userAddress,
    staleTime: 30000,
  });
}

// Hook to fetch global stats
export function useGlobalStats() {
  const { getContract } = useCircleContract();

  return useQuery({
    queryKey: ['globalStats'],
    queryFn: async () => {
      const contract = await getContract('core');

      const [totalPooled, activeCircleCount, circleCounter] = await Promise.all([
        contract.getTotalPooled(),
        contract.getActiveCircleCount(),
        contract.circleCounter()
      ]);


      const stats = {
        totalPooled: ethers.formatUnits(totalPooled, 6),
        activeCircles: Number(activeCircleCount),
        totalCircles: Number(circleCounter)
      };


      return stats;
    },
    enabled: true, // Global stats are public and don't require wallet connection
    staleTime: 60000, // 1 minute
  });
}

// Hook to fetch user's payout history
export function usePayoutHistory() {
  const { getContract, userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['payoutHistory', userAddress],
    queryFn: async () => {
      const contract = await getContract('core');
      const history = await contract.getUserPayoutHistory(userAddress);

      // Fetch circle details to get goalType for each payout
      const payoutsWithDetails = await Promise.all(
        history.circleIds.map(async (circleId, index) => {
          const details = await contract.getCircleDetails(circleId);

          return {
            circleId: circleId.toString(),
            circleName: history.circleNames[index],
            goalType: Number(details.goalType),
            amount: formatCurrency(ethers.formatUnits(history.amounts[index], 6)),
            date: formatDate(Number(history.dates[index])),
            claimed: history.claimed[index],
            timestamp: Number(history.dates[index])
          };
        })
      );

      return payoutsWithDetails;
    },
    enabled: isConnected && !!userAddress,
    staleTime: 30000,
  });
}

// Hook to fetch upcoming payouts
export function useUpcomingPayouts() {
  const { getContract, userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['upcomingPayouts', userAddress],
    queryFn: async () => {
      const contract = await getContract('core');
      const upcoming = await contract.getUserUpcomingPayouts(userAddress);

      // Fetch circle details to get goalType for each payout
      const upcomingWithDetails = await Promise.all(
        upcoming.circleIds.map(async (circleId, index) => {
          const details = await contract.getCircleDetails(circleId);

          return {
            circleId: circleId.toString(),
            circleName: upcoming.circleNames[index],
            goalType: Number(details.goalType),
            estimatedDate: formatDate(Number(upcoming.estimatedDates[index])),
            timestamp: Number(upcoming.estimatedDates[index])
          };
        })
      );

      return upcomingWithDetails;
    },
    enabled: isConnected && !!userAddress,
    staleTime: 30000,
  });
}

// Hook to search circles
export function useSearchCircles(searchTerm) {
  const { getContract, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['searchCircles', searchTerm],
    queryFn: async () => {
      const contract = await getContract('core');
      const results = await contract.searchCircles(searchTerm);

      return Promise.all(
        results.map(async (id) => {
          const details = await contract.getCircleDetails(id);
          const progress = await contract.getCircleProgress(id);

          return {
            id: id.toString(),
            name: details.name,
            goalType: Number(details.goalType),
            amount: ethers.formatUnits(details.amount, 6),
            duration: Number(details.duration),
            currentRound: Number(details.currentRound),
            maxMembers: Number(details.maxMembers),
            frequency: Number(details.frequency),
            status: Number(details.status),
            progress: Number(progress.percentage),
            icon: progress.icon
          };
        })
      );
    },
    enabled: isConnected && !!searchTerm && searchTerm.length >= 3,
    staleTime: 20000,
  });
}

// Hook to find circle by invite code
export function useCircleByInviteCode(inviteCode) {
  const { getContract, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['circleByInviteCode', inviteCode],
    queryFn: async () => {
      const contract = await getContract('core');

      // Get total number of circles
      const circleCounter = await contract.circleCounter();
      const totalCircles = Number(circleCounter);

      // Optimized: Check circles in parallel batches to reduce lookup time
      // from O(n) sequential to parallel batch processing
      const BATCH_SIZE = 100; // Check 100 circles at a time
      const normalizedInviteCode = inviteCode.toLowerCase();

      for (let start = 1; start <= totalCircles; start += BATCH_SIZE) {
        const end = Math.min(start + BATCH_SIZE, totalCircles + 1);

        // Create array of promises to check invite codes in parallel
        const checkPromises = [];
        for (let i = start; i < end; i++) {
          checkPromises.push(
            contract.getCircleInviteCode(i)
              .then(code => ({ id: i, code: code.toLowerCase() }))
              .catch(() => ({ id: i, code: null })) // Handle errors gracefully
          );
        }

        // Wait for all checks in this batch to complete
        const results = await Promise.all(checkPromises);

        // Check if any match
        const match = results.find(r => r.code === normalizedInviteCode);

        if (match) {
          // Found matching circle, fetch full details
          const circleId = match.id;

          try {
            const [details, progress] = await Promise.all([
              contract.getCircleDetails(circleId),
              contract.getCircleProgress(circleId)
            ]);

            // Fetch all members in parallel
            const maxMembers = Number(details.maxMembers);
            const memberPromises = [];

            for (let j = 0; j < maxMembers; j++) {
              memberPromises.push(
                contract.circleMembers(circleId, j)
                  .then(addr => addr !== '0x0000000000000000000000000000000000000000' ? addr : null)
                  .catch(() => null)
              );
            }

            const memberResults = await Promise.all(memberPromises);
            const memberAddresses = memberResults.filter(addr => addr !== null);

            return {
              id: circleId.toString(),
              name: details.name,
              goalType: Number(details.goalType),
              amount: ethers.formatUnits(details.amount, 6),
              duration: Number(details.duration),
              currentRound: Number(details.currentRound),
              maxMembers: maxMembers,
              members: memberAddresses.length,
              frequency: Number(details.frequency),
              isActive: details.isActive,
              status: Number(details.status),
              createdAt: Number(details.createdAt),
              startAt: Number(details.startAt),
              vaultBalance: ethers.formatUnits(details.vaultBalance, 6),
              creator: details.creator,
              progress: Number(progress.percentage),
              icon: progress.icon,
              inviteCode: match.code,
              memberAddresses: memberAddresses
            };
          } catch (error) {
            console.error('Error fetching circle details:', error);
            throw error;
          }
        }
      }

      // No circle found with this invite code
      return null;
    },
    enabled: isConnected && !!inviteCode && inviteCode.length > 20, // Invite codes are hex strings
    staleTime: 60000, // Cache for 1 minute
  });
}
