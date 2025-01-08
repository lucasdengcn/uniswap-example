import { Signer, Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";
import { linkLibraries } from "./linkLibraries";
import WETH9 from "./WETH9.json";

import * as fs from 'node:fs/promises';

// https://gist.github.com/BlockmanCodes/d50eadf80447db00a99df2559700054e

import { artifacts } from "./shared";

async function deployContract<T>(
    abi: any,
    bytecode: string,
    deployParams: Array<any>,
    actor: Signer
) {
    const factory = new ContractFactory(abi, bytecode, actor);
    return await factory.deploy(...deployParams);
}

async function deployFactory(deployer: Signer) {
    return await deployContract<Contract>(
        artifacts.UniswapV3Factory.abi,
        artifacts.UniswapV3Factory.bytecode,
        [],
        deployer
    );
}

async function deployWETH9(deployer: Signer) {
    console.log("Deploying WETH9...");
    return await deployContract<Contract>(
        artifacts.WETH9.abi,
        artifacts.WETH9.bytecode,
        [],
        deployer
    );
}

async function deployRouter(factoryAddress: string, weth9Address: string, deployer: Signer) {
    console.log("Deploying SwapRouter...");
    return await deployContract<Contract>(
        artifacts.SwapRouter.abi,
        artifacts.SwapRouter.bytecode,
        [factoryAddress, weth9Address],
        deployer
    );
}

async function deployNFTDescriptorLibrary(deployer: Signer) {
    console.log("Deploying NFTDescriptorLibrary...");
    return await deployContract<Contract>(
        artifacts.NFTDescriptor.abi,
        artifacts.NFTDescriptor.bytecode,
        [],
        deployer
    );
}

async function deployPositionDescriptor(
    nftDescriptorLibraryAddress: string,
    weth9Address: string,
    deployer: Signer
) {
    console.log("Deploying NonfungibleTokenPositionDescriptor...");
    const linkedBytecode = linkLibraries(
        {
            bytecode: artifacts.NonfungibleTokenPositionDescriptor.bytecode,
            linkReferences: {
                "NFTDescriptor.sol": {
                    NFTDescriptor: [
                        {
                            length: 20,
                            start: 1681,
                        },
                    ],
                },
            },
        },
        {
            NFTDescriptor: nftDescriptorLibraryAddress,
        }
    );

    return (await deployContract(
        artifacts.NonfungibleTokenPositionDescriptor.abi,
        linkedBytecode,
        [weth9Address, '0x4554480000000000000000000000000000000000000000000000000000000000'],
        deployer
    )) as Contract;
}

async function deployNonfungiblePositionManager(
    factoryAddress: string,
    weth9Address: string,
    positionDescriptorAddress: string,
    deployer: Signer
) {
    console.log("Deploying NonfungiblePositionManager...");
    return await deployContract<Contract>(
        artifacts.NonfungiblePositionManager.abi,
        artifacts.NonfungiblePositionManager.bytecode,
        [factoryAddress, weth9Address, positionDescriptorAddress],
        deployer
    );
}


async function main() {
    const [deployer] = await ethers.getSigners();
    // deplly contracts
    const weth9 = await deployWETH9(deployer);
    const factory = await deployFactory(deployer);
    const factoryAddress = await factory.getAddress();
    const weth9Address = await weth9.getAddress();
    //
    const router = await deployRouter(factoryAddress, weth9Address, deployer);
    //
    const nftDescriptorLibrary = await deployNFTDescriptorLibrary(deployer);
    const nftDescriptorLibraryAddress = await nftDescriptorLibrary.getAddress();

    const positionDescriptor = await deployPositionDescriptor(
        nftDescriptorLibraryAddress,
        weth9Address,
        deployer
    );
    const positionDescriptorAddress = await positionDescriptor.getAddress();
    //
    const positionManager = await deployNonfungiblePositionManager(
        factoryAddress,
        weth9Address,
        positionDescriptorAddress,
        deployer
    );

    //
    let addresses = [
        '',
        `WETH_ADDRESS=${weth9Address}`,
        `FACTORY_ADDRESS=${factoryAddress}`,
        `SWAP_ROUTER_ADDRESS=${await router.getAddress()}`,
        `NFT_DESCRIPTOR_ADDRESS=${nftDescriptorLibraryAddress}`,
        `POSITION_DESCRIPTOR_ADDRESS=${positionDescriptorAddress}`,
        `POSITION_MANAGER_ADDRESS=${await positionManager.getAddress()}`,
    ]
    const data = addresses.join("\n");
    console.log(addresses);

    return fs.writeFile(".address.env", data);
}

/**
 * npx hardhat run --network localhost scripts/uniswap/deployContracts.ts
 */

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });