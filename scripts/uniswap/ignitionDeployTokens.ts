import { ethers, ignition } from "hardhat";

import TetherModule from "../../ignition/modules/TetherModule";
import UsdcModule from "../../ignition/modules/UsdcModule";
import WrappedBitcoinModule from "../../ignition/modules/WrappedBitcoinModule";

import * as fs from 'node:fs/promises';


async function main() {
    const [deployer, signer] = await ethers.getSigners();
    console.log('deployer: ', await deployer.getAddress());
    console.log('signer: ', await signer.getAddress());
    // deplly tokens
    const { tether } = await ignition.deploy(TetherModule);
    await tether.waitForDeployment(); // NEED this, otherwise the getAddress will return wrong address.
    const tetherAddress = await tether.getAddress();
    //
    const { usdc } = await ignition.deploy(UsdcModule);
    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();
    console.log("Deploy USDC token success. ");
    //
    const { wrappedBitcoin } = await ignition.deploy(WrappedBitcoinModule);
    await wrappedBitcoin.waitForDeployment();
    const wrappedBitcoinAddress = await wrappedBitcoin.getAddress();
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

    return fs.appendFile(".env", data);
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