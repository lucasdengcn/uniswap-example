import * as dotenv from "dotenv";
dotenv.config({ path: '.address.env' });

const TETHER_ADDRESS = process.env.TETHER_ADDRESS || '';
const USDC_ADDRESS = process.env.USDC_ADDRESS || '';
const WBTC_ADDRESS = process.env.WBTC_ADDRESS || '';
const WETH_ADDRESS = process.env.WETH_ADDRESS || '';
const POSITION_MANAGER_ADDRESS = process.env.POSITION_MANAGER_ADDRESS || '';
const USDT_USDC_500 = process.env.USDT_USDC_500 || '';
const USDT_WBTC_500 = process.env.USDT_WBTC_500 || '';
const USDC_WBTC_500 = process.env.USDC_WBTC_500 || '';

//
import { Contract, ContractTransactionReceipt, ContractTransactionResponse, Signer } from "ethers";
import { ethers, ignition } from "hardhat";
import { expect } from "chai";
import WETH9 from "../scripts/uniswap/WETH9.json";
import LiquidityExampleModule from "../ignition/modules/LiquidityExampleModule";

describe("LiquidityExample", function () {
    let example: any;
    //
    before(async function () {
        const { contract } = await ignition.deploy(LiquidityExampleModule, {
            parameters: {
                "LiquidityExampleModule": {
                    "positionManager": POSITION_MANAGER_ADDRESS,
                    "poolAddress": USDT_USDC_500,
                    "token0": TETHER_ADDRESS,
                    "token1": USDC_ADDRESS
                }
            }
        });
        await contract.waitForDeployment();
        example = contract;
    });

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

    async function getWBTC(signer: Signer) {
        // binding to signer
        return await ethers.getContractAt("WrappedBitcoin", WBTC_ADDRESS, signer);
    }

    describe("Minting", function () {

        it("USDT_USDC should estimate NewPosition success", async function () {
            const tx = await example.estimateNewPosition();
            console.log(tx);
        });

        it("USDT_USDC should mint new position success", async function () {
            const [deployer, tokenOwner] = await ethers.getSigners();
            const callerAddress = await example.getAddress();
            const ownerAddress = await tokenOwner.getAddress();
            //
            const estimation = await example.connect(tokenOwner).estimateNewPosition();
            //
            console.log(ethers.formatEther(estimation[1]));
            console.log(ethers.formatEther(estimation[2]));
            //
            const tether: any = await getUSDT(tokenOwner);
            await expect(tether.approve(callerAddress, estimation[1]))
                .to.be.emit(tether, "Approval")
                .withArgs(ownerAddress, callerAddress, estimation[1]);
            //
            const usdc: any = await getUSDC(tokenOwner);
            await expect(usdc.approve(callerAddress, estimation[1]))
                .to.be.emit(usdc, "Approval")
                .withArgs(ownerAddress, callerAddress, estimation[1]);
            //
            const tx = await example.connect(tokenOwner).mintNewPosition(estimation[0], estimation[1], estimation[2], estimation[3], estimation[4]);
            //
        });

    });

});
