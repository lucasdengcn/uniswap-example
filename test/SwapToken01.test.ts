import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import { artifacts } from '../scripts/uniswap/shared';
import * as CS from './ContractShared.test';

import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';

describe('SwapToken01', function () {
  //
  it('Should swap USDT/USDC exactIn success', async function () {
    const [_owner, _signer] = await ethers.getSigners();
    const signerAddress = await _signer.getAddress();
    // get contract
    const usdtContract: any = new Contract(CS.TETHER_ADDRESS, artifacts.TETHER.abi, ethers.provider);
    const usdcContract: any = new Contract(CS.USDC_ADDRESS, artifacts.USDC.abi, ethers.provider);
    // verify balance
    const usdtBalance0 = await usdtContract.balanceOf(signerAddress);
    const usdcBalance0 = await usdcContract.balanceOf(signerAddress);
    console.log('usdt balance before: ', ethers.formatEther(usdtBalance0));
    console.log('usdc balance before: ', ethers.formatEther(usdcBalance0));
    // get swap pool
    const poolContract = new ethers.Contract(CS.USDT_USDC_500, artifacts.UniswapV3Pool.abi, ethers.provider);
    let poolData = await CS.getPoolData(poolContract);
    // get swap router
    const swapRouterContract: any = new Contract(CS.SWAP_ROUTER_ADDRESS, artifacts.SwapRouter.abi, ethers.provider);
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
    await usdtContract.connect(_signer).approve(CS.SWAP_ROUTER_ADDRESS, amountIn);
    await usdcContract.connect(_signer).approve(CS.SWAP_ROUTER_ADDRESS, amountIn);
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
    const usdtContract: any = new Contract(CS.TETHER_ADDRESS, artifacts.TETHER.abi, ethers.provider);
    const wbtcContract: any = new Contract(CS.WBTC_ADDRESS, artifacts.WBTC.abi, ethers.provider);
    // verify balance
    const usdtBalance0 = await usdtContract.balanceOf(signerAddress);
    const wbtcBalance0 = await wbtcContract.balanceOf(signerAddress);
    console.log('usdt balance before: ', ethers.formatEther(usdtBalance0));
    console.log('wbtc balance before: ', ethers.formatEther(wbtcBalance0));
    // get swap pool
    const poolContract = new ethers.Contract(CS.USDT_WBTC_500, artifacts.UniswapV3Pool.abi, ethers.provider);
    let poolData = await CS.getPoolData(poolContract);
    console.log(poolData);
    // get swap router
    const swapRouterContract: any = new Contract(CS.SWAP_ROUTER_ADDRESS, artifacts.SwapRouter.abi, ethers.provider);
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
    await usdtContract.connect(_signer).approve(CS.SWAP_ROUTER_ADDRESS, ethers.MaxUint256);
    await wbtcContract.connect(_signer).approve(CS.SWAP_ROUTER_ADDRESS, ethers.MaxUint256);
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
