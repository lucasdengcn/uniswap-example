import * as dotenv from "dotenv";
dotenv.config();

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

async function getPoolData(poolContract: any) {
    const [token0, token1, fee] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
    ])
    return {
        token0: token0,
        token1: token1,
        fee: fee,
    }
}

describe("SwapToken01", function () {
    //
    it("Should swap USDT/USDC success", async function () {
        const [_owner, _signer] = await ethers.getSigners();
        const signerAddress = await _signer.getAddress();
        // get contract
        const usdtContract: any = new Contract(TETHER_ADDRESS, artifacts.TETHER.abi, ethers.provider);
        const usdcContract: any = new Contract(USDC_ADDRESS, artifacts.USDC.abi, ethers.provider);
        // verify balance
        const usdtBalance0 = await usdtContract.balanceOf(signerAddress);
        const usdcBalance0 = await usdcContract.balanceOf(signerAddress);
        console.log('usdt balance before: ', ethers.formatEther(usdtBalance0));
        console.log('usdc balance before: ', ethers.formatEther(usdcBalance0));
        // get swap pool
        const poolContract = new ethers.Contract(USDT_USDC_500, artifacts.UniswapV3Pool.abi, ethers.provider);
        let poolData = await getPoolData(poolContract);
        // get swap router
        const swapRouterContract: any = new Contract(SWAP_ROUTER_ADDRESS, artifacts.SwapRouter.abi, ethers.provider);
        // prepare swap parameters
        const amountIn = ethers.parseEther('10');
        const params = {
            tokenIn: poolData.token0,
            tokenOut: poolData.token1,
            fee: poolData.fee,
            recipient: signerAddress,
            deadline: Math.floor(Date.now() / 1000) + (60 * 10),
            amountIn: amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        };
        // approve swap router to spend on USDT, USDC
        await usdtContract.connect(_signer).approve(SWAP_ROUTER_ADDRESS, amountIn);
        await usdcContract.connect(_signer).approve(SWAP_ROUTER_ADDRESS, amountIn);
        // execute swap
        const tx = await swapRouterContract.connect(_signer).exactInputSingle(
            params,
            { gasLimit: 1000000 }
        );
        await tx.wait();
        //
        expect(tx).to.be.emit(poolContract, "Swap");
        //
        const usdtBalance1 = await usdtContract.balanceOf(signerAddress);
        const usdcBalance1 = await usdcContract.balanceOf(signerAddress);
        console.log('usdt balance after: ', ethers.formatEther(usdtBalance1));
        console.log('usdc balance after: ', ethers.formatEther(usdcBalance1));
    });
});