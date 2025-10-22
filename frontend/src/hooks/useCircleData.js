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

      console.log('=== USER CIRCLES ===');
      console.log('User Address:', userAddress);
      console.log('Circle IDs:', circleIds.map(id => id.toString()));

      // Fetch details for each circle
      const circles = await Promise.all(
        circleIds.map(async (id) => {
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
            isActive: details.isActive,
            status: Number(details.status),
            createdAt: Number(details.createdAt),
            startAt: Number(details.startAt),
            vaultBalance: ethers.formatUnits(details.vaultBalance, 6),
            creator: details.creator,
            progress: Number(progress.percentage),
            icon: progress.icon
          };
        })
      );

      console.log('User Circles:', circles);
      circles.forEach((circle, idx) => {
        console.log(`Circle ${idx}:`, {
          id: circle.id,
          name: circle.name,
          isActive: circle.isActive,
          status: circle.status,
          currentRound: circle.currentRound,
          maxMembers: circle.maxMembers
        });
      });
      console.log('Active Circles:', circles.filter(c => c.isActive));

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
      console.log('Fetching circle details for ID:', circleId);

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

        console.log('Circle details fetched:', {
          details,
          progress,
          membersCount: memberAddresses.length,
          inviteCode
        });

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
          progress: Number(progress.percentage),
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

// Hook to fetch recent activities
export function useRecentActivities(limit = 10) {
  const { getContract, userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['recentActivities', userAddress, limit],
    queryFn: async () => {
      const contract = await getContract('core');
      const activities = await contract.getRecentActivity(userAddress, limit);

      return activities.map(activity => ({
        id: `${activity.circleId}-${activity.timestamp}`,
        type: getActivityIconType(activity.activityType),
        title: formatActivityType(activity.activityType),
        timeAgo: formatDate(Number(activity.timestamp)),
        amount: formatCurrency(ethers.formatUnits(activity.amount, 6)),
        circleId: activity.circleId.toString(),
        timestamp: Number(activity.timestamp)
      }));
    },
    enabled: isConnected && !!userAddress,
    staleTime: 15000,
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

      console.log('=== GLOBAL STATS FROM CONTRACT ===');
      console.log('Total Pooled (raw):', totalPooled.toString());
      console.log('Active Circle Count:', activeCircleCount.toString());
      console.log('Circle Counter:', circleCounter.toString());

      const stats = {
        totalPooled: ethers.formatUnits(totalPooled, 6),
        activeCircles: Number(activeCircleCount),
        totalCircles: Number(circleCounter)
      };

      console.log('Formatted stats:', stats);

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
      console.log('Searching for circle with invite code:', inviteCode);

      const contract = await getContract('core');

      // Get total number of circles
      const circleCounter = await contract.circleCounter();
      const totalCircles = Number(circleCounter);

      console.log('Total circles to search:', totalCircles);

      // Search through all circles to find matching invite code
      // This is brute force but necessary since there's no direct lookup
      for (let i = 1; i <= totalCircles; i++) {
        try {
          const code = await contract.getCircleInviteCode(i);

          if (code.toLowerCase() === inviteCode.toLowerCase()) {
            console.log('Found circle with ID:', i);

            // Fetch full circle details
            const details = await contract.getCircleDetails(i);
            const progress = await contract.getCircleProgress(i);

            return {
              id: i.toString(),
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
              progress: Number(progress.percentage),
              icon: progress.icon,
              inviteCode: code
            };
          }
        } catch (error) {
          // Circle might not exist or other error, continue searching
          continue;
        }
      }

      // No circle found with this invite code
      console.log('No circle found with invite code:', inviteCode);
      return null;
    },
    enabled: isConnected && !!inviteCode && inviteCode.length > 20, // Invite codes are hex strings
    staleTime: 60000, // Cache for 1 minute
  });
}
