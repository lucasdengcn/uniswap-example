import * as dotenv from "dotenv";
dotenv.config();

import { ContractFactory, Contract } from "ethers";
import { ethers, ignition } from "hardhat";
import * as fs from 'node:fs/promises';
import BigNumber from "bignumber.js";

const TETHER_ADDRESS = process.env.TETHER_ADDRESS || '';
const USDC_ADDRESS = process.env.USDC_ADDRESS || '';
const WBTC_ADDRESS = process.env.WBTC_ADDRESS || '';
const WETH_ADDRESS = process.env.WETH_ADDRESS || '';
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || '';
const SWAP_ROUTER_ADDRESS = process.env.SWAP_ROUTER_ADDRESS;
const NFT_DESCRIPTOR_ADDRESS = process.env.NFT_DESCRIPTOR_ADDRESS;
const POSITION_DESCRIPTOR_ADDRESS = process.env.POSITION_DESCRIPTOR_ADDRESS;
const POSITION_MANAGER_ADDRESS = process.env.POSITION_MANAGER_ADDRESS || '';

const artifacts = {
    UniswapV3Factory: require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json"),
    NonfungiblePositionManager: require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json"),
    UniswapV3Pool: require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json"),
};

BigNumber.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });

//
const provider = ethers.provider;
//
const nonfungiblePositionManager: any = new Contract(
    POSITION_MANAGER_ADDRESS,
    artifacts.NonfungiblePositionManager.abi,
    provider
);

const factory: any = new Contract(
    FACTORY_ADDRESS,
    artifacts.UniswapV3Factory.abi,
    provider
);

function encodePriceSqrt(reserve1: Number, reserve0: Number) {
    //
    return BigNumber(reserve1.toString()).div(reserve0.toString())
        .sqrt().multipliedBy(BigNumber(2).pow(96))
        .integerValue(3)
        .toString();
}

async function deployPool(token0: string, token1: string, fee: Number, price: string) {
    const [owner] = await ethers.getSigners();

    // https://docs.uniswap.org/contracts/v3/reference/periphery/base/PoolInitializer#createandinitializepoolifnecessary
    const tx = await nonfungiblePositionManager.connect(owner).createAndInitializePoolIfNecessary(
        token0,
        token1,
        fee,
        price,
        { gasLimit: 5000000 }
    );
    // console.log(tx);
    //
    const poolAddress = await factory.connect(owner).getPool(
        token0,
        token1,
        fee,
    );
    return poolAddress;
}

async function setFeeProtocol(poolAddress: any) {
    const [owner] = await ethers.getSigners();
    const poolContract: any = new Contract(poolAddress, artifacts.UniswapV3Pool.abi, provider)

    const feeProtocol0 = 4
    const feeProtocol1 = 4
    await poolContract.connect(owner).setFeeProtocol(feeProtocol0, feeProtocol1)
}

async function main() {
    const fee = 10000;
    // USDT/USDC
    const usdtUsdc500 = await deployPool(TETHER_ADDRESS, USDC_ADDRESS, fee, encodePriceSqrt(1, 1));
    await setFeeProtocol(usdtUsdc500);
    console.log("Create pool successfully. usdtUsdc500");
    // USDT/WBTC
    const usdtWBTC500 = await deployPool(TETHER_ADDRESS, WBTC_ADDRESS, fee, encodePriceSqrt(1, 1));
    await setFeeProtocol(usdtWBTC500);
    console.log("Create pool successfully. usdtWBTC500");
    // USDT/WETH
    const usdtWETH500 = await deployPool(TETHER_ADDRESS, WETH_ADDRESS, fee, encodePriceSqrt(1, 1));
    await setFeeProtocol(usdtWETH500);
    console.log("Create pool successfully. usdtWETH500");
    // USDC/WBTC
    const usdcWBTC500 = await deployPool(USDC_ADDRESS, WBTC_ADDRESS, fee, encodePriceSqrt(1, 1));
    await setFeeProtocol(usdcWBTC500);
    console.log("Create pool successfully. usdcWBTC500");
    // USDC/WETH
    const usdcWETH500 = await deployPool(USDC_ADDRESS, WETH_ADDRESS, fee, encodePriceSqrt(1, 1));
    await setFeeProtocol(usdcWETH500);
    console.log("Create pool successfully. usdcWETH500");
    //
    //
    let addresses = [
        '',
        `USDT_USDC_500=${usdtUsdc500}`,
        `USDT_WBTC_500=${usdtWBTC500}`,
        `USDT_WETH_500=${usdtWETH500}`,
        `USDC_WBTC_500=${usdcWBTC500}`,
        `USDC_WETH_500=${usdcWETH500}`
    ];
    //
    const data = addresses.join("\n");
    console.log(addresses);

    return fs.appendFile(".env", data);
}

/**
 * npx hardhat run --network localhost scripts/uniswap/deployPools.ts
 */

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });