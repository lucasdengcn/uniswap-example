import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const LiquidityExampleModule = buildModule('LiquidityExampleModule', m => {
  //
  const positionManager = m.getParameter('positionManager');
  const poolAddress = m.getParameter('poolAddress');
  const token0 = m.getParameter('token0');
  const token1 = m.getParameter('token1');
  //
  const deployer = m.getAccount(0);
  const contract = m.contract('LiquidityExample', [positionManager, token0, token1, poolAddress], {
    from: deployer,
  });
  return { contract };
});

export default LiquidityExampleModule;
