# ChainCircle Badge & Reputation System Guide

## 📊 Reputation Point System (Out of 1000+)

Your reputation score determines your tier and unlocks badges. The maximum score is unlimited, but tiers max out at 850+.

### How to Earn Points

| Action | Points | Frequency |
|--------|--------|-----------|
| **On-time payment** | +15 | Per payment |
| **Receive payout** | +25 | Per payout received |
| **5-payment streak bonus** | +50 | Every 5 consecutive on-time payments |
| **Join subsequent circle** | +100 | Per new circle after your first |
| **Complete full circle** | +250 | Per completed circle |

### Penalties

| Action | Points | Note |
|--------|--------|------|
| **Late payment (within grace period)** | -75 | Avoid at all costs! |

---

## 🏆 Badge Requirements

### Badge Types & How to Earn Them

| Badge | Name | Requirement | Icon |
|-------|------|-------------|------|
| **0** | First Circle 🎯 | Create or join your first circle | Automatic |
| **1** | Circle Completed ✅ | Complete a full savings circle | 250 points |
| **2** | 5-Day Streak 🔥 | Make 5 consecutive on-time payments | 75 total points (5×15) |
| **3** | 10-Day Streak 🔥🔥 | Make 10 consecutive on-time payments | 150 total points (10×15) |
| **4** | Silver Tier 🥈 | Reach Silver tier | 700+ reputation |
| **5** | Gold Tier 🥇 | Reach Gold tier | 850+ reputation |
| **6** | High Saver 💎 | Save over $10,000 total | $10,000+ saved |
| **-1** | Welcome 👋 | Mock badge for new users | 0 points (auto-shown) |

---

## 🎖️ Reputation Tiers

| Tier | Score Range | Benefits |
|------|-------------|----------|
| **None** | 0 - 499 | Starting level |
| **Bronze** | 500 - 699 | Enhanced trust level |
| **Silver** | 700 - 849 | **Unlocks Governance Voting Rights** |
| **Gold** | 850+ | Elite status, maximum trust |

### Governance Voting Requirements
- Minimum tier: **Silver** (700+ points)
- Minimum completed circles: **2**

---

## 📈 Example Scenarios

### Scenario 1: New User - First Badge
**Goal**: Get your first badge

**Steps**:
1. Create or join a circle → **First Circle Badge 🎯** (automatic)
2. Your profile now shows 1 badge instead of the "Welcome" placeholder

**Points**: 0+ (badge is automatic, not score-based)

---

### Scenario 2: Reach Bronze Tier
**Goal**: Get to 500 points (Bronze)

**Path**:
1. Join 2 circles → +100 points (2nd circle bonus)
2. Make 12 on-time payments → +180 points (12×15)
3. Complete 1 circle → +250 points
4. **Total**: 530 points → **Bronze Tier**

**Badges Earned**: First Circle 🎯, Circle Completed ✅

---

### Scenario 3: Reach Silver Tier (Unlock Voting)
**Goal**: Get to 700 points (Silver + Voting Rights)

**Path**:
1. Complete 2 circles with all on-time payments:
   - 2 circles × 250 points = 500 points
   - 2 circles × 12 payments × 15 points = 360 points
   - Join 2nd circle bonus = +100 points
2. **Total**: 960 points → **Gold Tier!**

**Badges Earned**: First Circle 🎯, Circle Completed ✅, 5-Day Streak 🔥, 10-Day Streak 🔥🔥, Silver Tier 🥈, Gold Tier 🥇

---

### Scenario 4: Max Out - Gold Tier
**Goal**: Reach 850+ points (Gold Tier)

**Fast Track**:
- Complete 3 circles with all payments on-time:
  - 3 × 250 (completion) = 750 points
  - 3 × 12 × 15 (payments) = 540 points
  - 2 × 100 (subsequent circles) = 200 points
- **Total**: 1,490 points → **Gold Tier + All Badges**

**Time**: ~12 months (if doing monthly circles)

---

## 💡 Pro Tips

### Fastest Way to First Badge
- **Just create a circle** → First Circle Badge 🎯 (instant)

### Fastest Way to 500 Points (Bronze)
1. Join/create 3 circles
2. Complete 1 full circle (3-month duration recommended)
3. Time: ~3 months

