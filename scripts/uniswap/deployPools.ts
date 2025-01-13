import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import BigNumber from 'bignumber.js';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import * as fs from 'node:fs/promises';

const TETHER_ADDRESS = process.env.TETHER_ADDRESS || '';
const USDC_ADDRESS = process.env.USDC_ADDRESS || '';
const WBTC_ADDRESS = process.env.WBTC_ADDRESS || '';
const WETH_ADDRESS = process.env.WETH_ADDRESS || '';
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || '';
const SWAP_ROUTER_ADDRESS = process.env.SWAP_ROUTER_ADDRESS;
const NFT_DESCRIPTOR_ADDRESS = process.env.NFT_DESCRIPTOR_ADDRESS;
const POSITION_DESCRIPTOR_ADDRESS = process.env.POSITION_DESCRIPTOR_ADDRESS;
const POSITION_MANAGER_ADDRESS = process.env.POSITION_MANAGER_ADDRESS || '';

import { artifacts } from './shared';

BigNumber.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });

//
const provider = ethers.provider;
//
const nonfungiblePositionManager: any = new Contract(
  POSITION_MANAGER_ADDRESS,
  artifacts.NonfungiblePositionManager.abi,
  provider
);

const factory: any = new Contract(FACTORY_ADDRESS, artifacts.UniswapV3Factory.abi, provider);

function encodePriceSqrt(reserve1: Number, reserve0: Number) {
  //
  return BigNumber(reserve1.toString())
    .div(reserve0.toString())
    .sqrt()
    .multipliedBy(BigNumber(2).pow(96))
    .integerValue(3)
    .toString();
}

async function deployPool(token0: string, token1: string, fee: Number, price: string) {
  const [owner] = await ethers.getSigners();

  // https://docs.uniswap.org/contracts/v3/reference/periphery/base/PoolInitializer#createandinitializepoolifnecessary
  // require(token0 < token1);
  if (token0 > token1) {
    [token0, token1] = [token1, token0];
  }
  const tx = await nonfungiblePositionManager
    .connect(owner)
    .createAndInitializePoolIfNecessary(token0, token1, fee, price, { gasLimit: 5000000 });
  await tx.wait();
  // console.log(tx);
  //
  const poolAddress = await factory.connect(owner).getPool(token0, token1, fee);
  return poolAddress;
}

async function setFeeProtocol(poolAddress: any) {
  const [owner] = await ethers.getSigners();
  const poolContract: any = new Contract(poolAddress, artifacts.UniswapV3Pool.abi, provider);

  const feeProtocol0 = 4;
  const feeProtocol1 = 4;
  const tx = await poolContract.connect(owner).setFeeProtocol(feeProtocol0, feeProtocol1);
  await tx.wait();
}

async function main() {
  let fee = 500;
  // USDT/USDC
  const usdtUsdc005 = await deployPool(TETHER_ADDRESS, USDC_ADDRESS, fee, encodePriceSqrt(1, 1));
  await setFeeProtocol(usdtUsdc005);
  console.log('Create pool successfully. USDT/USDC 500');
  // USDT/WBTC
  fee = 3000;
  const usdtWBTC005 = await deployPool(TETHER_ADDRESS, WBTC_ADDRESS, fee, encodePriceSqrt(1, 0.1));
  await setFeeProtocol(usdtWBTC005);
  console.log('Create pool successfully. USDT/WBTC 3000');
  // USDT/WETH
  const usdtWETH500 = await deployPool(TETHER_ADDRESS, WETH_ADDRESS, fee, encodePriceSqrt(1, 0.15));
  await setFeeProtocol(usdtWETH500);
  console.log('Create pool successfully. USDT/WETH 3000');
  // USDC/WBTC
  fee = 3000;
  const usdcWBTC005 = await deployPool(USDC_ADDRESS, WBTC_ADDRESS, fee, encodePriceSqrt(1, 0.1));
  await setFeeProtocol(usdcWBTC005);
  console.log('Create pool successfully. USDC/WBTC 3000');
  // USDC/USDT
  fee = 3000;
  const usdcUSDT030 = await deployPool(USDC_ADDRESS, TETHER_ADDRESS, fee, encodePriceSqrt(1, 2));
  await setFeeProtocol(usdcUSDT030);
  console.log('Create pool successfully. USDC/USDT 3000');
  // USDT/USDC
  fee = 10000;
  const usdtUSDC100 = await deployPool(TETHER_ADDRESS, USDC_ADDRESS, fee, encodePriceSqrt(2, 1));
  await setFeeProtocol(usdtUSDC100);
  console.log('Create pool successfully. USDT/USDC 3000');
  //
  //
  let addresses = [
    '',
    `USDT_USDC_500=${usdtUsdc005}`,
    `USDT_WBTC_500=${usdtWBTC005}`,
    `USDT_WETH_500=${usdtWETH500}`,
    `USDC_WBTC_500=${usdcWBTC005}`,
    `USDT_USDC_030=${usdcUSDT030}`,
    `USDT_USDC_100=${usdtUSDC100}`,
  ];
  //
  const data = addresses.join('\n');
  console.log(addresses);
  console.log('Deploy Pools DONE. ----------------');
  return fs.appendFile('.address.env', data);
}

/**
 * npx hardhat run --network localhost scripts/uniswap/deployPools.ts
 */

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
