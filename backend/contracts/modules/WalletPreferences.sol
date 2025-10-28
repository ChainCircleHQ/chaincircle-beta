// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title WalletPreferences
 * @notice Stores user wallet preferences on-chain
 * Works alongside localStorage as a persistent backup
 */
contract WalletPreferences {
    
    struct WalletInfo {
        address walletAddress;
        string chainName;
        bool isPreferred;
        uint256 addedAt;
    }
    
    // Map user address to their linked wallets
    mapping(address => address[]) public linkedWallets;
    // Map (user, wallet) to wallet info
    mapping(address => mapping(address => WalletInfo)) public walletDetails;
    // Map user to their preferred wallet
    mapping(address => address) public preferredWallet;
    
    event WalletAdded(address indexed user, address indexed wallet, string chainName);
    event WalletRemoved(address indexed user, address indexed wallet);
    event PreferredWalletChanged(address indexed user, address indexed oldWallet, address indexed newWallet);
    
    /**
     * @notice Link a new wallet to the user's account
     * @param walletAddress The address to link
     * @param chainName The chain this wallet is from
     */
    function addWallet(address walletAddress, string memory chainName) external {
        // Check if wallet already exists
        require(walletDetails[msg.sender][walletAddress].addedAt == 0, "Wallet already linked");
        
        // Add wallet details
        walletDetails[msg.sender][walletAddress] = WalletInfo({
            walletAddress: walletAddress,
            chainName: chainName,
            isPreferred: linkedWallets[msg.sender].length == 0, // First wallet is preferred
            addedAt: block.timestamp
        });
        
        // Add to linked wallets array
        linkedWallets[msg.sender].push(walletAddress);
        
        // Set as preferred if it's the first wallet
        if (linkedWallets[msg.sender].length == 1) {
            preferredWallet[msg.sender] = walletAddress;
        }
        
        emit WalletAdded(msg.sender, walletAddress, chainName);
    }
    
    /**
     * @notice Remove a wallet from the user's account
     * @param walletAddress The wallet to remove
     */
    function removeWallet(address walletAddress) external {
        require(walletDetails[msg.sender][walletAddress].addedAt > 0, "Wallet not linked");
        // Can't remove the last wallet
        require(linkedWallets[msg.sender].length > 1, "Cannot remove last wallet");
        
        // If removing preferred wallet, set another as preferred
        if (walletAddress == preferredWallet[msg.sender]) {
            for (uint256 i = 0; i < linkedWallets[msg.sender].length; i++) {
                if (linkedWallets[msg.sender][i] != walletAddress) {
                    preferredWallet[msg.sender] = linkedWallets[msg.sender][i];
                    break;
                }
            }
        }
        
        // Remove from array
        for (uint256 i = 0; i < linkedWallets[msg.sender].length; i++) {
            if (linkedWallets[msg.sender][i] == walletAddress) {
                linkedWallets[msg.sender][i] = linkedWallets[msg.sender][linkedWallets[msg.sender].length - 1];
                linkedWallets[msg.sender].pop();
                break;
            }
        }
        
        delete walletDetails[msg.sender][walletAddress];
        
        emit WalletRemoved(msg.sender, walletAddress);
    }
    
    /**
     * @notice Set the preferred wallet for receiving payouts
     * @param walletAddress The wallet to set as preferred
     */
    function setPreferredWallet(address walletAddress) external {
        require(walletDetails[msg.sender][walletAddress].addedAt > 0, "Wallet not linked");
        
        address oldPreferred = preferredWallet[msg.sender];
        preferredWallet[msg.sender] = walletAddress;
        
        // Update isPreferred flags
        walletDetails[msg.sender][oldPreferred].isPreferred = false;
        walletDetails[msg.sender][walletAddress].isPreferred = true;
        
        emit PreferredWalletChanged(msg.sender, oldPreferred, walletAddress);
    }
    
    /**
     * @notice Get all linked wallets for a user
     * @param userAddress The user's address
     * @return wallets Array of wallet addresses
     */
    function getLinkedWallets(address userAddress) external view returns (address[] memory) {
        return linkedWallets[userAddress];
    }
    
    /**
     * @notice Get wallet details for a specific wallet
     * @param userAddress The user's address
     * @param walletAddress The wallet address
     * @return walletInfo The wallet information
     */
    function getWalletInfo(address userAddress, address walletAddress) external view returns (WalletInfo memory) {
        return walletDetails[userAddress][walletAddress];
    }
    
    /**
     * @notice Get preferred wallet for a user
     * @param userAddress The user's address
     * @return The preferred wallet address
     */
    function getPreferredWallet(address userAddress) external view returns (address) {
        return preferredWallet[userAddress];
    }
    
    /**
     * @notice Get count of linked wallets for a user
     * @param userAddress The user's address
     * @return Count of linked wallets
     */
    function getWalletCount(address userAddress) external view returns (uint256) {
        return linkedWallets[userAddress].length;
    }
}

