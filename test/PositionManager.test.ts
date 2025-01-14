import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import { artifacts } from '../scripts/uniswap/shared';
import * as CS from './ContractShared.test';

//
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers, ignition } from 'hardhat';
import LiquidityExampleModule from '../ignition/modules/LiquidityExampleModule';

describe('PositionManager', function () {
  let nfpm: any;
  let tokenId: number = 7;
  let pmContract: any;
  before(async function () {
    nfpm = new Contract(CS.POSITION_MANAGER_ADDRESS, artifacts.NonfungiblePositionManager.abi, ethers.provider);
    //
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
    pmContract = contract;
  });

  it('Should owner be Liquidity Contract given valid tokenId', async function () {
    const [deployer, tokenOwner] = await ethers.getSigners();
    // 10, 0x51A1ceB83B83F1985a81C295d1fF28Afef186E02
    const owner2 = await nfpm.ownerOf(7);
    console.log(`tokenId ${tokenId} owner is: ${owner2}`);
    console.log(await tokenOwner.getAddress());
    console.log('Liquidity Contract: ', await pmContract.getAddress());
    expect(await pmContract.getAddress()).to.be.equal(owner2);
  });

  it('Should return position info given valid tokenId', async function () {
    const position = await nfpm.positions(tokenId);
    console.log(position);
  });
});
