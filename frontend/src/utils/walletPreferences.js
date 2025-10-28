/**
 * Wallet Preferences Management
 * MVP implementation using localStorage
 * 
 * Stores user's linked wallets and preferred wallet for payouts
 */

/**
 * Save a wallet to the user's linked wallets list
 * @param {string} walletAddress - The wallet address
 * @param {string} chainName - The chain name (e.g., "Ethereum", "Solana", "Push Chain")
 */
export const saveWallet = (walletAddress, chainName) => {
  if (!walletAddress) return;
  
  const prefs = JSON.parse(localStorage.getItem('walletPreferences') || '{}');
  if (!prefs.linkedWallets) prefs.linkedWallets = [];
  
  // Check if wallet already exists
  const existingWallet = prefs.linkedWallets.find(w => w.address.toLowerCase() === walletAddress.toLowerCase());
  if (!existingWallet) {
    prefs.linkedWallets.push({
      address: walletAddress,
      chainName: chainName || 'Push Chain',
      linkedAt: Date.now(),
      isPreferred: prefs.linkedWallets.length === 0 // First wallet is preferred by default
    });
    
    // Set as preferred if it's the first wallet
    if (prefs.linkedWallets.length === 1) {
      prefs.preferredWallet = walletAddress;
    }
    
    localStorage.setItem('walletPreferences', JSON.stringify(prefs));
  }
  
  return prefs;
};

/**
 * Get all linked wallets for the user
 * @returns {Array} Array of wallet objects
 */
export const getLinkedWallets = () => {
  const prefs = JSON.parse(localStorage.getItem('walletPreferences') || '{}');
  return prefs.linkedWallets || [];
};

/**
 * Remove a wallet from the linked wallets list
 * @param {string} walletAddress - The wallet address to remove
 */
export const removeWallet = (walletAddress) => {
  const prefs = JSON.parse(localStorage.getItem('walletPreferences') || '{}');
  if (!prefs.linkedWallets) return prefs;
  
  // Can't remove if it's the only wallet
  if (prefs.linkedWallets.length <= 1) {
    return prefs;
  }
  
  // Remove wallet from list
  prefs.linkedWallets = prefs.linkedWallets.filter(
    w => w.address.toLowerCase() !== walletAddress.toLowerCase()
  );
  
  // If removed wallet was preferred, set another as preferred
  if (prefs.preferredWallet.toLowerCase() === walletAddress.toLowerCase()) {
    if (prefs.linkedWallets.length > 0) {
      prefs.preferredWallet = prefs.linkedWallets[0].address;
      prefs.linkedWallets[0].isPreferred = true;
    } else {
      prefs.preferredWallet = null;
    }
  }
  
  // Update isPreferred flags
  prefs.linkedWallets.forEach(w => {
    w.isPreferred = w.address.toLowerCase() === prefs.preferredWallet?.toLowerCase();
  });
  
  localStorage.setItem('walletPreferences', JSON.stringify(prefs));
  return prefs;
};

/**
 * Set the preferred wallet for receiving payouts
 * @param {string} walletAddress - The wallet address to set as preferred
 */
export const setPreferredWallet = (walletAddress) => {
  const prefs = JSON.parse(localStorage.getItem('walletPreferences') || '{}');
  if (!prefs.linkedWallets) return prefs;
  
  // Find the wallet
  const wallet = prefs.linkedWallets.find(
    w => w.address.toLowerCase() === walletAddress.toLowerCase()
  );
  
  if (!wallet) return prefs;
  
  // Unset previous preferred wallet
  prefs.linkedWallets.forEach(w => {
    w.isPreferred = false;
  });
  
  // Set new preferred wallet
  wallet.isPreferred = true;
  prefs.preferredWallet = walletAddress;
  
  localStorage.setItem('walletPreferences', JSON.stringify(prefs));
  return prefs;
};

/**
 * Get the preferred wallet address
 * @returns {string|null} The preferred wallet address
 */
export const getPreferredWallet = () => {
  const prefs = JSON.parse(localStorage.getItem('walletPreferences') || '{}');
  return prefs.preferredWallet || null;
};

/**
 * Get wallet info for a specific address
 * @param {string} walletAddress - The wallet address
 * @returns {Object|null} Wallet info object or null
 */
export const getWalletInfo = (walletAddress) => {
  const prefs = JSON.parse(localStorage.getItem('walletPreferences') || '{}');
  if (!prefs.linkedWallets) return null;
  
  return prefs.linkedWallets.find(
    w => w.address.toLowerCase() === walletAddress.toLowerCase()
  ) || null;
};

/**
 * Check if a wallet exists in the linked wallets
 * @param {string} walletAddress - The wallet address
 * @returns {boolean} True if wallet is linked
 */
export const isWalletLinked = (walletAddress) => {
  const prefs = JSON.parse(localStorage.getItem('walletPreferences') || '{}');
  if (!prefs.linkedWallets) return false;
  
  return prefs.linkedWallets.some(
    w => w.address.toLowerCase() === walletAddress.toLowerCase()
  );
};

/**
 * Initialize wallet preferences with current connected wallet
 * @param {string} walletAddress - Current connected wallet address
 * @param {string} chainName - Chain name (default: "Push Chain")
 */
export const initializeWalletPreferences = (walletAddress, chainName = 'Push Chain') => {
  if (!walletAddress) return;
  
  const prefs = JSON.parse(localStorage.getItem('walletPreferences') || '{}');
  
  // Only initialize if empty
  if (!prefs.linkedWallets || prefs.linkedWallets.length === 0) {
    saveWallet(walletAddress, chainName);
  }
};

