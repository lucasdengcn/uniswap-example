import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import * as CS from './ContractShared.test';

//
import { TickMath } from '@uniswap/v3-sdk';
import { expect } from 'chai';
import { ethers, ignition } from 'hardhat';
import LiquidityExampleModule from '../ignition/modules/LiquidityExampleModule';

function nearestUsableTick(tick: number, tickSpacing: number) {
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  if (rounded < TickMath.MIN_TICK) return rounded + tickSpacing;
  else if (rounded > TickMath.MAX_TICK) return rounded - tickSpacing;
  else return rounded;
}

describe('LiquidityExample', function () {
  let example: any;
  let tokenId: number = 9;
  //

  async function approveAllowanceFromOwnerToContract() {
    console.log('approveAllowanceFromOwnerToContract');
    const [deployer, tokenOwner] = await ethers.getSigners();
    const callerAddress = await example.getAddress();
    //
    const usdt: any = await CS.getUSDT();
    const usdc: any = await CS.getUSDC();
    //
    await usdt.connect(tokenOwner).approve(callerAddress, ethers.MaxUint256);
    await usdc.connect(tokenOwner).approve(callerAddress, ethers.MaxUint256);
  }

  async function printOutBalance(token: any, owner: string, name: string, tokenName: string) {
    const amount = await token.balanceOf(owner);
    console.log('balance: ', tokenName, ', ', name, ', ', ethers.formatEther(amount));
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
    console.log('deploy contract Done. ', await contract.getAddress());
    //
    await approveAllowanceFromOwnerToContract();
    console.log('approveAllowanceFromOwnerToContract Done');
  });

  describe('Helper', function () {
    it('calculateRoundedTick', async function () {
      const tx = await example.calculateRoundedTick(-4, 200);
      const tx2 = nearestUsableTick(-4, 200);
      console.log('round tick: ', tx, tx2);
    });
  });

  describe('Prepare balance', function () {
    it('Should mint balance success for owners', async function () {
      const [deployer, tokenOwner] = await ethers.getSigners();
      const tether: any = await CS.getUSDT();
      const usdc: any = await CS.getUSDC();
      //
      const amount = ethers.parseEther('1000000');
      await expect(tether.connect(deployer).mint(tokenOwner, amount)).not.to.be.reverted;
      await expect(usdc.connect(deployer).mint(tokenOwner, amount)).not.to.be.reverted;
    });
  });

  describe('Minting', function () {
    //
    it('USDT_USDC should estimate NewPosition success', async function () {
      const estimation = await example.estimateNewPosition(1, 5);
      //
      console.log('amount0: ', ethers.formatEther(estimation[1]));
      console.log('amount1: ', ethers.formatEther(estimation[2]));
    });

    it('USDT_USDC should mint new position success', async function () {
      const [deployer, tokenOwner] = await ethers.getSigners();
      const callerAddress = await example.getAddress();
      //
      const requestId = CS.randomHexString(16);
      // add more 5% liquidity
      const estimation = await example.connect(tokenOwner).estimateNewPosition(1, 5);
      //
      console.log('estimate amount0: ', ethers.formatEther(estimation[0]));
      console.log('estimate amount1: ', ethers.formatEther(estimation[1]));
      //
      const tether: any = await CS.getUSDT();
      const usdc: any = await CS.getUSDC();
      //
      await printOutBalance(tether, CS.POSITION_MANAGER_ADDRESS, 'PM-before', 'USDT');
      await printOutBalance(usdc, CS.POSITION_MANAGER_ADDRESS, 'PM-before', 'USDC');
      //
      await printOutBalance(tether, callerAddress, 'DA-before', 'USDT');
      await printOutBalance(usdc, callerAddress, 'DA-before', 'USDC');
      //
      await printOutBalance(tether, CS.USDT_USDC_500, 'Pool-before', 'USDT');
      await printOutBalance(usdc, CS.USDT_USDC_500, 'Pool-before', 'USDC');
      //
      // execute transaction
      const tx = await example.connect(tokenOwner).mintNewPosition({
        requestId,
        amount0Desired: estimation[0],
        amount1Desired: estimation[1],
        tickLower: estimation[2],
        tickUpper: estimation[3],
        amount0Min: estimation[4],
        amount1Min: estimation[5],
      });
      expect(tx).to.emit(example, 'MintPosition');
      //
      tokenId = await example.requestTokenIds(requestId);
      console.log('requestId: ', requestId, ', tokenId: ', tokenId);
      //
      await printOutBalance(tether, CS.POSITION_MANAGER_ADDRESS, 'PM-after', 'USDT');
      await printOutBalance(usdc, CS.POSITION_MANAGER_ADDRESS, 'PM-after', 'USDC');
      //
      await printOutBalance(tether, callerAddress, 'DA-after', 'USDT');
      await printOutBalance(usdc, callerAddress, 'DA-after', 'USDC');
      //
      await printOutBalance(tether, CS.USDT_USDC_500, 'Pool-after', 'USDT');
      await printOutBalance(usdc, CS.USDT_USDC_500, 'Pool-after', 'USDC');
    });

    it('Should return pools current holdings success', async function () {
      const [deployer, tokenOwner] = await ethers.getSigners();
      const holdings = await example.connect(tokenOwner).currentHoldings(tokenId);
      console.log('amount0: ', ethers.formatEther(holdings[0]), 'amount1: ', ethers.formatEther(holdings[1]));
    });
  });

  describe('Liquidity increase', function () {
    it('Should increase liquidity success given valid tokenId', async function () {
      const [deployer, tokenOwner] = await ethers.getSigners();
      const requestId = CS.randomHexString(16);
      console.log('requestId: ', requestId, 'tokenId: ', tokenId);
      //
      const holdingsBefore = await example.connect(tokenOwner).currentHoldings(tokenId);
      console.log('Before Increase: ', ethers.formatEther(holdingsBefore[0]), ethers.formatEther(holdingsBefore[1]));
      //
      // 10 changges change
      const estimation = await example.connect(tokenOwner).estimateLiquidityChanges(tokenId, 10);
      console.log(estimation);
      //
      const tolerance = 5;
      await expect(
        example
          .connect(tokenOwner)
          .increaseLiquidityCurrentRange(requestId, tokenId, estimation[0], estimation[1], tolerance)
      ).to.emit(example, 'IncreaseLiquidity');
      //
      const holdingsAfter = await example.connect(tokenOwner).currentHoldings(tokenId);
      console.log('After Increase: ', ethers.formatEther(holdingsAfter[0]), ethers.formatEther(holdingsAfter[1]));
      //
      const diff0 = holdingsAfter[0] - holdingsBefore[0];
      const diff1 = holdingsAfter[1] - holdingsBefore[1];
      // diff0 + diff1 may not be qual to amount0 + amount1
      // expect(diff0 + diff1, 'diff0').to.be.equal(amount0 + amount1);
      //
      console.log('diff0: ', diff0, 'diff1: ', diff1, 'diffSum: ', diff0 + diff1);
    });
    //
    it('Should increase liquidity failed given not valid tokenId', async function () {
      const [deployer, tokenOwner] = await ethers.getSigners();
      const amount0 = ethers.parseEther('10');
      const requestId = CS.randomHexString(16);
      const tolerance = 5;

      await expect(
        example.connect(tokenOwner).increaseLiquidityCurrentRange(requestId, 19, amount0, amount0, tolerance)
      ).to.revertedWith('TokenId not found');
    });
    //
    it('Should increase liquidity failed given not valid sender', async function () {
      const [deployer, tokenOwner] = await ethers.getSigners();
      const amount0 = ethers.parseEther('10');
      const requestId = CS.randomHexString(16);
      const tolerance = 5;

      await expect(
        example.connect(deployer).increaseLiquidityCurrentRange(requestId, tokenId, amount0, amount0, tolerance)
      ).to.revertedWith('Not the owner');
    });
  });

  describe('Liquidity decrease', function () {
    it('Should decrease liquidity in percentage success given valid tokenId', async function () {
      const [deployer, tokenOwner] = await ethers.getSigners();
      const requestId = CS.randomHexString(16);
      const callerAddress = await example.getAddress();
      const ownerAddress = await tokenOwner.getAddress();
      //
      const holdingsBefore = await example.connect(tokenOwner).currentHoldings(tokenId);
      console.log(
        'Before decrease percentage: ',
        ethers.formatEther(holdingsBefore[0]),
        ethers.formatEther(holdingsBefore[1])
      );
      //
      const tether: any = await CS.getUSDT();
      const usdc: any = await CS.getUSDC();
      //
      await printOutBalance(tether, ownerAddress, 'Owner-before', 'USDT');
      await printOutBalance(usdc, ownerAddress, 'Owner-before', 'USDC');
      //
      await printOutBalance(tether, CS.POSITION_MANAGER_ADDRESS, 'PM-before', 'USDT');
      await printOutBalance(usdc, CS.POSITION_MANAGER_ADDRESS, 'PM-before', 'USDC');
      //
      await printOutBalance(tether, callerAddress, 'DA-before', 'USDT');
      await printOutBalance(usdc, callerAddress, 'DA-before', 'USDC');
      // 10 changges change
      const estimation = await example.connect(tokenOwner).estimateLiquidityChanges(tokenId, 10);
      console.log(estimation);
      //
      await expect(
        example.connect(tokenOwner).decreaseLiquidity(requestId, tokenId, estimation[0], estimation[1], estimation[2])
      ).to.emit(example, 'DecreaseLiquidity');
      //
      await printOutBalance(tether, ownerAddress, 'Owner-after', 'USDT');
      await printOutBalance(usdc, ownerAddress, 'Owner-after', 'USDC');
      //
      await printOutBalance(tether, CS.POSITION_MANAGER_ADDRESS, 'PM-after', 'USDT');
      await printOutBalance(usdc, CS.POSITION_MANAGER_ADDRESS, 'PM-after', 'USDC');
      //
      await printOutBalance(tether, callerAddress, 'DA-after', 'USDT');
      await printOutBalance(usdc, callerAddress, 'DA-after', 'USDC');
      //
      const holdingsAfter = await example.connect(tokenOwner).currentHoldings(tokenId);
      console.log(
        'After decrease percentage: ',
        ethers.formatEther(holdingsAfter[0]),
        ethers.formatEther(holdingsAfter[1])
      );
      //
      const diff0 = holdingsAfter[0] - holdingsBefore[0];
      const diff1 = holdingsAfter[1] - holdingsBefore[1];
      // diff0 + diff1 may not be qual to amount0 + amount1
      // expect(diff0 + diff1, 'diff0').to.be.equal(amount0 + amount1);
      //
      console.log('diff0: ', diff0, 'diff1: ', diff1, 'diffSum: ', diff0 + diff1);
    });

    it('Should decrease liquidity failed given not valid tokenId', async function () {
      const [deployer, tokenOwner] = await ethers.getSigners();
      const requestId = CS.randomHexString(16);

      await expect(example.connect(tokenOwner).decreaseLiquidity(requestId, 19, 10, 0, 0)).to.revertedWith(
        'TokenId not found'
      );
    });

    it('Should decrease liquidity failed given not valid sender', async function () {
      const [deployer, tokenOwner] = await ethers.getSigners();
      const requestId = CS.randomHexString(16);

      await expect(example.connect(deployer).decreaseLiquidity(requestId, tokenId, 10, 0, 0)).to.revertedWith(
        'Not the owner'
      );
    });
  });
});
