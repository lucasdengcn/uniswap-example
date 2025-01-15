import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import * as CS from './ContractShared.test';

//
import BigNumber from 'bignumber.js';
import { ethers, ignition } from 'hardhat';
import EstimationExampleModule from '../ignition/modules/EstimationExampleModule';

describe('EstimationExample', function () {
  let twapExample: any;
  before(async () => {
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
  });
  //
  async function calculatePriceLimit(secondsAgo: number) {
    const [sqrtPriceX96] = await twapExample.twapSqrtPriceX96(CS.TETHER_ADDRESS, CS.USDC_ADDRESS, 3000, secondsAgo);
    console.log('sqrtPriceX96Limit: ', sqrtPriceX96);
    return sqrtPriceX96;
  }

  it('Should estimate amounts given price 5% off', async function () {
    const [sqrtPriceBX96] = await twapExample.currentPrice(CS.TETHER_ADDRESS, CS.USDC_ADDRESS, 3000);
    const limit = BigNumber(sqrtPriceBX96.toString())
      .multipliedBy(BigNumber(1 - 0.05))
      .toFixed(0);
    const amountDeltas = await twapExample.estimateAmountsOnPriceRange(CS.TETHER_ADDRESS, CS.USDC_ADDRESS, 3000, limit);
    console.log(amountDeltas);
    // 4180751527334600175
    // 2087475186884078019
  });
  //
  it('Should estimate nextPrice given swap token0 in amount', async function () {
    const amount = ethers.parseEther('1');
    const [nextPrice, currentPrice] = await twapExample.estimatePriceOnSwapExactInput(
      CS.TETHER_ADDRESS,
      CS.USDC_ADDRESS,
      3000,
      amount,
      true
    );
    console.log('IN current: ', currentPrice);
    console.log('IN next: ', nextPrice);
  });
  //
  it('Should estimate nextPrice given swap token1 in amount', async function () {
    const amount = ethers.parseEther('1');
    const [nextPrice, currentPrice] = await twapExample.estimatePriceOnSwapExactInput(
      CS.TETHER_ADDRESS,
      CS.USDC_ADDRESS,
      3000,
      amount,
      false
    );
    console.log('IN current: ', currentPrice);
    console.log('IN next: ', nextPrice);
  });
  //
  it('Should estimate nextPrice given swap token0 out amount', async function () {
    const amount = ethers.parseEther('1');
    const [nextPrice, currentPrice] = await twapExample.estimatePriceOnSwapExactOut(
      CS.TETHER_ADDRESS,
      CS.USDC_ADDRESS,
      3000,
      amount,
      true
    );
    console.log('OUT current: ', currentPrice);
    console.log('OUT next: ', nextPrice);
  });
  //
  it('Should estimate nextPrice given swap token1 out amount', async function () {
    const amount = ethers.parseEther('1');
    const [nextPrice, currentPrice] = await twapExample.estimatePriceOnSwapExactOut(
      CS.TETHER_ADDRESS,
      CS.USDC_ADDRESS,
      3000,
      amount,
      false
    );
    console.log('OUT current: ', currentPrice);
    console.log('OUT next: ', nextPrice);
  });
});
