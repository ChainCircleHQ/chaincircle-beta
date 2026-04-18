import { usePushWalletContext, usePushChainClient, PushUI } from '@pushchain/ui-kit';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../constants/contracts';
import ChainCircleCoreABI from '../abis/v2/ChainCircleCoreV2.json';
import ReputationManagerABI from '../abis/v2/ReputationManagerV2.json';
import BadgeNFTABI from '../abis/v2/BadgeNFTV2.json';
import WalletPreferencesABI from '../abis/v2/WalletPreferencesV2.json';
import GovernanceModuleABI from '../abis/v2/GovernanceModuleV2.json';
import TestnetYieldABI from '../abis/v2/TestnetYield.json';
import CUSDABI from '../abis/CUSD.json';
import NameRegistryABI from '../abis/NameRegistry.json';

export function useCircleContract() {
  const { connectionStatus } = usePushWalletContext();
  const { pushChainClient, isInitialized } = usePushChainClient();

  const getProvider = () => {
    return new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
  };

  const getContract = async (contractName) => {
    const contracts = {
      core: {
        address: CONTRACT_ADDRESSES.CHAIN_CIRCLE_CORE,
        abi: ChainCircleCoreABI.abi,
      },
      reputation: {
        address: CONTRACT_ADDRESSES.REPUTATION_MANAGER,
        abi: ReputationManagerABI.abi,
      },
      badge: {
        address: CONTRACT_ADDRESSES.BADGE_NFT,
        abi: BadgeNFTABI.abi,
      },
      walletPreferences: {
        address: CONTRACT_ADDRESSES.WALLET_PREFERENCES,
        abi: WalletPreferencesABI.abi,
      },
      governance: {
        address: CONTRACT_ADDRESSES.GOVERNANCE_MODULE,
        abi: GovernanceModuleABI.abi,
      },
      yield: {
        address: CONTRACT_ADDRESSES.TESTNET_YIELD,
        abi: TestnetYieldABI.abi,
      },
      cusd: {
        address: CONTRACT_ADDRESSES.CUSD,
        abi: CUSDABI.abi,
      },
      nameRegistry: {
        address: CONTRACT_ADDRESSES.NAME_REGISTRY,
        abi: NameRegistryABI.abi,
      },
    };

    const config = contracts[contractName];
    if (!config) throw new Error(`Unknown contract: ${contractName}`);

    const provider = getProvider();
    return new ethers.Contract(config.address, config.abi, provider);
  };

  return {
    getProvider,
    getContract,
    pushChainClient,
    isInitialized,
    isConnected: connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED,
    userAddress: pushChainClient?.universal?.account || null,
  };
}
