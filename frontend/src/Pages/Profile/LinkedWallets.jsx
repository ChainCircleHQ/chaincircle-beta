import React, { useState, useEffect } from 'react'
import { RiWallet3Line } from "react-icons/ri";
import { Trash2 } from "lucide-react";
import PurpleBtn from '../../Components/PurpleBtn';
import { useWalletPreferences } from '../../hooks/useWalletPreferences';
import { usePushChainClient, usePushWalletContext, PushUI } from '@pushchain/ui-kit';

const isTabletOrMobile = window.innerWidth <= 1014;

export default function LinkedWallets() {
  const [linkedWallets, setLinkedWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const { pushChainClient } = usePushChainClient();
  const { handleConnectToPushWallet, connectionStatus } = usePushWalletContext();
  const { getAllWalletDetails, removeWallet: removeWalletOnChain, addWallet } = useWalletPreferences();
  const currentWallet = pushChainClient?.universal?.account;

  // Load wallets from smart contract
  useEffect(() => {
    const loadWallets = async () => {
      if (!currentWallet) return;
      
      try {
        const wallets = await getAllWalletDetails(currentWallet);
        setLinkedWallets(wallets);
      } catch (error) {
        // Fallback to empty array if contract call fails
        setLinkedWallets([]);
      }
    };

    loadWallets();
  }, [currentWallet, getAllWalletDetails]);

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
      const wallets = await getAllWalletDetails(currentWallet);
      setLinkedWallets(wallets);
    } catch (error) {
      alert('Failed to remove wallet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkWallet = async () => {
    setLoading(true);
    try {
      // Trigger wallet connection modal
      await handleConnectToPushWallet();
      // Note: Wallet will be auto-linked via useEffect when connectionStatus changes
    } catch (error) {
      alert('Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  // Auto-add wallet when user connects or switches wallets
  useEffect(() => {
    const addConnectedWallet = async () => {
      if (!currentWallet || loading) return;
      
      try {
        const wallets = await getAllWalletDetails(currentWallet);
        const isAlreadyAdded = wallets.some(w => w.address.toLowerCase() === currentWallet.toLowerCase());
        
        if (!isAlreadyAdded && wallets.length === 0) {
          // First time connecting - add wallet automatically
          await addWallet(currentWallet, 'Push Chain');
          // Reload
          const updatedWallets = await getAllWalletDetails(currentWallet);
          setLinkedWallets(updatedWallets);
        } else if (!isAlreadyAdded && wallets.length > 0) {
          // User switched to a different wallet, add the new one
          await addWallet(currentWallet, 'Push Chain');
          // Reload
          const updatedWallets = await getAllWalletDetails(currentWallet);
          setLinkedWallets(updatedWallets);
        }
      } catch (error) {
        // Silently fail - wallet might already be added or contract error
      }
    };

    if (currentWallet) {
      addConnectedWallet();
    }
  }, [currentWallet, loading, getAllWalletDetails, addWallet]);

  const truncateAddress = (address) => {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex flex-col gap-4 ">
      <header className="flex items-center text-[16px] lg:text-[24px] gap-3">
        <div className="p-3 rounded-full border  border-[#333] bg-[rgba(34, 34, 34, 0.702)] flex items-center justify-center ">
          <RiWallet3Line color="#87698C" size={isTabletOrMobile ? 24 : 30} />
        </div>
        <p>Linked Wallets</p>
      </header>

      {/* List */}
      {linkedWallets.length === 0 ? (
        <p className="text-[#707070] text-[14px] lg:text-[18px]">No wallets linked yet</p>
      ) : (
        <ul className="flex flex-col text-[#AAAAAA] gap-2 text-[14px] lg:text-[18px]">
          {linkedWallets.map((wallet, index) => (
            <li key={wallet.address} className="flex items-center justify-between p-3 border border-[#333] rounded-[8px] hover:border-[#D548EC] transition-colors">
              <div className="flex flex-col gap-1">
                <span className="text-[#F4AEFF]">
                  {wallet.isPreferred ? '⭐ ' : ''}Wallet {index + 1}
                </span>
                <span className="text-[12px] lg:text-[14px] font-mono">
                  {truncateAddress(wallet.address)}
                </span>
                <span className="text-[#707070] text-[11px] lg:text-[13px]">
                  {wallet.chainName}
                </span>
              </div>
              {linkedWallets.length > 1 && (
                <button
                  onClick={() => handleRemoveWallet(wallet.address)}
                  className="p-2 hover:bg-[#D548EC]/20 rounded-full transition-colors text-[#aaa] hover:text-[#D548EC]"
                  title="Remove wallet"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="w-fit ml-auto ">
        <PurpleBtn 
          text={loading ? "Loading..." : "Link New Wallet"} 
          action={handleLinkWallet}
          disabled={loading}
        />
      </div>
      
      <p className="text-[#707070] text-[11px] lg:text-[13px]">
        💡 Connect a different wallet to link it. Wallets are saved on-chain.
      </p>
    </div>
  );
}
