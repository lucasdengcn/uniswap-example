#npx hardhat run scripts/uniswap/checkLiquidity.ts --network localhost
#echo "checkLiquidity DONE"

npx hardhat run scripts/uniswap/addLiquidity.ts --network localhost
echo "addLiquidity DONE"

npx hardhat run scripts/uniswap/checkLiquidity.ts --network localhost
echo "checkLiquidity DONE"