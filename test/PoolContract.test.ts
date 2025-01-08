import * as dotenv from "dotenv";
dotenv.config({ path: '.address.env' });

const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || '';
const TETHER_ADDRESS = process.env.TETHER_ADDRESS || '';
const USDC_ADDRESS = process.env.USDC_ADDRESS || '';
const WBTC_ADDRESS = process.env.WBTC_ADDRESS || '';
const WETH_ADDRESS = process.env.WETH_ADDRESS || '';
const SWAP_ROUTER_ADDRESS = process.env.SWAP_ROUTER_ADDRESS || '';
const USDT_USDC_500 = process.env.USDT_USDC_500 || '';
const USDT_WBTC_500 = process.env.USDT_WBTC_500 || '';
const POSITION_MANAGER_ADDRESS = process.env.POSITION_MANAGER_ADDRESS || '';


type ContractJson = { abi: any; bytecode: string };
const artifacts: { [name: string]: ContractJson } = {
    TETHER: require("../artifacts/contracts/tokens/Tether.sol/Tether.json"),
    USDC: require("../artifacts/contracts/tokens/Usdc.sol/Usdc.json"),
    WBTC: require("../artifacts/contracts/tokens/WrappedBitcoin.sol/WrappedBitcoin.json"),
    UniswapV3Pool: require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json"),
    SwapRouter: require("@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json"),
    UniswapV3Factory: require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json"),
    NonfungiblePositionManager: require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json"),
}

import { ethers } from "hardhat";
import { expect } from 'chai';
import { Contract, BigNumberish } from "ethers";
import { TickMath } from "@uniswap/v3-sdk";
import BigNumber from "bignumber.js";
import JSBI from 'jsbi'

/**
 * 
 * @param sqrtPriceX96 
 * @param decimals 
 * @returns 
 */
function sqrtToPrice(sqrtPriceX96: any, decimals: number = 0) {
    const numerator = sqrtPriceX96 ** 2
    const denominator = 2 ** 192
    let ratio = numerator / denominator
    //
    const decimalShift = Math.pow(10, decimals)
    ratio = decimalShift / ratio;
    //
    return ratio
}

describe("PoolContract", function () {

    async function getContract(address: string) {
        return new ethers.Contract(address, artifacts.UniswapV3Pool.abi, ethers.provider);
    }

    async function getPositionManager() {
        return new ethers.Contract(POSITION_MANAGER_ADDRESS, artifacts.NonfungiblePositionManager.abi, ethers.provider);
    }

    async function getPool(token0: string, token1: string, fee: number) {
        var FactoryContract = new ethers.Contract(FACTORY_ADDRESS, artifacts.UniswapV3Factory.abi, ethers.provider);
        var V3pool = await FactoryContract.getPool(token0, token1, fee);
        return new ethers.Contract(V3pool, artifacts.UniswapV3Pool.abi, ethers.provider);
    }

    async function getPoolData(poolContract: any) {
        const [tickSpacing, fee, liquidity, slot0, token0, token1, maxLiquidityPerTick] = await Promise.all([
            poolContract.tickSpacing(),
            poolContract.fee(),
            poolContract.liquidity(),
            poolContract.slot0(),
            poolContract.token0(),
            poolContract.token1(),
            poolContract.maxLiquidityPerTick(),
        ])

        return {
            tickSpacing: parseInt(tickSpacing),
            fee: parseInt(fee),
            liquidity: liquidity,
            sqrtPriceX96: Number(slot0[0]),
            tick: parseInt(slot0[1]),
            token0: token0,
            token1: token1,
            maxLiquidityPerTick: maxLiquidityPerTick,
            locked: slot0[6],
            feeProtocol: slot0[5],
        }
    }

    describe("USDT_USDC_500", function () {
        let poolContract: any;
        let decimalsUSDT: number;
        let decimalsUSDC: number;

        before(async function () {
            poolContract = await getContract(USDT_USDC_500);
            decimalsUSDT = 18; //token0
            decimalsUSDC = 18; //token1
        });

        it("Should get pool data success", async function () {
            let poolData = await getPoolData(poolContract);
            expect(poolData.fee).to.be.above(0);
            expect(poolData.token0).to.be.equal(TETHER_ADDRESS);
            expect(poolData.token1).to.be.equal(USDC_ADDRESS);
        });

        it("Current Tick to price", async function () {
            let poolData = await getPoolData(poolContract);
            const tick = poolData.tick;
            let price0 = (1.0001 ** tick) / (10 ** (decimalsUSDC - decimalsUSDT));
            let price1 = 1 / price0;
            console.log("price token0: ", price0)
            console.log("price token1: ", price1);
            expect(price0).to.be.above(0);
            expect(price1).to.be.above(0);
        });

        it("sqrtPriceX96 to price", async function () {
            let poolData = await getPoolData(poolContract);
            let sqrtPriceX96 = poolData.sqrtPriceX96;
            //
            const numerator = (sqrtPriceX96 / 2 ** 96) ** 2;
            const denominator = 10 ** decimalsUSDC / 10 ** decimalsUSDT;
            const priceToken0 = (numerator) / (denominator);
            const priceToken1 = (1 / priceToken0);
            //
            console.log("price token0: ", priceToken0);
            console.log("price token1: ", priceToken1);
            //
            const buyOneOfToken0Wei = (Math.floor(priceToken0 * (10 ** decimalsUSDC))).toLocaleString('fullwide', { useGrouping: false });
            const buyOneOfToken1Wei = (Math.floor(priceToken1 * (10 ** decimalsUSDC))).toLocaleString('fullwide', { useGrouping: false });
            console.log(buyOneOfToken0Wei);
            console.log(buyOneOfToken1Wei);
        });

        it("sqrtPriceX96 to tick", async function () {
            let poolData = await getPoolData(poolContract);
            let sqrtPriceX96 = poolData.sqrtPriceX96;
            const q96 = 2 ** 96;
            const value = (sqrtPriceX96 / q96) ** 2;
            let tick = Math.floor(Math.log(value) / Math.log(1.0001));
            console.log("calculation: ", tick);
            console.log("expect:", poolData.tick);
        });

    });

    describe("PositionManager", function () {

    });

});