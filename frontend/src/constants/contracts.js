// Single source of truth for contract addresses and chain config.
// Reads from Vite env (VITE_*) with fallback to deployed pushDonut testnet values
// so the app works out-of-the-box for new clones without a .env.local.
// To override for a different testnet/staging, set the VITE_* vars in .env.local.

const env = import.meta.env;

export const CONTRACT_ADDRESSES = {
  CUSD: env.VITE_CUSD_ADDRESS || "0x7D5Dbda57E186f7e905e5E77224Cd60054fF41f3",
  CHAIN_CIRCLE_CORE: env.VITE_CHAIN_CIRCLE_CORE || "0x59D44aea45bd92E2798b7998e8E090586670f161",
  REPUTATION_MANAGER: env.VITE_REPUTATION_MANAGER || "0xEaEa469279B89E7fF0BDd5903226483418AB37e4",
  BADGE_NFT: env.VITE_BADGE_NFT || "0x9171F3AE9Cb9EBBa0826ad31971647DceB52Bd50",
  GOVERNANCE_MODULE: env.VITE_GOVERNANCE_MODULE || "0xA3c786088a6D3EB9216B5647a4149a7dF0149b49",
  NAME_REGISTRY: env.VITE_NAME_REGISTRY || "0x1c8fCc121D52EAa6d4705fCcE95e34E2CEDced5E",
  WALLET_PREFERENCES: env.VITE_WALLET_PREFERENCES || "0xB5b71E6fbA444d0B791C62C855cc31b3521e8E38",
  MOCK_YIELD: env.VITE_MOCK_YIELD || "0x2312493eac47f20a3a1B8e7AB1627F1B1FDd3412",
};

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
