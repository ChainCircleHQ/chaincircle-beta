import { usePushWalletContext, usePushChainClient, PushUI } from '@pushchain/ui-kit';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../constants/contracts';
import ChainCircleCoreABI from '../abis/ChainCircleCore.json';
import ReputationManagerABI from '../abis/ReputationManager.json';
import CUSDABI from '../abis/CUSD.json';

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
        abi: ChainCircleCoreABI.abi
      },
      reputation: {
        address: CONTRACT_ADDRESSES.REPUTATION_MANAGER,
        abi: ReputationManagerABI.abi
      },
      cusd: {
        address: CONTRACT_ADDRESSES.CUSD,
        abi: CUSDABI.abi
      }
    };

    const config = contracts[contractName];
    if (!config) throw new Error(`Unknown contract: ${contractName}`);

    // Always use provider for read-only operations
    const provider = getProvider();
    return new ethers.Contract(config.address, config.abi, provider);
  };

  return {
    getProvider,
    getContract,
    pushChainClient,
    isInitialized,
    isConnected: connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED,
    userAddress: pushChainClient?.universal?.account || null
  };
}
