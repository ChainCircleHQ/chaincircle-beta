// WalletPreferencesV2 hook. v2 difference from v1:
//   - `addWallet(wallet, chainId, chainName)` now takes a chainId (uint256)
//     that must be in the on-chain whitelist (`isSupportedChain[chainId]`).
//     Picking a chain the user is shown in the UI means we always pass a
//     whitelisted ID; if a caller passes a disabled chain the tx reverts.
//   - `getLinkedWallets(user)` returns struct[] directly (wallet, chainId,
//     chainName, isPreferred, addedAt). No separate `getWalletInfo`.
//   - No `getPreferredWallet(user)` — the flag lives on each WalletInfo struct
//     and the public `preferredWalletOf(address)` mapping exposes the picked
//     wallet address directly.
//
// All writes go through sendUniversalTx so the progress banner works.

import { usePushChainClient } from '@pushchain/ui-kit';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG, SUPPORTED_PAYOUT_CHAINS } from '../constants/contracts';
import WalletPreferencesABI from '../abis/v2/WalletPreferencesV2.json';
import { sendUniversalTx } from '../lib/pushchainTx';

const iface = ethers.Interface.from(WalletPreferencesABI.abi);

export function useWalletPreferences() {
  const { pushChainClient, isInitialized } = usePushChainClient();
  const userAddress = pushChainClient?.universal?.account;

  const getReadContract = () => {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    return new ethers.Contract(
      CONTRACT_ADDRESSES.WALLET_PREFERENCES,
      WalletPreferencesABI.abi,
      provider
    );
  };

  const requireWallet = () => {
    if (!pushChainClient || !userAddress) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }
    if (!pushChainClient.universal?.sendTransaction) {
      throw new Error('Push Chain client not ready. Reconnect and try again.');
    }
  };

  // Add a linked wallet. Defaults to Push Chain ID when chainId missing so
  // the existing "add my master account" flow keeps working.
  const addWallet = async (walletAddress, chainIdOrName, maybeChainName) => {
    requireWallet();

    // Support both (addr, chainId, chainName) and (addr, chainName) callers —
    // resolve chainName → chainId via SUPPORTED_PAYOUT_CHAINS if needed.
    let chainId;
    let chainName;
    if (typeof chainIdOrName === 'number' || typeof chainIdOrName === 'bigint') {
      chainId = Number(chainIdOrName);
      chainName = maybeChainName || (SUPPORTED_PAYOUT_CHAINS.find((c) => c.chainId === chainId)?.name) || 'Unknown';
    } else {
      chainName = chainIdOrName || 'Push Chain Donut';
      const match = SUPPORTED_PAYOUT_CHAINS.find((c) => c.name === chainName);
      chainId = match ? match.chainId : NETWORK_CONFIG.chainId;
    }

    // Local preflight — duplicate check + whitelist check matches what the
    // contract enforces, but lets us surface a clearer error.
    const contract = getReadContract();
    const existing = await contract.getLinkedWallets(userAddress);
    const dup = existing.some((w) => w.wallet.toLowerCase() === walletAddress.toLowerCase());
    if (dup) {
      const e = new Error('Wallet already linked');
      e.alreadyLinked = true;
      throw e;
    }
    const supported = await contract.isSupportedChain(chainId);
    if (!supported) {
      throw new Error(`Chain ${chainName} (id ${chainId}) is not on the payout whitelist yet.`);
    }

    const data = iface.encodeFunctionData('addWallet', [walletAddress, chainId, chainName]);
    const res = await sendUniversalTx(pushChainClient, {
      to: CONTRACT_ADDRESSES.WALLET_PREFERENCES,
      data,
      value: 0n,
    }, { label: 'Linking wallet' });
    if (res.status === 'pending') {
      const e = new Error('Link still pending on origin chain — refresh in a minute.');
      e.pending = true;
      throw e;
    }
    return res;
  };

  const removeWallet = async (walletAddress) => {
    requireWallet();
    const data = iface.encodeFunctionData('removeWallet', [walletAddress]);
    const res = await sendUniversalTx(pushChainClient, {
      to: CONTRACT_ADDRESSES.WALLET_PREFERENCES,
      data,
      value: 0n,
    }, { label: 'Removing wallet' });
    if (res.status === 'pending') {
      const e = new Error('Removal still pending on origin chain — refresh in a minute.');
      e.pending = true;
      throw e;
    }
    return res;
  };

  const setPreferredWallet = async (walletAddress) => {
    requireWallet();
    const data = iface.encodeFunctionData('setPreferredWallet', [walletAddress]);
    const res = await sendUniversalTx(pushChainClient, {
      to: CONTRACT_ADDRESSES.WALLET_PREFERENCES,
      data,
      value: 0n,
    }, { label: 'Updating preferred wallet' });
    if (res.status === 'pending') {
      const e = new Error('Update still pending on origin chain — refresh in a minute.');
      e.pending = true;
      throw e;
    }
    return res;
  };

  const getLinkedWallets = async (user) => {
    const contract = getReadContract();
    return contract.getLinkedWallets(user || userAddress);
  };

  const getPreferredWallet = async (user) => {
    const contract = getReadContract();
    const addr = await contract.preferredWalletOf(user || userAddress);
    return addr === ethers.ZeroAddress ? null : addr;
  };

  // Normalized list for the UI — keeps the old shape `{ address, chainName,
  // chainId, isPreferred, addedAt (ms) }` that LinkedWallets/Payout pages use.
  const getAllWalletDetails = async (user) => {
    const contract = getReadContract();
    const list = await contract.getLinkedWallets(user || userAddress);
    return list.map((w) => ({
      address: w.wallet,
      chainId: Number(w.chainId),
      chainName: w.chainName,
      isPreferred: w.isPreferred,
      addedAt: Number(w.addedAt) * 1000,
    }));
  };

  // v2 adds `getPayoutDestination(user)` — returns (wallet, chainId) the
  // contract will actually use at payout time. Handy for the UI to show
  // "payout will arrive on [chain] at [address]".
  const getPayoutDestination = async (user) => {
    const contract = getReadContract();
    const [wallet, chainId] = await contract.getPayoutDestination(user || userAddress);
    return { wallet, chainId: Number(chainId) };
  };

  return {
    addWallet,
    removeWallet,
    setPreferredWallet,
    getLinkedWallets,
    getPreferredWallet,
    getAllWalletDetails,
    getPayoutDestination,
    isInitialized,
    userAddress,
  };
}
