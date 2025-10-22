// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CUSD is ERC20, Ownable {
    
    mapping(address => uint256) public lastMintTime;
    uint256 public constant MINT_COOLDOWN = 24 hours;
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**6; // 1000 CUSD

    event Mint(address indexed to, uint256 amount);
    event FaucetClaim(address indexed user, uint256 amount);
    event Burn(address indexed from, uint256 amount);

    constructor() ERC20("Circle USD", "CUSD") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000 * 10**6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    // Public faucet - anyone can claim with cooldown
    function claimFromFaucet() external {
        require(
            block.timestamp >= lastMintTime[msg.sender] + MINT_COOLDOWN,
            "Cooldown active"
        );
        
        lastMintTime[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        
        emit FaucetClaim(msg.sender, FAUCET_AMOUNT);
    }

    // Admin mint for special cases
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit Mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit Burn(msg.sender, amount);
    }

    function getTimeUntilNextClaim(address user) external view returns (uint256) {
        uint256 nextClaimTime = lastMintTime[user] + MINT_COOLDOWN;
        if (block.timestamp >= nextClaimTime) {
            return 0;
        }
        return nextClaimTime - block.timestamp;
    }
}