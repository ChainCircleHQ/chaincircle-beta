require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

// Fallback to deployed pushDonut defaults if env not set — keeps the
// clone-and-run experience working without forcing new devs to create
// a .env first. Override in .env when staging/mainnet lands.
const PUSH_RPC = process.env.PUSH_CHAIN_RPC || "https://evm.rpc-testnet-donut-node1.push.org/";
const PUSH_CHAIN_ID = Number(process.env.PUSH_CHAIN_ID) || 42101;
const PUSH_EXPLORER = process.env.PUSH_CHAIN_EXPLORER || "https://donut.push.network";

module.exports = {
    solidity: {
        version: "0.8.22",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            viaIR: true,
        },
    },
    networks: {
        pushDonut: {
            url: PUSH_RPC,
            chainId: PUSH_CHAIN_ID,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
    },
    etherscan: {
        apiKey: {
            pushDonut: "blockscout",
        },
        customChains: [
            {
                network: "pushDonut",
                chainId: PUSH_CHAIN_ID,
                urls: {
                    apiURL: `${PUSH_EXPLORER}/api`,
                    browserURL: `${PUSH_EXPLORER}/`,
                },
            },
        ],
    },
    sourcify: {
        enabled: false,
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
    mocha: {
        timeout: 40000,
    },
};
