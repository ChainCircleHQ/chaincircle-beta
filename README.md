# ChainCircle

> Decentralized savings circles on Push Chain - Save together, across any chain.

ChainCircle is a full-stack blockchain-based savings platform that enables users from different blockchains (Ethereum, Solana, Push Chain) to participate in collaborative savings circles without bridging or network switching. The platform combines Solidity smart contracts with a modern React frontend to deliver a seamless Web3 savings experience.

[![Push Chain](https://img.shields.io/badge/Push%20Chain-Testnet-purple)](https://push.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.22-blue)](https://soliditylang.org/)
[![React](https://img.shields.io/badge/React-19.1.1-blue)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7.1.7-yellow)](https://vitejs.dev)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Live Demo**: [chaincircle-beta1.vercel.app](#) | **Testnet**: Push Chain Donut

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Contract Addresses](#contract-addresses)
- [Frontend Application](#frontend-application)
- [Smart Contract API](#smart-contract-api)
- [Testing](#testing)
- [Deployment](#deployment)
- [Constants & Configuration](#constants--configuration)
- [Security](#security)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Overview

ChainCircle implements a traditional ROSCA (Rotating Savings and Credit Association) model on-chain with the following innovations:

- **Universal Access**: Users from Ethereum, Solana, and Push Chain can participate
- **No Bridging**: Powered by Push Chain's universal transaction layer
- **Reputation System**: Build credit score by completing circles
- **Yield Generation**: Funds earn 4% APR while in the pool
- **Social Accountability**: Friends keep each other on track
- **Gamified Experience**: Earn soulbound NFT badges as you progress

### What is a ROSCA?

A Rotating Savings and Credit Association is a group of individuals who agree to meet for a defined period to save and borrow together. Each member contributes a fixed amount periodically, and in each period, one member receives the total pot. This continues until everyone has received their payout once.

**Example**: 6 friends each contribute $500/month for 6 months. Each month, one person receives $3,000. By month 6, everyone has contributed $3,000 and received $3,000, but they've saved together with social accountability.

## Features

### Core Functionality

- Create savings circles (3-12 months, 3-12 members)
- Join circles with first contribution
- Monthly/weekly contribution schedules
- Automated payout distribution
- Emergency withdrawal with governance voting
- Circle search and invite codes
- Multiple goal types (HOME, EDUCATION, BUSINESS, EMERGENCY, WEDDING, TRAVEL, GENERAL)
- Contribution tracking with grace periods
- Automatic interest calculation (4% APR)

### Advanced Features

- **Reputation System**: None → Bronze → Silver → Gold tiers
- **Cross-Chain Detection**: Know which chain users are from
- **Soulbound NFT Badges**: Non-transferable achievement tokens
- **Name Registry**: Display names for better UX
- **Governance Module**: Vote on early withdrawals
- **Activity Tracking**: Recent transactions and history
- **Public Faucet**: 1000 CUSD per claim (24hr cooldown)
- **Streak Tracking**: Bonus points every 5 consecutive on-time payments
- **Payout History**: View all past and upcoming payouts
- **Circle Statistics**: Real-time progress tracking

### Frontend Features

- **Responsive Design**: Mobile-first UI with Tailwind CSS
- **Universal Wallet Support**: Connect from any blockchain via Push Chain UI Kit
- **Dashboard**: Overview of all circles, savings, and earnings
- **Profile Management**: Reputation score, tier badges, and statistics
- **Notification System**: Transaction alerts, reminders, and service updates
- **Circle Browser**: Search and filter active circles
- **Invite System**: Share circle invite codes
- **Settings**: Payout preferences, notification settings, linked wallets
- **Activity Feed**: Real-time updates on all activities
- **FAQ & Terms**: Comprehensive documentation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ChainCircle Platform                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────────────┐     │
│  │   Frontend App   │         │   Smart Contracts        │     │
│  │   (React + Vite) │◄────────┤   (Solidity 0.8.22)      │     │
│  │                  │  ethers │                          │     │
│  │  - Dashboard     │         │  ┌──────────────────┐    │     │
│  │  - Circle Mgmt   │         │  │     CUSD         │    │     │
│  │  - Profile       │         │  │   (ERC20)        │    │     │
│  │  - Notifications │         │  │  + Faucet        │    │     │
│  └──────────────────┘         │  └─────────┬────────┘    │     │
│           │                   │            │             │     │
│           │                   │  ┌─────────▼──────────┐  │     │
│  ┌────────▼────────┐          │  │ ChainCircleCore   │  │     │
│  │  Push Chain     │          │  │  (Main Logic)     │  │     │
│  │  UI Kit         │          │  │  + Activity Log   │  │     │
│  │  (Wallet)       │          │  └───────┬───────────┘  │     │
│  └─────────────────┘          │          │              │     │
│                               │  ┌───────┼───────────┐  │     │
│                               │  │       │           │  │     │
│                               │  ▼       ▼           ▼  │     │
│                               │ ┌──────┐ ┌────┐ ┌─────┐│     │
│                               │ │Reptn.│ │Yld │ │Gov. ││     │
│                               │ │Mgr.  │ │4% │ │Mod. ││     │
│                               │ └──┬───┘ └────┘ └─────┘│     │
│                               │    │                    │     │
│                               │  ┌─▼──────┐ ┌──────────┐│     │
│                               │  │Badge   │ │  Name    ││     │
│                               │  │NFT     │ │Registry  ││     │
│                               │  └────────┘ └──────────┘│     │
│                               └──────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Frontend → Push Wallet → Smart Contract → Event Emission
                ↑                                              │
                └──────────────────────────────────────────────┘
                          React Query Cache Update
```

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.1.1 | UI framework |
| **Vite** | 7.1.7 | Build tool & dev server |
| **React Router** | 7.9.3 | Client-side routing |
| **TailwindCSS** | 4.1.14 | Utility-first CSS |
| **@pushchain/ui-kit** | 2.0.11 | Universal wallet integration |
| **@tanstack/react-query** | 5.90.2 | Server state management |
| **ethers.js** | 6.13.4 | Blockchain interaction |
| **react-icons** | 5.5.0 | Icon library |
| **react-smooth** | 4.0.4 | Smooth animations |

### Backend (Smart Contracts)

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Solidity** | 0.8.22 | Smart contract language |
| **Hardhat** | 2.19.0 | Development framework |
| **ethers.js** | 6.4.0 | Contract deployment |
| **OpenZeppelin** | 5.0.0 | Secure contract standards |
| **chai** | 4.2.0 | Testing framework |

## Getting Started

### Prerequisites

- Node.js v18+
- npm or yarn
- Git
- MetaMask or any Web3 wallet

### Smart Contracts Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/chaincircle-contracts.git
cd chaincircle-contracts

# Navigate to backend
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` and add your private key:
```bash
PRIVATE_KEY=your_private_key_without_0x_prefix
```

### Compile Contracts

```bash
npm run compile
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Quick Start Guide

1. **Get Testnet Tokens**: Visit [Push Faucet](https://faucet.push.org/) to get PC tokens
2. **Claim CUSD**: Use the faucet in the app to get 1000 CUSD
3. **Create or Join a Circle**: Browse circles or create your own
4. **Make Contributions**: Contribute monthly to build your reputation
5. **Earn Rewards**: Receive payouts and earn NFT badges

## Project Structure

```
chaincircle_beta/
├── frontend/                          # React application
│   ├── public/                        # Static assets
│   ├── src/
│   │   ├── Routes/                    # Main page routes
│   │   │   ├── Home.jsx              # Landing page
│   │   │   ├── Dashboard.jsx         # User dashboard
│   │   │   ├── Circle.jsx            # Circle browser
│   │   │   ├── Profile.jsx           # User profile
│   │   │   ├── Payout.jsx            # Payout management
│   │   │   └── Notification.jsx      # Notifications
│   │   ├── Pages/                     # Sub-pages & modals
│   │   │   ├── Circle/
│   │   │   │   ├── CreateCircleModal.jsx
│   │   │   │   ├── JoinByInviteCode.jsx
│   │   │   │   └── CirclePreview.jsx
│   │   │   ├── Profile/
│   │   │   │   ├── ProfileDetails.jsx
│   │   │   │   ├── AccountAction.jsx
│   │   │   │   ├── CircleHistory.jsx
│   │   │   │   ├── StatsArchive.jsx
│   │   │   │   ├── PayoutPreferences.jsx
│   │   │   │   ├── NotificationSettings.jsx
│   │   │   │   └── LinkedWallets.jsx
│   │   │   └── Landing/
│   │   │       ├── FAQ.jsx
│   │   │       └── Terms.jsx
│   │   ├── Components/                # Reusable components
│   │   │   ├── PurpleBtn.jsx
│   │   │   ├── TransBtn.jsx
│   │   │   ├── CountUp.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── Spinner.jsx
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useCircleData.js
│   │   │   ├── useCircleActions.js
│   │   │   ├── useCircleContract.js
│   │   │   ├── useBadgeNFT.js
│   │   │   ├── useNameRegistry.js
│   │   │   └── useFetch.js
│   │   ├── services/                  # API services
│   │   │   ├── circleAPI.js
│   │   │   ├── recentActivitiesAPI.js
│   │   │   └── payout.js
│   │   ├── utils/                     # Utility functions
│   │   ├── constants/                 # Configuration
│   │   │   └── contracts.js          # Contract addresses
│   │   ├── abis/                      # Smart contract ABIs
│   │   ├── App.jsx                    # Main app component
│   │   └── index.css                  # Tailwind styles
│   ├── vite.config.js
│   └── package.json
│
└── backend/                           # Hardhat project
    ├── contracts/
    │   ├── core/
    │   │   ├── ChainCircleCore.sol   # Main savings logic
    │   │   └── GovernanceModule.sol  # Voting system
    │   ├── tokens/
    │   │   ├── CUSD.sol              # Stable token + faucet
    │   │   └── BadgeNFT.sol          # Soulbound NFTs
    │   ├── modules/
    │   │   ├── ReputationManager.sol # Reputation tracking
    │   │   ├── MockYield.sol         # Yield simulator
    │   │   └── NameRegistry.sol      # Display names
    │   └── interfaces/
    │       └── Interfaces.sol        # Push Chain interfaces
    ├── scripts/
    │   ├── deploy.js                 # Deployment script
    │   ├── verify.js                 # Contract verification
    │   └── interact.js               # Interaction examples
    ├── test/                          # Test suite (52 tests)
    │   ├── ChainCircleCore.test.js
    │   ├── ReputationManager.test.js
    │   ├── GovernanceModule.test.js
    │   ├── MockYield.test.js
    │   └── integration/
    │       └── FullCircle.test.js
    ├── deployments/
    │   └── pushDonut/
    │       ├── deployment-addresses.json
    │       └── addresses.js
    ├── hardhat.config.js
    └── package.json
```

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

## Frontend Application

### Routes & Pages

The frontend is organized into main routes and sub-pages:

#### Main Routes

1. **Home (`/`)** - Landing page with platform overview, feature highlights, and call-to-action
2. **Dashboard (`/dashboard`)** - Total savings overview, active circles, interest earned, and recent activity
3. **Circle (`/circle`)** - Browse all active circles, search functionality, and circle management
4. **Profile (`/profile`)** - Reputation score, tier badge, user statistics, and settings
5. **Payout (`/payout`)** - Upcoming and historical payouts with filtering options
6. **Notification (`/notification`)** - Tabbed notifications (Transactions, Reminders, Services)

### Components

- **PurpleBtn** - Primary action button with gradient and loading states
- **TransBtn** - Transparent outlined button for secondary actions
- **CountUp** - Animated number counter for statistics display
- **ProtectedRoute** - Authentication guard for wallet-gated routes
- **Spinner** - Loading indicator for async operations

### Custom Hooks

- **useCircleData** - Fetches all circle-related data (circles, stats, payouts, activities)
- **useCircleActions** - Provides circle action functions (create, join, contribute, withdraw)
- **useCircleContract** - Manages contract instances (core, CUSD, reputation)
- **useBadgeNFT** - Badge NFT interactions (mint, upgrade, view)
- **useNameRegistry** - Name registration and resolution

### Services

- **circleAPI.js** - Circle data fetching and management
- **recentActivitiesAPI.js** - Activity tracking and history
- **payout.js** - Payout calculations and history

## Smart Contract API

### ChainCircleCore

Main contract for savings circle operations.

**Key Functions:**
- `createCircle(name, goalType, amount, duration, maxMembers, frequency)` - Create new circle
- `joinCircle(circleId)` - Join existing circle with first contribution
- `contribute(circleId)` - Make contribution for current period
- `getCircleProgress(circleId)` - View circle completion percentage
- `getUserCircles(user)` - Get all circles for a user
- `getRecentActivity(user, limit)` - Get recent activity log
- `getUserPayoutHistory(user)` - Get payout history
- `searchCircles(searchTerm)` - Search circles by name
- `getCircle(circleId)` - Get complete circle details

**Circle Structure:**
- id, name, goalType, creator
- contributionAmount, duration, currentRound, maxMembers
- totalPool, createdAt, isActive, frequency
- members array

### ReputationManager

Tracks user reputation and tier progression.

**Key Functions:**
- `getUserReputation(user)` - Get score, tier, circles completed, on-time rate, total saved
- `getDetailedStats(user)` - Get current streak, missed payments, interest earned
- `canVote(user)` - Check voting eligibility (Bronze tier or higher)

**Reputation Tiers:**
- **None**: 0-499 points
- **Bronze**: 500-699 points
- **Silver**: 700-849 points
- **Gold**: 850+ points

**Points System:**
- Complete cycle: +250 pts
- On-time payment: +15 pts
- Streak bonus (every 5): +50 pts
- Receive payout: +25 pts
- Subsequent cycle: +100 pts
- Missed payment: -75 pts
- Early withdrawal: -150 pts

### CUSD Token

ERC20 stablecoin with built-in testnet faucet.

**Key Functions:**
- `claimFromFaucet()` - Claims 1000 CUSD (24hr cooldown)
- `getTimeUntilNextClaim(user)` - Returns seconds until next claim
- `balanceOf(account)` - Check CUSD balance
- `approve(spender, amount)` - Approve contract to spend tokens
- `transfer(to, amount)` - Transfer tokens

### GovernanceModule

Democratic voting for emergency withdrawals.

**Key Functions:**
- `createProposal(circleId, reason)` - Create withdrawal proposal (7-day voting period)
- `vote(proposalId, support)` - Vote yes/no (requires Bronze tier)
- `executeProposal(proposalId)` - Execute if voting passed
- `getProposal(proposalId)` - Get proposal details

**Proposal Structure:**
- id, circleId, proposer, reason
- yesVotes, noVotes
- createdAt, votingDeadline, executed

### BadgeNFT

Soulbound (non-transferable) achievement NFTs.

**Key Functions:**
- `mintBadge(user, tier)` - Mint badge (called by ReputationManager)
- `upgradeBadge(user, newTier)` - Upgrade existing badge
- `getUserBadge(user)` - Get badge info (hasBadge, tier, earnedAt)
- `tokenURI(tokenId)` - Get on-chain SVG metadata

**Tiers:** Bronze (1), Silver (2), Gold (3)

### NameRegistry

Display name registration for better UX.

**Key Functions:**
- `registerName(name)` - Register display name (1-32 characters, unique)
- `getName(user)` - Get display name for address
- `resolveAddress(name)` - Get address for name
- `isNameAvailable(name)` - Check name availability

## Testing

The project includes a comprehensive test suite with 52 passing tests.

```bash
# Run all tests
cd backend
npm run test

# Run specific test file
npx hardhat test test/ChainCircleCore.test.js

# Test coverage
npm run coverage
```

**Test Structure:**
- ChainCircleCore.test.js - 20 tests (circle creation, joining, contributions, payouts)
- ReputationManager.test.js - 15 tests (score calculation, tier progression, streaks)
- GovernanceModule.test.js - 8 tests (proposals, voting, execution)
- MockYield.test.js - 5 tests (interest calculation)
- integration/FullCircle.test.js - 4 tests (complete circle lifecycle)

## Deployment

### Deploy to Push Chain Testnet

1. Get testnet tokens from [Push Faucet](https://faucet.push.org/)

2. Configure environment:
```bash
cd backend
cp .env.example .env
# Edit .env and add your PRIVATE_KEY
```

3. Compile and deploy:
```bash
npm run compile
npx hardhat run scripts/deploy.js --network pushDonut
```

4. Verify contracts:
```bash
npx hardhat run scripts/verify.js --network pushDonut
```

### Deploy Frontend

```bash
cd frontend
npm run build
vercel deploy
```

## Constants & Configuration

### Circle Parameters

| Parameter | Min | Max | Default |
|-----------|-----|-----|---------|
| Duration | 3 months | 12 months | 6 months |
| Members | 3 | 12 | 6 |
| Contribution Amount | 100 CUSD | 5,000 CUSD | 500 CUSD |
| Grace Period | - | 2 days | 2 days |

### Goal Types

0=HOME, 1=EDUCATION, 2=BUSINESS, 3=EMERGENCY, 4=WEDDING, 5=TRAVEL, 6=GENERAL

### Contribution Frequency

0=MONTHLY (30 days), 1=WEEKLY (7 days)

### Faucet Configuration

- Claim Amount: 1000 CUSD
- Cooldown Period: 24 hours
- Max Claims: Unlimited (testnet only)

### Yield Configuration

- APR: 4% (400 basis points)
- Calculation: Compound interest on pooled funds
- Distribution: Proportional to contribution

## Security

### Security Measures

- ReentrancyGuard on all state-changing functions
- Access control via Ownable pattern
- Input validation on all parameters
- Safe Math (Solidity 0.8.22 built-in overflow protection)
- Emergency governance with democratic voting
- Soulbound NFTs (non-transferable)
- Rate limiting on faucet
- Grace periods for late payments

### Security Considerations

**Not Audited** - This project has not undergone a professional security audit.

**Recommendations:**
- Use only on testnet with test tokens
- Do not deploy to mainnet without audit
- Review all contract code before use
- Test thoroughly in local environment
- Report security issues responsibly

### Known Limitations

- Faucet is for testnet only (unlimited supply)
- Mock yield uses simplified calculation
- No oracle integration for external data
- Governance voting is simple majority (not weighted)
- Names cannot be transferred or updated

## Roadmap

### Completed

- Core circle functionality (create, join, contribute)
- Reputation system with 4 tiers
- Streak tracking with bonuses
- Cross-chain user detection
- Activity logging and history
- Public faucet with cooldown
- Soulbound NFT badges
- Governance module for withdrawals
- Name registry for display names
- Full frontend application
- Comprehensive test suite (52 tests)
- Push Chain Donut testnet deployment

### In Progress

- Push Protocol notification integration
- Advanced analytics dashboard
- Mobile-responsive improvements
- Multi-language support

### Planned

**Q1 2026:**
- Professional security audit
- Gas optimization
- Enhanced governance (quadratic voting)
- Oracle integration for yield rates

**Q2 2026:**
- Push Chain mainnet deployment
- Additional DeFi integrations (Aave, Compound)
- Mobile app (React Native)
- Advanced reputation features (referrals, achievements)

**Q3 2026:**
- Cross-chain expansion (Ethereum, Solana)
- Automated savings scheduling
- Social features (friend invites, leaderboards)
- NFT marketplace for badges

**Q4 2026:**
- DAO governance launch
- Token economics implementation
- Institutional features (large circles, escrow)
- API for third-party integrations

## Contributing

We welcome contributions from the community.

### Ways to Contribute

1. Report bugs with detailed reproduction steps
2. Suggest features in GitHub Discussions
3. Submit pull requests (bug fixes, features, docs)
4. Write tests to increase coverage
5. Improve documentation

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes (write clean, documented code)
4. Add tests for new features
5. Run tests: `npm run test`
6. Commit with clear messages
7. Push and create pull request

### Testing Requirements

- All new features must have tests
- Maintain minimum 80% code coverage
- Tests must pass before PR merge
- Include integration tests for complex features

## Troubleshooting

### Common Issues

**Compilation failed:**
```bash
cd backend
rm -rf cache artifacts
npx hardhat clean
npx hardhat compile
```

**Insufficient funds during deployment:**
- Get testnet PC tokens from [Push Faucet](https://faucet.push.org/)

**Tests failing:**
- Ensure Node.js v18+
- Clean install: `rm -rf node_modules package-lock.json && npm install`

**Cannot connect wallet:**
- Ensure Push Chain Donut testnet is added (Chain ID: 42101)
- RPC: `https://evm.rpc-testnet-donut-node1.push.org/`

**Transaction failed:**
- Check CUSD balance (enough for contribution + gas)
- Verify contract approval
- Check circle requirements (not full, not expired)

**Can't claim from faucet:**
- Must wait 24 hours between claims
- Check cooldown with `getTimeUntilNextClaim()`

## Resources

### Official Documentation

- [Push Chain Documentation](https://docs.push.org)
- [Push Chain UI Kit](https://www.npmjs.com/package/@pushchain/ui-kit)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Ethers.js v6 Documentation](https://docs.ethers.org/v6/)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

### Tools

- [Push Chain Explorer](https://donut.push.network)
- [Push Chain Faucet](https://faucet.push.org)
- [Hardhat](https://hardhat.org)
- [Remix IDE](https://remix.ethereum.org)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Built for**: Push Chain Project G.U.D
- **Powered by**: [Push Protocol](https://push.org)
- **Inspired by**: Traditional ROSCAs and community savings groups
- **Thanks to**: OpenZeppelin, Hardhat team, React community

## Contact & Support

- **GitHub**: [ChainCircle Repository](https://github.com/yourusername/chaincircle-beta)
- **Issues**: [Report bugs](https://github.com/yourusername/chaincircle-beta/issues)
- **Discussions**: [Community forum](https://github.com/yourusername/chaincircle-beta/discussions)
- **Email**: support@chaincircle.org

---

**Built for the Push Chain community**

**Disclaimer**: This software is provided "as is" without warranty. Use at your own risk. Not audited - testnet use only.
