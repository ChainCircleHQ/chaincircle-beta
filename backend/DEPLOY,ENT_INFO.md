# ChainCircle Smart Contracts - Deployment Information

## Network Details
- **Network:** Push Chain Donut Testnet
- **Chain ID:** 42101
- **RPC URL:** https://evm.rpc-testnet-donut-node1.push.org/
- **Explorer:** https://donut.push.network
- **Currency:** PC (Push Token)

## Latest Deployment (October 2025)

### Contract Addresses
```javascript
const CONTRACTS = {
  CUSD: "0x7D5Dbda57E186f7e905e5E77224Cd60054fF41f3",
  ChainCircleCore: "0x59D44aea45bd92E2798b7998e8E090586670f161",
  ReputationManager: "0xEaEa469279B89E7fF0BDd5903226483418AB37e4",
  MockYield: "0x2312493eac47f20a3a1B8e7AB1627F1B1FDd3412",
  BadgeNFT: "0x9171F3AE9Cb9EBBa0826ad31971647DceB52Bd50",
  GovernanceModule: "0xA3c786088a6D3EB9216B5647a4149a7dF0149b49",
  NameRegistry: "0x1c8fCc121D52EAa6d4705fCcE95e34E2CEDced5E"
};
```

### Deployment Status
- ✅ All contracts deployed
- ✅ All contracts verified on Push Chain Explorer
- ✅ All contracts linked and functional
- ✅ Tested via interaction script

## Contract Explorer Links

