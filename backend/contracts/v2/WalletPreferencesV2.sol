// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IV2.sol";

/**
 * @title WalletPreferencesV2
 * @notice Source of truth for where a user's circle payouts should land.
 *         Extends v1 by tracking chainId alongside chainName and whitelisting
 *         supported chains — ChainCircleCoreV2.withdrawPayout reads from this
 *         at pull-time to route funds (including cross-chain via Push UEA).
 */
contract WalletPreferencesV2 is IWalletPreferencesV2, Ownable {

    struct WalletInfo {
        address wallet;
        uint256 chainId;
        string chainName;
        bool isPreferred;
        uint256 addedAt;
    }

    // user → list of linked wallets
    mapping(address => WalletInfo[]) private _wallets;
    // user → preferred wallet address (must be in _wallets[user])
    mapping(address => address) public preferredWalletOf;
    // supported chain whitelist (chainId → enabled)
    mapping(uint256 => bool) public isSupportedChain;

    // Push Chain Donut is always supported (chainId 42101).
    uint256 public constant PUSH_CHAIN_ID = 42101;

    event WalletAdded(address indexed user, address indexed wallet, uint256 chainId, string chainName);
    event WalletRemoved(address indexed user, address indexed wallet);
    event PreferredWalletChanged(address indexed user, address indexed oldWallet, address indexed newWallet);
    event SupportedChainSet(uint256 indexed chainId, bool enabled);

    constructor(uint256[] memory initialSupportedChains) Ownable(msg.sender) {
        isSupportedChain[PUSH_CHAIN_ID] = true;
        emit SupportedChainSet(PUSH_CHAIN_ID, true);
        for (uint256 i = 0; i < initialSupportedChains.length; i++) {
            uint256 cid = initialSupportedChains[i];
            if (cid == PUSH_CHAIN_ID) continue;
            isSupportedChain[cid] = true;
            emit SupportedChainSet(cid, true);
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Admin                                                             */
    /* ------------------------------------------------------------------ */

    function setSupportedChain(uint256 chainId, bool enabled) external onlyOwner {
        require(chainId != PUSH_CHAIN_ID || enabled, "cannot disable Push");
        isSupportedChain[chainId] = enabled;
        emit SupportedChainSet(chainId, enabled);
    }

    /* ------------------------------------------------------------------ */
    /*  User actions                                                      */
    /* ------------------------------------------------------------------ */

    function addWallet(address wallet, uint256 chainId, string calldata chainName) external {
        require(wallet != address(0), "zero wallet");
        require(isSupportedChain[chainId], "chain not supported");
        WalletInfo[] storage list = _wallets[msg.sender];
        for (uint256 i = 0; i < list.length; i++) {
            require(list[i].wallet != wallet, "already linked");
        }
        list.push(WalletInfo({
            wallet: wallet,
            chainId: chainId,
            chainName: chainName,
            isPreferred: false,
            addedAt: block.timestamp
        }));
        if (preferredWalletOf[msg.sender] == address(0)) {
            _setPreferredUnchecked(msg.sender, wallet);
        }
        emit WalletAdded(msg.sender, wallet, chainId, chainName);
    }

    function removeWallet(address wallet) external {
        WalletInfo[] storage list = _wallets[msg.sender];
        require(list.length > 1, "cannot remove last wallet");

        uint256 removedIdx = type(uint256).max;
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i].wallet == wallet) { removedIdx = i; break; }
        }
        require(removedIdx != type(uint256).max, "wallet not found");

        // swap-and-pop
        list[removedIdx] = list[list.length - 1];
        list.pop();

        // If we removed the preferred wallet, pick a new one deterministically.
        if (preferredWalletOf[msg.sender] == wallet) {
            _setPreferredUnchecked(msg.sender, list[0].wallet);
        }
        emit WalletRemoved(msg.sender, wallet);
    }

    function setPreferredWallet(address wallet) external {
        WalletInfo[] storage list = _wallets[msg.sender];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i].wallet == wallet) {
                _setPreferredUnchecked(msg.sender, wallet);
                return;
            }
        }
        revert("wallet not linked");
    }

    function _setPreferredUnchecked(address user, address wallet) internal {
        address old = preferredWalletOf[user];
        if (old == wallet) return;
        preferredWalletOf[user] = wallet;
        // Update the isPreferred flags on the stored structs.
        WalletInfo[] storage list = _wallets[user];
        for (uint256 i = 0; i < list.length; i++) {
            list[i].isPreferred = (list[i].wallet == wallet);
        }
        emit PreferredWalletChanged(user, old, wallet);
    }

    /* ------------------------------------------------------------------ */
    /*  Views                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * @notice Resolves destination for a payout. If the user has a preferred
     *         wallet, use it. Otherwise fall back to the user's own Push
     *         Chain address on chainId 42101.
     */
    function getPayoutDestination(address user) external view returns (address wallet, uint256 chainId) {
        address preferred = preferredWalletOf[user];
        if (preferred == address(0)) return (user, PUSH_CHAIN_ID);
        WalletInfo[] storage list = _wallets[user];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i].wallet == preferred) {
                return (preferred, list[i].chainId);
            }
        }
        // Defensive — if preferred was removed without update, fall back.
        return (user, PUSH_CHAIN_ID);
    }

    function getLinkedWallets(address user) external view returns (WalletInfo[] memory) {
        return _wallets[user];
    }

    function walletCount(address user) external view returns (uint256) {
        return _wallets[user].length;
    }
}
