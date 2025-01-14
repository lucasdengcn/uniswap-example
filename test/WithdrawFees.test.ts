import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import { artifacts } from '../scripts/uniswap/shared';
import * as CS from './ContractShared.test';

import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';

describe('WithdrawFees', function () {
  it('Should withdraw fees success', async function () {
    const [owner] = await ethers.getSigners();
    const ownerAddress = await owner.getAddress();
    //
    // get contract
    const usdtContract: any = new Contract(CS.TETHER_ADDRESS, artifacts.TETHER.abi, ethers.provider);
    const usdcContract: any = new Contract(CS.USDC_ADDRESS, artifacts.USDC.abi, ethers.provider);
    // verify balance
    const usdtBalance0 = await usdtContract.balanceOf(ownerAddress);
    const usdcBalance0 = await usdcContract.balanceOf(ownerAddress);
    console.log('usdt balance: ', usdtBalance0);
    console.log('usdc balance: ', usdcBalance0);
    //
    const poolContract: any = new Contract(CS.USDT_USDC_500, artifacts.UniswapV3Pool.abi, ethers.provider);
    const amount = ethers.parseEther('100000');
    //
    const tx = await poolContract.connect(owner).collectProtocol(ownerAddress, amount, amount);
    await tx.wait();
    expect(tx).to.be.emit(poolContract, 'CollectProtocol');
    //
    // console.log(tx);
    //
    const usdtBalance1 = await usdtContract.balanceOf(ownerAddress);
    const usdcBalance1 = await usdcContract.balanceOf(ownerAddress);
    console.log('usdt balance: ', usdtBalance1);
    console.log('usdc balance: ', usdcBalance1);
  });
});
