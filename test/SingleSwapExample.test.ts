import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import * as CS from './ContractShared.test';

//
import { expect } from 'chai';
import { ContractTransactionResponse, Signer } from 'ethers';
import { ethers, ignition } from 'hardhat';

import SingleSwapExampleModule from '../ignition/modules/SingleSwapExampleModule';

describe('SingleSwapExampleModule', function () {
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

  describe('Swap ExactInput Single', function () {
    it('Should swap USDT to USDC success given pool is init', async function () {
      const amountIn = ethers.parseEther('10');
      const callerAddress = await example.getAddress();
      const ownerAddress = await tokenOwner.getAddress();
      //
      totalUSDT = await usdt.balanceOf(tokenOwner);
      totalUSDC = await usdc.balanceOf(tokenOwner);
      console.log('totalUSDC: ', totalUSDC);
      console.log('totalUSDT: ', totalUSDT);
      console.log('amountIn: ', amountIn);
      //
      const tether: any = await CS.getUSDT();
      // approve allowance (owner->contract)
      await expect(tether.connect(tokenOwner).approve(callerAddress, amountIn))
        .to.be.emit(tether, 'Approval')
        .withArgs(ownerAddress, callerAddress, amountIn);
      // tx (usdt->contract->weth)
      const tx = await example
        .connect(tokenOwner)
        .swapExactInputSingle(CS.TETHER_ADDRESS, CS.USDC_ADDRESS, amountIn, 3000);
      expect(tx).not.be.reverted;
      expect(tx).to.be.emit(example, 'SwapResult');
    });

    it('Should swap USDC to USDT success given pool', async function () {
      const amountIn = ethers.parseEther('10');
      const callerAddress = await example.getAddress();
      const ownerAddress = await tokenOwner.getAddress();
      //
      totalUSDT = await usdt.balanceOf(ownerAddress);
      totalUSDC = await usdc.balanceOf(ownerAddress);
      console.log('totalUSDC: ', totalUSDC);
      console.log('totalUSDT: ', totalUSDT);
      console.log('amountIn: ', amountIn);
      //
      const tether: any = await CS.getUSDT();
      const usdcOwner: any = await CS.getUSDC();
      // approve allowance (owner->contract)
      await expect(usdcOwner.connect(tokenOwner).approve(callerAddress, amountIn))
        .to.be.emit(usdcOwner, 'Approval')
        .withArgs(ownerAddress, callerAddress, amountIn);
      // tx (usdt->contract->weth)
      const tx = await example
        .connect(tokenOwner)
        .swapExactInputSingle(CS.USDC_ADDRESS, CS.TETHER_ADDRESS, amountIn, 10000);
      expect(tx).not.be.reverted;
      expect(tx).to.be.emit(example, 'SwapResult');
    });

    it('Should swap USDT to WETH failed given pool is not deployed', async function () {
      const amountIn = ethers.parseEther('10');
      const callerAddress = await example.getAddress();
      const ownerAddress = await tokenOwner.getAddress();
      //
      totalUSDT = await usdt.balanceOf(ownerAddress);
      totalWETH = await weth.balanceOf(ownerAddress);
      console.log('totalWETH: ', totalWETH);
      console.log('totalUSDT: ', totalUSDT);
      console.log('amountIn: ', amountIn);
      //
      const tether: any = await CS.getUSDT();
      const wethOwner: any = CS.getWETH();
      // approve allowance (owner->contract)
      await expect(tether.connect(tokenOwner).approve(callerAddress, amountIn))
        .to.be.emit(tether, 'Approval')
        .withArgs(ownerAddress, callerAddress, amountIn);
      // tx (usdt->contract->weth)
      await expect(example.connect(tokenOwner).swapExactInputSingle(CS.TETHER_ADDRESS, CS.WETH_ADDRESS, amountIn, 3000))
        .to.be.reverted;
      //
      expect(await weth.balanceOf(ownerAddress), 'WETH balance').to.be.equal(totalWETH);
      expect(await usdt.balanceOf(ownerAddress), 'USDT balance').to.be.equal(totalUSDT);
    });
  });

  describe('Swap ExactOut Single', function () {
    it('Should swap USDT to WBTC success given pool is init', async function () {
      const amountOut = ethers.parseEther('10');
      const amountInMax = ethers.parseEther('13');
      const callerAddress = await example.getAddress();
      const ownerAddress = await tokenOwner.getAddress();
      //
      totalUSDT = await usdt.balanceOf(tokenOwner);
      totalWBTC = await wbtc.balanceOf(tokenOwner);
      console.log('totalWBTC: ', totalWBTC);
      console.log('totalUSDT: ', totalUSDT);
      console.log('amountOut: ', amountOut);
      //
      const tether: any = await CS.getUSDT();
      // approve allowance (owner->contract)
      await expect(tether.connect(tokenOwner).approve(callerAddress, amountInMax), 'USDT approve')
        .to.be.emit(tether, 'Approval')
        .withArgs(ownerAddress, callerAddress, amountInMax);
      // tx (usdt->contract->wbtc)
      const tx: ContractTransactionResponse = await example
        .connect(tokenOwner)
        .swapExactOutputSingle(CS.TETHER_ADDRESS, CS.WBTC_ADDRESS, amountOut, amountInMax, 3000);
      expect(tx, 'swapExactOutputSingle').not.be.reverted;
      expect(tx).to.be.emit(example, 'SwapResult');
    });
  });
});
