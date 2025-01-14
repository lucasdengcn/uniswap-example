import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const TwapExampleModule = buildModule('TwapExampleModule', m => {
  //
  const factory = m.getParameter('factoryAddress');
  const WETH9 = m.getParameter('weth9Address');

  const deployer = m.getAccount(0);
  const contract = m.contract('TwapExample', [factory, WETH9], {
    from: deployer,
  });
  return { contract };
});

export default TwapExampleModule;
