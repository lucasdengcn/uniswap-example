import * as dotenv from "dotenv";
dotenv.config();

import { HardhatUserConfig, task, vars } from "hardhat/config";

import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition-ethers";

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || vars.get("ETHERSCAN_API_KEY")
const PRIVATE_KEY = process.env.ACCOUNT_PRIVATE_KEY || vars.get("ACCOUNT_PRIVATE_KEY")
const INFURA_ID = process.env.INFURA_API_KEY || vars.get("INFURA_API_KEY")

const config: HardhatUserConfig = {
  defaultNetwork: "localhost",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    hardhat: {
      // forking: {
      //   url: `https://sepolia.infura.io/v3/${INFURA_ID}`,
      // },
      chainId: 31337,
    },
  },
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 5000
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  },
  gasReporter: {
    showMethodSig: true,
    showTimeSpent: true
  },
  ignition: {
    strategyConfig: {
      create2: {
        // To learn more about salts, see the CreateX documentation
        salt: "0xdff28ae068e1b163cf0510b14c6194f5142dcfb563cea2dc42556621ef87d2d1",
      },
    },
  },
};

export default config;
