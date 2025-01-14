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

  async function printBalance(name: string, signer: string) {
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
    const poolContract = CS.getPoolContract(CS.USDT_USDC_500, 'USDT_USDC_500');
    const poolData = await CS.getPoolData(poolContract);
    console.log(poolData.token0 == CS.TETHER_ADDRESS);
    console.log(poolData.token1 == CS.USDC_ADDRESS);
    //
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
    //
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
  //   P2, USDT/USDC 3000 2:1
  //   P3, USDT/USDC 10000 1:2
  // Then
  //   Swap out the high price token
  //   Swap in the low price token
  it('Should FlashSwap USDT/USDC success given amounts(1,1)', async function () {
    const amount0 = ethers.parseEther('1');
    const amount1 = ethers.parseEther('1');
    console.log('amount0: ', amount0);
    console.log('amount1: ', amount1);
    //
    // Borrow: 1 USDT, 1 USDC
    // fees: 1 * 0.05% USDT, 1 * 0.05% USDC
    // Amount Min: > 1 USDT, > 1 USDC
    //
    // Swap USDT for USDC in P3: 2 * (1-0.3%) USDC = 1.994 USDC > 1 USDC
    // Swap USDC for USDT in P2: 2 * (1-1%) = 1.98 USDT > 1USDT
    // USDT Profit: 1.98 - 1 - 0.05% = 0.98 USDT
    // USDC Profit: 1.994 - 1 - 0.05% = 0.994 USDC
    //
    // What if
    // Swap USDT for USDC in P2: 1 * 1/2 * (1-0.3%) USDC < 1 USDC (Failed)
    // Swap USDC for USDT in P3: 1 * 1/2 * (1-1%) USDT < 1 USDT (Failed)
    //
    await printBalance('BEFORE', await tokenOwner.getAddress());
    const tx = await flashSwap.connect(tokenOwner).startFlash(
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
    await printBalance('AFTER', await tokenOwner.getAddress());
    expect(tx).not.to.be.reverted;
    expect(tx).to.emit(flashSwap, 'FlashSwapProfit');
  });
  it('Should FlashSwap USDT/USDC fail given amounts(1,2)', async function () {
    const amount0 = ethers.parseEther('1');
    const amount1 = ethers.parseEther('2');
    console.log('amount0: ', amount0);
    console.log('amount1: ', amount1);
    //
    // Borrow: 1 USDT, 2 USDC
    // fees: 1 * 0.05% USDT, 2 * 0.05% USDC
    // Amount Min: > 1 USDT, > 2 USDC
    // Swap USDT for USDC in P3: 1 * 2 * (1-0.3%) USDC < 2 USDC (Failed)
    // Swap USDC for USDT in P2: 2 * 2 * (1-1%) > 1 USDT
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
  it('Should FlashSwap USDT/USDC fail given amounts(2,1)', async function () {
    [deployer, tokenOwner, user3] = await ethers.getSigners();
    const amount0 = ethers.parseEther('2');
    const amount1 = ethers.parseEther('1');
    console.log('amount0: ', amount0);
    console.log('amount1: ', amount1);
    //
    // Borrow: 2 USDT, 1 USDC
    // fees: 2 * 0.05% USDT, 1 * 0.05% USDC
    // Amount Min: > 2 USDT, > 1 USDC
    // Swap USDT for USDC in P3: 2 * 2 * (1-0.3%) USDC > 1 USDC
    // Swap USDC for USDT in P2: 1 * 2 * (1-1%) < 2 USDT (Failed!)
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
  it('Should FlashSwap USDT/USDC success given amounts(2,3)', async function () {
    const amount0 = ethers.parseEther('2');
    const amount1 = ethers.parseEther('3');
    console.log('amount0: ', amount0);
    console.log('amount1: ', amount1);
    //
    // Borrow: 2 USDT, 3 USDC
    // fees: 2 * 0.05% USDT, 3 * 0.05% USDC
    // Amount Min: > 2 USDT, > 3 USDC
    // Swap USDT for USDC in P3: 2 * 2 * (1-0.3%) USDC > 3 USDC
    // Swap USDC for USDT in P2: 3 * 2 * (1-1%) > 4 USDT
    //
    //
    await printBalance('BEFORE', await user4.getAddress());
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
    await printBalance('AFTER', await user4.getAddress());
  });
  it('Should FlashSwap USDT/USDC success given amounts(4,5)', async function () {
    const amount0 = ethers.parseEther('4');
    const amount1 = ethers.parseEther('5');
    console.log('amount0: ', amount0);
    console.log('amount1: ', amount1);
    //
    // Borrow: 4 USDT, 5 USDC
    // fees: 4 * 0.05% USDT, 5 * 0.05% USDC
    // Amount Min: > 4 USDT, > 5 USDC
    // Swap USDT for USDC in P3: 4 * 2 * (1-0.3%) USDC > 7 USDC
    // Swap USDC for USDT in P2: 5 * 2 * (1-1%) > 9 USDT
    //
    //
    await printBalance('BEFORE', await user5.getAddress());
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
    await printBalance('AFTER', await user5.getAddress());
  });
});
