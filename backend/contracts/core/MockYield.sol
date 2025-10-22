// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract MockYield {
    
    uint256 public constant APR_BASIS_POINTS = 400;
    uint256 public constant BASIS_POINTS_DIVISOR = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    function calculateYield(uint256 principal, uint256 timeElapsed) 
        external 
        pure 
        returns (uint256) 
    {
        if (principal == 0 || timeElapsed == 0) {
            return 0;
        }

        uint256 yearFraction = (timeElapsed * 1e18) / SECONDS_PER_YEAR;
        uint256 interest = (principal * APR_BASIS_POINTS * yearFraction) / (BASIS_POINTS_DIVISOR * 1e18);
        
        return interest;
    }

    function getAPR() external pure returns (uint256) {
        return APR_BASIS_POINTS;
    }
}