- [CUSD](https://donut.push.network/address/0x7D5Dbda57E186f7e905e5E77224Cd60054fF41f3)
- [ChainCircleCore](https://donut.push.network/address/0x59D44aea45bd92E2798b7998e8E090586670f161)
- [ReputationManager](https://donut.push.network/address/0xEaEa469279B89E7fF0BDd5903226483418AB37e4)
- [MockYield](https://donut.push.network/address/0x2312493eac47f20a3a1B8e7AB1627F1B1FDd3412)
- [BadgeNFT](https://donut.push.network/address/0x9171F3AE9Cb9EBBa0826ad31971647DceB52Bd50)
- [GovernanceModule](https://donut.push.network/address/0xA3c786088a6D3EB9216B5647a4149a7dF0149b49)
- [NameRegistry](https://donut.push.network/address/0x1c8fCc121D52EAa6d4705fCcE95e34E2CEDced5E)

## Key Contract Functions for Frontend

### ChainCircleCore
```javascript
// Create Circle
createCircle(name, goalType, amount, duration, maxMembers, frequency)

// Join Circle
joinCircle(circleId)

// Contribute
contribute(circleId)

// View Functions
getCircleDetails(circleId)
getCircleProgress(circleId)
getUserCircles(userAddress)
getUserActiveCircleCount(userAddress)
getUserTotalContributions(userAddress)
getUserTotalInterest(userAddress)
getRecentActivity(userAddress, limit)
getUserPayoutHistory(userAddress)
getUserUpcomingPayouts(userAddress)
getCircleInviteCode(circleId)
searchCircles(searchTerm)
getUserChainOrigin(userAddress)
getTotalPooled()
getActiveCircleCount()
```

### ReputationManager
```javascript
// View Functions
getUserReputation(userAddress) // Returns: score, tier, circlesCompleted, onTimeRate, totalSaved, accountAge, longestStreak
getDetailedStats(userAddress) // Returns: currentStreak, missedPayments, totalInterestEarned, subsequentCycles
canVote(userAddress) // Returns: bool
getTier(score) // Returns: tier name
```

### CUSD (ERC20 + Faucet)
```javascript
// Faucet
claimFromFaucet() // Mint 1000 CUSD (24hr cooldown)
getTimeUntilNextClaim(userAddress) // Check cooldown

// Standard ERC20
approve(spender, amount)
transfer(to, amount)
balanceOf(account)
```

### BadgeNFT
```javascript
getUserBadge(userAddress) // Returns: tokenId, tier
```

### NameRegistry
```javascript
setName(name) // Set display name
getName(userAddress) // Get display name
hasName(userAddress) // Check if user has name
```

## Constants

### CUSD
- **Decimals:** 6 (like USDC)
- **Faucet Amount:** 1000 CUSD
- **Faucet Cooldown:** 24 hours

### Circle Parameters
- **Min Duration:** 3 months
- **Max Duration:** 12 months
- **Min Members:** 3
- **Max Members:** 12
- **Min Amount:** 100 CUSD
- **Max Amount:** 5000 CUSD
- **Grace Period:** 2 days

### Reputation Tiers & Points

| Tier | Score Range |
|------|-------------|
| None | 0 - 499 |
| Bronze | 500 - 699 |
| Silver | 700 - 849 |
| Gold | 850+ |

**Points System:**
- Complete cycle: **+250 pts**
- On-time payment: **+15 pts**
- Streak bonus (every 5): **+50 pts**
- Missed payment: **-75 pts**
- Payout received: **+25 pts**
- Subsequent cycle: **+100 pts**

**Voting Requirements:**
- Minimum tier: Silver (700+)
- Minimum completed circles: 2

## Push Chain Features

### Universal Account Detection
The contracts use Push Chain's IUEAFactory to detect user origins:
```javascript
getUserChainOrigin(userAddress)
// Returns: (chainType, isExternal)
// chainType: "Push Chain", "Ethereum Sepolia", "Solana Devnet", etc.
// isExternal: true if from another chain, false if native Push Chain
```

### Supported Chains
- Push Chain (native)
- Ethereum Sepolia
- Solana Devnet

## Integration Notes

### For Frontend Developers

1. **Use Push UI Kit** (`@pushchain/ui-kit`) for wallet connections
2. **CUSD Token** is the savings currency (6 decimals)
3. **Public Faucet** available - users can claim 1000 CUSD every 24 hours
4. **Always approve CUSD** before creating/joining circles
5. **Events to listen for:**
   - CircleCreated
   - MemberJoined
   - ContributionMade
   - PayoutProcessed
   - InterestDistributed
   - CircleCompleted
   - ActivityLogged
   - ScoreChanged
   - TierChanged

### Sample Integration Code
```javascript
import { ethers } from 'ethers';

// Connect to Push Chain
const provider = new ethers.JsonRpcProvider(
  'https://evm.rpc-testnet-donut-node1.push.org/'
);

// Load contracts
const cusd = new ethers.Contract(CONTRACTS.CUSD, CUSD_ABI, signer);
const core = new ethers.Contract(CONTRACTS.ChainCircleCore, CORE_ABI, signer);
const reputation = new ethers.Contract(CONTRACTS.ReputationManager, REP_ABI, signer);

// 1. Claim CUSD from faucet
const timeUntilClaim = await cusd.getTimeUntilNextClaim(userAddress);
if (timeUntilClaim === 0) {
  await cusd.claimFromFaucet();
}

// 2. Create a circle
const amount = ethers.parseUnits('500', 6); // 500 CUSD
await cusd.approve(CONTRACTS.ChainCircleCore, amount);
await core.createCircle(
  "Dream Home Squad",
  0, // HOME goal type
  amount,
  6, // 6 months
  6, // 6 members
  0  // MONTHLY frequency
);

// 3. Get user stats
const rep = await reputation.getUserReputation(userAddress);
console.log(`Score: ${rep.score}, Tier: ${rep.tier}`);

// 4. Get recent activity
const activity = await core.getRecentActivity(userAddress, 5);
activity.forEach(a => {
  console.log(`${a.activityType}: ${ethers.formatUnits(a.amount, 6)} CUSD`);
});
```

## Testing

### Get Testnet Tokens
- **PC (gas):** https://faucet.push.org/
- **CUSD:** Call `cusd.claimFromFaucet()` (1000 CUSD, 24hr cooldown)

### Test Flow
1. Connect wallet (any chain via Push UI Kit)
2. Claim CUSD from faucet
3. Create or join a circle
4. Make contributions
5. Check reputation progress
6. Claim payouts when eligible

## ABI Files

ABIs are available in:
```
artifacts/contracts/core/ChainCircleCore.sol/ChainCircleCore.json
artifacts/contracts/modules/ReputationManager.sol/ReputationManager.json
artifacts/contracts/tokens/CUSD.sol/CUSD.json
artifacts/contracts/tokens/BadgeNFT.sol/BadgeNFT.json
artifacts/contracts/modules/NameRegistry.sol/NameRegistry.json
artifacts/contracts/core/GovernanceModule.sol/GovernanceModule.json
```

Or use the frontend-ready export:
```
deployments/pushDonut/addresses.js
```

## Support

- **Documentation:** See README.md and frontend audit document
- **Push Chain Docs:** https://push.org/docs
- **Block Explorer:** https://donut.push.network
- **Issues:** GitHub Issues

---

**Last Updated:** October 21, 2025
**Deployment Version:** v2.0.0