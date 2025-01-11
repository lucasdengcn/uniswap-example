import { ethers } from 'hardhat';
import { Contract, ContractFactory } from 'ethers';
import { expect } from 'chai';
import { BigNumber } from 'bignumber.js';

import { MathUtils } from '../typechain-types';

describe('MathExample', function () {
  let mathExample: MathUtils;
  const sqrtPriceX96 = '2018382873588440326581633304624437';
  const decimals0 = 6;
  const decimals1 = 18;
  let price0: bigint;
  //
  before('deploy Contract', async () => {
    const factory = await ethers.getContractFactory('MathUtils');
    mathExample = (await factory.deploy()) as MathUtils;
  });
  //
  it('Should calculate sqrtPriceX96 to price0 correctly', async () => {
    //
    price0 = await mathExample.sqrtPriceX96ToPrice0(sqrtPriceX96, decimals0, decimals1);
    //
    console.log('price0: ', price0);
  });
  it('ETH/USDC Pool: Should find amount of assets from a range', async () => {
    const x = 2;
    const P = 2000;
    const Pa = 1500;
    const Pb = 2500;
    //
    const Lx = (x * (Math.sqrt(P) * Math.sqrt(Pb))) / (Math.sqrt(Pb) - Math.sqrt(P));
    const y = Lx * (Math.sqrt(P) - Math.sqrt(Pa));
    console.log('y need: ', y);
  });
  it('ETH/USDC Pool: Should find range from amounts of assets given amounts and price0', async () => {
    const x = 2;
    const y = 4000;
    const Pb = 3000; // USDC/ETH
    const P = 2000; // current Price
    //
    const ratio = y / x;
    const v1 = ratio / Math.sqrt(Pb);
    const v2 = ratio / Math.sqrt(P);
    //
    const v3 = v1 + Math.sqrt(P) - v2;
    const Pa = Math.pow(v3, 2);
    console.log('Pa (lower bound)', Pa);
  });
  it('ETH/USDC Pool: Assets after a price change', async () => {
    const x = 2;
    const y = 4000;
    const Pb = 3000; // USDC/ETH
    const Pa = 1333.33;
    const P0 = 2000;
    const P1 = 2500;
    //
    const Lx = (x * (Math.sqrt(P0) * Math.sqrt(Pb))) / (Math.sqrt(Pb) - Math.sqrt(P0));
    const Ly = y / (Math.sqrt(P0) - Math.sqrt(Pa));
    const L = Math.min(Lx, Ly);
    console.log('L: ', L);
    //
    const x1 = (L * (Math.sqrt(Pb) - Math.sqrt(P1))) / (Math.sqrt(P1) * Math.sqrt(Pb));
    const y1 = L * (Math.sqrt(P1) - Math.sqrt(Pa));
    console.log('x1: ', x1, 'y1: ', y1); // Impermanent loss
    //
  });
  it('USDC/ETH Pool: amount of assets in the current tick range', async () => {
    BigNumber.config({ DECIMAL_PLACES: 5 });
    //
    const L = BigNumber('22402462192838616433');
    const tick = 195574;
    const fee = '0.3';
    const tickSpacing = 60;
    // step1: calculate current tick price
    const P = Math.pow(1.0001, tick); // USDC/ETH
    // step2: calculate tick range
    const vv = Math.floor(tick / tickSpacing);
    const tickBottom = vv * tickSpacing;
    const tickTop = (vv + 1) * tickSpacing;
    console.log('tick range is : (bottom: ', tickBottom, 'top: ', tickTop, ')');
    // step3: calculate price range
    const Pa = Math.pow(1.0001, tickBottom);
    const Pb = Math.pow(1.0001, tickTop);
    console.log('price range is: (lower: ', Pa, 'upper: ', Pb, ')');
    // step4: calculate amount of USDC, ETH given liquidity
    const ratio = (Math.sqrt(Pb) - Math.sqrt(P)) / (Math.sqrt(P) * Math.sqrt(Pb));
    console.log('ratio: ', ratio);
    const xUsdc: BigNumber = L.multipliedBy(ratio);
    const yETH: BigNumber = L.multipliedBy(Math.sqrt(P) - Math.sqrt(Pa));
    console.log('amount of assets in range, (USDC: ', xUsdc.toString(), ' ETH: ', yETH.toString());
    // step5: adjust amount on decimial places
    const xUsdcAdj = xUsdc.dividedBy(Math.pow(10, 6));
    const yETHAdj = yETH.dividedBy(Math.pow(10, 18));
    //
    console.log('amount of assets adjusted in range, (USDC: ', xUsdcAdj.toString(), ' ETH: ', yETHAdj.toString());
  });
});
