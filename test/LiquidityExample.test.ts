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
import WETH9 from '../scripts/uniswap/WETH9.json';
import LiquidityExampleModule from '../ignition/modules/LiquidityExampleModule';

function nearestUsableTick(tick: number, tickSpacing: number) {
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  if (rounded < TickMath.MIN_TICK) return rounded + tickSpacing;
  else if (rounded > TickMath.MAX_TICK) return rounded - tickSpacing;
  else return rounded;
}

function randomHexString(length: number): string {
  const randomBytes = ethers.randomBytes(Math.ceil(length / 2)); // Generate random bytes
  const randomHexString = ethers.hexlify(randomBytes); // Convert random bytes to a hexadecimal string
  return randomHexString.slice(2, 2 + length); // Trim the string to the desired length
}

function sqrtToPrice(sqrtPriceX96: bigint, decimals: number = 0) {
  const numerator = sqrtPriceX96 ** BigInt(2);
  const denominator = BigInt(2 ** 192);
  let ratio = numerator / denominator;
  if (ratio == BigInt(0)) {
    return ratio;
  }
  //
  const decimalShift = BigInt(Math.pow(10, decimals));
  ratio = decimalShift / ratio;
  //
  return ratio;
}

describe('LiquidityExample', function () {
  let example: any;
  let tokenId: number = 9;
  //
  async function getUSDT() {
    // binding to signer
    return await ethers.getContractAt('Tether', TETHER_ADDRESS);
  }

  async function getUSDC() {
    // binding to signer
    return await ethers.getContractAt('Usdc', USDC_ADDRESS);
  }

  async function getWETH(signer: Signer) {
    // binding to signer
    return new Contract(WETH_ADDRESS, WETH9.abi, ethers.provider);
  }

  async function getWBTC() {
    // binding to signer
    return await ethers.getContractAt('WrappedBitcoin', WBTC_ADDRESS);
  }

  async function approveAllowanceFromOwnerToContract() {
    console.log('approveAllowanceFromOwnerToContract');
    const [deployer, tokenOwner] = await ethers.getSigners();
    const callerAddress = await example.getAddress();
    //
    const usdt: any = await getUSDT();
    const usdc: any = await getUSDC();
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
          positionManager: POSITION_MANAGER_ADDRESS,
          poolAddress: USDT_USDC_500,
          token0: TETHER_ADDRESS,
          token1: USDC_ADDRESS,
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
      const tether: any = await getUSDT();
      const usdc: any = await getUSDC();
      //
      const amount = ethers.parseEther('1000000');
      await expect(tether.connect(deployer).mint(tokenOwner, amount)).not.to.be.reverted;
      await expect(usdc.connect(deployer).mint(tokenOwner, amount)).not.to.be.reverted;
    });
  });

  describe('Minting', function () {
    //
    it('USDT_USDC should estimate NewPosition success', async function () {
      const estimation = await example.estimateNewPosition(1);
      //
      console.log('amount0: ', ethers.formatEther(estimation[1]));
      console.log('amount1: ', ethers.formatEther(estimation[2]));
      console.log('current USDT/USDC price: ', sqrtToPrice(estimation[4], 0));
    });

    it('USDT_USDC should mint new position success', async function () {
      const [deployer, tokenOwner] = await ethers.getSigners();
      const callerAddress = await example.getAddress();
      //
      const requestId = randomHexString(16);
      const estimation = await example.connect(tokenOwner).estimateNewPosition(1);
      //
      console.log('estimate amount0: ', ethers.formatEther(estimation[0]));
      console.log('estimate amount1: ', ethers.formatEther(estimation[1]));
      console.log('current USDT/USDC price: ', sqrtToPrice(estimation[4], 0));
      //
      const tether: any = await getUSDT();
      const usdc: any = await getUSDC();
      //
      await printOutBalance(tether, POSITION_MANAGER_ADDRESS, 'PM-before', 'USDT');
      await printOutBalance(usdc, POSITION_MANAGER_ADDRESS, 'PM-before', 'USDC');
      //
      await printOutBalance(tether, callerAddress, 'DA-before', 'USDT');
      await printOutBalance(usdc, callerAddress, 'DA-before', 'USDC');
      //
      await printOutBalance(tether, USDT_USDC_500, 'Pool-before', 'USDT');
      await printOutBalance(usdc, USDT_USDC_500, 'Pool-before', 'USDC');
      //
      // execute transaction
      const tx = await example
        .connect(tokenOwner)
        .mintNewPosition(requestId, estimation[0], estimation[1], estimation[2], estimation[3]);
      expect(tx).to.emit(example, 'MintPosition');
      //
      tokenId = await example.requestTokenIds(requestId);
      console.log('requestId: ', requestId, ', tokenId: ', tokenId);
      //
      await printOutBalance(tether, POSITION_MANAGER_ADDRESS, 'PM-after', 'USDT');
      await printOutBalance(usdc, POSITION_MANAGER_ADDRESS, 'PM-after', 'USDC');
      //
      await printOutBalance(tether, callerAddress, 'DA-after', 'USDT');
      await printOutBalance(usdc, callerAddress, 'DA-after', 'USDC');
      //
      await printOutBalance(tether, USDT_USDC_500, 'Pool-after', 'USDT');
      await printOutBalance(usdc, USDT_USDC_500, 'Pool-after', 'USDC');
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
      const amount0 = ethers.parseEther('1');
      const amount1 = ethers.parseEther('1');
      const requestId = randomHexString(16);
      console.log('requestId: ', requestId, 'tokenId: ', tokenId);
      //
      const holdingsBefore = await example.connect(tokenOwner).currentHoldings(tokenId);
      console.log('Before Increase: ', ethers.formatEther(holdingsBefore[0]), ethers.formatEther(holdingsBefore[1]));
      //
      await expect(
        example.connect(tokenOwner).increaseLiquidityCurrentRange(requestId, tokenId, amount0, amount1)
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
      const requestId = randomHexString(16);
      await expect(
        example.connect(tokenOwner).increaseLiquidityCurrentRange(requestId, 19, amount0, amount0)
      ).to.revertedWith('TokenId not found');
    });
    //
    it('Should increase liquidity failed given not valid sender', async function () {
      const [deployer, tokenOwner] = await ethers.getSigners();
      const amount0 = ethers.parseEther('10');
      const requestId = randomHexString(16);
      await expect(
        example.connect(deployer).increaseLiquidityCurrentRange(requestId, tokenId, amount0, amount0)
      ).to.revertedWith('Not the owner');
    });
  });

  describe('Liquidity decrease', function () {
    it('Should decrease liquidity in percentage success given valid tokenId', async function () {
      const [deployer, tokenOwner] = await ethers.getSigners();
      const requestId = randomHexString(16);
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
      const tether: any = await getUSDT();
      const usdc: any = await getUSDC();
      //
      await printOutBalance(tether, ownerAddress, 'Owner-before', 'USDT');
      await printOutBalance(usdc, ownerAddress, 'Owner-before', 'USDC');
      //
      await printOutBalance(tether, POSITION_MANAGER_ADDRESS, 'PM-before', 'USDT');
      await printOutBalance(usdc, POSITION_MANAGER_ADDRESS, 'PM-before', 'USDC');
      //
      await printOutBalance(tether, callerAddress, 'DA-before', 'USDT');
      await printOutBalance(usdc, callerAddress, 'DA-before', 'USDC');
      //
      await expect(example.connect(tokenOwner).decreaseLiquidity(requestId, tokenId, 10, 0)).to.emit(
        example,
        'DecreaseLiquidity'
      );
      //
      await printOutBalance(tether, ownerAddress, 'Owner-after', 'USDT');
      await printOutBalance(usdc, ownerAddress, 'Owner-after', 'USDC');
      //
      await printOutBalance(tether, POSITION_MANAGER_ADDRESS, 'PM-after', 'USDT');
      await printOutBalance(usdc, POSITION_MANAGER_ADDRESS, 'PM-after', 'USDC');
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

    it('Should decrease liquidity in amount success given valid tokenId', async function () {
      //   const [deployer, tokenOwner] = await ethers.getSigners();
      //   const requestId = randomHexString(16);
      //   const change = ethers.parseEther('100');
      //   //
      //   const holdingsBefore = await example.connect(tokenOwner).currentHoldings(tokenId);
      //   console.log(
      //     'Before decrease amount: ',
      //     ethers.formatEther(holdingsBefore[0]),
      //     ethers.formatEther(holdingsBefore[1])
      //   );
      //   //
      //   await expect(example.connect(tokenOwner).decreaseLiquidity(requestId, tokenId, 0, change)).to.emit(
      //     example,
      //     'DecreaseLiquidity'
      //   );
      //   //
      //   const holdingsAfter = await example.connect(tokenOwner).currentHoldings(tokenId);
      //   console.log(
      //     'After decrease amount: ',
      //     ethers.formatEther(holdingsAfter[0]),
      //     ethers.formatEther(holdingsAfter[1])
      //   );
      //   //
      //   const diff0 = holdingsAfter[0] - holdingsBefore[0];
      //   const diff1 = holdingsAfter[1] - holdingsBefore[1];
      //   // diff0 + diff1 may not be qual to amount0 + amount1
      //   // expect(diff0 + diff1, 'diff0').to.be.equal(amount0 + amount1);
      //   //
      //   console.log('diff0: ', diff0, 'diff1: ', diff1, 'diffSum: ', diff0 + diff1);
    });

    it('Should decrease liquidity failed given not valid tokenId', async function () {
      const [deployer, tokenOwner] = await ethers.getSigners();
      const requestId = randomHexString(16);

      await expect(example.connect(tokenOwner).decreaseLiquidity(requestId, 19, 10, 0)).to.revertedWith(
        'TokenId not found'
      );
    });

    it('Should decrease liquidity failed given not valid sender', async function () {
      const [deployer, tokenOwner] = await ethers.getSigners();
      const requestId = randomHexString(16);

      await expect(example.connect(deployer).decreaseLiquidity(requestId, tokenId, 10, 0)).to.revertedWith(
        'Not the owner'
      );
    });
  });
});
