import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const SingleSwapExampleModule = buildModule("SingleSwapExampleModule", (m) => {
    //
    const SWAP_ROUTER = m.getParameter("routerAddress");
    const deployer = m.getAccount(0);
    const contract = m.contract("SingleSwapExample", [SWAP_ROUTER], {
        from: deployer
    });
    return { contract };
});

export default SingleSwapExampleModule;