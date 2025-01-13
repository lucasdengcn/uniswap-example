import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

const TETHER_ADDRESS = process.env.TETHER_ADDRESS || '';
const USDC_ADDRESS = process.env.USDC_ADDRESS || '';
const WBTC_ADDRESS = process.env.WBTC_ADDRESS || '';
const WETH_ADDRESS = process.env.WETH_ADDRESS || '';
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || '';
const SWAP_ROUTER_ADDRESS = process.env.SWAP_ROUTER_ADDRESS;
const NFT_DESCRIPTOR_ADDRESS = process.env.NFT_DESCRIPTOR_ADDRESS;
const POSITION_DESCRIPTOR_ADDRESS = process.env.POSITION_DESCRIPTOR_ADDRESS;
const POSITION_MANAGER_ADDRESS = process.env.POSITION_MANAGER_ADDRESS || '';
const USDT_USDC_500 = process.env.USDT_USDC_500 || '';
const USDT_WBTC_500 = process.env.USDT_WBTC_500 || '';
const USDC_WBTC_500 = process.env.USDC_WBTC_500 || '';
const USDT_USDC_030 = process.env.USDT_USDC_030 || '';
const USDT_USDC_100 = process.env.USDT_USDC_100 || '';

import WETH9 from './WETH9.json';

type ContractJson = { abi: any; bytecode: string };

const artifacts: { [name: string]: ContractJson } = {
  UniswapV3Factory: require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json'),
  SwapRouter: require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json'),
  SwapRouter02: require('@uniswap/swap-router-contracts/artifacts/contracts/SwapRouter02.sol/SwapRouter02.json'),
  NFTDescriptor: require('@uniswap/v3-periphery/artifacts/contracts/libraries/NFTDescriptor.sol/NFTDescriptor.json'),
  NonfungibleTokenPositionDescriptor: require('@uniswap/v3-periphery/artifacts/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json'),
  NonfungiblePositionManager: require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json'),
  WETH9,
  TETHER: require('../../artifacts/contracts/tokens/Tether.sol/Tether.json'),
  USDC: require('../../artifacts/contracts/tokens/Usdc.sol/Usdc.json'),
  WBTC: require('../../artifacts/contracts/tokens/WrappedBitcoin.sol/WrappedBitcoin.json'),
  UniswapV3Pool: require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json'),
};

type TokenJson = { abi: any; bytecode: string; address: string; symbol: string; name: string };
const tokens: { [name: string]: TokenJson } = {
  USDT: {
    abi: artifacts.TETHER.abi,
    bytecode: artifacts.TETHER.bytecode,
    address: TETHER_ADDRESS,
    symbol: 'USDT',
    name: 'Tether',
  },
  USDC: {
    abi: artifacts.USDC.abi,
    bytecode: artifacts.USDC.bytecode,
    address: USDC_ADDRESS,
    symbol: 'USDC',
    name: 'Usdc',
  },
  WBTC: {
    abi: artifacts.WBTC.abi,
    bytecode: artifacts.WBTC.bytecode,
    address: WBTC_ADDRESS,
    symbol: 'WBTC',
    name: 'WBTC',
  },
};

export { artifacts, TokenJson, tokens };
