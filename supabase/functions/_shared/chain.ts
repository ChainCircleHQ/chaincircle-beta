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
    // Other modules (ReputationManager, BadgeNFT, GovernanceModule, NameRegistry)
    // are deployed but not wired at the contract level — current ChainCircleCore
    // bytecode doesn't call them, so they emit nothing. Indexer ignores them
    // until Phase 6 redeploy. Off-chain reputation covers the UX gap in the
    // meantime (see user_reputation view + useUserStats).
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
    // ReputationManager/BadgeNFT/NameRegistry/GovernanceModule are deliberately
    // not indexed — the deployed ChainCircleCore bytecode never calls into them,
    // so they emit no events worth capturing.
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
