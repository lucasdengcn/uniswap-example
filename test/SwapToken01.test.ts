import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

const TETHER_ADDRESS = process.env.TETHER_ADDRESS || '';
const USDC_ADDRESS = process.env.USDC_ADDRESS || '';
const WBTC_ADDRESS = process.env.WBTC_ADDRESS || '';
const WETH_ADDRESS = process.env.WETH_ADDRESS || '';
const SWAP_ROUTER_ADDRESS = process.env.SWAP_ROUTER_ADDRESS || '';
const USDT_USDC_500 = process.env.USDT_USDC_500 || '';
const USDT_WBTC_500 = process.env.USDT_WBTC_500 || '';

type ContractJson = { abi: any; bytecode: string };
const artifacts: { [name: string]: ContractJson } = {
  TETHER: require('../artifacts/contracts/tokens/Tether.sol/Tether.json'),
  USDC: require('../artifacts/contracts/tokens/Usdc.sol/Usdc.json'),
  WBTC: require('../artifacts/contracts/tokens/WrappedBitcoin.sol/WrappedBitcoin.json'),
  UniswapV3Pool: require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json'),
  SwapRouter: require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json'),
};

import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract, BigNumberish } from 'ethers';
import { TickMath } from '@uniswap/v3-sdk';
import BigNumber from 'bignumber.js';

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

/**
 *
 * @param sqrtPriceX96
 * @param decimals
 * @returns
 */
function sqrtToPrice(sqrtPriceX96: any, decimals: number = 0) {
  const numerator = sqrtPriceX96 ** 2;
  const denominator = 2 ** 192;
  let ratio = numerator / denominator;
  //
  const decimalShift = Math.pow(10, decimals);
  ratio = decimalShift / ratio;
  //
  return ratio;
}

describe('SwapToken01', function () {
  //
  it('Should swap USDT/USDC exactIn success', async function () {
    const [_owner, _signer] = await ethers.getSigners();
    const signerAddress = await _signer.getAddress();
    // get contract
    const usdtContract: any = new Contract(TETHER_ADDRESS, artifacts.TETHER.abi, ethers.provider);
    const usdcContract: any = new Contract(USDC_ADDRESS, artifacts.USDC.abi, ethers.provider);
    // verify balance
    const usdtBalance0 = await usdtContract.balanceOf(signerAddress);
    const usdcBalance0 = await usdcContract.balanceOf(signerAddress);
    console.log('usdt balance before: ', ethers.formatEther(usdtBalance0));
    console.log('usdc balance before: ', ethers.formatEther(usdcBalance0));
    // get swap pool
    const poolContract = new ethers.Contract(USDT_USDC_500, artifacts.UniswapV3Pool.abi, ethers.provider);
    let poolData = await getPoolData(poolContract);
    // get swap router
    const swapRouterContract: any = new Contract(SWAP_ROUTER_ADDRESS, artifacts.SwapRouter.abi, ethers.provider);
    // prepare swap parameters
    const amountIn = ethers.parseEther('10');
    const params = {
      tokenIn: poolData.token0,
      tokenOut: poolData.token1,
      fee: poolData.fee,
      recipient: signerAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 10,
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    };
    // approve swap router to spend on USDT, USDC
    await usdtContract.connect(_signer).approve(SWAP_ROUTER_ADDRESS, amountIn);
    await usdcContract.connect(_signer).approve(SWAP_ROUTER_ADDRESS, amountIn);
    // execute swap
    const tx = await swapRouterContract.connect(_signer).exactInputSingle(params, { gasLimit: 1000000 });
    await tx.wait();
    //
    expect(tx).to.be.emit(poolContract, 'Swap');
    //
    const usdtBalance1 = await usdtContract.balanceOf(signerAddress);
    const usdcBalance1 = await usdcContract.balanceOf(signerAddress);
    console.log('usdt balance after: ', ethers.formatEther(usdtBalance1));
    console.log('usdc balance after: ', ethers.formatEther(usdcBalance1));
  });

  it('Should swap USDT/WBTC exactOut success', async function () {
    const [_owner, _signer] = await ethers.getSigners();
    const signerAddress = await _signer.getAddress();
    // get contract
    const usdtContract: any = new Contract(TETHER_ADDRESS, artifacts.TETHER.abi, ethers.provider);
    const wbtcContract: any = new Contract(WBTC_ADDRESS, artifacts.WBTC.abi, ethers.provider);
    // verify balance
    const usdtBalance0 = await usdtContract.balanceOf(signerAddress);
    const wbtcBalance0 = await wbtcContract.balanceOf(signerAddress);
    console.log('usdt balance before: ', ethers.formatEther(usdtBalance0));
    console.log('wbtc balance before: ', ethers.formatEther(wbtcBalance0));
    // get swap pool
    const poolContract = new ethers.Contract(USDT_WBTC_500, artifacts.UniswapV3Pool.abi, ethers.provider);
    let poolData = await getPoolData(poolContract);
    console.log(poolData);
    // get swap router
    const swapRouterContract: any = new Contract(SWAP_ROUTER_ADDRESS, artifacts.SwapRouter.abi, ethers.provider);
    // prepare swap parameters
    const amountOut = ethers.parseEther('10');
    const amountInMax = ethers.parseEther('13');
    //
    const params = {
      tokenIn: poolData.token0,
      tokenOut: poolData.token1,
      fee: poolData.fee,
      recipient: signerAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 10,
      amountOut: amountOut,
      amountInMaximum: amountInMax,
      sqrtPriceLimitX96: 0,
    };
    // approve swap router to spend on USDT, WBTC
    await usdtContract.connect(_signer).approve(SWAP_ROUTER_ADDRESS, ethers.MaxUint256);
    await wbtcContract.connect(_signer).approve(SWAP_ROUTER_ADDRESS, ethers.MaxUint256);
    // execute swap
    const tx = await swapRouterContract.connect(_signer).exactOutputSingle(params, { gasLimit: 1000000 });
    await tx.wait();
    //
    expect(tx).to.be.emit(poolContract, 'Swap');
    //
    const usdtBalance1 = await usdtContract.balanceOf(signerAddress);
    const wbtcBalance1 = await wbtcContract.balanceOf(signerAddress);
    console.log('usdt balance after: ', ethers.formatEther(usdtBalance1));
    console.log('wbtc balance after: ', ethers.formatEther(wbtcBalance1));
  });
});
