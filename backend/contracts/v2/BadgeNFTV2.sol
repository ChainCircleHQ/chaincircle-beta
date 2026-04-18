// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IV2.sol";

/**
 * @title BadgeNFTV2
 * @notice Soulbound (non-transferable) ERC721 reputation badge. One token per
 *         user, tier is a string ("Bronze" / "Silver" / "Gold"). Mints and
 *         upgrades are driven entirely by ReputationManagerV2 — users cannot
 *         mint directly. Transfers revert.
 */
contract BadgeNFTV2 is IBadgeNFTV2, ERC721, Ownable {

    address public reputationManager;

    // user → tokenId (0 == none)
    mapping(address => uint256) private _badgeOf;
    // tokenId → current tier string
    mapping(uint256 => string) private _tierOf;

    uint256 private _nextTokenId = 1;
    string public baseMetadataURI = "https://api.chaincircle.org/metadata/v2/";

    event BadgeMinted(address indexed user, uint256 indexed tokenId, string tier);
    event BadgeUpgraded(address indexed user, uint256 indexed tokenId, string oldTier, string newTier);
    event TierThresholdCrossed(address indexed user, string fromTier, string toTier, uint256 timestamp);
    event ReputationManagerSet(address indexed manager);
    event BaseURISet(string baseUri);

    error OnlyReputationManager();
    error SoulboundNonTransferable();

    modifier onlyReputationManager() {
        if (msg.sender != reputationManager) revert OnlyReputationManager();
        _;
    }

    constructor() ERC721("ChainCircle Badge", "CCB") Ownable(msg.sender) {}

    function setReputationManager(address manager) external onlyOwner {
        require(manager != address(0), "zero manager");
        reputationManager = manager;
        emit ReputationManagerSet(manager);
    }

    function setBaseURI(string calldata uri) external onlyOwner {
        baseMetadataURI = uri;
        emit BaseURISet(uri);
    }

    /* ------------------------------------------------------------------ */
    /*  Mint / upgrade surface — ReputationManager only                   */
    /* ------------------------------------------------------------------ */

    function mintOrUpgrade(address user, string calldata tier) external onlyReputationManager returns (uint256 tokenId) {
        require(user != address(0), "zero user");
        require(bytes(tier).length > 0, "empty tier");

        tokenId = _badgeOf[user];
        if (tokenId == 0) {
            tokenId = _nextTokenId++;
            _badgeOf[user] = tokenId;
            _tierOf[tokenId] = tier;
            _safeMint(user, tokenId);
            emit BadgeMinted(user, tokenId, tier);
            emit TierThresholdCrossed(user, "", tier, block.timestamp);
            return tokenId;
        }
        string memory oldTier = _tierOf[tokenId];
        if (keccak256(bytes(oldTier)) == keccak256(bytes(tier))) {
            // No-op — same tier, don't spam events.
            return tokenId;
        }
        _tierOf[tokenId] = tier;
        emit BadgeUpgraded(user, tokenId, oldTier, tier);
        emit TierThresholdCrossed(user, oldTier, tier, block.timestamp);
    }

    /* ------------------------------------------------------------------ */
    /*  Views                                                             */
    /* ------------------------------------------------------------------ */

    function getUserBadge(address user) external view returns (uint256 tokenId, string memory tier) {
        tokenId = _badgeOf[user];
        tier = tokenId == 0 ? "" : _tierOf[tokenId];
    }

    function tierOfToken(uint256 tokenId) external view returns (string memory) {
        return _tierOf[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string(abi.encodePacked(baseMetadataURI, _tierOf[tokenId]));
    }

    /* ------------------------------------------------------------------ */
    /*  Soulbound: block all transfers                                    */
    /* ------------------------------------------------------------------ */

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // Allow mint (from == 0) and burn (to == 0) but block everything else.
        if (from != address(0) && to != address(0)) {
            revert SoulboundNonTransferable();
        }
        return super._update(to, tokenId, auth);
    }
}
