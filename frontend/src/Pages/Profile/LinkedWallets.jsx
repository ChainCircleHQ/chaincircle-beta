import React, { useState, useEffect } from 'react'
import { Wallet, Trash2, Crown, Star } from "lucide-react";
import PurpleBtn from '../../Components/PurpleBtn';
import { useWalletPreferences } from '../../hooks/useWalletPreferences';
import { usePushChainClient, usePushWalletContext, PushUI } from '@pushchain/ui-kit';

const isTabletOrMobile = window.innerWidth <= 1014;

export default function LinkedWallets() {
  const [linkedWallets, setLinkedWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const { pushChainClient } = usePushChainClient();
  const { handleConnectToPushWallet, connectionStatus } = usePushWalletContext();
  const { getAllWalletDetails, removeWallet: removeWalletOnChain, addWallet } = useWalletPreferences();
  const currentWallet = pushChainClient?.universal?.account;
  
  // Use currentWallet as the master account (your login wallet)
  const userAddress = currentWallet;

  // Load wallets from smart contract using userAddress (master account)
  useEffect(() => {
    const loadWallets = async () => {
      if (!userAddress || initialized) return;
      
      try {
        const wallets = await getAllWalletDetails(userAddress);
        setLinkedWallets(wallets);
        setInitialized(true);
      } catch (error) {
        // Fallback to empty array if contract call fails
        setLinkedWallets([]);
        setInitialized(true);
      }
    };

    loadWallets();
  }, [userAddress, initialized, getAllWalletDetails]);

  const handleRemoveWallet = async (walletAddress) => {
    if (linkedWallets.length <= 1) {
      alert('Cannot remove your last wallet');
      return;
    }
    
    const confirmRemove = window.confirm('Are you sure you want to remove this wallet?');
    if (!confirmRemove) return;
    
    setLoading(true);
    try {
      await removeWalletOnChain(walletAddress);
      // Reload wallets
      const wallets = await getAllWalletDetails(userAddress);
      setLinkedWallets(wallets);
    } catch (error) {
      alert('Failed to remove wallet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkWallet = () => {
    const walletAddress = prompt('Enter the wallet address you want to link:');
    
    if (!walletAddress) {
      return; // User cancelled
    }

    // Basic validation
    if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      alert('Invalid wallet address. Please enter a valid Ethereum address.');
      return;
    }

    // Check if already linked
    const isAlreadyLinked = linkedWallets.some(
      w => w.address.toLowerCase() === walletAddress.toLowerCase()
    );

    if (isAlreadyLinked) {
      alert('This wallet is already linked!');
      return;
    }

    // Add the wallet
    addWalletManually(walletAddress);
  };

  const addWalletManually = async (walletAddress) => {
    setLoading(true);
    try {
      if (connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED || !userAddress) {
        alert('Please connect your wallet first');
        return;
      }

      await addWallet(walletAddress, 'Push Chain');
      const updatedWallets = await getAllWalletDetails(userAddress);
      setLinkedWallets(updatedWallets);
      setLoading(false);
      alert('Wallet linked successfully!');
    } catch (error) {
      if (error.message.includes('already linked')) {
        alert('This wallet is already linked!');
      } else {
        alert('Failed to link wallet: ' + error.message);
      }
      setLoading(false);
    }
  };

  // Auto-add current wallet if none are linked (first time setup)
  const [hasTriedAutoAdd, setHasTriedAutoAdd] = useState(false);
  
  useEffect(() => {
    const autoAddCurrentWallet = async () => {
      // Only auto-add if:
      // 1. We have a userAddress (master account) and currentWallet
      // 2. We're initialized and loaded
      // 3. We haven't tried auto-add yet
      // 4. The linkedWallets list is empty (first time)
      // 5. The wallet is fully connected
      if (!userAddress || !currentWallet || !initialized || hasTriedAutoAdd || linkedWallets.length > 0 || loading) return;
      
      if (connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED) return;

      // Only auto-add if current wallet is the same as userAddress (first login)
      if (currentWallet.toLowerCase() !== userAddress.toLowerCase()) return;

      // Mark that we've tried, even if it fails
      setHasTriedAutoAdd(true);

      try {
        // Check if this wallet is already in the contract
        const wallets = await getAllWalletDetails(userAddress);
        
        if (wallets.length === 0) {
          // No wallets in contract yet - add current wallet
          setLoading(true);
          await addWallet(currentWallet, 'Push Chain');
          const updatedWallets = await getAllWalletDetails(userAddress);
          setLinkedWallets(updatedWallets);
          setLoading(false);
        } else {
          // Wallets exist in contract, load them
          setLinkedWallets(wallets);
        }
      } catch (error) {
        // Silently fail - user can manually link
        setLoading(false);
      }
    };

    // Small delay to ensure everything is initialized
    const timer = setTimeout(() => {
      autoAddCurrentWallet();
    }, 500);

    return () => clearTimeout(timer);
  }, [userAddress, currentWallet, initialized, hasTriedAutoAdd, connectionStatus, linkedWallets.length, loading, getAllWalletDetails, addWallet]);
  
  // Reset hasTriedAutoAdd when wallet changes
  useEffect(() => {
    setHasTriedAutoAdd(false);
  }, [currentWallet]);

  const truncateAddress = (address) => {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex flex-col gap-4 ">
      <header className="flex items-center text-[18px] lg:text-[28px] gap-3">
        <div className="p-3 rounded-full border  border-[#333] bg-[rgba(34, 34, 34, 0.702)] flex items-center justify-center ">
          <Wallet color="#87698C" size={isTabletOrMobile ? 28 : 36} />
        </div>
        <div>
          <p className="text-[18px] lg:text-[28px]">Linked Wallets</p>
          <p className="text-[#707070] text-[12px] lg:text-[14px] mt-1">
            Master Account: {userAddress ? truncateAddress(userAddress) : 'Loading...'}
          </p>
        </div>
      </header>

      {/* List */}
      {linkedWallets.length === 0 ? (
        <p className="text-[#707070] text-[16px] lg:text-[20px]">No wallets linked yet</p>
      ) : (
        <ul className="flex flex-col text-[#AAAAAA] gap-3 text-[16px] lg:text-[20px]">
          {linkedWallets.map((wallet, index) => {
            const isMasterAccount = wallet.address.toLowerCase() === userAddress?.toLowerCase();
            return (
              <li key={wallet.address} className="flex items-center justify-between p-4 border border-[#333] rounded-[8px] hover:border-[#D548EC] transition-colors bg-[rgba(34, 34, 34, 0.5)]">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    {wallet.isPreferred && <Star className="text-[#D548EC]" size={20} />}
                    {isMasterAccount && <Crown className="text-[#F4AEFF]" size={18} />}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[#F4AEFF] flex items-center gap-2">
                      {isMasterAccount ? 'Master Account' : `Wallet ${index + 1}`}
                    </span>
                    <span className="text-[13px] lg:text-[15px] font-mono">
                      {truncateAddress(wallet.address)}
                    </span>
                    <span className="text-[#707070] text-[12px] lg:text-[14px]">
                      {wallet.chainName}
                    </span>
                  </div>
                </div>
                {linkedWallets.length > 1 && !isMasterAccount && (
                  <button
                    onClick={() => handleRemoveWallet(wallet.address)}
                    className="p-2 hover:bg-[#D548EC]/20 rounded-full transition-colors text-[#aaa] hover:text-[#D548EC] ml-2"
                    title="Remove wallet"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="w-fit ml-auto ">
        <PurpleBtn 
          text={loading ? "Loading..." : "Link New Wallet"} 
          action={handleLinkWallet}
          disabled={loading}
        />
      </div>
      
      <div className="bg-[rgba(213, 72, 236, 0.1)] border border-[rgba(213, 72, 236, 0.3)] rounded-[8px] p-4 text-[13px] lg:text-[15px]">
        <p className="text-[#D548EC] font-semibold mb-3 text-[15px] lg:text-[18px]">What are Linked Wallets?</p>
        <p className="text-[#AAAAAA] mb-3 leading-relaxed">
          <strong className="text-[#D548EC]">Purpose:</strong> These are wallet addresses where you want to <span className="text-[#D548EC]">receive payouts</span> from your savings circles.
        </p>
        <p className="text-[#AAAAAA] mb-3 leading-relaxed">
          <strong className="text-[#D548EC]">Important:</strong> These are <span className="text-red-400">NOT for logging in</span>. They're just addresses stored on-chain for payouts.
        </p>
        <p className="text-[#AAAAAA] leading-relaxed text-[12px] lg:text-[13px]">
          <strong>Any EVM Address Works:</strong> You can add any Ethereum-compatible address (0x...). It doesn't need to be a UEA. These are just destination addresses for payouts.
        </p>
        <p className="text-[#AAAAAA] text-[11px] lg:text-[12px] mt-3 pt-3 border-t border-[rgba(213, 72, 236, 0.2)]">
          Your Master Account ({userAddress ? truncateAddress(userAddress) : '...'}) controls all linked wallets. Only you (the logged-in wallet) can add/remove them.
        </p>
      </div>
    </div>
  );
}
