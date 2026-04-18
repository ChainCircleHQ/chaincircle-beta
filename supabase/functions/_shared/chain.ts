// Shared chain helpers for Edge Functions — event ABIs match the v2
// deployed contracts (verified against frontend/src/abis/v2/*.json
// after the 2026-04-17 redeploy).

import { JsonRpcProvider, Interface, Log, Contract } from "https://esm.sh/ethers@6.15.0";

const RPC_URL =
    Deno.env.get("PUSH_CHAIN_RPC") ||
    "https://evm.donut.rpc.push.org/";

export function provider(): JsonRpcProvider {
    return new JsonRpcProvider(RPC_URL);
}

// v2 addresses (block 13762869). CUSD + NameRegistry reused from v1.
export const CONTRACTS = {
    CHAIN_CIRCLE_CORE:   "0xd0105BC643EadFc8312211e0e4B35c36CEbec7e2",
    REPUTATION_MANAGER:  "0xF75fEc00ea81b31893E3C3C195A46bC2D4BeAcEB",
    BADGE_NFT:           "0x8044ce1AE0e40C28b1b4869110a01842f5155523",
    WALLET_PREFERENCES:  "0xd74eFA9343028bbbc864aE42aac8b11373C9b813",
    GOVERNANCE_MODULE:   "0x8dAac1b0dbC0B5561768658b2d99be3129318dD2",
    NAME_REGISTRY:       "0x1c8fCc121D52EAa6d4705fCcE95e34E2CEDced5E",
} as const;

// v2 event signatures. ChainCircleCoreV2 replaced the flat
// PayoutProcessed/InterestDistributed pair with PayoutAccrued +
// PayoutWithdrawn (escrow + pull). ContributionMade now carries round +
// onTime. Reputation and badges are wired via mandatory callbacks.
export const EVENT_ABIS = {
    CHAIN_CIRCLE_CORE: [
        "event CircleCreated(uint256 indexed circleId, address indexed creator, string name, uint8 goalType, uint8 frequency, uint256 contributionAmount, uint8 duration, uint8 maxMembers)",
        "event MemberJoined(uint256 indexed circleId, address indexed member, uint8 position)",
        "event CircleStarted(uint256 indexed circleId, uint256 timestamp)",
        "event ContributionMade(uint256 indexed circleId, address indexed member, uint8 indexed round, uint256 amount, bool onTime, uint256 timestamp)",
        "event PayoutAccrued(uint256 indexed circleId, address indexed recipient, uint8 indexed round, uint256 principal, uint256 interest, uint256 timestamp)",
        "event PayoutWithdrawn(uint256 indexed circleId, address indexed recipient, address indexed destination, uint256 destinationChainId, uint256 amount)",
        "event CrossChainPayoutRequested(address indexed recipient, uint256 indexed destinationChainId, uint256 amount, bytes32 ref)",
        "event EmergencyWithdrawal(uint256 indexed circleId, address indexed member, uint256 refund, uint256 penalty)",
        "event CircleCancelled(uint256 indexed circleId, string reason, uint256 timestamp)",
        "event CirclePaused(uint256 indexed circleId, string reason, uint256 timestamp)",
        "event CircleUnpaused(uint256 indexed circleId, uint256 timestamp)",
        "event CircleCompleted(uint256 indexed circleId, uint256 timestamp)",
        "event GovernanceActionExecuted(uint256 indexed proposalId, uint256 indexed circleId, address indexed target, uint8 kind, uint256 reductionBps)",
    ],
    REPUTATION_MANAGER: [
        "event ScoreChanged(address indexed user, uint256 oldScore, uint256 newScore, uint256 circleId, uint8 round, string reason)",
        "event StreakUpdated(address indexed user, uint256 newStreak)",
    ],
    BADGE_NFT: [
        "event BadgeMinted(address indexed user, uint256 indexed tokenId, string tier)",
        "event BadgeUpgraded(address indexed user, uint256 indexed tokenId, string oldTier, string newTier)",
        "event TierThresholdCrossed(address indexed user, string fromTier, string toTier, uint256 timestamp)",
    ],
    WALLET_PREFERENCES: [
        "event WalletAdded(address indexed user, address indexed wallet, uint256 chainId, string chainName)",
        "event WalletRemoved(address indexed user, address indexed wallet)",
        "event PreferredWalletChanged(address indexed user, address indexed oldWallet, address indexed newWallet)",
    ],
    GOVERNANCE_MODULE: [
        "event ProposalCreated(uint256 indexed proposalId, uint256 indexed circleId, address indexed proposer, uint8 kind, address target, uint256 reductionBps, string justification, uint256 deadline, uint256 electorateWeight)",
        "event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight)",
        "event ProposalResolved(uint256 indexed proposalId, uint8 outcome, uint256 yesWeight, uint256 noWeight, uint256 executedAt)",
    ],
} as const;

// v2 circles() struct used to enrich CircleCreated rows (event now carries
// all fields but we keep this for tolerating event-ABI drift).
export const CORE_READ_ABI = [
    "function circles(uint256) view returns (string name, uint8 goalType, uint8 frequency, uint256 contributionAmount, uint8 duration, uint8 maxMembers, uint8 currentRound, uint8 status, uint256 vaultBalance, uint256 createdAt, uint256 startAt, uint256 completedAt, uint256 pausedAt, address creator)",
    "function getCircleMembers(uint256) view returns (address[])",
];

export const IFACES = Object.fromEntries(
    Object.entries(EVENT_ABIS).map(([k, abi]) => [k, new Interface(abi as string[])]),
) as Record<keyof typeof EVENT_ABIS, Interface>;

export const NAME_TO_KEY: Record<string, keyof typeof EVENT_ABIS> = {
    ChainCircleCoreV2:   "CHAIN_CIRCLE_CORE",
    ReputationManagerV2: "REPUTATION_MANAGER",
    BadgeNFTV2:          "BADGE_NFT",
    WalletPreferencesV2: "WALLET_PREFERENCES",
    GovernanceModuleV2:  "GOVERNANCE_MODULE",
    // Legacy names kept so indexer_state rows seeded under v1 names still resolve.
    ChainCircleCore:     "CHAIN_CIRCLE_CORE",
    ReputationManager:   "REPUTATION_MANAGER",
    BadgeNFT:            "BADGE_NFT",
    WalletPreferences:   "WALLET_PREFERENCES",
    GovernanceModule:    "GOVERNANCE_MODULE",
};

export function coreContract(p: JsonRpcProvider): Contract {
    return new Contract(CONTRACTS.CHAIN_CIRCLE_CORE, CORE_READ_ABI, p);
}

export async function fetchLogs(
    p: JsonRpcProvider,
    address: string,
    fromBlock: number,
    toBlock: number,
): Promise<Log[]> {
    return await p.getLogs({ address, fromBlock, toBlock });
}

export async function blockTimestamp(
    p: JsonRpcProvider,
    blockNumber: number,
): Promise<Date> {
    const blk = await p.getBlock(blockNumber);
    if (!blk) throw new Error(`Block ${blockNumber} not found`);
    return new Date(Number(blk.timestamp) * 1000);
}
