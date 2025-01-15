import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import * as CS from './ContractShared.test';

import { expect } from 'chai';
import { Signer } from 'ethers';
import { ethers, ignition } from 'hardhat';

import EstimationExampleModule from '../ignition/modules/EstimationExampleModule';
import SingleSwapExampleModule from '../ignition/modules/SingleSwapExampleModule';

describe('SingleSwapOutExampleModule', function () {
  let deployer: Signer;
  let tokenOwner: Signer;
  let example: any;
  let twapExample: any;
  let usdt: any, usdc: any, weth: any, wbtc: any;
  let totalUSDT: bigint, totalUSDC: bigint, totalWETH: bigint, totalWBTC: bigint;

  async function deploySwapContract() {
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
  }

  async function deployTwapContract() {
    const { contract } = await ignition.deploy(EstimationExampleModule, {
      parameters: {
        EstimationExampleModule: {
          factoryAddress: CS.FACTORY_ADDRESS,
          weth9Address: CS.WETH_ADDRESS,
        },
      },
    });
    await contract.waitForDeployment();
    twapExample = contract;
  }

  before(async function () {
    // listene contract events
    CS.getPoolContract(CS.USDT_USDC_500, 'USDT_USDC_500');
    CS.getPoolContract(CS.USDT_WBTC_500, 'USDT_WBTC_500');
    CS.getPoolContract(CS.USDC_WBTC_500, 'USDC_WBTC_500');
    //
    [deployer, tokenOwner] = await ethers.getSigners();
    await deploySwapContract();
    await deployTwapContract();
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
    const tx = await example
      .connect(tokenOwner)
      .swapExactOutputSingle(CS.TETHER_ADDRESS, CS.WBTC_ADDRESS, amountOut, amountInMax, 3000);
    expect(tx, 'swapExactOutputSingle').not.be.reverted;
    expect(tx).to.be.emit(example, 'SwapResult');
  });
});
