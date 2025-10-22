# ChainCircle Frontend - Quick Start Guide

## 🚀 What's Been Created

A complete blockchain integration system that fetches real-time data from your Push Chain smart contracts and displays it in your existing UI with proper icons, colors, and formatting.

## 📁 New Files Created

### 1. **Hooks** (`src/hooks/`)
- `useCircleContract.js` - Base contract connection hook
- `useCircleData.js` - All data fetching hooks (read operations)
- `useCircleActions.js` - All transaction hooks (write operations)

### 2. **Utilities** (`src/utils/`)
- `circleHelpers.js` - Icon mapping, color schemes, formatters

### 3. **Components** (`src/Pages/Circle/`)
- `CirclePreview.jsx` - Preview & join circles via shareable links

### 4. **Updated Services** (`src/services/`)
- `circleAPI.js` - Now fetches from blockchain
- `recentActivitiesAPI.js` - Now fetches from blockchain

## 🎯 How to Use in Your Existing Pages

### Dashboard Page

Update `src/Routes/Dashboard.jsx`:

```javascript
import React from 'react';
import { useUserStats, useActiveCircles } from '../hooks/useCircleData';
import { getGoalIcon, getGoalColors } from '../utils/circleHelpers';

export default function Dashboard() {
  const { data: stats, isLoading } = useUserStats();
  const { data: activeCircles } = useActiveCircles();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="h-full overflow-auto flex flex-col gap-10">
      {/* Header Card - Your existing design */}
      <header className="px-6 py-4 rounded-[16px] ...">
        <h3 className="font-bold text-[40px]">
          {stats?.totalSaved ? `$${parseFloat(stats.totalSaved).toFixed(2)}` : '$0.00'}
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 ...">
            <p><span>{stats?.activeCircles || 0}</span> active circles</p>
          </div>
          <div className="flex-1 ...">
            <p><span>${stats?.totalInterest || '0'}</span> interest earned</p>
          </div>
        </div>
      </header>

      {/* Active Circles - Dynamically rendered */}
      <section className="flex flex-col gap-5">
        <h3>Active Circles</h3>
        <div className="flex items-start gap-10 overflow-x-scroll">
          {activeCircles?.map((circle) => {
            const IconComponent = getGoalIcon(circle.goalType);
            const colors = getGoalColors(circle.goalType);

            return (
              <div key={circle.id} className="flex flex-col gap-2 items-center">
                <div className={`w-[102px] h-[102px] rounded-full flex items-center justify-center ${colors.bg} ${colors.text}`}>
                  <IconComponent size={33} />
                </div>
                <p className="text-center text-[21px]">{circle.name}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Keep your existing DashboardTable - it's already using the hook */}
      <DashboardTable />
    </div>
  );
}
```

### Circle Page (Progress Tracking)

Update `src/Routes/Circle.jsx`:

```javascript
import React from 'react';
import { useUserCircles } from '../hooks/useCircleData';
import { getGoalIcon, getGoalColors } from '../utils/circleHelpers';

export default function Circle() {
  const { data: circles, isLoading } = useUserCircles();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-10">
      <h3 className="text-[30px] font-bold">Your Circles</h3>

      <div className="flex flex-col gap-6">
        {circles?.map((circle) => {
          const IconComponent = getGoalIcon(circle.goalType);
          const colors = getGoalColors(circle.goalType);

          return (
            <div key={circle.id} className="flex items-center justify-between">
              {/* Circle Icon & Name */}
              <div className="flex items-center gap-6">
                <div className={`w-[102px] h-[102px] rounded-full flex items-center justify-center ${colors.bg} ${colors.text}`}>
                  <IconComponent size={33} />
                </div>
                <div>
                  <p className="text-[24px]">{circle.name}</p>
                  <p className="text-[#AAAAAA]">${circle.amount} / {circle.frequency === 0 ? 'Monthly' : 'Weekly'}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-[300px]">
                <div className="flex justify-between mb-2">
                  <span>Progress</span>
                  <span className="text-primary">{circle.progress}%</span>
                </div>
                <div className="w-full h-3 bg-[#333] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#D548EC] to-[#F4AEFF]"
                    style={{ width: `${circle.progress}%` }}
                  />
                </div>
              </div>

              {/* Status Badge */}
              <div className="px-8 py-2 rounded-full border border-[#F4AEFF]">
                {circle.isActive ? 'Active' : 'Completed'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Payout Page

Update `src/Routes/Payout.jsx`:

```javascript
import React, { useState } from 'react';
import { usePayoutHistory, useUpcomingPayouts } from '../hooks/useCircleData';
import { useWithdrawPayout } from '../hooks/useCircleActions';
import { getGoalIcon, getGoalColors } from '../utils/circleHelpers';

