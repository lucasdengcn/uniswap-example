import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import * as CS from './ContractShared.test';

import { expect } from 'chai';
import { ethers, ignition } from 'hardhat';

import { Signer } from 'ethers';
import LiquidityExampleModule from '../ignition/modules/LiquidityExampleModule';

describe('Collect fees', function () {
  let example: any;
  let tokenId: number = 7;

  async function approveAllowanceFromOwnerToContract() {
    const [deployer, tokenOwner] = await ethers.getSigners();
    const callerAddress = await example.getAddress();
    //
    const usdt: any = await CS.getUSDT();
    const usdc: any = await CS.getUSDC();
    //
    await usdt.connect(tokenOwner).approve(callerAddress, ethers.MaxUint256);
    await usdc.connect(tokenOwner).approve(callerAddress, ethers.MaxUint256);
  }

  async function printBalance(tag: string, signer: Signer) {
    const usdt: any = await CS.getUSDT();
    const usdc: any = await CS.getUSDC();
    //
    const balance0 = await usdt.balanceOf(await signer.getAddress());
    const balance1 = await usdc.balanceOf(await signer.getAddress());
    console.log(tag, ' USDT: ', ethers.formatEther(balance0), ', USDC: ', ethers.formatEther(balance1));
  }

  before(async function () {
    const { contract } = await ignition.deploy(LiquidityExampleModule, {
      parameters: {
        LiquidityExampleModule: {
          positionManager: CS.POSITION_MANAGER_ADDRESS,
          poolAddress: CS.USDT_USDC_500,
          token0: CS.TETHER_ADDRESS,
          token1: CS.USDC_ADDRESS,
        },
      },
    });
    await contract.waitForDeployment();
    example = contract;
    console.log('deploy contract Done');
    //
    await approveAllowanceFromOwnerToContract();
    console.log('approveAllowanceFromOwnerToContract Done');
  });

  it('Should collect fees success', async function () {
    const [deployer, tokenOwner] = await ethers.getSigners();
    const requestId = CS.randomHexString(16);
    const callerAddress = await example.getAddress();
    const ownerAddress = await tokenOwner.getAddress();
    console.log(callerAddress);
    console.log('tokenId: ', tokenId);
    await printBalance('Before Collect: ', tokenOwner);
    // const holdingsBefore = await example.connect(tokenOwner).currentHoldings(tokenId);
    // console.log(
    //   'Before Collect: ',
    //   ethers.formatEther(holdingsBefore[0]),
    //   ethers.formatEther(holdingsBefore[1]),
    //   holdingsBefore[4],
    //   holdingsBefore[5],
    //   ethers.formatEther(holdingsBefore[6]),
    //   ethers.formatEther(holdingsBefore[7])
    // );
    //
    await expect(example.connect(tokenOwner).collectAllFees(requestId, tokenId)).to.emit(example, 'CollectFee');
    await printBalance('After Collect: ', tokenOwner);
    //
    // const holdingsAfter = await example.connect(tokenOwner).currentHoldings(tokenId);
    // console.log(
    //   'After Collect: ',
    //   ethers.formatEther(holdingsAfter[0]),
    //   ethers.formatEther(holdingsAfter[1]),
    //   holdingsBefore[4],
    //   holdingsBefore[5],
    //   ethers.formatEther(holdingsAfter[6]),
    //   ethers.formatEther(holdingsAfter[7])
    // );
  });
});
