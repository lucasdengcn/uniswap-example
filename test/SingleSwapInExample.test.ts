import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import * as CS from './ContractShared.test';

import { expect } from 'chai';
import { Signer } from 'ethers';
import { ethers, ignition } from 'hardhat';

import BigNumber from 'bignumber.js';
import EstimationExampleModule from '../ignition/modules/EstimationExampleModule';
import SingleSwapExampleModule from '../ignition/modules/SingleSwapExampleModule';

describe('SingleSwapInExample', function () {
  let deployer: Signer;
  let tokenOwner: Signer;
  let example: any;
  let twapExample: any;
  let usdt: any, usdc: any, weth: any, wbtc: any;
  let totalUSDT: bigint, totalUSDC: bigint, totalWETH: bigint, totalWBTC: bigint;

  async function deploySwapContract() {
    const { contract } = await ignition.deploy(SingleSwapExampleModule, {
      parameters: {
        SingleSwapExampleModule: {
          routerAddress: CS.SWAP_ROUTER_ADDRESS,
        },
      },
    });
    expect(await contract.getAddress()).to.be.properAddress;
    example = contract;
    example.on('SwapResult', (receipt: any, tokenIn: any, tokenOut: any, amountIn: any, amountOut: any) => {
      console.log(
        'SwapResult',
        '|',
        'pair:',
        name,
        '|',
        'receipt:',
        receipt,
        '|',
        'amountIn:',
        amountIn,
        '|',
        'amountOut:',
        amountOut
      );
    });
  }

  async function deployTwapContract() {
    const { contract } = await ignition.deploy(EstimationExampleModule, {
      parameters: {
        EstimationExampleModule: {
          factoryAddress: CS.FACTORY_ADDRESS,
          weth9Address: CS.WETH_ADDRESS,
        },
      },
    });
    await contract.waitForDeployment();
    twapExample = contract;
  }

  async function calculateAmountOutMinimum(amountIn: bigint, slippage: number = 5) {
    const estimateAmountOut: bigint = await twapExample.estimateAmountOutV2(
      CS.TETHER_ADDRESS,
      CS.USDC_ADDRESS,
      3000,
      amountIn,
      1
    );
    const amountOutMinimum = BigNumber(estimateAmountOut.toString())
      .multipliedBy(BigNumber(1 - (slippage * 1.0) / 100))
      .toFixed(0);
    // 10000000000000000000
    //  4987318126208235057
    console.log(
      'estimateAmountOut: ',
      ethers.formatEther(estimateAmountOut),
      ', amountOutMinimum: ',
      ethers.formatEther(amountOutMinimum)
    );
    return amountOutMinimum;
  }

  async function calculatePriceLimit(secondsAgo: number) {
    const [sqrtPriceX96] = await twapExample.twapSqrtPriceX96(CS.TETHER_ADDRESS, CS.USDC_ADDRESS, 3000, secondsAgo);
    console.log('sqrtPriceX96Limit: ', sqrtPriceX96);
    return sqrtPriceX96;
  }

  before(async function () {
    // listene contract events
    const poolContract = CS.getPoolContract(CS.USDT_USDC_030, 'USDT_USDC_030');
    const info = await CS.getPoolData(poolContract);
    console.log('sqrtPriceX96 current: ', info.sqrtPriceX96);
    //
    [deployer, tokenOwner] = await ethers.getSigners();
    await deploySwapContract();
    await deployTwapContract();
  });

  it('Should deploy success', async function () {
    //
    usdt = await CS.getUSDT();
    usdc = await CS.getUSDC();
    weth = CS.getWETH();
    wbtc = await CS.getWBTC();
    //
    expect(await usdt.balanceOf(tokenOwner), 'Owner USDT balance').to.be.above(0);
    expect(await usdc.balanceOf(tokenOwner), 'Owner USDC balance').to.be.above(0);
    expect(await weth.balanceOf(tokenOwner), 'Owner WETH balance').to.be.equal(0);
    expect(await wbtc.balanceOf(tokenOwner), 'Owner WETH balance').to.be.above(0);
    //
    totalUSDT = await usdt.balanceOf(tokenOwner);
    totalUSDC = await usdc.balanceOf(tokenOwner);
    totalWETH = await weth.balanceOf(tokenOwner);
    totalWBTC = await wbtc.balanceOf(tokenOwner);
  });

  it('Should swap 10 USDT to USDC success given amountOutMinimum, slippage in 10 TWAP', async function () {
    const requestId = CS.randomHexString(16);
    const amountIn = ethers.parseEther('10');
    const callerAddress = await example.getAddress();
    const ownerAddress = await tokenOwner.getAddress();
    //
    totalUSDT = await usdt.balanceOf(tokenOwner);
    totalUSDC = await usdc.balanceOf(tokenOwner);
    //
    const tether: any = await CS.getUSDT();
    // approve allowance (owner->contract)
    await expect(tether.connect(tokenOwner).approve(callerAddress, amountIn))
      .to.be.emit(tether, 'Approval')
      .withArgs(ownerAddress, callerAddress, amountIn);
    // tx (usdt->contract->weth)
    const amountOutMinimum = await calculateAmountOutMinimum(amountIn, 10);
    // given no priceLimit, amountIn will be fully utilized to meet amountOutMinimum
    const tx = await example
      .connect(tokenOwner)
      .swapExactInputSingle(CS.TETHER_ADDRESS, CS.USDC_ADDRESS, amountIn, 3000, amountOutMinimum, 0);
    expect(tx).not.be.reverted;
    expect(tx).to.be.emit(example, 'SwapResult');
  });

  it('Should swap 10 USDT to USDC success given priceLimit', async function () {
    const requestId = CS.randomHexString(16);
    const amount = ethers.parseEther('10');
    const callerAddress = await example.getAddress();
    const ownerAddress = await tokenOwner.getAddress();
    //
    totalUSDT = await usdt.balanceOf(tokenOwner);
    totalUSDC = await usdc.balanceOf(tokenOwner);
    const fee = 3000;
    //
    const tether: any = await CS.getUSDT();
    // approve allowance (owner->contract)
    await expect(tether.connect(tokenOwner).approve(callerAddress, amount))
      .to.be.emit(tether, 'Approval')
      .withArgs(ownerAddress, callerAddress, amount);
    // tx (usdt->contract->weth)
    const [priceLimit, currentPrice] = await twapExample.estimatePriceOnSwapExactInput(
      CS.TETHER_ADDRESS,
      CS.USDC_ADDRESS,
      fee,
      amount,
      true
    );
    console.log('currentPrice: ', currentPrice);
    console.log('priceLimit: ', priceLimit);
    // given priceLimit, amountIn will not be fully utilized
    const tx = await example
      .connect(tokenOwner)
      .swapExactInputSingle(CS.TETHER_ADDRESS, CS.USDC_ADDRESS, amount, fee, 0, priceLimit);
    expect(tx).not.be.reverted;
    expect(tx).to.be.emit(example, 'SwapResult');
    //
    const [currentPrice1, liqudity] = await twapExample.currentPrice(CS.TETHER_ADDRESS, CS.USDC_ADDRESS, fee);
    console.log('currentPrice1: ', currentPrice1);
  });

  it('Should swap 10 USDT to USDC success given no price and amount control', async function () {
    const requestId = CS.randomHexString(16);
    const amountIn = ethers.parseEther('10');
    const callerAddress = await example.getAddress();
    const ownerAddress = await tokenOwner.getAddress();
    //
    totalUSDT = await usdt.balanceOf(tokenOwner);
    totalUSDC = await usdc.balanceOf(tokenOwner);
    //
    const tether: any = await CS.getUSDT();
    // approve allowance (owner->contract)
    await expect(tether.connect(tokenOwner).approve(callerAddress, amountIn))
      .to.be.emit(tether, 'Approval')
      .withArgs(ownerAddress, callerAddress, amountIn);
    // tx (usdt->contract->weth)
    // given no priceLimit, amountIn will be fully utilized
    const tx = await example
      .connect(tokenOwner)
      .swapExactInputSingle(CS.TETHER_ADDRESS, CS.USDC_ADDRESS, amountIn, 3000, 0, 0);
    expect(tx).not.be.reverted;
    expect(tx).to.be.emit(example, 'SwapResult');
  });

  it('Should swap 10 USDT to USDC failed given amountOutMinimum and no slippage', async function () {
    const amountIn = ethers.parseEther('10');
    const callerAddress = await example.getAddress();
    const ownerAddress = await tokenOwner.getAddress();
    //
    totalUSDT = await usdt.balanceOf(tokenOwner);
    totalUSDC = await usdc.balanceOf(tokenOwner);
    //
    const tether: any = await CS.getUSDT();
    // approve allowance (owner->contract)
    await expect(tether.connect(tokenOwner).approve(callerAddress, amountIn))
      .to.be.emit(tether, 'Approval')
      .withArgs(ownerAddress, callerAddress, amountIn);
    // tx (usdt->contract->weth)
    const estimateAmountOut: bigint = await twapExample.estimateAmountOutV2(
      CS.TETHER_ADDRESS,
      CS.USDC_ADDRESS,
      3000,
      amountIn,
      1
    );
    //
    await expect(
      example
        .connect(tokenOwner)
        .swapExactInputSingle(CS.TETHER_ADDRESS, CS.USDC_ADDRESS, amountIn, 3000, estimateAmountOut, 0)
    ).be.reverted;
  });
});
