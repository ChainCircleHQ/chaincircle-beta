# ChainCircle Smart Contracts

> Decentralized savings circles on Push Chain - Save together, across any chain.

ChainCircle is a blockchain-based savings platform that enables users from different blockchains (Ethereum, Solana, Push Chain) to participate in collaborative savings circles without bridging or network switching.

[![Push Chain](https://img.shields.io/badge/Push%20Chain-Testnet-purple)](https://push.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.22-blue)](https://soliditylang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Testing](#testing)
- [Contract Addresses](#contract-addresses)
- [Frontend Integration](#frontend-integration)
- [Contributing](#contributing)
- [License](#license)

## Overview

ChainCircle implements a traditional ROSCA (Rotating Savings and Credit Association) model on-chain with the following innovations:

- **Universal Access**: Users from Ethereum, Solana, and Push Chain can participate
- **No Bridging**: Powered by Push Chain's universal transaction layer
- **Reputation System**: Build credit score by completing circles
- **Yield Generation**: Funds earn 4% APR while in the pool
- **Social Accountability**: Friends keep each other on track

## Features

### Core Functionality

- ✅ Create savings circles (3-12 months, 3-12 members)
- ✅ Join circles with first contribution
- ✅ Monthly/weekly contribution schedules
- ✅ Automated payout distribution
- ✅ Emergency withdrawal with governance voting
- ✅ Circle search and invite codes

### Advanced Features

- ✅ **Reputation System**: None → Bronze → Silver → Gold tiers
- ✅ **Cross-Chain Detection**: Know which chain users are from
- ✅ **Soulbound NFT Badges**: Non-transferable achievement tokens
- ✅ **Name Registry**: Display names for better UX
- ✅ **Governance Module**: Vote on early withdrawals
- ✅ **Activity Tracking**: Recent transactions and history
- ✅ **Public Faucet**: 1000 CUSD per claim (24hr cooldown)

## Architecture
```
┌─────────────────────────────────────────────┐
│           ChainCircle Platform              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐      ┌─────────────────┐ │
│  │     CUSD     │      │ ChainCircleCore │ │
│  │   (ERC20)    │◄─────┤  (Main Logic)   │ │
│  │  + Faucet    │      │  + Activity Log │ │
│  └──────────────┘      └─────────────────┘ │
│                              │              │
│         ┌────────────────────┼──────────┐   │
│         │                    │          │   │
│  ┌──────▼──────┐   ┌────────▼──────┐   │   │
│  │ Reputation  │   │   MockYield   │   │   │
│  │   Manager   │   │   (4% APR)    │   │   │
│  │ +Streaks    │   │               │   │   │
│  └──────┬──────┘   └───────────────┘   │   │
│         │                               │   │
│  ┌──────▼──────┐          ┌────────────▼┐  │
│  │  BadgeNFT   │          │ Governance  │  │
│  │ (Soulbound) │          │   Module    │  │
│  └─────────────┘          └─────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │        Name Registry                │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js v18+
- npm or yarn
- Git

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/chaincircle-contracts.git
cd chaincircle-contracts

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Setup

Edit `.env` and add your private key:
```bash
PRIVATE_KEY=your_private_key_without_0x_prefix
```

### Compile Contracts
```bash
npm run compile
```

## Testing

Run the full test suite:
```bash
npm run test
```

Run specific test file:
```bash
npx hardhat test test/ChainCircleCore.test.js
```

### Test Coverage
```bash
npm run coverage
```

Current coverage: **52 passing tests** across all contracts.

## Deployment

### Deploy to Push Chain Testnet

1. **Get testnet tokens**: Visit [Push Faucet](https://faucet.push.org/)

2. **Deploy contracts**:
```bash
npx hardhat run scripts/deploy.js --network pushDonut
```

3. **Verify contracts**:
```bash
npx hardhat run scripts/verify.js --network pushDonut
```

4. **Test interactions**:
```bash
npx hardhat run scripts/interact.js --network pushDonut
```

### Latest Deployment (October 2025)
```javascript
CUSD:               0x7D5Dbda57E186f7e905e5E77224Cd60054fF41f3
ChainCircleCore:    0x59D44aea45bd92E2798b7998e8E090586670f161
ReputationManager:  0xEaEa469279B89E7fF0BDd5903226483418AB37e4
MockYield:          0x2312493eac47f20a3a1B8e7AB1627F1B1FDd3412
BadgeNFT:           0x9171F3AE9Cb9EBBa0826ad31971647DceB52Bd50
GovernanceModule:   0xA3c786088a6D3EB9216B5647a4149a7dF0149b49
NameRegistry:       0x1c8fCc121D52EAa6d4705fCcE95e34E2CEDced5E
```

**All contracts verified on Push Chain Explorer ✅**

## Contract Addresses

### Push Chain Donut Testnet (Chain ID: 42101)

| Contract | Address | Explorer |
|----------|---------|----------|
| CUSD | `0x7D5Dbda57E186f7e905e5E77224Cd60054fF41f3` | [View](https://donut.push.network/address/0x7D5Dbda57E186f7e905e5E77224Cd60054fF41f3) |
| ChainCircleCore | `0x59D44aea45bd92E2798b7998e8E090586670f161` | [View](https://donut.push.network/address/0x59D44aea45bd92E2798b7998e8E090586670f161) |
| ReputationManager | `0xEaEa469279B89E7fF0BDd5903226483418AB37e4` | [View](https://donut.push.network/address/0xEaEa469279B89E7fF0BDd5903226483418AB37e4) |
| MockYield | `0x2312493eac47f20a3a1B8e7AB1627F1B1FDd3412` | [View](https://donut.push.network/address/0x2312493eac47f20a3a1B8e7AB1627F1B1FDd3412) |
| BadgeNFT | `0x9171F3AE9Cb9EBBa0826ad31971647DceB52Bd50` | [View](https://donut.push.network/address/0x9171F3AE9Cb9EBBa0826ad31971647DceB52Bd50) |
| GovernanceModule | `0xA3c786088a6D3EB9216B5647a4149a7dF0149b49` | [View](https://donut.push.network/address/0xA3c786088a6D3EB9216B5647a4149a7dF0149b49) |
| NameRegistry | `0x1c8fCc121D52EAa6d4705fCcE95e34E2CEDced5E` | [View](https://donut.push.network/address/0x1c8fCc121D52EAa6d4705fCcE95e34E2CEDced5E) |

**Network Info:**
- RPC: `https://evm.rpc-testnet-donut-node1.push.org/`
- Explorer: `https://donut.push.network`
- Faucet: `https://faucet.push.org`

## Frontend Integration

### Install Dependencies
```bash
npm install ethers @pushchain/ui-kit
```

### Basic Usage
```javascript
import { ethers } from 'ethers';

// Connect to Push Chain
const provider = new ethers.JsonRpcProvider(
  'https://evm.rpc-testnet-donut-node1.push.org/'
);

// Contract addresses
const CUSD_ADDRESS = '0x7D5Dbda57E186f7e905e5E77224Cd60054fF41f3';
const CORE_ADDRESS = '0x59D44aea45bd92E2798b7998e8E090586670f161';

// Load contracts
const cusd = new ethers.Contract(CUSD_ADDRESS, CUSD_ABI, signer);
const core = new ethers.Contract(CORE_ADDRESS, CORE_ABI, signer);

// Get CUSD from faucet (1000 CUSD, 24hr cooldown)
await cusd.claimFromFaucet();

// Create a circle
const amount = ethers.parseUnits('500', 6); // 500 CUSD
await cusd.approve(CORE_ADDRESS, amount);
await core.createCircle(
  "Dream Home Squad",
  0, // HOME goal type
  amount,
  6, // 6 months
  6, // 6 members
  0  // MONTHLY frequency
);
```

### Using Push UI Kit
```javascript
import { PushUniversalWalletProvider } from '@pushchain/ui-kit';

function App() {
  return (
    <PushUniversalWalletProvider
      config={{ network: 'TESTNET' }}
    >
      <YourApp />
    </PushUniversalWalletProvider>
  );
}
```

See [DEPLOYMENT_INFO.md](./DEPLOYMENT_INFO.md) for complete integration guide.

## Project Structure
```
chaincircle-contracts/
├── contracts/
│   ├── core/
│   │   ├── ChainCircleCore.sol      # Main savings logic + activity tracking
│   │   └── GovernanceModule.sol     # Voting system
│   ├── tokens/
│   │   ├── CUSD.sol                 # Stable token + public faucet
│   │   └── BadgeNFT.sol             # Reputation NFTs (soulbound)
│   ├── modules/
│   │   ├── ReputationManager.sol    # Points system + streak tracking
│   │   ├── MockYield.sol            # 4% APR simulator
│   │   └── NameRegistry.sol         # Display names
│   └── interfaces/
│       └── Interfaces.sol           # Push Chain interfaces
├── scripts/
│   ├── deploy.js                    # Full deployment + linking
│   ├── verify.js                    # Blockscout verification
│   └── interact.js                  # Test interactions
├── test/
│   ├── ChainCircleCore.test.js
│   ├── ReputationManager.test.js
│   ├── GovernanceModule.test.js
│   ├── MockYield.test.js
│   └── integration/
│       └── FullCircle.test.js
├── deployments/
│   └── pushDonut/
│       ├── deployment-addresses.json
│       └── addresses.js              # Frontend-ready format
├── hardhat.config.js
└── package.json
```

## Key Contract Functions

### ChainCircleCore
```solidity
// Create a new savings circle
function createCircle(
  string name,
  uint8 goalType,
  uint256 amount,
  uint8 duration,
  uint8 maxMembers,
  uint8 frequency
) external returns (uint256 circleId)

// Join existing circle (includes first contribution)
function joinCircle(uint256 circleId) external

// Make monthly contribution
function contribute(uint256 circleId) external

// View circle progress
function getCircleProgress(uint256 circleId) 
  external view returns (uint256 percentage, string circleName, string icon)

// Get recent activity
function getRecentActivity(address user, uint256 limit) 
  external view returns (ActivityLog[] memory)

// Get payout history
function getUserPayoutHistory(address user) 
  external view returns (
    uint256[] circleIds,
    uint256[] amounts,
    uint256[] dates,
    string[] circleNames,
    bool[] claimed
  )

// Search circles by name
function searchCircles(string searchTerm) 
  external view returns (uint256[] memory)
```

### ReputationManager
```solidity
// Get user's reputation data
function getUserReputation(address user) 
  external view returns (
    uint256 score,
    string tier,
    uint256 circlesCompleted,
    uint8 onTimeRate,
    uint256 totalSaved,
    uint256 accountAge,
    uint256 longestStreak
  )

// Get detailed stats
function getDetailedStats(address user)
  external view returns (
    uint256 currentStreak,
    uint256 missedPayments,
    uint256 totalInterestEarned,
    uint256 subsequentCycles
  )

// Check voting eligibility
function canVote(address user) external view returns (bool)
```

### CUSD (with Faucet)
```solidity
// Claim free testnet tokens (1000 CUSD, 24hr cooldown)
function claimFromFaucet() external

// Check time until next claim
function getTimeUntilNextClaim(address user) external view returns (uint256)

// Standard ERC20
function approve(address spender, uint256 amount) external returns (bool)
function transfer(address to, uint256 amount) external returns (bool)
function balanceOf(address account) external view returns (uint256)
```

## Constants & Limits

| Parameter | Min | Max |
|-----------|-----|-----|
| Circle Duration | 3 months | 12 months |
| Members per Circle | 3 | 12 |
| Contribution Amount | 100 CUSD | 5,000 CUSD |
| Grace Period | - | 2 days |
| Faucet Amount | 1000 CUSD | - |
| Faucet Cooldown | 24 hours | - |

### Reputation Tiers & Points

| Tier | Score Range |
|------|-------------|
| None | 0 - 499 |
| Bronze | 500 - 699 |
| Silver | 700 - 849 |
| Gold | 850+ |

**Points System:**
- Complete cycle: +250 pts
- On-time payment: +15 pts
- Streak bonus (every 5): +50 pts
- Missed payment: -75 pts
- Payout received: +25 pts
- Subsequent cycle: +100 pts

## Events

Listen to these events for real-time updates:
```solidity
event CircleCreated(uint256 indexed circleId, address indexed creator, uint256 goalAmount);
event MemberJoined(uint256 indexed circleId, address indexed member);
event ContributionMade(uint256 indexed circleId, address indexed member, uint256 amount, uint256 timestamp);
event PayoutProcessed(uint256 indexed circleId, address indexed recipient, uint256 amount, uint256 timestamp);
event InterestDistributed(uint256 indexed circleId, address indexed recipient, uint256 amount, uint256 timestamp);
event CircleCompleted(uint256 indexed circleId, uint256 timestamp);
event ActivityLogged(address indexed user, uint256 circleId, string activityType, uint256 amount);
event ScoreChanged(address indexed user, uint256 oldScore, uint256 newScore, string reason);
event TierChanged(address indexed user, string oldTier, string newTier);
```

## Security

- ✅ ReentrancyGuard on all state-changing functions
- ✅ Access control via Ownable
- ✅ Input validation on all parameters
- ✅ Emergency governance for edge cases
- ⚠️ **Not audited** - Use at your own risk on testnet

## Roadmap

- [x] Core circle functionality
- [x] Reputation system with streaks
- [x] Cross-chain detection
- [x] Activity tracking
- [x] Public faucet
- [x] Testnet deployment
- [ ] Push Protocol notifications
- [ ] Security audit
- [ ] Mainnet deployment
- [ ] Mobile app support
- [ ] Additional DeFi integrations

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for all new features
- Follow Solidity style guide
- Update documentation
- Run `npm run test` before submitting PR

## Troubleshooting

### Common Issues

**"Compilation failed" error:**
```bash
rm -rf cache artifacts
npx hardhat compile
```

**"Insufficient funds" during deployment:**
- Get testnet PC tokens from https://faucet.push.org

**Tests failing:**
- Ensure you're using Node.js v18+
- Clean install: `rm -rf node_modules && npm install`

**Can't claim from faucet:**
- Check cooldown: Call `cusd.getTimeUntilNextClaim(yourAddress)`
- Wait 24 hours between claims

## Resources

- [Push Chain Documentation](https://push.org/docs)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Ethers.js Documentation](https://docs.ethers.org)

## Support

- **Issues**: [GitHub Issues]
- **Twitter**: [@chaincircle](#)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for Push Chain Project G.U.D
- Powered by Push Protocol
- Inspired by traditional ROSCAs and community savings groups

---

