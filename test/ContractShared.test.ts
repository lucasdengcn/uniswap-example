import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import { Contract } from 'ethers';
import { ethers } from 'hardhat';

export const TETHER_ADDRESS = process.env.TETHER_ADDRESS || '';
export const USDC_ADDRESS = process.env.USDC_ADDRESS || '';
export const WBTC_ADDRESS = process.env.WBTC_ADDRESS || '';
export const WETH_ADDRESS = process.env.WETH_ADDRESS || '';
//
export const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || '';
export const SWAP_ROUTER_ADDRESS = process.env.SWAP_ROUTER_ADDRESS || '';
export const NFT_DESCRIPTOR_ADDRESS = process.env.NFT_DESCRIPTOR_ADDRESS || '';
export const POSITION_DESCRIPTOR_ADDRESS = process.env.POSITION_DESCRIPTOR_ADDRESS || '';
export const POSITION_MANAGER_ADDRESS = process.env.POSITION_MANAGER_ADDRESS || '';
export const QUOTER_ADDRESS = process.env.QUOTER_ADDRESS || '';
export const QUOTERV2_ADDRESS = process.env.QUOTERV2_ADDRESS || '';
//
export const USDT_USDC_500 = process.env.USDT_USDC_500 || '';
export const USDT_WBTC_500 = process.env.USDT_WBTC_500 || '';
export const USDC_WBTC_500 = process.env.USDC_WBTC_500 || '';
export const USDT_USDC_030 = process.env.USDT_USDC_030 || '';
export const USDT_USDC_100 = process.env.USDT_USDC_100 || '';

import BigNumber from 'bignumber.js';
import { artifacts } from '../scripts/uniswap/shared';

export function sqrtToPrice(sqrtPriceX96: bigint, decimals: number) {
  const price = BigNumber(sqrtPriceX96.toString());
  const numerator = price.pow(2);
  const denominator = BigNumber(2).pow(192);
  let ratio = numerator.dividedBy(denominator);
  //
  const decimalShift = BigNumber(Math.pow(10, decimals));
  ratio = decimalShift.dividedBy(ratio);
  return ratio.toFixed(4);
}

export async function getUSDT() {
  return await ethers.getContractAt('Tether', TETHER_ADDRESS);
}

export async function getUSDC() {
  return await ethers.getContractAt('Usdc', USDC_ADDRESS);
}

export async function getWBTC() {
  // binding to signer
  return await ethers.getContractAt('WrappedBitcoin', WBTC_ADDRESS);
}

export function getWETH() {
  return new Contract(WETH_ADDRESS, artifacts.WETH9.abi, ethers.provider);
}

export function getPoolContract(poolAddress: string, name: string) {
  const poolContract = new ethers.Contract(poolAddress, artifacts.UniswapV3Pool.abi, ethers.provider);
  return poolContract;
}

export function getPoolFactory(address: string, name: string) {
  const poolContract = new ethers.Contract(address, artifacts.UniswapV3Factory.abi, ethers.provider);
  return poolContract;
}

export function getNFPM() {
  return new Contract(POSITION_MANAGER_ADDRESS, artifacts.NonfungiblePositionManager.abi, ethers.provider);
}

export function getQuote() {
  return new Contract(QUOTER_ADDRESS, artifacts.Quoter.abi, ethers.provider);
}

export function getQuoterV2() {
  return new Contract(QUOTERV2_ADDRESS, artifacts.QuoterV2.abi, ethers.provider);
}

export async function getPoolData(poolContract: any) {
  const [tickSpacing, fee, liquidity, slot0, token0, token1, maxLiquidityPerTick] = await Promise.all([
    poolContract.tickSpacing(),
    poolContract.fee(),
    poolContract.liquidity(),
    poolContract.slot0(),
    poolContract.token0(),
    poolContract.token1(),
    poolContract.maxLiquidityPerTick(),
  ]);

  return {
    tickSpacing: parseInt(tickSpacing),
    fee: parseInt(fee),
    liquidity: liquidity,
    sqrtPriceX96: slot0[0],
    tick: parseInt(slot0[1]),
    token0: token0,
    token1: token1,
    maxLiquidityPerTick: maxLiquidityPerTick,
  };
}

export function randomHexString(length: number): string {
  const randomBytes = ethers.randomBytes(Math.ceil(length / 2)); // Generate random bytes
  const randomHexString = ethers.hexlify(randomBytes); // Convert random bytes to a hexadecimal string
  return randomHexString.slice(2, 2 + length); // Trim the string to the desired length
}
