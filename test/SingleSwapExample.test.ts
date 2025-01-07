import * as dotenv from "dotenv";
dotenv.config();

const TETHER_ADDRESS = process.env.TETHER_ADDRESS || '';
const USDC_ADDRESS = process.env.USDC_ADDRESS || '';
const WBTC_ADDRESS = process.env.WBTC_ADDRESS || '';
const WETH_ADDRESS = process.env.WETH_ADDRESS || '';
const SWAP_ROUTER_ADDRESS = process.env.SWAP_ROUTER_ADDRESS || '';

//
import { Contract, Signer } from "ethers";
import { ethers, ignition } from "hardhat";
import { expect } from "chai";

import SingleSwapExampleModule from "../ignition/modules/SingleSwapExampleModule";
import WETH9 from "../scripts/uniswap/WETH9.json";

describe("SingleSwapExampleModule", function () {
    let deployer: Signer;
    let tokenOwner: Signer;
    let example: any;
    let usdt: any;
    let usdc: any;
    let weth: any;
    let totalUSDT: bigint;
    let totalUSDC: bigint;
    let totalWETH: bigint;

    async function getUSDT(signer: Signer) {
        // binding to signer
        return await ethers.getContractAt("Tether", TETHER_ADDRESS, signer);
    }

    async function getUSDC(signer: Signer) {
        // binding to signer
        return await ethers.getContractAt("Usdc", USDC_ADDRESS, signer);
    }

    async function getWETH(signer: Signer) {
        // binding to signer
        return new Contract(WETH_ADDRESS, WETH9.abi, ethers.provider);
    }

    it("Should deploy success", async function () {
        [deployer, tokenOwner] = await ethers.getSigners();
        const { contract } = await ignition.deploy(SingleSwapExampleModule, {
            parameters: {
                "SingleSwapExampleModule": {
                    "routerAddress": SWAP_ROUTER_ADDRESS
                }
            }
        });
        expect(await contract.getAddress()).to.be.properAddress;
        example = contract;
        //
        usdt = await getUSDT(deployer);
        usdc = await getUSDC(deployer);
        weth = await getWETH(deployer);
        //
        expect(await usdt.balanceOf(tokenOwner), "Owner USDT balance").to.be.above(0);
        expect(await usdc.balanceOf(tokenOwner), "Owner USDC balance").to.be.above(0);
        expect(await weth.balanceOf(tokenOwner), "Owner WETH balance").to.be.equal(0);
        //
        totalUSDT = await usdt.balanceOf(tokenOwner);
        totalUSDC = await usdc.balanceOf(tokenOwner);
        totalWETH = await weth.balanceOf(tokenOwner);
        console.log('totalUSDT: ', totalUSDT);
        console.log('totalUSDC: ', totalUSDC);
        console.log('totalWETH', totalWETH);
    });

    it("Should swap USDT to USDC success given pool is init", async function () {
        const amountIn = ethers.parseEther("10");
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
            .to.be.emit(tether, "Approval")
            .withArgs(ownerAddress, callerAddress, amountIn);
        // tx (usdt->contract->weth)
        const tx = await example.connect(tokenOwner).swapExactInputSingle(TETHER_ADDRESS, USDC_ADDRESS, amountIn);
        expect(tx).not.be.reverted;
        //
        expect(await usdt.balanceOf(ownerAddress), "USDT balance").to.be.equal(totalUSDT - amountIn);
        expect(await usdc.balanceOf(ownerAddress), "USDC balance").to.be.below(totalUSDC + amountIn).above(totalUSDC);
    });

    it("Should swap USDC to USDT success given pool", async function () {
        const amountIn = ethers.parseEther("10");
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
            .to.be.emit(usdcOwner, "Approval")
            .withArgs(ownerAddress, callerAddress, amountIn);
        // tx (usdt->contract->weth)
        const tx = await example.connect(tokenOwner).swapExactInputSingle(USDC_ADDRESS, TETHER_ADDRESS, amountIn);
        expect(tx).not.be.reverted;
        //
        expect(await usdc.balanceOf(ownerAddress), "USDC balance").to.be.equal(totalUSDC - amountIn);
        expect(await usdt.balanceOf(ownerAddress), "USDT balance").to.be.below(totalUSDT + amountIn);
    });

    it("Should swap USDT to WETH failed given pool is not deployed", async function () {
        const amountIn = ethers.parseEther("10");
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
            .to.be.emit(tether, "Approval")
            .withArgs(ownerAddress, callerAddress, amountIn);
        // tx (usdt->contract->weth)
        await expect(example.connect(tokenOwner).swapExactInputSingle(TETHER_ADDRESS, WETH_ADDRESS, amountIn))
            .to.be.reverted;
        //
        expect(await weth.balanceOf(ownerAddress), "WETH balance").to.be.equal(totalWETH);
        expect(await usdt.balanceOf(ownerAddress), "USDT balance").to.be.equal(totalUSDT);
    });

});