// Single source of truth for contract addresses and chain config.
// V2 deploy is live on Push Donut testnet — all non-reused contracts point
// there. Envs still win so staging/other networks can override. Reused v1
// pieces: CUSD (user balances carry over) + NameRegistry (name ownership
// carries over). Everything else is the fresh v2 redeploy at block 13762869.
//
// V2 deploy record: backend/deployments/pushDonut-v2.json
//                   frontend/src/constants/contracts.v2.js (auto-generated)

const env = import.meta.env;

export const CONTRACT_ADDRESSES = {
  // Reused from v1.
  CUSD: env.VITE_CUSD_ADDRESS || "0x7D5Dbda57E186f7e905e5E77224Cd60054fF41f3",
  NAME_REGISTRY: env.VITE_NAME_REGISTRY || "0x1c8fCc121D52EAa6d4705fCcE95e34E2CEDced5E",
  // v2 deployments (block 13762869).
  CHAIN_CIRCLE_CORE: env.VITE_CHAIN_CIRCLE_CORE || "0xd0105BC643EadFc8312211e0e4B35c36CEbec7e2",
  REPUTATION_MANAGER: env.VITE_REPUTATION_MANAGER || "0xF75fEc00ea81b31893E3C3C195A46bC2D4BeAcEB",
  BADGE_NFT: env.VITE_BADGE_NFT || "0x8044ce1AE0e40C28b1b4869110a01842f5155523",
  WALLET_PREFERENCES: env.VITE_WALLET_PREFERENCES || "0xd74eFA9343028bbbc864aE42aac8b11373C9b813",
  GOVERNANCE_MODULE: env.VITE_GOVERNANCE_MODULE || "0x8dAac1b0dbC0B5561768658b2d99be3129318dD2",
  TESTNET_YIELD: env.VITE_TESTNET_YIELD || "0x8Bf15ce481eA106beC3540C44D5A154caBcd03C1",
};

// Block at which the v2 deployment landed — indexer start point.
export const V2_DEPLOY_BLOCK = Number(env.VITE_V2_DEPLOY_BLOCK) || 13762869;

export const NETWORK_CONFIG = {
  chainId: Number(env.VITE_PUSH_CHAIN_ID) || 42101,
  name: "Push Chain Donut Testnet",
  rpcUrl: env.VITE_PUSH_CHAIN_RPC || "https://evm.donut.rpc.push.org/",
  rpcUrlAlt: env.VITE_PUSH_CHAIN_RPC_FALLBACK || "https://evm.donut.rpc.push.org/",
  explorerUrl: env.VITE_PUSH_CHAIN_EXPLORER || "https://donut.push.network",
  faucetUrl: env.VITE_PUSH_CHAIN_FAUCET || "https://faucet.push.org",
  currency: {
    name: "Push Token",
    symbol: "PC",
    decimals: 18,
  },
};

// Chains the user is allowed to pick as a payout destination. Must match the
// whitelist seeded into WalletPreferencesV2 at deploy time.
export const SUPPORTED_PAYOUT_CHAINS = [
  { chainId: 42101, name: "Push Chain Donut" },
  { chainId: 1, name: "Ethereum" },
  { chainId: 11155111, name: "Ethereum Sepolia" },
  { chainId: 84532, name: "Base Sepolia" },
  { chainId: 421614, name: "Arbitrum Sepolia" },
  { chainId: 11155420, name: "Optimism Sepolia" },
  { chainId: 80002, name: "Polygon Amoy" },
  { chainId: 97, name: "BNB Testnet" },
];
