import { ethers, ignition } from "hardhat";
import { Signer, Contract, ContractFactory } from "ethers";

import { artifacts } from "./shared";

import * as fs from 'node:fs/promises';

async function deployContract<T>(
    abi: any,
    bytecode: string,
    deployParams: Array<any>,
    actor: Signer
) {
    const factory = new ContractFactory(abi, bytecode, actor);
    return await factory.deploy(...deployParams);
}

async function main() {
    const [deployer, signer] = await ethers.getSigners();
    console.log('deployer: ', await deployer.getAddress());
    console.log('signer: ', await signer.getAddress());
    // deplly tokens
    // const { tether } = await ignition.deploy(TetherModule);
    const tether: any = await deployContract(artifacts.TETHER.abi, artifacts.TETHER.bytecode, [], deployer);
    const tetherAddress = await tether.getAddress();
    await tether.mint(signer, ethers.parseEther("100000"));
    // const owner = await tether.owner();
    // if (signer == owner) {
    //     console.log("Deploy Tether token success. ");
    // }
    //
    // const { usdc } = await ignition.deploy(UsdcModule);
    const usdc: any = await deployContract(artifacts.USDC.abi, artifacts.USDC.bytecode, [], deployer);
    const usdcAddress = await usdc.getAddress();
    await usdc.mint(signer, ethers.parseEther("100000"));
    console.log("Deploy USDC token success. ");
    //
    // const { wrappedBitcoin } = await ignition.deploy(WrappedBitcoinModule);
    const wrappedBitcoin: any = await deployContract(artifacts.WBTC.abi, artifacts.WBTC.bytecode, [], deployer);
    const wrappedBitcoinAddress = await wrappedBitcoin.getAddress();
    await wrappedBitcoin.mint(signer, ethers.parseEther("100000"));
    console.log("Deploy WBTC token success. ");
    //
    let addresses: string[] = [
        '',
        `USDC_ADDRESS=${usdcAddress}`,
        `TETHER_ADDRESS=${tetherAddress}`,
        `WBTC_ADDRESS=${wrappedBitcoinAddress}`
    ];
    const data = addresses.join("\n");
    console.log(addresses);

    return fs.appendFile(".address.env", data);
}

/**
 * npx hardhat run --network localhost scripts/uniswap/deployTokens.ts
 */

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });