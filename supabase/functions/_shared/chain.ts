// Shared chain helpers for Edge Functions — event ABIs match the deployed
// contracts (verified against frontend/src/abis/*.json 2026-04-17).

import { JsonRpcProvider, Interface, Log, Contract } from "https://esm.sh/ethers@6.15.0";

const RPC_URL =
    Deno.env.get("PUSH_CHAIN_RPC") ||
    "https://evm.rpc-testnet-donut-node1.push.org/";

export function provider(): JsonRpcProvider {
    return new JsonRpcProvider(RPC_URL);
}

export const CONTRACTS = {
    CHAIN_CIRCLE_CORE: "0x59D44aea45bd92E2798b7998e8E090586670f161",
    REPUTATION_MANAGER: "0xEaEa469279B89E7fF0BDd5903226483418AB37e4",
    BADGE_NFT: "0x9171F3AE9Cb9EBBa0826ad31971647DceB52Bd50",
    GOVERNANCE_MODULE: "0xA3c786088a6D3EB9216B5647a4149a7dF0149b49",
    NAME_REGISTRY: "0x1c8fCc121D52EAa6d4705fCcE95e34E2CEDced5E",
} as const;

// Real deployed event signatures
export const EVENT_ABIS = {
    CHAIN_CIRCLE_CORE: [
        "event CircleCreated(uint256 indexed circleId, address indexed creator, uint256 goalAmount)",
        "event MemberJoined(uint256 indexed circleId, address indexed member)",
        "event ContributionMade(uint256 indexed circleId, address indexed member, uint256 amount, uint256 timestamp)",
        "event PayoutProcessed(uint256 indexed circleId, address indexed recipient, uint256 amount, uint256 timestamp)",
        "event InterestDistributed(uint256 indexed circleId, address indexed recipient, uint256 amount, uint256 timestamp)",
        "event EmergencyWithdrawal(uint256 indexed circleId, address indexed member, uint256 amount)",
        "event CircleCompleted(uint256 indexed circleId, uint256 timestamp)",
    ],
    REPUTATION_MANAGER: [
        "event ScoreChanged(address indexed user, uint256 oldScore, uint256 newScore, string reason)",
        "event TierChanged(address indexed user, string oldTier, string newTier)",
        "event StreakUpdated(address indexed user, uint256 newStreak)",
    ],
    BADGE_NFT: [
        "event BadgeMinted(address indexed user, uint256 indexed tokenId, string tier)",
        "event BadgeUpgraded(address indexed user, uint256 indexed tokenId, string oldTier, string newTier)",
    ],
    NAME_REGISTRY: [
        "event NameRegistered(address indexed user, string name)",
        "event NameUpdated(address indexed user, string oldName, string newName)",
    ],
} as const;

// Contract read ABI used to enrich CircleCreated rows (events only carry id/creator/goalAmount).
export const CORE_READ_ABI = [
    "function circles(uint256) view returns (string name, uint8 goalType, uint256 amount, uint8 duration, uint8 currentRound, uint8 maxMembers, uint8 frequency, bool isActive, uint8 status, uint256 createdAt, uint256 startAt, uint256 vaultBalance, address creator)",
];

export const IFACES = Object.fromEntries(
    Object.entries(EVENT_ABIS).map(([k, abi]) => [k, new Interface(abi as string[])]),
) as Record<keyof typeof EVENT_ABIS, Interface>;

export const NAME_TO_KEY: Record<string, keyof typeof EVENT_ABIS> = {
    ChainCircleCore: "CHAIN_CIRCLE_CORE",
    ReputationManager: "REPUTATION_MANAGER",
    BadgeNFT: "BADGE_NFT",
    NameRegistry: "NAME_REGISTRY",
    // GovernanceModule omitted — no committed ABI yet
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
