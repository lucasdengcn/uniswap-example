npx hardhat clean
npx hardhat compile
npx hardhat run scripts/uniswap/deployContracts.ts --network localhost
echo "deployContracts DONE"

npx hardhat run scripts/uniswap/deployTokens.ts --network localhost
echo "deployTokens DONE"

npx hardhat run scripts/uniswap/deployPools.ts --network localhost
echo "deployPools DONE"

npx hardhat run scripts/uniswap/checkLiquidity.ts --network localhost
echo "checkLiquidity DONE"

npx hardhat run scripts/uniswap/addLiquidity.ts --network localhost
echo "addLiquidity DONE"

npx hardhat run scripts/uniswap/checkLiquidity.ts --network localhost
echo "checkLiquidity DONE"

