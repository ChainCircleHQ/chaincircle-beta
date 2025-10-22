import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCircleContract } from './useCircleContract';

// Hook to check if user owns a specific badge
export function useOwnsBadge(badgeType) {
  const { getContract, userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['ownsBadge', userAddress, badgeType],
    queryFn: async () => {
      const contract = await getContract('badge');
      return await contract.hasBadge(userAddress, badgeType);
    },
    enabled: isConnected && !!userAddress && badgeType !== undefined,
    staleTime: 60000, // 1 minute
  });
}

// Hook to get all user's badges (including mock welcome badge)
export function useUserBadges() {
  const { getContract, userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['userBadges', userAddress],
    queryFn: async () => {
      const contract = await getContract('badge');

      // Badge types: 0=FIRST_CIRCLE, 1=CIRCLE_COMPLETED, 2=STREAK_5, 3=STREAK_10,
      // 4=SILVER_TIER, 5=GOLD_TIER, 6=HIGH_SAVER
      const badgeTypes = [0, 1, 2, 3, 4, 5, 6];
      const badges = [];

      for (const badgeType of badgeTypes) {
        try {
          const hasBadge = await contract.hasBadge(userAddress, badgeType);
          if (hasBadge) {
            const uri = await contract.getBadgeURI(badgeType);
            badges.push({
              type: badgeType,
              name: getBadgeName(badgeType),
              description: getBadgeDescription(badgeType),
              uri: uri,
              earned: true
            });
          }
        } catch (error) {
          console.error(`Error checking badge ${badgeType}:`, error);
        }
      }

      // If user has no badges, add a welcome badge to prevent empty state
      if (badges.length === 0) {
        badges.push({
          type: -1, // Mock badge
          name: 'Welcome to ChainCircle',
          description: 'Start your savings journey! Create or join your first circle to earn badges.',
          uri: '',
          earned: false,
          mock: true
        });
      }

      return badges;
    },
    enabled: isConnected && !!userAddress,
    staleTime: 30000,
  });
}

// Hook to get badge count for user
export function useUserBadgeCount() {
  const { getContract, userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['badgeCount', userAddress],
    queryFn: async () => {
      const contract = await getContract('badge');
      const count = await contract.balanceOf(userAddress);
      return Number(count);
    },
    enabled: isConnected && !!userAddress,
    staleTime: 30000,
  });
}

// Hook to mint a badge (only ReputationManager can call this)
export function useMintBadge() {
  const queryClient = useQueryClient();
  const { getContract, userAddress } = useCircleContract();

  return useMutation({
    mutationFn: async ({ badgeType }) => {
      const contract = await getContract('badge');
      const tx = await contract.mint(userAddress, badgeType);
      await tx.wait();
      return tx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userBadges'] });
      queryClient.invalidateQueries({ queryKey: ['badgeCount'] });
    },
  });
}

// Helper functions
function getBadgeName(badgeType) {
  const names = {
    0: 'First Circle',
    1: 'Circle Completed',
    2: '5-Day Streak',
    3: '10-Day Streak',
    4: 'Silver Tier',
    5: 'Gold Tier',
    6: 'High Saver'
  };
  return names[badgeType] || 'Unknown Badge';
}

function getBadgeDescription(badgeType) {
  const descriptions = {
    0: 'Created your first savings circle',
    1: 'Successfully completed a circle',
    2: 'Maintained a 5-day contribution streak',
    3: 'Maintained a 10-day contribution streak',
    4: 'Reached Silver tier reputation',
    5: 'Reached Gold tier reputation',
    6: 'Saved over $10,000 total'
  };
  return descriptions[badgeType] || 'Achievement unlocked!';
}

export function getBadgeIcon(badgeType) {
  const icons = {
    '-1': '👋', // Welcome badge
    0: '🎯',
    1: '✅',
    2: '🔥',
    3: '🔥🔥',
    4: '🥈',
    5: '🥇',
    6: '💎'
  };
  return icons[badgeType] || '🏆';
}

// Get badge requirements in points
export function getBadgeRequirements() {
  return {
    0: { // First Circle
      points: 0, // Automatic when you create/join first circle
      description: "Create or join your first savings circle"
    },
    1: { // Circle Completed
      points: 250, // COMPLETE_CYCLE
      description: "Complete a full savings circle (250 points)"
    },
    2: { // 5-Day Streak
      points: 50, // STREAK_BONUS (5 consecutive on-time payments)
      description: "Make 5 consecutive on-time payments (75 points total: 5×15)"
    },
    3: { // 10-Day Streak
      points: 100, // 2× STREAK_BONUS
      description: "Make 10 consecutive on-time payments (150 points total: 10×15)"
    },
    4: { // Silver Tier
      points: 700, // REPUTATION_TIERS.SILVER.min
      description: "Reach Silver tier (700+ reputation points)"
    },
    5: { // Gold Tier
      points: 850, // REPUTATION_TIERS.GOLD.min
      description: "Reach Gold tier (850+ reputation points)"
    },
    6: { // High Saver
      points: 1000, // Estimate - $10,000+ total saved
      description: "Save over $10,000 total across all circles"
    }
  };
}

// Calculate how to earn reputation points
export function getReputationGuide() {
  return {
    title: "How to Earn Reputation Points (out of 1000+)",
    ways: [
      { action: "On-time payment", points: 15, frequency: "per payment" },
      { action: "Receive payout", points: 25, frequency: "per payout" },
      { action: "5-payment streak bonus", points: 50, frequency: "every 5 consecutive" },
      { action: "Join subsequent circle", points: 100, frequency: "per new circle" },
      { action: "Complete full circle", points: 250, frequency: "per completed circle" },
    ],
    penalties: [
      { action: "Late payment (grace period)", points: -75, note: "Avoid late payments!" }
    ],
    tiers: {
      none: { min: 0, max: 499, name: "None" },
      bronze: { min: 500, max: 699, name: "Bronze" },
      silver: { min: 700, max: 849, name: "Silver (Unlocks Voting)" },
      gold: { min: 850, max: Infinity, name: "Gold (Elite Status)" }
    },
    example: "Example: Complete 3 circles with on-time payments = 3×250 + 3×12×15 = 1,290 points (Gold tier!)"
  };
}
