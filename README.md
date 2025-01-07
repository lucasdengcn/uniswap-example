# Uniswap sample

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```

## Deployment

### deploy to localnet

```shell
sh deploy-uniswapv3.sh
```

### add liquidity

### check liquidity

## Reference

<https://techgeorgii.com/uniswap-v3-sdk-swap-tutorial-part-2-get-pool-information/>

## Error Codes

- STF: Safe Transfer Failed.

A "reverted with reason 'STF'" error on a Uniswap V3 swap typically means a "Safe Transfer Failed," which usually occurs when you haven't properly approved your wallet to spend the required amount of tokens with the Uniswap contract, indicating an issue with the token approval process on your wallet side.
