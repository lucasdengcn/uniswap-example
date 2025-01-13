import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const FlashSwapExampleModule = buildModule('FlashSwapExampleModule', m => {
  //
  const SWAP_ROUTER = m.getParameter('routerAddress');
  const factory = m.getParameter('factoryAddress');
  const WETH9 = m.getParameter('weth9Address');

  const deployer = m.getAccount(0);
  const contract = m.contract('FlashSwapExample', [SWAP_ROUTER, factory, WETH9], {
    from: deployer,
  });
  return { contract };
});

export default FlashSwapExampleModule;
