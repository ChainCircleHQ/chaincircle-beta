// Shared chain helpers for Edge Functions. Uses ethers v6 via esm.sh.
// We import ABIs as JSON strings at build time via Deno's JSR file loader —
// but since Edge Functions don't import local JSON easily, ABIs live inline
// below for the minimal event set the indexer needs.

import { JsonRpcProvider, Interface, Log } from "npm:ethers@6";

const RPC_URL =
    Deno.env.get("PUSH_CHAIN_RPC") ||
    "https://evm.rpc-testnet-donut-node1.push.org/";

export function provider(): JsonRpcProvider {
    return new JsonRpcProvider(RPC_URL);
}

// Contract addresses mirror supabase/migrations/*.sql#indexer_state seed rows.
export const CONTRACTS = {
    CHAIN_CIRCLE_CORE: "0x59D44aea45bd92E2798b7998e8E090586670f161",
    REPUTATION_MANAGER: "0xEaEa469279B89E7fF0BDd5903226483418AB37e4",
    BADGE_NFT: "0x9171F3AE9Cb9EBBa0826ad31971647DceB52Bd50",
    GOVERNANCE_MODULE: "0xA3c786088a6D3EB9216B5647a4149a7dF0149b49",
    NAME_REGISTRY: "0x1c8fCc121D52EAa6d4705fCcE95e34E2CEDced5E",
} as const;

// Event ABIs — narrow subset the indexer decodes. Full ABI lives in the repo.
// If contract events change, update here AND in frontend/src/abis/*.json.
export const EVENT_ABIS = {
    CHAIN_CIRCLE_CORE: [
        "event CircleCreated(uint256 indexed circleId, address indexed creator, string name, uint8 goalType, uint256 contributionAmount, uint8 duration, uint8 memberCap, uint8 frequency)",
        "event CircleJoined(uint256 indexed circleId, address indexed member, uint8 position)",
        "event Contributed(uint256 indexed circleId, address indexed member, uint256 amount, uint8 round)",
        "event PayoutDistributed(uint256 indexed circleId, address indexed recipient, uint256 amount, uint8 round)",
        "event CircleStarted(uint256 indexed circleId)",
        "event CircleCompleted(uint256 indexed circleId)",
    ],
    REPUTATION_MANAGER: [
        "event ReputationUpdated(address indexed user, int256 delta, uint256 scoreAfter, string eventType, string reason)",
    ],
    BADGE_NFT: [
        "event BadgeMinted(address indexed user, uint256 indexed tokenId, string badgeType)",
    ],
    GOVERNANCE_MODULE: [
        "event ProposalCreated(uint256 indexed proposalId, uint256 indexed circleId, address indexed proposer, string proposalType)",
        "event Voted(uint256 indexed proposalId, address indexed voter, bool support)",
        "event ProposalResolved(uint256 indexed proposalId, string outcome)",
    ],
    NAME_REGISTRY: [
        "event NameRegistered(address indexed user, string name)",
        "event NameUpdated(address indexed user, string oldName, string newName)",
    ],
} as const;

export const IFACES = Object.fromEntries(
    Object.entries(EVENT_ABIS).map(([k, abi]) => [k, new Interface(abi as string[])]),
) as Record<keyof typeof EVENT_ABIS, Interface>;

export async function fetchLogs(
    p: JsonRpcProvider,
    address: string,
    fromBlock: number,
    toBlock: number,
): Promise<Log[]> {
    return await p.getLogs({
        address,
        fromBlock,
        toBlock,
    });
}

export async function blockTimestamp(
    p: JsonRpcProvider,
    blockNumber: number,
): Promise<Date> {
    const blk = await p.getBlock(blockNumber);
    if (!blk) throw new Error(`Block ${blockNumber} not found`);
    return new Date(Number(blk.timestamp) * 1000);
}
