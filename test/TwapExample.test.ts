import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import * as CS from './ContractShared.test';

//
import { ethers, ignition } from 'hardhat';

import TwapExampleModule from '../ignition/modules/TwapExampleModule';

describe('TwapExample', function () {
  let twapExample: any;
  before(async () => {
    const { contract } = await ignition.deploy(TwapExampleModule, {
      parameters: {
        TwapExampleModule: {
          factoryAddress: CS.FACTORY_ADDRESS,
          weth9Address: CS.WETH_ADDRESS,
        },
      },
    });
    await contract.waitForDeployment();
    twapExample = contract;
  });
  //
  describe('USDT_USDC_500 pool', function () {
    const fee = 500;
    it('Should estimate amountOut given USDT_USDC_500, USDC_OUT', async () => {
      const tokenIn = CS.TETHER_ADDRESS;
      const tokenOut = CS.USDC_ADDRESS;
      const amountIn = ethers.parseEther('1');
      const amountOut = await twapExample.estimateAmountOut(tokenIn, tokenOut, fee, amountIn, 10);
      console.log('USDT_USDC_500 USDC amountOut: ', ethers.formatEther(amountOut));
    });
    it('Should estimate amountOut given USDT_USDC_500, USDT_OUT', async () => {
      const tokenOut = CS.TETHER_ADDRESS;
      const tokenIn = CS.USDC_ADDRESS;
      const amountIn = ethers.parseEther('1');
      const amountOut = await twapExample.estimateAmountOut(tokenIn, tokenOut, fee, amountIn, 10);
      console.log('USDT_USDC_500 USDT amountOut: ', ethers.formatEther(amountOut));
    });
    it('Should estimateV2 amountOut given USDT_USDC_500 USDC_OUT', async () => {
      const tokenIn = CS.TETHER_ADDRESS;
      const tokenOut = CS.USDC_ADDRESS;
      const amountIn = ethers.parseEther('1');
      const amountOut = await twapExample.estimateAmountOut(tokenIn, tokenOut, fee, amountIn, 10);
      console.log('USDT_USDC_500 USDC amountOut: ', ethers.formatEther(amountOut));
    });
    //
    it('Should TWAP for USDT/USDC given 10s', async () => {
      const tokenIn = CS.TETHER_ADDRESS;
      const tokenOut = CS.USDC_ADDRESS;
      const sqrtPriceX96 = await twapExample.twapSqrtPriceX96(tokenIn, tokenOut, fee, 10);
      console.log('USDT_USDC_030 USDC sqrtPriceX96: ', sqrtPriceX96, CS.sqrtToPrice(sqrtPriceX96, 0));
    });
  });
  describe('USDT_USDC_030 pool', function () {
    const fee = 3000;
    it('Should estimate amountOut given USDC_OUT', async () => {
      const tokenIn = CS.TETHER_ADDRESS;
      const tokenOut = CS.USDC_ADDRESS;
      const amountIn = ethers.parseEther('1');
      const amountOut = await twapExample.estimateAmountOut(tokenIn, tokenOut, fee, amountIn, 10);
      console.log('USDT_USDC_030 USDC amountOut: ', ethers.formatEther(amountOut));
    });
    it('Should estimate amountOut given USDT_OUT', async () => {
      const tokenOut = CS.TETHER_ADDRESS;
      const tokenIn = CS.USDC_ADDRESS;
      const amountIn = ethers.parseEther('1');
      const amountOut = await twapExample.estimateAmountOut(tokenIn, tokenOut, fee, amountIn, 10);
      console.log('USDT_USDC_030 USDT amountOut: ', ethers.formatEther(amountOut));
    });
    it('Should estimateV2 amountOut for USDT/USDEC given USDC_OUT', async () => {
      const tokenIn = CS.TETHER_ADDRESS;
      const tokenOut = CS.USDC_ADDRESS;
      const amountIn = ethers.parseEther('1');
      const amountOut = await twapExample.estimateAmountOut(tokenIn, tokenOut, fee, amountIn, 10);
      console.log('USDT_USDC_030 USDC amountOut: ', ethers.formatEther(amountOut));
    });
    //
    it('Should TWAP for USDT/USDC given 10s', async () => {
      const tokenIn = CS.TETHER_ADDRESS;
      const tokenOut = CS.USDC_ADDRESS;
      const sqrtPriceX96 = await twapExample.twapSqrtPriceX96(tokenIn, tokenOut, fee, 10);
      console.log('USDT_USDC_030 USDC sqrtPriceX96: ', sqrtPriceX96, CS.sqrtToPrice(sqrtPriceX96, 0));
    });
  });
  describe('USDT_USDC_100 pool', function () {
    const fee = 10000;
    it('Should estimate amountOut given USDC_OUT', async () => {
      const tokenIn = CS.TETHER_ADDRESS;
      const tokenOut = CS.USDC_ADDRESS;
      const amountIn = ethers.parseEther('1');
      const amountOut = await twapExample.estimateAmountOut(tokenIn, tokenOut, fee, amountIn, 10);
      console.log('USDT_USDC_100 USDC amountOut: ', ethers.formatEther(amountOut));
    });
    it('Should estimate amountOut given USDT_OUT', async () => {
      const tokenOut = CS.TETHER_ADDRESS;
      const tokenIn = CS.USDC_ADDRESS;
      const amountIn = ethers.parseEther('1');
      const amountOut = await twapExample.estimateAmountOut(tokenIn, tokenOut, fee, amountIn, 10);
      console.log('USDT_USDC_100 USDT amountOut: ', ethers.formatEther(amountOut));
    });
    it('Should estimateV2 amountOut given USDC_OUT', async () => {
      const tokenIn = CS.TETHER_ADDRESS;
      const tokenOut = CS.USDC_ADDRESS;
      const amountIn = ethers.parseEther('1');
      const amountOut = await twapExample.estimateAmountOut(tokenIn, tokenOut, fee, amountIn, 10);
      console.log('USDT_USDC_100 USDC amountOut: ', ethers.formatEther(amountOut));
    });
    //
    it('Should TWAP for USDT/USDC given 10s', async () => {
      const tokenIn = CS.TETHER_ADDRESS;
      const tokenOut = CS.USDC_ADDRESS;
      const sqrtPriceX96 = await twapExample.twapSqrtPriceX96(tokenIn, tokenOut, fee, 10);
      console.log('USDT_USDC_100 USDC sqrtPriceX96: ', sqrtPriceX96, CS.sqrtToPrice(sqrtPriceX96, 0));
    });
  });
});
