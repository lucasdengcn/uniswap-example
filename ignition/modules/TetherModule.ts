import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const TetherModule = buildModule("TetherModule", (m) => {
    const deployer = m.getAccount(0);
    const signer = m.getAccount(1);
    //
    const tether = m.contract("Tether", [], {
        from: deployer
    });
    m.call(tether, "mint", [signer, ethers.parseEther('100000')], {
        from: deployer
    });
    return { tether };
});

export default TetherModule