export default function Payout() {
  const [filter, setFilter] = useState('upcoming'); // 'upcoming' or 'history'
  const { data: history } = usePayoutHistory();
  const { data: upcoming } = useUpcomingPayouts();
  const withdrawPayout = useWithdrawPayout();

  const displayData = filter === 'upcoming' ? upcoming : history;

  const handleWithdraw = async (circleId) => {
    try {
      await withdrawPayout.mutateAsync(circleId);
      alert('Payout withdrawn successfully!');
    } catch (error) {
      alert('Failed to withdraw payout');
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <h3 className="text-[30px] font-bold">Your Payouts</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-3 border border-[#F4AEFF] rounded-[16px] bg-transparent"
        >
          <option value="upcoming">Only Upcoming</option>
          <option value="history">History</option>
        </select>
      </div>

      <div className="flex flex-col gap-6">
        {displayData?.map((payout, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex flex-col gap-2.5 text-[24px]">
                <p>{payout.amount || payout.estimatedDate}</p>
                <p className="text-[16px] text-[#AAAAAA]">{payout.circleName}</p>
              </div>
            </div>

            <div className="px-8 py-2 rounded-full border border-[#F4AEFF]">
              {payout.date || payout.estimatedDate}
            </div>

            {filter === 'history' && !payout.claimed && (
              <button
                onClick={() => handleWithdraw(payout.circleId)}
                className="px-6 py-3 bg-[#D548EC] rounded-full"
                disabled={withdrawPayout.isPending}
              >
                {withdrawPayout.isPending ? 'Claiming...' : 'Claim'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Profile Page (Reputation)

Update `src/Routes/Profile.jsx` to show reputation:

```javascript
import React from 'react';
import { useUserStats } from '../hooks/useCircleData';
import { getReputationTier, getTierColor } from '../utils/circleHelpers';

export default function Profile() {
  const { data: stats } = useUserStats();
  const tier = getReputationTier(stats?.reputation.score || 0);
  const tierColor = getTierColor(tier);

  return (
    <div className="flex flex-col gap-10">
      {/* Reputation Section */}
      <div className="p-6 border border-[#F4AEFF] rounded-[16px]">
        <h3 className="text-[24px] font-bold mb-4">Reputation</h3>

        <div className="flex items-center gap-4">
          <div className={`text-[48px] font-bold ${tierColor}`}>
            {stats?.reputation.score || 0}
          </div>
          <div>
            <p className={`text-[24px] ${tierColor}`}>{tier} Badge</p>
            <p className="text-[#AAAAAA]">out of 1000 points</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <p className="text-[#AAAAAA]">Completed Circles</p>
            <p className="text-[24px] font-bold">{stats?.reputation.completedCircles || 0}</p>
          </div>
          <div>
            <p className="text-[#AAAAAA]">On-Time Rate</p>
            <p className="text-[24px] font-bold">{stats?.reputation.onTimeRate || 0}%</p>
          </div>
          <div>
            <p className="text-[#AAAAAA]">Longest Streak</p>
            <p className="text-[24px] font-bold">{stats?.reputation.longestStreak || 0} payments</p>
          </div>
          <div>
            <p className="text-[#AAAAAA]">User Since</p>
            <p className="text-[24px] font-bold">
              {stats?.reputation.accountAge
                ? new Date(stats.reputation.accountAge * 1000).toLocaleDateString()
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Keep your existing profile components */}
    </div>
  );
}
```

### Home Page (Global Stats)

Update `src/Routes/Home.jsx` to show global stats:

```javascript
import React from 'react';
import { useGlobalStats } from '../hooks/useCircleData';

export default function Home() {
  const { data: stats } = useGlobalStats();

  return (
    <div className="flex flex-col gap-4 max-w-dvw">
      {/* Your existing header */}

      {/* Add global stats in your existing Social Proof section */}
      <section className="pt-[120px] pb-[70px] ...">
        <h1 className="font-bold text-[40px] text-center">Social Proof</h1>

        <div className="carousel-container ...">
          <div className="carousel-item ...">
            <p>
              <span className="text-primary">${stats?.totalPooled ? parseFloat(stats.totalPooled).toLocaleString() : '0'}</span> pooled
            </p>
          </div>

          <div className="carousel-item ...">
            <p>
              <span className="text-primary">{stats?.activeCircles || 0}</span> circles active
            </p>
          </div>

          <div className="carousel-item ...">
            <p>
              <span className="text-primary">{stats?.totalCircles || 0}</span> total circles created
            </p>
          </div>
        </div>
      </section>

      {/* Rest of your existing content */}
    </div>
  );
}
```

## 🔧 Updating CreateCircleModal

Update `src/Pages/Circle/CreateCircleModal.jsx`:

```javascript
import { useCreateCircle } from '../../hooks/useCircleActions';

export default function CreateCircleModal({ onClose }) {
  const createCircle = useCreateCircle();
  const [formData, setFormData] = useState({...});

  const handleSubmit = async () => {
    try {
      await createCircle.mutateAsync({
        name: formData.circleName,
        goalType: formData.goalType, // 0-5
        amount: formData.contributionAmount,
        duration: formData.duration,
        maxMembers: formData.maxMembers,
        frequency: formData.frequency === 'Monthly' ? 0 : 1
      });

      alert('Circle created successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to create circle:', error);
      alert('Failed to create circle. Please try again.');
    }
  };

  // Keep your existing UI, just update handleSubmit
}
```

## 🎨 Icon & Color System

The system automatically assigns icons and colors based on `goalType`:

```javascript
// Goal types from contract
const GOAL_TYPES = {
  HOME: 0,          // 🏠 Blue
  EDUCATION: 1,     // 🎓 Orange
  BUSINESS: 2,      // 💼 Red
  EMERGENCY: 3,     // 🏥 Pink
  TRAVEL: 4,        // 🚗 Green
  OTHER: 5          // 🎉 Purple
};

// Usage
const IconComponent = getGoalIcon(circle.goalType);
const colors = getGoalColors(circle.goalType);

<div className={`${colors.bg} ${colors.text}`}>
  <IconComponent size={44} />
</div>
```

## 🔗 Circle Sharing

### Share Button Component
```javascript
import { generateCircleLink } from '../utils/circleHelpers';

function ShareButton({ circleId, circleName }) {
  const handleShare = () => {
    const link = generateCircleLink(circleId, circleName);

    if (navigator.share) {
      navigator.share({
        title: circleName,
        text: `Join my savings circle: ${circleName}`,
        url: link
      });
    } else {
      navigator.clipboard.writeText(link);
      alert('Circle link copied!');
    }
  };

  return (
    <button onClick={handleShare}>Share Circle</button>
  );
}
```

### Add Route for Circle Preview
In `App.jsx`:
```javascript
import CirclePreview from './Pages/Circle/CirclePreview';

<Routes>
  {/* Existing routes */}
  <Route path="/chain/circle/:circleId" element={<CirclePreview />} />
</Routes>
```

## 📊 Dashboard with Recent Activities

Your `DashboardTable` already uses the hook, but here's the structure:

```javascript
import { useRecentActivities } from '../../hooks/useCircleData';

export default function DashboardTable() {
  const { data, isLoading } = useRecentActivities(10);

  return (
    <div>
      {data?.map((item) => (
        <div key={item.id} className="flex justify-between">
          <div className="flex items-center gap-4">
            <ActivityIcon type={item.type} />
            <div>
              <p>{item.title}</p>
              <p className="text-[12px]">{item.timeAgo}</p>
            </div>
          </div>
          <p className="text-primary">{item.amount}</p>
        </div>
      ))}
    </div>
  );
}
```

## ✅ Testing Checklist

1. ✅ Connect wallet via Push Chain
2. ✅ Mint test CUSD from faucet
3. ✅ Create a test circle
4. ✅ Join your own circle
5. ✅ Make a contribution
6. ✅ Check dashboard shows correct data
7. ✅ Check profile shows reputation
8. ✅ Check recent activities appear
9. ✅ Share a circle link
10. ✅ Preview circle from shared link

## 🐛 Common Issues

### "Cannot read properties of undefined"
- Make sure you're checking if data exists: `{data?.fieldName}`
- Use loading states: `if (isLoading) return <Spinner />;`

### "Transaction failed"
- Ensure user has enough CUSD balance
- Check gas fees (user needs some PC tokens)
- Verify contract addresses in `constants/contracts.js`

### "Hook not updating"
- React Query caches data - check `staleTime` in hook
- Force refetch with `queryClient.invalidateQueries()`

## 🎉 You're Done!

Your frontend now:
- ✅ Fetches real-time data from blockchain
- ✅ Maps correct icons and colors to circles
- ✅ Shows accurate user stats and reputation
- ✅ Supports circle sharing and preview
- ✅ Works with Push Chain's universal accounts
- ✅ Automatically handles cross-chain interactions

For detailed technical docs, see `BLOCKCHAIN_INTEGRATION.md`.
