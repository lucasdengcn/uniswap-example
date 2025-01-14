import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import * as CS from './ContractShared.test';

describe('QuoteExample', function () {
  let deployer: Signer, user2: Signer, user3: Signer, user4: Signer, user5: Signer, user6: Signer;

  let quoteContract: any;
  let quotev2Contract: any;
  //
  before(async () => {
    [deployer, user2, user3, user4, user5, user6] = await ethers.getSigners();

    quoteContract = CS.getQuote();
    quotev2Contract = CS.getQuoterV2();
  });

  it('Quoter Shoule return amountOut given amountIn', async () => {
    const poolContract = CS.getPoolContract(CS.USDT_USDC_500, 'USDT/USDC');
    const amountIn = ethers.parseEther('1');
    // in ethersjs-6
    const amountOut = await quoteContract.quoteExactInputSingle.staticCall(
      CS.TETHER_ADDRESS,
      CS.USDC_ADDRESS,
      500,
      amountIn,
      0
    );
    console.log('amountIn: ', ethers.formatEther(amountIn));
    console.log('amountOut: ', ethers.formatEther(amountOut));
  });
  it('QuoterV2 Shoule return amountOut given amountIn', async () => {
    const poolContract = CS.getPoolContract(CS.USDT_USDC_500, 'USDT/USDC');
    const amountIn = ethers.parseEther('1');
    // in ethersjs-6
    const params = {
      tokenIn: CS.TETHER_ADDRESS,
      tokenOut: CS.USDC_ADDRESS,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0,
    };
    const output = await quotev2Contract.quoteExactInputSingle.staticCall(params);
    console.log('amountIn: ', ethers.formatEther(amountIn));
    console.log('amountOut: ', ethers.formatEther(output[0]));
    console.log('sqrtPriceX96After: ', CS.sqrtToPrice(output[1], 0));
    console.log('initializedTicksCrossed: ', output[2]);
    console.log('gasEstimate: ', output[3]);
  });
  it('QuoterV2 Shoule return amountOut given larger amountIn', async () => {
    const poolContract = CS.getPoolContract(CS.USDT_USDC_500, 'USDT/USDC');
    const amountIn = ethers.parseEther('100');
    // in ethersjs-6
    const params = {
      tokenIn: CS.TETHER_ADDRESS,
      tokenOut: CS.USDC_ADDRESS,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0,
    };
    const output = await quotev2Contract.quoteExactInputSingle.staticCall(params);
    console.log('amountIn: ', ethers.formatEther(amountIn));
    console.log('amountOut: ', ethers.formatEther(output[0]));
    console.log('sqrtPriceX96After: ', CS.sqrtToPrice(output[1], 0));
    console.log('initializedTicksCrossed: ', output[2]);
    console.log('gasEstimate: ', output[3]);
  });
  it('QuoterV2 Shoule return amountOut given larger amountIn', async () => {
    const poolContract = CS.getPoolContract(CS.USDT_USDC_500, 'USDT/USDC');
    const amountIn = ethers.parseEther('1000');
    // in ethersjs-6
    const params = {
      tokenIn: CS.TETHER_ADDRESS,
      tokenOut: CS.USDC_ADDRESS,
      amountIn: amountIn,
      fee: 500,
      sqrtPriceLimitX96: 0,
    };
    const output = await quotev2Contract.quoteExactInputSingle.staticCall(params);
    console.log('amountIn: ', ethers.formatEther(amountIn));
    console.log('amountOut: ', ethers.formatEther(output[0]));
    console.log('sqrtPriceX96After: ', CS.sqrtToPrice(output[1], 0));
    console.log('initializedTicksCrossed: ', output[2]);
    console.log('gasEstimate: ', output[3]);
  });
});
