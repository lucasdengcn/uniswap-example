import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import * as CS from './ContractShared.test';

//
import { expect } from 'chai';
import { Signer } from 'ethers';
import { ethers, ignition } from 'hardhat';

import SingleSwapExampleModule from '../ignition/modules/SingleSwapExampleModule';

describe('MultiSwapExampleModule', function () {
  let deployer: Signer;
  let tokenOwner: Signer;
  let example: any;
  let usdt: any, usdc: any, weth: any, wbtc: any;
  let totalUSDT: bigint, totalUSDC: bigint, totalWETH: bigint, totalWBTC: bigint;

  before(async function () {
    // listene contract events
    CS.getPoolContract(CS.USDT_USDC_500, 'USDT_USDC_500');
    CS.getPoolContract(CS.USDT_WBTC_500, 'USDT_WBTC_500');
    CS.getPoolContract(CS.USDC_WBTC_500, 'USDC_WBTC_500');
    //
    [deployer, tokenOwner] = await ethers.getSigners();
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
    console.log('totalUSDT: ', totalUSDT);
    console.log('totalUSDC: ', totalUSDC);
    console.log('totalWETH', totalWETH);
    console.log('totalWBTC', totalWBTC);
  });

  describe('Swap multihop', function () {
    //
    it('Should swap USDT to USDC to WBTC success using exactInput given pool is init', async function () {
      const amountIn = ethers.parseEther('10');
      const callerAddress = await example.getAddress();
      const ownerAddress = await tokenOwner.getAddress();
      //
      totalUSDT = await usdt.balanceOf(tokenOwner);
      totalUSDC = await usdc.balanceOf(tokenOwner);
      totalWBTC = await wbtc.balanceOf(tokenOwner);
      console.log('totalUSDC: ', totalUSDC);
      console.log('totalUSDT: ', totalUSDT);
      console.log('totalWBTC: ', totalWBTC);
      console.log('amountIn: ', amountIn);
      //
      const tether: any = await CS.getUSDT();
      // approve allowance (owner->contract)
      await expect(tether.connect(tokenOwner).approve(callerAddress, amountIn))
        .to.be.emit(tether, 'Approval')
        .withArgs(ownerAddress, callerAddress, amountIn);
      // tx (usdt->contract->usdc->wbtc)
      // USDT->USDC
      // USDC->WBTC
      const tx = await example
        .connect(tokenOwner)
        .swapExactInputMultihop(CS.TETHER_ADDRESS, CS.USDC_ADDRESS, CS.WBTC_ADDRESS, amountIn, 500, 3000);
      expect(tx, 'swapExactInputMultihop').not.be.reverted;
      expect(tx).to.be.emit(example, 'SwapResult');
      //
      totalUSDT = await usdt.balanceOf(tokenOwner);
      totalUSDC = await usdc.balanceOf(tokenOwner);
      totalWBTC = await wbtc.balanceOf(tokenOwner);
      console.log('totalUSDC: ', totalUSDC);
      console.log('totalUSDT: ', totalUSDT);
      console.log('totalWBTC: ', totalWBTC);
      //
    });

    it('Should swap USDT to USDC to WBTC success using exactOut given pool is init', async function () {
      const amountOut = ethers.parseEther('10');
      const amountInMaximum = ethers.parseEther('12');

      const callerAddress = await example.getAddress();
      const ownerAddress = await tokenOwner.getAddress();
      //
      totalUSDT = await usdt.balanceOf(tokenOwner);
      totalUSDC = await usdc.balanceOf(tokenOwner);
      totalWBTC = await wbtc.balanceOf(tokenOwner);
      console.log('totalUSDC: ', totalUSDC);
      console.log('totalUSDT: ', totalUSDT);
      console.log('totalWBTC: ', totalWBTC);
      console.log('amountOut: ', amountOut);
      //
      const tether: any = await CS.getUSDT();
      // approve allowance (owner->contract)
      await expect(tether.connect(tokenOwner).approve(callerAddress, amountInMaximum))
        .to.be.emit(tether, 'Approval')
        .withArgs(ownerAddress, callerAddress, amountInMaximum);
      // tx (usdt->contract->usdc->wbtc)
      // USDT->USDC
      // USDC->WBTC
      const tx = await example
        .connect(tokenOwner)
        .swapExactOutputMultihop(
          CS.TETHER_ADDRESS,
          CS.USDC_ADDRESS,
          CS.WBTC_ADDRESS,
          amountOut,
          amountInMaximum,
          3000,
          3000
        );
      expect(tx, 'swapExactOutputMultihop').not.be.reverted;
      expect(tx).to.be.emit(example, 'SwapResult');
      //
      totalUSDT = await usdt.balanceOf(tokenOwner);
      totalUSDC = await usdc.balanceOf(tokenOwner);
      totalWBTC = await wbtc.balanceOf(tokenOwner);
      console.log('totalUSDC: ', totalUSDC);
      console.log('totalUSDT: ', totalUSDT);
      console.log('totalWBTC: ', totalWBTC);
      //
    });
  });
});
