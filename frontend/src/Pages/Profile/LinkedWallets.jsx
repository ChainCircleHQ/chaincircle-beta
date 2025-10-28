import React, { useState, useEffect } from 'react'
import { RiWallet3Line } from "react-icons/ri";
import { IoClose } from "react-icons/io5";
import PurpleBtn from '../../Components/PurpleBtn';
import { 
  getLinkedWallets, 
  removeWallet, 
  isWalletLinked,
  saveWallet,
  initializeWalletPreferences 
} from '../../utils/walletPreferences';
import { usePushChainClient } from '@pushchain/ui-kit';

const isTabletOrMobile = window.innerWidth <= 1014;

export default function LinkedWallets() {
  const [linkedWallets, setLinkedWallets] = useState([]);
  const { pushChainClient } = usePushChainClient();
  const currentWallet = pushChainClient?.universal?.account;

  // Load wallets on mount
  useEffect(() => {
    const wallets = getLinkedWallets();
    setLinkedWallets(wallets);
  }, []);

  // Initialize current wallet if not already linked
  useEffect(() => {
    if (currentWallet && !isWalletLinked(currentWallet)) {
      initializeWalletPreferences(currentWallet, 'Push Chain');
      const wallets = getLinkedWallets();
      setLinkedWallets(wallets);
    }
  }, [currentWallet]);

  const handleRemoveWallet = (walletAddress) => {
    if (linkedWallets.length <= 1) {
      alert('Cannot remove your last wallet');
      return;
    }
    
    const confirmRemove = window.confirm('Are you sure you want to remove this wallet?');
    if (!confirmRemove) return;
    
    removeWallet(walletAddress);
    setLinkedWallets(getLinkedWallets());
  };

  const handleLinkWallet = () => {
    if (currentWallet && !isWalletLinked(currentWallet)) {
      saveWallet(currentWallet, 'Push Chain');
      setLinkedWallets(getLinkedWallets());
      alert('Current wallet linked successfully!');
    } else {
      alert('Current wallet is already linked. Connect a different wallet from your wallet app to link it.');
    }
  };

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
                  className="p-2 hover:bg-[#D548EC]/20 rounded-full transition-colors"
                  title="Remove wallet"
                >
                  <IoClose size={20} className="text-[#aaa]" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="w-fit ml-auto ">
        <PurpleBtn text={"Link New Wallet"} action={handleLinkWallet} />
      </div>
      
      <p className="text-[#707070] text-[11px] lg:text-[13px]">
        {currentWallet && isWalletLinked(currentWallet) 
          ? '💡 Connect a different wallet from your wallet app to link it'
          : '💡 Current wallet will be automatically linked'
        }
      </p>
    </div>
  );
}
