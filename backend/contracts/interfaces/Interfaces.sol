// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

struct UniversalAccountId {
    string chainNamespace;
    string chainId;
    bytes owner;
}

interface IUEAFactory {
    function getOriginForUEA(address addr) external view returns (UniversalAccountId memory account, bool isUEA);
    function getUEAForOrigin(UniversalAccountId memory _id) external view returns (address uea, bool isDeployed);
}

library ChainHelper {
    
    address constant UEA_FACTORY = 0x00000000000000000000000000000000000000eA;

    string constant PUSH_TESTNET_DONUT = "eip155:42101";
    string constant ETHEREUM_SEPOLIA = "eip155:11155111";
    string constant SOLANA_DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

    function getOrigin(address caller) internal view returns (UniversalAccountId memory account, bool isUEA) {
        return IUEAFactory(UEA_FACTORY).getOriginForUEA(caller);
    }

    function getChainNamespace(UniversalAccountId memory account) internal pure returns (string memory) {
        return string(abi.encodePacked(account.chainNamespace, ":", account.chainId));
    }

    function isEthereumSepolia(UniversalAccountId memory account) internal pure returns (bool) {
        bytes32 chainHash = keccak256(abi.encodePacked(account.chainNamespace, account.chainId));
        return chainHash == keccak256(abi.encodePacked("eip155", "11155111"));
    }

    function isSolanaDevnet(UniversalAccountId memory account) internal pure returns (bool) {
        bytes32 chainHash = keccak256(abi.encodePacked(account.chainNamespace, account.chainId));
        return chainHash == keccak256(abi.encodePacked("solana", "EtWTRABZaYq6iMfeYKouRu166VU2xqa1"));
    }

    function isPushChain(UniversalAccountId memory account) internal pure returns (bool) {
        bytes32 chainHash = keccak256(abi.encodePacked(account.chainNamespace, account.chainId));
        return chainHash == keccak256(abi.encodePacked("eip155", "42101"));
    }

    function getChainType(address caller) internal view returns (string memory) {
        (UniversalAccountId memory account, bool isUEA) = getOrigin(caller);
        
        if (!isUEA) {
            return "Push Chain";
        }

        if (isEthereumSepolia(account)) {
            return "Ethereum Sepolia";
        }

        if (isSolanaDevnet(account)) {
            return "Solana Devnet";
        }

        if (isPushChain(account)) {
            return "Push Chain";
        }

        return "Unknown";
    }
}