import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const UsdcModule = buildModule("UsdcModule", (m) => {
    const deployer = m.getAccount(0);
    const signer = m.getAccount(1);
    //
    const usdc = m.contract("Usdc", [], {
        from: deployer
    });
    //
    m.call(usdc, "mint", [signer, ethers.parseEther('100000')], {
        from: deployer
    });
    return { usdc };
});

export default UsdcModule