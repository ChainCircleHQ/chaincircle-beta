import { usePushChainClient } from '@pushchain/ui-kit';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../constants/contracts';
import WalletPreferencesABI from '../abis/WalletPreferences.json';

/**
 * Hook for interacting with WalletPreferences smart contract
 */
export function useWalletPreferences() {
  const { pushChainClient, isInitialized, userAddress } = usePushChainClient();

  const getContract = async () => {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    return new ethers.Contract(
      CONTRACT_ADDRESSES.WALLET_PREFERENCES,
      WalletPreferencesABI,
      provider
    );
  };

  /**
   * Add a wallet to the user's linked wallets (smart contract)
   */
  const addWallet = async (walletAddress, chainName = 'Push Chain') => {
    if (!isInitialized || !pushChainClient) {
      throw new Error('Wallet not connected');
    }

    if (!pushChainClient.universal) {
      throw new Error('Push Chain universal client not available');
    }

    const addWalletData = ethers.Interface.from(WalletPreferencesABI).encodeFunctionData(
      'addWallet',
      [walletAddress, chainName]
    );

    const tx = await pushChainClient.universal.sendTransaction({
      to: CONTRACT_ADDRESSES.WALLET_PREFERENCES,
      data: addWalletData,
      value: 0n
    });

    await tx.wait();
    return tx;
  };

  /**
   * Remove a wallet from the user's linked wallets (smart contract)
   */
  const removeWallet = async (walletAddress) => {
    if (!isInitialized || !pushChainClient) {
      throw new Error('Wallet not connected');
    }

    if (!pushChainClient.universal) {
      throw new Error('Push Chain universal client not available');
    }

    const removeWalletData = ethers.Interface.from(WalletPreferencesABI).encodeFunctionData(
      'removeWallet',
      [walletAddress]
    );

    const tx = await pushChainClient.universal.sendTransaction({
      to: CONTRACT_ADDRESSES.WALLET_PREFERENCES,
      data: removeWalletData,
      value: 0n
    });

    await tx.wait();
    return tx;
  };

  /**
   * Set the preferred wallet (smart contract)
   */
  const setPreferredWallet = async (walletAddress) => {
    if (!isInitialized || !pushChainClient) {
      throw new Error('Wallet not connected');
    }

    if (!pushChainClient.universal) {
      throw new Error('Push Chain universal client not available');
    }

    const setPreferredData = ethers.Interface.from(WalletPreferencesABI).encodeFunctionData(
      'setPreferredWallet',
      [walletAddress]
    );

    const tx = await pushChainClient.universal.sendTransaction({
      to: CONTRACT_ADDRESSES.WALLET_PREFERENCES,
      data: setPreferredData,
      value: 0n
    });

    await tx.wait();
    return tx;
  };

  /**
   * Get all linked wallets for a user (read from contract)
   */
  const getLinkedWallets = async (userAddress) => {
    const contract = await getContract();
    const addresses = await contract.getLinkedWallets(userAddress);
    return addresses;
  };

  /**
   * Get preferred wallet for a user (read from contract)
   */
  const getPreferredWallet = async (userAddress) => {
    const contract = await getContract();
    const preferred = await contract.getPreferredWallet(userAddress);
    return preferred;
  };

  /**
   * Get wallet info for a specific wallet (read from contract)
   */
  const getWalletInfo = async (userAddress, walletAddress) => {
    const contract = await getContract();
    const info = await contract.getWalletInfo(userAddress, walletAddress);
    return info;
  };

  /**
   * Get all wallet details with full info for a user
   */
  const getAllWalletDetails = async (userAddress) => {
    const contract = await getContract();
    const addresses = await contract.getLinkedWallets(userAddress);
    
    const wallets = await Promise.all(
      addresses.map(async (address) => {
        const info = await contract.getWalletInfo(userAddress, address);
        return {
          address,
          chainName: info.chainName,
          isPreferred: info.isPreferred,
          addedAt: Number(info.addedAt) * 1000 // Convert to timestamp
        };
      })
    );

    return wallets;
  };

  return {
    addWallet,
    removeWallet,
    setPreferredWallet,
    getLinkedWallets,
    getPreferredWallet,
    getWalletInfo,
    getAllWalletDetails,
    isInitialized,
    userAddress
  };
}

