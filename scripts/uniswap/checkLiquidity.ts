import * as dotenv from "dotenv";
dotenv.config();

import { Contract } from "ethers";
import { ethers } from "hardhat";
import { Token } from "@uniswap/sdk-core";
import { Pool, Position, nearestUsableTick } from "@uniswap/v3-sdk";

const TETHER_ADDRESS = process.env.TETHER_ADDRESS || '';
const USDC_ADDRESS = process.env.USDC_ADDRESS || '';
const WBTC_ADDRESS = process.env.WBTC_ADDRESS || '';
const WETH_ADDRESS = process.env.WETH_ADDRESS || '';
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || '';
const SWAP_ROUTER_ADDRESS = process.env.SWAP_ROUTER_ADDRESS;
const NFT_DESCRIPTOR_ADDRESS = process.env.NFT_DESCRIPTOR_ADDRESS;
const POSITION_DESCRIPTOR_ADDRESS = process.env.POSITION_DESCRIPTOR_ADDRESS;
const POSITION_MANAGER_ADDRESS = process.env.POSITION_MANAGER_ADDRESS || '';
const USDT_USDC_500 = process.env.USDT_USDC_500 || '';

const artifacts = {
    NonfungiblePositionManager: require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json"),
    Usdt: require("../../artifacts/contracts/tokens/Tether.sol/Tether.json"),
    Usdc: require("../../artifacts/contracts/tokens/Usdc.sol/Usdc.json"),
    UniswapV3Pool: require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json"),
};

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
        sqrtPriceX96: slot0[0],
        tick: parseInt(slot0[1]),
        token0: token0,
        token1: token1,
        maxLiquidityPerTick: maxLiquidityPerTick
    }
}

async function main() {
    const [owner, signer] = await ethers.getSigners();
    const provider = ethers.provider;
    //
    const poolContract = new Contract(USDT_USDC_500, artifacts.UniswapV3Pool.abi, provider);
    const poolData = await getPoolData(poolContract);
    //
    console.log('pool data: ', poolData);
}

/**
 * npx hardhat run --network localhost scripts/uniswap/checkLiquidity.ts
 */

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });