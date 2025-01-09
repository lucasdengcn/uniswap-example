import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

const TETHER_ADDRESS = process.env.TETHER_ADDRESS || '';
const USDC_ADDRESS = process.env.USDC_ADDRESS || '';
const WBTC_ADDRESS = process.env.WBTC_ADDRESS || '';
const WETH_ADDRESS = process.env.WETH_ADDRESS || '';
const POSITION_MANAGER_ADDRESS = process.env.POSITION_MANAGER_ADDRESS || '';
const USDT_USDC_500 = process.env.USDT_USDC_500 || '';
const USDT_WBTC_500 = process.env.USDT_WBTC_500 || '';
const USDC_WBTC_500 = process.env.USDC_WBTC_500 || '';

//
import { Contract, Signer } from 'ethers';
import { ethers, ignition } from 'hardhat';
import { expect } from 'chai';
import { TickMath } from '@uniswap/v3-sdk';

import { artifacts } from '../scripts/uniswap/shared';

describe('PositionManager', function () {
  let nfpm: any;
  let tokenId: number = 9;
  before(async function () {
    nfpm = new Contract(POSITION_MANAGER_ADDRESS, artifacts.NonfungiblePositionManager.abi, ethers.provider);
  });

  it('Should return owner given valid tokenId', async function () {
    const [deployer, tokenOwner] = await ethers.getSigners();
    // 10, 0x51A1ceB83B83F1985a81C295d1fF28Afef186E02
    const owner1 = await nfpm.ownerOf(10);
    console.log(owner1);
    const owner2 = await nfpm.ownerOf(9);
    console.log(owner2);
    console.log(await tokenOwner.getAddress());
  });

  it('Should return position info given valid tokenId', async function () {
    const position = await nfpm.positions(tokenId);
    console.log(position);
  });
});
