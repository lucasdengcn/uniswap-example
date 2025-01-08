import * as dotenv from "dotenv";
dotenv.config({ path: '.address.env' });

const TETHER_ADDRESS = process.env.TETHER_ADDRESS || '';
const USDC_ADDRESS = process.env.USDC_ADDRESS || '';
const WBTC_ADDRESS = process.env.WBTC_ADDRESS || '';
const WETH_ADDRESS = process.env.WETH_ADDRESS || '';
const SWAP_ROUTER_ADDRESS = process.env.SWAP_ROUTER_ADDRESS || '';
const USDT_USDC_500 = process.env.USDT_USDC_500 || '';

type ContractJson = { abi: any; bytecode: string };
const artifacts: { [name: string]: ContractJson } = {
    TETHER: require("../artifacts/contracts/tokens/Tether.sol/Tether.json"),
    USDC: require("../artifacts/contracts/tokens/Usdc.sol/Usdc.json"),
    WBTC: require("../artifacts/contracts/tokens/WrappedBitcoin.sol/WrappedBitcoin.json"),
    UniswapV3Pool: require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json"),
    SwapRouter: require("@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json"),
}

import { ethers } from "hardhat";
import { expect } from 'chai';
import { Contract } from "ethers";

describe("WithdrawFees", function () {
    it("Should withdraw fees success", async function () {
        const [owner] = await ethers.getSigners();
        const ownerAddress = await owner.getAddress();
        //
        // get contract
        const usdtContract: any = new Contract(TETHER_ADDRESS, artifacts.TETHER.abi, ethers.provider);
        const usdcContract: any = new Contract(USDC_ADDRESS, artifacts.USDC.abi, ethers.provider);
        // verify balance
        const usdtBalance0 = await usdtContract.balanceOf(ownerAddress);
        const usdcBalance0 = await usdcContract.balanceOf(ownerAddress);
        console.log('usdt balance: ', usdtBalance0);
        console.log('usdc balance: ', usdcBalance0);
        //
        const poolContract: any = new Contract(USDT_USDC_500, artifacts.UniswapV3Pool.abi, ethers.provider);
        const amount = ethers.parseEther("100000");
        //
        const tx = await poolContract.connect(owner).collectProtocol(ownerAddress, amount, amount);
        await tx.wait();
        expect(tx).to.be.emit(poolContract, "CollectProtocol");
        //
        // console.log(tx);
        //
        const usdtBalance1 = await usdtContract.balanceOf(ownerAddress);
        const usdcBalance1 = await usdcContract.balanceOf(ownerAddress);
        console.log('usdt balance: ', usdtBalance1);
        console.log('usdc balance: ', usdcBalance1);
    });
});