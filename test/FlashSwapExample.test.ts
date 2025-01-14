import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import * as CS from './ContractShared.test';

//
import { expect } from 'chai';
import { Signer } from 'ethers';
import { ethers, ignition } from 'hardhat';

import FlashSwapExampleModule from '../ignition/modules/FlashSwapExampleModule';

describe('FlashSwapExampleModule', function () {
  let deployer: Signer, tokenOwner: Signer, user3: Signer, user4: Signer, user5: Signer, user6: Signer;
  let flashSwap: any;
  let usdt: any, usdc: any, weth: any, wbtc: any;
  let totalUSDT: bigint, totalUSDC: bigint, totalWETH: bigint, totalWBTC: bigint;

  async function printBalance(name: string, signer: Signer) {
    const usdt = await CS.getUSDT();
    const usdc = await CS.getUSDC();
    let token0Balance = await usdt.balanceOf(signer);
    let token1Balance = await usdc.balanceOf(signer);
    console.log(
      name,
      'USDT balance: ',
      ethers.formatEther(token0Balance),
      ', USDC balance: ',
      ethers.formatEther(token1Balance)
    );
  }
  before(async function () {
    // listene contract events
    CS.getPoolContract(CS.USDT_USDC_500, 'USDT_USDC_500');
    CS.getPoolContract(CS.USDT_USDC_030, 'USDT_USDC_030');
    CS.getPoolContract(CS.USDT_USDC_100, 'USDT_USDC_100');
    //
    [deployer, tokenOwner, user3, user4, user5, user6] = await ethers.getSigners();
    const { contract } = await ignition.deploy(FlashSwapExampleModule, {
      parameters: {
        FlashSwapExampleModule: {
          routerAddress: CS.SWAP_ROUTER_ADDRESS,
          factoryAddress: CS.FACTORY_ADDRESS,
          weth9Address: CS.WETH_ADDRESS,
        },
      },
    });
    expect(await contract.getAddress()).to.be.properAddress;
    flashSwap = contract;
    flashSwap.on(
      'FlashSwapProfit',
      (receipt: string, token0: string, token1: string, fee: bigint, profit: bigint, token: string) => {
        console.log('FlashSwapProfit:', fee, token == CS.TETHER_ADDRESS ? 'USDT' : 'USDC', ethers.formatEther(profit));
      }
    );
  });

  it('Should deploy success', async function () {
    //
    usdt = await CS.getUSDT();
    usdc = await CS.getUSDC();
    wbtc = await CS.getWBTC();
    weth = CS.getWETH();
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

  // Given
  //   P1, USDT/USDC 500 1:1
  //   P2, USDT/USDC 3000 1:2
  //   P3, USDT/USDC 10000 2:1
  // Then
  //
  it('Should FlashSwap USDT/USDC (500, 3000, 10000)', async function () {
    const amount0 = ethers.parseEther('1');
    const amount1 = ethers.parseEther('1');
    console.log('amount0: ', amount0);
    console.log('amount1: ', amount1);
    //
    await printBalance('BEFORE', user3);
    const tx = await flashSwap.connect(user3).startFlash(
      {
        token0: CS.TETHER_ADDRESS,
        token1: CS.USDC_ADDRESS,
        fee1: 500,
        amount0: amount0,
        amount1: amount1,
        fee2: 3000,
        fee3: 10000,
      },
      { gasLimit: 1000000 }
    );
    await printBalance('AFTER', user3);
    expect(tx).not.to.be.reverted;
    expect(tx).to.emit(flashSwap, 'FlashSwapProfit');
  });
  it('Should FlashSwap USDT/USDC-2 (500, 3000, 10000)', async function () {
    const amount0 = ethers.parseEther('1');
    const amount1 = ethers.parseEther('2');
    console.log('amount0: ', amount0);
    console.log('amount1: ', amount1);
    //
    await expect(
      flashSwap.connect(user3).startFlash(
        {
          token0: CS.TETHER_ADDRESS,
          token1: CS.USDC_ADDRESS,
          fee1: 500,
          amount0: amount0,
          amount1: amount1,
          fee2: 3000,
          fee3: 10000,
        },
        { gasLimit: 1000000 }
      )
    ).to.be.reverted;
  });
  it('Should FlashSwap USDT/USDC-3 (500, 3000, 10000)', async function () {
    [deployer, tokenOwner, user3] = await ethers.getSigners();
    const amount0 = ethers.parseEther('2');
    const amount1 = ethers.parseEther('1');
    console.log('amount0: ', amount0);
    console.log('amount1: ', amount1);
    //
    await expect(
      flashSwap.connect(user3).startFlash(
        {
          token0: CS.TETHER_ADDRESS,
          token1: CS.USDC_ADDRESS,
          fee1: 500,
          amount0: amount0,
          amount1: amount1,
          fee2: 3000,
          fee3: 10000,
        },
        { gasLimit: 1000000 }
      )
    ).to.be.reverted;
  });
  it('Should FlashSwap USDT/USDC-4 (500, 3000, 10000)', async function () {
    const amount0 = ethers.parseEther('2');
    const amount1 = ethers.parseEther('3');
    console.log('amount0: ', amount0);
    console.log('amount1: ', amount1);
    //
    await printBalance('BEFORE', user4);
    await expect(
      flashSwap.connect(user4).startFlash(
        {
          token0: CS.TETHER_ADDRESS,
          token1: CS.USDC_ADDRESS,
          fee1: 500,
          amount0: amount0,
          amount1: amount1,
          fee2: 3000,
          fee3: 10000,
        },
        { gasLimit: 1000000 }
      )
    ).not.to.be.reverted;
    await printBalance('AFTER', user4);
  });
  it('Should FlashSwap USDT/USDC-5 (500, 3000, 10000)', async function () {
    const amount0 = ethers.parseEther('4');
    const amount1 = ethers.parseEther('5');
    console.log('amount0: ', amount0);
    console.log('amount1: ', amount1);
    //
    await printBalance('BEFORE', user5);
    await expect(
      flashSwap.connect(user5).startFlash(
        {
          token0: CS.TETHER_ADDRESS,
          token1: CS.USDC_ADDRESS,
          fee1: 500,
          amount0: amount0,
          amount1: amount1,
          fee2: 3000,
          fee3: 10000,
        },
        { gasLimit: 1000000 }
      )
    ).not.to.be.reverted;
    await printBalance('AFTER', user5);
  });
});
