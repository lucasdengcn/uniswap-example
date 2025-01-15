import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const EstimationExampleModule = buildModule('EstimationExampleModule', m => {
  //
  const factory = m.getParameter('factoryAddress');
  const WETH9 = m.getParameter('weth9Address');

  const deployer = m.getAccount(0);
  const contract = m.contract('EstimationExample', [factory, WETH9], {
    from: deployer,
  });
  return { contract };
});

export default EstimationExampleModule;
