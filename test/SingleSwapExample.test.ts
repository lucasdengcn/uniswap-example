import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

const TETHER_ADDRESS = process.env.TETHER_ADDRESS || '';
const USDC_ADDRESS = process.env.USDC_ADDRESS || '';
const WBTC_ADDRESS = process.env.WBTC_ADDRESS || '';
const WETH_ADDRESS = process.env.WETH_ADDRESS || '';
const SWAP_ROUTER_ADDRESS = process.env.SWAP_ROUTER_ADDRESS || '';
const USDT_USDC_500 = process.env.USDT_USDC_500 || '';
const USDT_WBTC_500 = process.env.USDT_WBTC_500 || '';
const USDC_WBTC_500 = process.env.USDC_WBTC_500 || '';

//
import { Contract, ContractTransactionReceipt, ContractTransactionResponse, Signer } from 'ethers';
import { ethers, ignition } from 'hardhat';
import { expect } from 'chai';

import SingleSwapExampleModule from '../ignition/modules/SingleSwapExampleModule';
import WETH9 from '../scripts/uniswap/WETH9.json';
import UniswapV3Pool from '@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json';

function sqrtToPrice(sqrtPriceX96: any) {
  const numerator = sqrtPriceX96 ** 2;
  const denominator = 2 ** 192;
  let ratio = numerator / denominator;
  const decimalShift = Math.pow(10, 12);
  ratio = decimalShift / ratio;
  return ratio;
}

