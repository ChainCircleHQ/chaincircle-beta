// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BadgeNFT is ERC721, Ownable {

    uint256 public tokenCounter;
    address public reputationManager;

    mapping(uint256 => string) public tokenTiers;
    mapping(address => uint256) public userBadges;

    event BadgeMinted(address indexed user, uint256 indexed tokenId, string tier);
    event BadgeUpgraded(address indexed user, uint256 indexed tokenId, string oldTier, string newTier);

    modifier onlyReputationManager() {
        require(msg.sender == reputationManager, "Only ReputationManager");
        _;
    }

    constructor() ERC721("ChainCircle Badge", "CCB") Ownable(msg.sender) {}

    function setReputationManager(address _manager) external onlyOwner {
        reputationManager = _manager;
    }

    function mintBadge(address user, string memory tier) external onlyReputationManager returns (uint256) {
        require(userBadges[user] == 0, "Badge already exists");

        tokenCounter++;
        uint256 tokenId = tokenCounter;

        _safeMint(user, tokenId);
        tokenTiers[tokenId] = tier;
        userBadges[user] = tokenId;

        emit BadgeMinted(user, tokenId, tier);

        return tokenId;
    }

    function upgradeBadge(address user, string memory newTier) external onlyReputationManager {
        uint256 tokenId = userBadges[user];
        require(tokenId > 0, "No badge to upgrade");

        string memory oldTier = tokenTiers[tokenId];
        tokenTiers[tokenId] = newTier;

        emit BadgeUpgraded(user, tokenId, oldTier, newTier);
    }

    function getUserBadge(address user) external view returns (uint256 tokenId, string memory tier) {
        tokenId = userBadges[user];
        if (tokenId > 0) {
            tier = tokenTiers[tokenId];
        }
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        
        string memory tier = tokenTiers[tokenId];
        string memory baseURI = "https://api.chaincircle.io/metadata/";
        
        return string(abi.encodePacked(baseURI, tier));
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: Transfer not allowed");
        }
        
        return super._update(to, tokenId, auth);
    }
}