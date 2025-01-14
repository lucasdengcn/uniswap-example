import { Contract, ContractFactory, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { linkLibraries } from './linkLibraries';

import * as fs from 'node:fs/promises';

// https://gist.github.com/BlockmanCodes/d50eadf80447db00a99df2559700054e

import { artifacts } from './shared';

async function deployContract<T>(abi: any, bytecode: string, deployParams: Array<any>, actor: Signer) {
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
  console.log('Deploying WETH9...');
  const tx = await deployContract<Contract>(artifacts.WETH9.abi, artifacts.WETH9.bytecode, [], deployer);
  await tx.waitForDeployment();
  return await tx.getAddress();
}

async function deployRouter(factoryAddress: string, weth9Address: string, deployer: Signer) {
  console.log('Deploying SwapRouter...');
  const tx = await deployContract<Contract>(
    artifacts.SwapRouter.abi,
    artifacts.SwapRouter.bytecode,
    [factoryAddress, weth9Address],
    deployer
  );
  await tx.waitForDeployment();
  return await tx.getAddress();
}

async function deployNFTDescriptorLibrary(deployer: Signer) {
  console.log('Deploying NFTDescriptorLibrary...');
  const tx = await deployContract<Contract>(
    artifacts.NFTDescriptor.abi,
    artifacts.NFTDescriptor.bytecode,
    [],
    deployer
  );
  await tx.waitForDeployment();
  return await tx.getAddress();
}

async function deployPositionDescriptor(nftDescriptorLibraryAddress: string, weth9Address: string, deployer: Signer) {
  console.log('Deploying NonfungibleTokenPositionDescriptor...');
  const linkedBytecode = linkLibraries(
    {
      bytecode: artifacts.NonfungibleTokenPositionDescriptor.bytecode,
      linkReferences: {
        'NFTDescriptor.sol': {
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
  const tx = await deployContract(
    artifacts.NonfungibleTokenPositionDescriptor.abi,
    linkedBytecode,
    [weth9Address, '0x4554480000000000000000000000000000000000000000000000000000000000'],
    deployer
  );
  await tx.waitForDeployment();
  return await tx.getAddress();
}

async function deployNonfungiblePositionManager(
  factoryAddress: string,
  weth9Address: string,
  positionDescriptorAddress: string,
  deployer: Signer
) {
  console.log('Deploying NonfungiblePositionManager...');
  const tx = await deployContract<Contract>(
    artifacts.NonfungiblePositionManager.abi,
    artifacts.NonfungiblePositionManager.bytecode,
    [factoryAddress, weth9Address, positionDescriptorAddress],
    deployer
  );
  await tx.waitForDeployment();
  return await tx.getAddress();
}

async function deployQuoter(factoryAddress: string, weth9Address: string, deployer: Signer) {
  console.log('Deploying Quoter...');
  const tx = await deployContract<Contract>(
    artifacts.Quoter.abi,
    artifacts.Quoter.bytecode,
    [factoryAddress, weth9Address],
    deployer
  );
  await tx.waitForDeployment();
  return await tx.getAddress();
}

async function deployQuoterV2(factoryAddress: string, weth9Address: string, deployer: Signer) {
  console.log('Deploying QuoterV2...');
  const tx = await deployContract<Contract>(
    artifacts.QuoterV2.abi,
    artifacts.QuoterV2.bytecode,
    [factoryAddress, weth9Address],
    deployer
  );
  await tx.waitForDeployment();
  return await tx.getAddress();
}

async function main() {
  const [deployer] = await ethers.getSigners();
  // deplly contracts
  const weth9Address = await deployWETH9(deployer);
  const factory = await deployFactory(deployer);
  const factoryAddress = await factory.getAddress();
  //
  const routerAddress = await deployRouter(factoryAddress, weth9Address, deployer);
  //
  const nftDescriptorLibraryAddress = await deployNFTDescriptorLibrary(deployer);

  const positionDescriptorAddress = await deployPositionDescriptor(nftDescriptorLibraryAddress, weth9Address, deployer);
  //
  const positionManagerAddress = await deployNonfungiblePositionManager(
    factoryAddress,
    weth9Address,
    positionDescriptorAddress,
    deployer
  );
  //
  const quoterAddress = await deployQuoter(factoryAddress, weth9Address, deployer);
  const quoterV2Address = await deployQuoterV2(factoryAddress, weth9Address, deployer);
  //
  let addresses = [
    '',
    `WETH_ADDRESS=${weth9Address}`,
    `FACTORY_ADDRESS=${factoryAddress}`,
    `SWAP_ROUTER_ADDRESS=${routerAddress}`,
    `NFT_DESCRIPTOR_ADDRESS=${nftDescriptorLibraryAddress}`,
    `POSITION_DESCRIPTOR_ADDRESS=${positionDescriptorAddress}`,
    `POSITION_MANAGER_ADDRESS=${positionManagerAddress}`,
    `QUOTER_ADDRESS=${quoterAddress}`,
    `QUOTERV2_ADDRESS=${quoterV2Address}`,
  ];
  const data = addresses.join('\n');
  console.log(addresses);

  return fs.writeFile('.address.env', data);
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
