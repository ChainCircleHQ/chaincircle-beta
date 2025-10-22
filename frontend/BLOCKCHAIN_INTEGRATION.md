# ChainCircle Blockchain Integration Guide

## Overview

This document explains how the ChainCircle frontend integrates with the Push Chain smart contracts to fetch and display real-time blockchain data.

## Architecture

### Contracts
- **ChainCircleCore**: Main contract managing circles, contributions, and payouts
- **ReputationManager**: Manages user reputation scores and tiers
- **CUSD**: Test stablecoin for contributions
- **NameRegistry**: Maps user-friendly names to addresses
- **BadgeNFT**: Achievement badges for users

### Contract Addresses (Push Chain Donut Testnet)
```javascript
CUSD: "0x7D5Dbda57E186f7e905e5E77224Cd60054fF41f3"
CHAIN_CIRCLE_CORE: "0x59D44aea45bd92E2798b7998e8E090586670f161"
REPUTATION_MANAGER: "0xEaEa469279B89E7fF0BDd5903226483418AB37e4"
BADGE_NFT: "0x9171F3AE9Cb9EBBa0826ad31971647DceB52Bd50"
NAME_REGISTRY: "0x1c8fCc121D52EAa6d4705fCcE95e34E2CEDced5E"
```

## Data Fetching Hooks

All blockchain data is fetched using React Query hooks located in `src/hooks/useCircleData.js`:

### 1. User's Circles
```javascript
import { useUserCircles } from '../hooks/useCircleData';

function MyComponent() {
  const { data: circles, isLoading, error } = useUserCircles();
  // circles contains all user's circles with details
}
```

### 2. Active Circles Only
```javascript
import { useActiveCircles } from '../hooks/useCircleData';

function Dashboard() {
  const { data: activeCircles } = useActiveCircles();
  // Only returns circles where isActive = true
}
```

### 3. Circle Details
```javascript
import { useCircleDetails } from '../hooks/useCircleData';

function CircleView({ circleId }) {
  const { data: circle } = useCircleDetails(circleId);
  // Returns complete circle info including progress, members, invite code
}
```

### 4. Recent Activities
```javascript
import { useRecentActivities } from '../hooks/useCircleData';

function ActivityFeed() {
  const { data: activities } = useRecentActivities(10); // limit = 10
  // Returns user's recent contributions, withdrawals, interest earned
}
```

### 5. User Statistics
```javascript
import { useUserStats } from '../hooks/useCircleData';

function ProfilePage() {
  const { data: stats } = useUserStats();
  // Returns:
  // - totalSaved, totalInterest, activeCircles, totalCircles
  // - reputation: { score, tier, completedCircles, onTimeRate, longestStreak }
}
```

### 6. Global Platform Stats
```javascript
import { useGlobalStats } from '../hooks/useCircleData';

function LandingPage() {
  const { data: stats } = useGlobalStats();
  // Returns: totalPooled, activeCircles, totalCircles
}
```

### 7. Payout History & Upcoming Payouts
```javascript
import { usePayoutHistory, useUpcomingPayouts } from '../hooks/useCircleData';

function PayoutPage() {
  const { data: history } = usePayoutHistory();
  const { data: upcoming } = useUpcomingPayouts();
}
```

### 8. Search Circles
```javascript
import { useSearchCircles } from '../hooks/useCircleData';

function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: results } = useSearchCircles(searchTerm);
  // Searches circles by name (minimum 3 characters)
}
```

## Contract Interaction Hooks

For write operations (creating circles, contributing, etc.), use hooks from `src/hooks/useCircleActions.js`:

### 1. Create Circle
```javascript
import { useCreateCircle } from '../hooks/useCircleActions';

function CreateCircleModal() {
  const createCircle = useCreateCircle();

  const handleCreate = async () => {
    await createCircle.mutateAsync({
      name: "Dream House Squad",
      goalType: 0, // HOME
      amount: 500, // CUSD
      duration: 12, // months
      maxMembers: 10,
      frequency: 0 // MONTHLY
    });
  };
}
```

### 2. Join Circle
```javascript
import { useJoinCircle } from '../hooks/useCircleActions';

function JoinButton({ circleId }) {
  const joinCircle = useJoinCircle();

  const handleJoin = async () => {
    await joinCircle.mutateAsync(circleId);
  };
}
```

### 3. Contribute to Circle
```javascript
import { useContribute } from '../hooks/useCircleActions';

function ContributeButton({ circleId }) {
  const contribute = useContribute();

  const handleContribute = async () => {
    await contribute.mutateAsync(circleId);
    // Auto-approves CUSD and makes contribution
  };
}
```

### 4. Withdraw Payout
```javascript
import { useWithdrawPayout } from '../hooks/useCircleActions';

function WithdrawButton({ circleId }) {
  const withdraw = useWithdrawPayout();

  const handleWithdraw = async () => {
    await withdraw.mutateAsync(circleId);
  };
}
```

### 5. Mint Test CUSD
```javascript
import { useMintCUSD, useCUSDBalance } from '../hooks/useCircleActions';

function FaucetPage() {
  const mintCUSD = useMintCUSD();
  const { data: balance } = useCUSDBalance();

  const handleMint = async () => {
    await mintCUSD.mutateAsync('1000'); // 1000 CUSD
  };
}
```

## Icon and Goal Type Mapping

All circle icons and colors are dynamically mapped based on the `goalType` from the contract:

```javascript
import { getGoalIcon, getGoalColors } from '../utils/circleHelpers';

function CircleCard({ circle }) {
  const IconComponent = getGoalIcon(circle.goalType);
  const colors = getGoalColors(circle.goalType);

  return (
    <div className={`${colors.bg} ${colors.text}`}>
      <IconComponent size={44} />
      <h3>{circle.name}</h3>
    </div>
  );
}
```

### Goal Types
- `0`: HOME (🏠) - Blue colors
- `1`: EDUCATION (🎓) - Orange colors
- `2`: BUSINESS (💼) - Red colors
- `3`: EMERGENCY (🏥) - Pink colors
- `4`: TRAVEL (🚗) - Green colors
- `5`: OTHER (🎉) - Purple colors

## Circle Sharing & Preview

### Generate Shareable Link
```javascript
import { generateCircleLink, generateInviteUrl } from '../utils/circleHelpers';

function ShareButton({ circleId, circleName }) {
  const handleShare = () => {
    const link = generateCircleLink(circleId, circleName);
    // link: https://yourdomain.com/chain/circle/123?name=Dream%20House%20Squad

    navigator.clipboard.writeText(link);
  };
}
```

### Circle Preview Component
Users can preview a circle before joining:

```javascript
import CirclePreview from '../Pages/Circle/CirclePreview';

function App() {
  return (
    <Routes>
      <Route path="/chain/circle/:circleId" element={<CirclePreview />} />
    </Routes>
  );
}
```

When a user visits `/chain/circle/123?preview=true`, they see:
- Circle name and icon
- Progress bar
- Contribution amount, duration, frequency
- Current members
- "Join Circle" button
- "Share" button

## Reputation System

The reputation system is fully blockchain-based:

### Points Breakdown
- Complete a cycle: **+250 pts**
- On-time payment: **+15 pts**
- 5 consecutive on-time payments: **+50 pts bonus**
- Miss payment (grace period): **-75 pts**
- Receive payout: **+25 pts**
- Join subsequent cycle: **+100 pts**

### Tiers
- **Bronze**: 500-699 points
- **Silver**: 700-849 points
- **Gold**: 850+ points

### Display Reputation
```javascript
import { useUserStats } from '../hooks/useCircleData';
import { getReputationTier, getTierColor } from '../utils/circleHelpers';

function ProfileCard() {
  const { data: stats } = useUserStats();
  const tier = getReputationTier(stats.reputation.score);
  const tierColor = getTierColor(tier);

  return (
    <div>
      <h3 className={tierColor}>{tier} Badge</h3>
      <p>{stats.reputation.score} / 1000 points</p>
    </div>
  );
}
```

## Data Flow Example

### Dashboard Page
```javascript
import { useUserStats, useActiveCircles, useRecentActivities } from '../hooks/useCircleData';

function Dashboard() {
  const { data: stats } = useUserStats();
  const { data: circles } = useActiveCircles();
  const { data: activities } = useRecentActivities(5);

  return (
    <div>
      {/* Header Card */}
      <div>
        <h2>Total Saved: ${stats?.totalSaved}</h2>
        <p>{stats?.activeCircles} active circles</p>
        <p>${stats?.totalInterest} interest earned</p>
      </div>

      {/* Active Circles */}
      <div>
        {circles?.map(circle => (
          <CircleCard key={circle.id} circle={circle} />
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        {activities?.map(activity => (
          <ActivityRow key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}
```

## Push Chain Integration

All write operations automatically use Push Chain's Universal Account if available:

```javascript
// In useCircleActions.js
if (pushChainClient?.universal) {
  // Use Push Chain universal transaction
  const data = contract.interface.encodeFunctionData('contribute', [circleId]);
  const tx = await pushChainClient.universal.sendTransaction({
    to: contractAddress,
    data
  });
} else {
  // Fallback to direct contract call
  const tx = await contract.contribute(circleId);
}
```

This means users can:
- Pay gas in their native chain token (ETH, SOL, etc.)
- Interact with circles using CUSD on their UEA
- Seamlessly use the dApp from any supported chain

## Error Handling

All hooks include automatic error handling:

```javascript
function MyComponent() {
  const { data, isLoading, error } = useUserCircles();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return <CircleList circles={data} />;
}
```

## Cache & Refetching

React Query automatically handles caching and refetching:
- User data: refetches every 30 seconds
- Circle details: refetches every 20 seconds
- Activities: refetches every 15 seconds
- Global stats: refetches every 60 seconds

After mutations (create, join, contribute, withdraw), relevant queries are automatically invalidated and refetched.

## Migration from Mock Data

Old services in `src/services/` are now deprecated but kept for backward compatibility. They now fetch real blockchain data:

- `circleAPI.js`: Now uses ChainCircleCore contract
- `recentActivitiesAPI.js`: Now uses contract events and activity log

**Recommended**: Migrate to the new hooks for better performance and type safety.

## Testing

### Local Testing
1. Connect to Push Chain Donut Testnet
2. Get test CUSD from the faucet
3. Create a test circle
4. Make contributions and test all features

### Testnet Faucets
- **Push Chain PC**: https://faucet.push.org
- **CUSD**: Use the in-app faucet or call `mint()` directly

## Troubleshooting

### "User not connected" Error
Make sure wallet is connected via Push UI Kit:
```javascript
const { connectionStatus } = usePushWalletContext();
if (connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED) {
  // Show connect wallet button
}
```

### "Insufficient CUSD balance"
User needs to mint CUSD first:
```javascript
const mintCUSD = useMintCUSD();
await mintCUSD.mutateAsync('1000');
```

### Contract Call Fails
Check that contracts are deployed on the network and addresses are correct in `src/constants/contracts.js`.

## Future Enhancements

Features that can be added with minimal contract changes:
- Pin/favorite circles (add to user preferences contract)
- Circle invitations via invite codes
- Push notifications for payment reminders
- Circle chat/messaging
- Multi-token support (ETH, other stablecoins)
