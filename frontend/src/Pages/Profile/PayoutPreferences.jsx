import React, { useState, useEffect } from 'react'
import { MdOutlineCreditCard } from "react-icons/md";
import { toast } from 'sonner';
import PurpleBtn from '../../Components/PurpleBtn';
import { useWalletPreferences } from '../../hooks/useWalletPreferences';
import { usePushChainClient } from '@pushchain/ui-kit';

const isTabletOrMobile = window.innerWidth <= 1014;
  
export default function PayoutPreferences() {
  const [linkedWallets, setLinkedWallets] = useState([]);
  const [preferredWallet, setPreferredWalletState] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { pushChainClient } = usePushChainClient();
  const { getAllWalletDetails, getPreferredWallet, setPreferredWallet } = useWalletPreferences();
  const currentWallet = pushChainClient?.universal?.account;

  useEffect(() => {
    const loadData = async () => {
      if (!currentWallet) return;
      
      try {
        const wallets = await getAllWalletDetails(currentWallet);
        setLinkedWallets(wallets);
        
        const preferred = await getPreferredWallet(currentWallet);
        setPreferredWalletState(preferred);
      } catch (error) {
        // Failed to load - will show empty state
      }
    };

    loadData();
  }, [currentWallet, getAllWalletDetails, getPreferredWallet]);

  const handleSelectPreferredWallet = async (walletAddress) => {
    if (!currentWallet) return;
    
    setLoading(true);
    try {
      await setPreferredWallet(walletAddress);
      setPreferredWalletState(walletAddress);
      
      // Reload all wallets to update isPreferred flags
      const wallets = await getAllWalletDetails(currentWallet);
      setLinkedWallets(wallets);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      toast.error('Failed to set preferred wallet', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const truncateAddress = (address) => {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex flex-col gap-4 ">
      <header className="flex items-center text-[16px] lg:text-[24px] gap-3">
        <div className="p-3 rounded-full border border-[#333] bg-[rgba(34, 34, 34, 0.702)] flex items-center justify-center ">
          <MdOutlineCreditCard
            color="#87698C"
            size={isTabletOrMobile ? 24 : 30}
          />
        </div>
        <p>Payout Preferences</p>
      </header>

      {showSuccess && (
        <div className="p-3 bg-[#D548EC]/20 border border-[#D548EC] rounded-[8px] text-[14px]">
          ✅ Preferences updated successfully!
        </div>
      )}

      {/* Preferred Receiving Wallet */}
      <div className="flex flex-col gap-3">
        <p className="text-[#F4AEFF] text-[14px] lg:text-[16px] font-semibold">
          Preferred Receiving Wallet
        </p>
        {linkedWallets.length === 0 ? (
          <p className="text-[#707070] text-[14px]">No wallets available. Link a wallet first.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-[14px] lg:text-[18px]">
            {linkedWallets.map((wallet) => (
              <li 
                key={wallet.address}
                onClick={() => handleSelectPreferredWallet(wallet.address)}
                className={`flex items-center justify-between p-3 border rounded-[8px] cursor-pointer transition-all ${
                  preferredWallet?.toLowerCase() === wallet.address.toLowerCase()
                    ? 'border-[#D548EC] bg-[#D548EC]/10'
                    : 'border-[#333] hover:border-[#D548EC]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    preferredWallet?.toLowerCase() === wallet.address.toLowerCase()
                      ? 'border-[#D548EC] bg-[#D548EC]'
                      : 'border-[#707070]'
                  }`}>
                    {preferredWallet?.toLowerCase() === wallet.address.toLowerCase() && (
                      <div className="w-full h-full rounded-full bg-white scale-50" />
                    )}
                  </div>
                  <div>
                    <span className="text-[#F4AEFF] font-mono">
                      {truncateAddress(wallet.address)}
                    </span>
                    <p className="text-[#707070] text-[12px] lg:text-[14px]">
                      {wallet.chainName}
                    </p>
                  </div>
                </div>
                {preferredWallet?.toLowerCase() === wallet.address.toLowerCase() && (
                  <span className="text-[#D548EC] text-[12px]">⭐ Preferred</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Preferred Token */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[#333]">
        <p className="text-[#F4AEFF] text-[14px] lg:text-[16px] font-semibold">
          Preferred Token
        </p>
        <div className="p-3 border border-[#333] rounded-[8px]">
          <span className="text-[#AAAAAA]">CUSD (Circle USD)</span>
          <p className="text-[#707070] text-[12px] lg:text-[14px]">
            Default savings currency
          </p>
        </div>
      </div>

      <div className="w-fit ml-auto pt-2">
        <PurpleBtn
          text={showSuccess ? "✓ Saved" : "Save preferences"}
          action={handleSavePreferences}
        />
      </div>
    </div>
  );
}
