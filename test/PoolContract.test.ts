import * as dotenv from 'dotenv';
dotenv.config({ path: '.address.env' });

import * as CS from './ContractShared.test';

import BigNumber from 'bignumber.js';
import { expect } from 'chai';

describe('PoolContract', function () {
  describe('USDT_USDC_500', function () {
    let poolContract: any;
    let decimalsUSDT: number;
    let decimalsUSDC: number;

    before(async function () {
      poolContract = await CS.getPoolContract(CS.USDT_USDC_500, 'USDT_USDC_500');
      decimalsUSDT = 18; //token0
      decimalsUSDC = 18; //token1
    });

    it('Should get pool data success', async function () {
      let poolData = await CS.getPoolData(poolContract);
      expect(poolData.fee).to.be.above(0);
      expect(poolData.token0).to.be.equal(CS.TETHER_ADDRESS);
      expect(poolData.token1).to.be.equal(CS.USDC_ADDRESS);
    });

    it('Current Tick to price', async function () {
      let poolData = await CS.getPoolData(poolContract);
      const tick = Number(poolData.tick);
      let price0 = 1.0001 ** tick / 10 ** (decimalsUSDC - decimalsUSDT);
      let price1 = 1 / price0;
      console.log('price token0: ', price0);
      console.log('price token1: ', price1);
      expect(price0).to.be.above(0);
      expect(price1).to.be.above(0);
    });

    it('sqrtPriceX96 to price', async function () {
      let poolData = await CS.getPoolData(poolContract);
      let sqrtPriceX96 = poolData.sqrtPriceX96;
      //
      const priceToken0 = CS.sqrtToPrice(sqrtPriceX96, decimalsUSDC - decimalsUSDT);
      const priceToken1 = 1 / Number(priceToken0);
      //
      console.log('price token0: ', priceToken0);
      console.log('price token1: ', priceToken1);
      //
      const buyOneOfToken0Wei = Math.floor(Number(priceToken0) * 10 ** decimalsUSDC).toLocaleString('fullwide', {
        useGrouping: false,
      });
      const buyOneOfToken1Wei = Math.floor(priceToken1 * 10 ** decimalsUSDC).toLocaleString('fullwide', {
        useGrouping: false,
      });
      console.log(buyOneOfToken0Wei);
      console.log(buyOneOfToken1Wei);
    });

    it('sqrtPriceX96 to tick', async function () {
      let poolData = await CS.getPoolData(poolContract);
      let sqrtPriceX96 = BigNumber(poolData.sqrtPriceX96);
      const q96 = 2 ** 96;
      const value = sqrtPriceX96.dividedBy(q96).pow(2);
      let tick = Math.floor(Math.log(value.toNumber()) / Math.log(1.0001));
      console.log('calculation: ', tick);
      console.log('expect:', poolData.tick);
    });
  });
});
