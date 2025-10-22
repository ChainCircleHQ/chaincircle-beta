require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

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
            url: "https://evm.rpc-testnet-donut-node1.push.org/",
            chainId: 42101,
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
                chainId: 42101,
                urls: {
                    apiURL: "https://donut.push.network/api",
                    browserURL: "https://donut.push.network/",
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