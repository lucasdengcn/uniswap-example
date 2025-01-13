import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { Token } from '@uniswap/sdk-core';
import { Pool, Position, nearestUsableTick } from '@uniswap/v3-sdk';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';

const POSITION_MANAGER_ADDRESS = process.env.POSITION_MANAGER_ADDRESS || '';
const USDT_USDC_500 = process.env.USDT_USDC_500 || '';
const USDT_WBTC_500 = process.env.USDT_WBTC_500 || '';
const USDC_WBTC_500 = process.env.USDC_WBTC_500 || '';
const USDT_USDC_030 = process.env.USDT_USDC_030 || '';
const USDT_USDC_100 = process.env.USDT_USDC_100 || '';

import { TokenJson, artifacts, tokens } from './shared';

async function getPoolData(poolContract: any) {
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
    locked: slot0[6],
    feeProtocol: slot0[5],
  };
}

async function getPoolState(poolContract: any) {
  const [liquidity, slot] = await Promise.all([poolContract.liquidity(), poolContract.slot0()]);

  return {
    liquidity: liquidity,
    sqrtPriceX96: slot[0],
    tick: slot[1],
    observationIndex: slot[2],
    observationCardinality: slot[3],
    observationCardinalityNext: slot[4],
    feeProtocol: slot[5],
    unlocked: slot[6],
  };
}

async function poolLiquidityParams(
  signer: HardhatEthersSigner,
  token0: TokenJson,
  token1: TokenJson,
  poolAddress: string
) {
  console.log(`  Pool: ${token0.symbol}/${token1.symbol}, ${poolAddress}`);
  // token contract
  const usdtContract: any = new Contract(token0.address, token0.abi, ethers.provider);
  const usdcContract: any = new Contract(token1.address, token1.abi, ethers.provider);
  // token allowance to positionManager
  await usdtContract.connect(signer).approve(POSITION_MANAGER_ADDRESS, ethers.parseEther('100000'));
  await usdcContract.connect(signer).approve(POSITION_MANAGER_ADDRESS, ethers.parseEther('100000'));
  // Uniswap pool contract
  const poolContract = new Contract(poolAddress, artifacts.UniswapV3Pool.abi, ethers.provider);
  // show pool information
  const poolData = await getPoolData(poolContract);
  console.log('  Pool Data', poolData);
  // create uniswap token
  const UsdtToken = new Token(31337, token0.address, 18, token0.symbol, token0.name);
  const UsdcToken = new Token(31337, token1.address, 18, token1.symbol, token1.name);
  // prepare uniswap mint params
  // invariant(Number.isInteger(fee) && fee < 1_000_000, 'FEE')
  const pool = new Pool(
    UsdtToken,
    UsdcToken,
    poolData.fee,
    poolData.sqrtPriceX96.toString(),
    poolData.liquidity.toString(),
    poolData.tick
  );
  //
  const roundTick = nearestUsableTick(poolData.tick, poolData.tickSpacing);
  const tickLower = roundTick - poolData.tickSpacing * 2;
  const tickUpper = roundTick + poolData.tickSpacing * 2;
  //
  const position = new Position({
    pool: pool,
    liquidity: ethers.parseEther('100000').toString(),
    tickLower: tickLower,
    tickUpper: tickUpper,
  });
  const { amount0: amount0Desired, amount1: amount1Desired } = position.mintAmounts;
  //
  // amount0Min and amount1Min to zero for the example - but this would be a vulnerability in production.
  // A function calling mint with no slippage protection would be vulnerable to a frontrunning attack
  // designed to execute the mint call at an inaccurate price.
  // TODO: For a more secure practice the developer would need to implement a slippage estimation process.
  //
  const params = {
    token0: token0.address,
    token1: token1.address,
    fee: poolData.fee,
    tickLower: tickLower,
    tickUpper: tickUpper,
    amount0Desired: amount0Desired.toString(),
    amount1Desired: amount1Desired.toString(),
    amount0Min: 0,
    amount1Min: 0,
    recipient: signer.address,
    deadline: Math.floor(Date.now() / 1000) + 60 * 10,
  };

  // console.log(params);

  return params;
}

async function main() {
  const [owner, signer] = await ethers.getSigners();
  //
  const nonfungiblePositionManager: any = new Contract(
    POSITION_MANAGER_ADDRESS,
    artifacts.NonfungiblePositionManager.abi,
    ethers.provider
  );
  //
  console.log('add Liqudity: USDT-USDC-500');
  let params = await poolLiquidityParams(signer, tokens.USDT, tokens.USDC, USDT_USDC_500);
  let tx = await nonfungiblePositionManager.connect(signer).mint(params, { gasLimit: '1000000' });
  await tx.wait();
  // need to extract response: tokenId, liquidity, amount0, amoun1
  // console.log(receipt);
  console.log('add Liqudity: USDT-USDC-030');
  params = await poolLiquidityParams(signer, tokens.USDT, tokens.USDC, USDT_USDC_030);
  tx = await nonfungiblePositionManager.connect(signer).mint(params, { gasLimit: '1000000' });
  await tx.wait();
  //
  console.log('add Liqudity: USDT-USDC-100');
  params = await poolLiquidityParams(signer, tokens.USDT, tokens.USDC, USDT_USDC_100);
  tx = await nonfungiblePositionManager.connect(signer).mint(params, { gasLimit: '1000000' });
  await tx.wait();
  //
  console.log('add Liqudity: USDT-WBTC-500');
  params = await poolLiquidityParams(signer, tokens.USDT, tokens.WBTC, USDT_WBTC_500);
  tx = await nonfungiblePositionManager.connect(signer).mint(params, { gasLimit: '1000000' });
  await tx.wait();
  //
  console.log('add Liqudity: USDC-WBTC-500');
  params = await poolLiquidityParams(signer, tokens.USDC, tokens.WBTC, USDC_WBTC_500);
  tx = await nonfungiblePositionManager.connect(signer).mint(params, { gasLimit: '1000000' });
  await tx.wait();
}

/**
 * npx hardhat run --network localhost scripts/uniswap/addLiquidity.ts
 */

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
