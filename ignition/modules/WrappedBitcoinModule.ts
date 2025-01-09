import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { ethers } from 'ethers';

const WrappedBitcoinModule = buildModule('WrappedBitcoinModule', m => {
  const deployer = m.getAccount(0);
  const signer = m.getAccount(1);
  //
  const wrappedBitcoin = m.contract('WrappedBitcoin', [], {
    from: deployer,
  });
  //
  m.call(wrappedBitcoin, 'mint', [signer, ethers.parseEther('100000')], {
    from: deployer,
  });
  return { wrappedBitcoin };
});

export default WrappedBitcoinModule;