describe('SingleSwapExampleModule', function () {
  let deployer: Signer;
  let tokenOwner: Signer;
  let example: any;
  let usdt: any, usdc: any, weth: any, wbtc: any;
  let totalUSDT: bigint, totalUSDC: bigint, totalWETH: bigint, totalWBTC: bigint;

  async function getUSDT(signer: Signer) {
    // binding to signer
    return await ethers.getContractAt('Tether', TETHER_ADDRESS, signer);
  }

  async function getUSDC(signer: Signer) {
    // binding to signer
    return await ethers.getContractAt('Usdc', USDC_ADDRESS, signer);
  }

  async function getWETH(signer: Signer) {
    // binding to signer
    return new Contract(WETH_ADDRESS, WETH9.abi, ethers.provider);
  }

  async function getWBTC(signer: Signer) {
    // binding to signer
    return await ethers.getContractAt('WrappedBitcoin', WBTC_ADDRESS, signer);
  }

  async function getPoolContract(poolAddress: string, name: string) {
    const poolContract = new ethers.Contract(poolAddress, UniswapV3Pool.abi, ethers.provider);
    poolContract.on('Swap', (sender, recipient, amount0, amount1, sqrtPriceX96) => {
      const ratio = sqrtToPrice(String(sqrtPriceX96));
      console.log(
        'Uni V3',
        '|',
        'pair:',
        name,
        '|',
        'sender:',
        sender,
        '|',
        'amount0:',
        amount0,
        '|',
        'amount1:',
        amount1,
        '|',
        'sqrtPriceX96:',
        sqrtPriceX96,
        '|',
        'ratio:',
        1 / ratio
      );
    });
    return poolContract;
  }

  async function getPoolData(poolContract: any) {
    const [token0, token1, fee] = await Promise.all([poolContract.token0(), poolContract.token1(), poolContract.fee()]);
    return {
      token0: token0,
      token1: token1,
      fee: fee,
    };
  }
  before(async function () {
    // listene contract events
    await getPoolContract(USDT_USDC_500, 'USDT_USDC_500');
    await getPoolContract(USDT_WBTC_500, 'USDT_WBTC_500');
    await getPoolContract(USDC_WBTC_500, 'USDC_WBTC_500');
    //
    [deployer, tokenOwner] = await ethers.getSigners();
    const { contract } = await ignition.deploy(SingleSwapExampleModule, {
      parameters: {
        SingleSwapExampleModule: {
          routerAddress: SWAP_ROUTER_ADDRESS,
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
    usdt = await getUSDT(deployer);
    usdc = await getUSDC(deployer);
    weth = await getWETH(deployer);
    wbtc = await getWBTC(deployer);
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
      const tether: any = await getUSDT(tokenOwner);
      // approve allowance (owner->contract)
      await expect(tether.approve(callerAddress, amountIn))
        .to.be.emit(tether, 'Approval')
        .withArgs(ownerAddress, callerAddress, amountIn);
      // tx (usdt->contract->weth)
      const tx = await example.connect(tokenOwner).swapExactInputSingle(TETHER_ADDRESS, USDC_ADDRESS, amountIn);
      expect(tx).not.be.reverted;
      expect(tx).to.be.emit(example, 'SwapResult');
      //
      expect(await usdt.balanceOf(ownerAddress), 'USDT balance').to.be.equal(totalUSDT - amountIn);
      expect(await usdc.balanceOf(ownerAddress), 'USDC balance')
        .to.be.below(totalUSDC + amountIn)
        .above(totalUSDC);
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
      const tether: any = await getUSDT(tokenOwner);
      const usdcOwner: any = await getUSDC(tokenOwner);
      // approve allowance (owner->contract)
      await expect(usdcOwner.approve(callerAddress, amountIn))
        .to.be.emit(usdcOwner, 'Approval')
        .withArgs(ownerAddress, callerAddress, amountIn);
      // tx (usdt->contract->weth)
      const tx = await example.connect(tokenOwner).swapExactInputSingle(USDC_ADDRESS, TETHER_ADDRESS, amountIn);
      expect(tx).not.be.reverted;
      expect(tx).to.be.emit(example, 'SwapResult');
      //
      expect(await usdc.balanceOf(ownerAddress), 'USDC balance').to.be.equal(totalUSDC - amountIn);
      expect(await usdt.balanceOf(ownerAddress), 'USDT balance').to.be.below(totalUSDT + amountIn);
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
      const tether: any = await getUSDT(tokenOwner);
      const wethOwner: any = await getWETH(tokenOwner);
      // approve allowance (owner->contract)
      await expect(tether.approve(callerAddress, amountIn))
        .to.be.emit(tether, 'Approval')
        .withArgs(ownerAddress, callerAddress, amountIn);
      // tx (usdt->contract->weth)
      await expect(example.connect(tokenOwner).swapExactInputSingle(TETHER_ADDRESS, WETH_ADDRESS, amountIn)).to.be
        .reverted;
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
      const tether: any = await getUSDT(tokenOwner);
      // approve allowance (owner->contract)
      await expect(tether.approve(callerAddress, amountInMax), 'USDT approve')
        .to.be.emit(tether, 'Approval')
        .withArgs(ownerAddress, callerAddress, amountInMax);
      // tx (usdt->contract->wbtc)
      const tx: ContractTransactionResponse = await example
        .connect(tokenOwner)
        .swapExactOutputSingle(TETHER_ADDRESS, WBTC_ADDRESS, amountOut, amountInMax);
      expect(tx, 'swapExactOutputSingle').not.be.reverted;
      expect(tx).to.be.emit(example, 'SwapResult');

      // const receipt = await tx.wait();
      // await expect(tx, "swap").emit(poolContract, "Swap");
      //
      expect(await usdt.balanceOf(ownerAddress), 'USDT balance')
        .to.be.below(totalUSDT - amountOut)
        .above(totalUSDT - amountInMax);
      expect(await wbtc.balanceOf(ownerAddress), 'WBTC balance').to.be.equal(totalWBTC + amountOut);
    });
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
      const tether: any = await getUSDT(tokenOwner);
      // approve allowance (owner->contract)
      await expect(tether.approve(callerAddress, amountIn))
        .to.be.emit(tether, 'Approval')
        .withArgs(ownerAddress, callerAddress, amountIn);
      // tx (usdt->contract->usdc->wbtc)
      const tx = await example
        .connect(tokenOwner)
        .swapExactInputMultihop(TETHER_ADDRESS, USDC_ADDRESS, WBTC_ADDRESS, amountIn);
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
      const tether: any = await getUSDT(tokenOwner);
      // approve allowance (owner->contract)
      await expect(tether.approve(callerAddress, amountInMaximum))
        .to.be.emit(tether, 'Approval')
        .withArgs(ownerAddress, callerAddress, amountInMaximum);
      // tx (usdt->contract->usdc->wbtc)
      const tx = await example
        .connect(tokenOwner)
        .swapExactOutputMultihop(TETHER_ADDRESS, USDC_ADDRESS, WBTC_ADDRESS, amountOut, amountInMaximum);
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