### Fastest Way to 700 Points (Silver + Voting)
1. Complete 2 full circles with on-time payments
2. Time: ~6 months (parallel circles)

### Fastest Way to 850 Points (Gold)
1. Complete 3 full circles
2. Never miss a payment deadline
3. Time: ~9 months (parallel circles)

---

## 🚀 Quick Reference

### To Get Your First Badge (New Users):
✅ **Create or join ANY circle** → Instant First Circle Badge 🎯

### Point Breakdown for 1 Completed Circle:
- Completion bonus: **250 points**
- 12 monthly on-time payments: **180 points** (12×15)
- 2 streak bonuses (5+10): **100 points**
- Receive payout once: **25 points**
- **Total per circle**: ~555 points

### Optimal Strategy:
1. **Month 1**: Join 2 circles → +100 points (2nd circle bonus)
2. **Month 3-5**: Complete first circle → +555 points
3. **Month 6-8**: Complete second circle → +555 points
4. **Total after 8 months**: 1,210 points (Gold tier + most badges)

---

## 🎯 Badge Display on Profile

### For New Users (0 reputation):
- Shows **"Welcome to ChainCircle"** badge 👋
- This is a mock badge to prevent empty state
- Disappears once you earn your first real badge

### For Active Users:
- Shows all earned badges with icons
- Total badge count displayed
- Each badge shows name and description

---

## 📝 Current Implementation

### ✅ Completed Features:
1. Badge NFT hook integration (`useBadgeNFT.js`)
2. Welcome badge for new users (prevents empty state)
3. Badge icon mapping with emojis
4. Badge requirements documentation
5. Reputation point calculation guide

### 🔲 To Implement (UI):
1. Display badges on Profile page
2. Show reputation progress bar
3. Display tier badge
4. Show points needed for next tier
5. Badge showcase section

---

## 🔧 For Developers

### Using the Badge System:

```javascript
import { useUserBadges, getBadgeIcon, getBadgeRequirements, getReputationGuide } from '../hooks/useBadgeNFT';

// Get user's badges (includes welcome badge if none earned)
const { data: badges } = useUserBadges();

// Get badge icon
const icon = getBadgeIcon(badgeType);

// Get requirements for all badges
const requirements = getBadgeRequirements();

// Get full reputation guide
const guide = getReputationGuide();
```

### Badge Object Structure:
```javascript
{
  type: 0,           // Badge type (-1 for mock welcome badge)
  name: "First Circle",
  description: "Created your first savings circle",
  uri: "",          // NFT metadata URI
  earned: true,     // true for real badges, false for mock
  mock: false       // true only for welcome badge
}
```

---

## 🎨 UI Design Suggestions

### Badge Display:
```
┌─────────────────────────────────────┐
│  Your Badges (3)                    │
├─────────────────────────────────────┤
│  🎯 First Circle                    │
│  Created your first savings circle  │
├─────────────────────────────────────┤
│  ✅ Circle Completed                │
│  Completed a full savings circle    │
├─────────────────────────────────────┤
│  🔥 5-Day Streak                    │
│  5 consecutive on-time payments     │
└─────────────────────────────────────┘
```

### Reputation Progress:
```
┌─────────────────────────────────────┐
│  Reputation: 530 / 850 (Bronze)     │
│  ████████░░░░░░░░░░░░ 62%           │
│  170 points to Silver tier          │
└─────────────────────────────────────┘
```

---

## 📚 Summary

**Minimum to earn at least 1 badge**:
- ✅ Create or join any circle → **First Circle Badge 🎯** (instant)

**New users see**:
- ✅ "Welcome to ChainCircle" badge 👋 (mock, prevents empty state)

**Badge automatically earned**:
- ✅ First Circle badge when you join/create your first circle

**To reach Bronze (500 pts)**:
- Complete 1 circle → ~555 points

**To reach Silver (700 pts)**:
- Complete 2 circles → ~1,110 points

**To reach Gold (850 pts)**:
- Complete 2 circles → already at ~1,110 points (exceeds 850)

**All badges unlockable by**:
- Completing 3 circles with perfect attendance → 1,490 points (all badges earned!)
