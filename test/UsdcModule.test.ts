import * as dotenv from "dotenv";
dotenv.config();

const TETHER_ADDRESS = process.env.TETHER_ADDRESS || '';
const USDC_ADDRESS = process.env.USDC_ADDRESS || '';
const WBTC_ADDRESS = process.env.WBTC_ADDRESS || '';
const WETH_ADDRESS = process.env.WETH_ADDRESS || '';
const SWAP_ROUTER_ADDRESS = process.env.SWAP_ROUTER_ADDRESS || '';

//
import { ethers, ignition } from "hardhat";
import { expect } from 'chai';

import { Signer } from "ethers";

describe("UsdcModule", function () {
    let tetherAddress: string;

    async function getContract(signer: Signer) {
        // binding to signer
        return await ethers.getContractAt("Usdc", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", signer);
    }

    it("Should get contract correctly success", async function () {
        const [deployer, tokenOwner] = await ethers.getSigners();
        const usdc = await getContract(deployer);
        //
        expect(await usdc.owner()).to.be.equal(deployer);
        expect(await usdc.balanceOf(tokenOwner)).to.be.above(0);
    });

    it("Should transferFrom success", async function () {
        const [deployer, tokenOwner, spender, user3] = await ethers.getSigners();
        const ownerAddress = await tokenOwner.getAddress();
        const spenderAddress = await spender.getAddress();
        const user3Address = await user3.getAddress();
        //
        const allowance = ethers.parseEther("2");
        const amountIn = ethers.parseEther("1");
        //
        let usdcOwner = await getContract(tokenOwner);
        let usdcSpender = await getContract(spender);
        //
        const ownerBalance = await usdcOwner.balanceOf(tokenOwner);
        // owner --> spender
        await expect(usdcOwner.approve(spenderAddress, allowance), "approve").not.be.reverted;
        const spenderBalance = await usdcOwner.allowance(ownerAddress, spenderAddress);
        //
        const receiptBalance = await usdcOwner.balanceOf(user3Address);
        //
        console.log('spenderBalance: ', spenderBalance);
        console.log('receiptBalance: ', receiptBalance);
        // spender call (owner, receipt)
        await expect(usdcSpender.transferFrom(ownerAddress, user3Address, amountIn), "transferFrom").not.be.reverted;
        //
        expect(await usdcOwner.balanceOf(user3Address), "Receipt balance").to.be.equal(amountIn + receiptBalance);
        expect(await usdcOwner.allowance(ownerAddress, spenderAddress), "Spender allowance").to.be.equal(spenderBalance - amountIn);

    });

});