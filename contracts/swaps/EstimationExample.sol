// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity =0.7.6;
pragma abicoder v2;

import 'hardhat/console.sol';

import '@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3FlashCallback.sol';
import '@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol';

import '@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol';
import '@uniswap/v3-core/contracts/libraries/SqrtPriceMath.sol';
import '@uniswap/v3-periphery/contracts/base/PeripheryPayments.sol';
import '@uniswap/v3-periphery/contracts/base/PeripheryImmutableState.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol';
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';
import '@uniswap/v3-periphery/contracts/libraries/CallbackValidation.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol';

contract EstimationExample is PeripheryImmutableState, PeripheryPayments {
  using LowGasSafeMath for uint24;
  using LowGasSafeMath for uint256;

  constructor(address _factory, address _WETH9) PeripheryImmutableState(_factory, _WETH9) {}

  // estimate amountOut based on latest TWAP
  function estimateAmountOut(
    address tokenIn,
    address tokenOut,
    uint24 fee,
    uint128 amountIn,
    uint24 secondsAgo
  ) external view returns (uint256 amountOut) {
    //
    PoolAddress.PoolKey memory poolKey = PoolAddress.getPoolKey(tokenIn, tokenOut, fee);
    //
    (int24 tick, ) = OracleLibrary.consult(PoolAddress.computeAddress(factory, poolKey), secondsAgo);
    amountOut = OracleLibrary.getQuoteAtTick(tick, amountIn, tokenIn, tokenOut);
  }

  // estimate amountOut based on latest TWAP
  function estimateAmountOutV2(
    address tokenIn,
    address tokenOut,
    uint24 fee,
    uint128 amountIn,
    uint24 secondsAgo
  ) external view returns (uint256 amountOut) {
    //
    PoolAddress.PoolKey memory poolKey = PoolAddress.getPoolKey(tokenIn, tokenOut, fee);
    IUniswapV3Pool pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));
    //
    uint32[] memory secondsAgos = new uint32[](2);
    secondsAgos[0] = secondsAgo;
    secondsAgos[1] = 0;

    (int56[] memory tickCumulatives, ) = pool.observe(secondsAgos);

    int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
    int24 averageTick = int24(tickCumulativesDelta / secondsAgo);
    // Always round to negative infinity
    if (tickCumulativesDelta < 0 && (tickCumulativesDelta % secondsAgo != 0)) averageTick--;
    //
    amountOut = OracleLibrary.getQuoteAtTick(averageTick, amountIn, tokenIn, tokenOut);
  }

  // calculate TWAP in secondsAgo
  function twapSqrtPriceX96(
    address tokenIn,
    address tokenOut,
    uint24 fee,
    uint24 secondsAgo
  ) external view returns (uint160 sqrtPriceX96, address token0, address token1) {
    //
    PoolAddress.PoolKey memory poolKey = PoolAddress.getPoolKey(tokenIn, tokenOut, fee);
    IUniswapV3Pool pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));
    //
    token0 = pool.token0();
    token1 = pool.token1();
    //
    uint32[] memory secondsAgos = new uint32[](2);
    secondsAgos[0] = secondsAgo;
    secondsAgos[1] = 0;
    //
    (int56[] memory tickCumulatives, ) = pool.observe(secondsAgos);
    //
    // average price
    int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
    int24 averageTick = int24(tickCumulativesDelta / secondsAgo);
    // Always round to negative infinity
    if (tickCumulativesDelta < 0 && (tickCumulativesDelta % secondsAgo != 0)) averageTick--;
    sqrtPriceX96 = TickMath.getSqrtRatioAtTick(averageTick);
  }

  //
  // estimate amounts given price range
  function estimateAmountsOnPriceRange(
    address tokenIn,
    address tokenOut,
    uint24 fee,
    uint160 sqrtPriceBX96
  ) external view returns (uint256 amount0Delta, uint256 amount1Delta) {
    //
    PoolAddress.PoolKey memory poolKey = PoolAddress.getPoolKey(tokenIn, tokenOut, fee);
    IUniswapV3Pool pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));
    // current
    uint128 liquidity = pool.liquidity();
    (uint160 sqrtPriceAX96, , , , , , ) = pool.slot0();
    //
    amount0Delta = SqrtPriceMath.getAmount0Delta(sqrtPriceAX96, sqrtPriceBX96, liquidity, false);
    amount1Delta = SqrtPriceMath.getAmount1Delta(sqrtPriceAX96, sqrtPriceBX96, liquidity, false);
  }

  //
  // estimate amounts given price range
  // zeroForOne The direction of the swap, true for token0 to token1, false for token1 to token0
  function estimatePriceOnSwapExactInput(
    address token0,
    address token1,
    uint24 fee,
    uint128 amount,
    bool zeroForOne
  ) external view returns (uint160 sqrtPriceNextX96, uint160 sqrtPriceCurrentX96) {
    //
    uint256 amountRemainingLessFee = FullMath.mulDiv(uint256(amount), 1e6 - fee, 1e6);
    //
    PoolAddress.PoolKey memory poolKey = PoolAddress.getPoolKey(token0, token1, fee);
    IUniswapV3Pool pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));
    // current
    uint128 liquidity = pool.liquidity();
    (sqrtPriceCurrentX96, , , , , , ) = pool.slot0();
    //
    sqrtPriceNextX96 = SqrtPriceMath.getNextSqrtPriceFromInput(
      sqrtPriceCurrentX96,
      liquidity,
      amountRemainingLessFee,
      zeroForOne
    );
  }

  //
  // estimate amounts given price range
  // zeroForOne The direction of the swap, true for token0 to token1, false for token1 to token0
  function estimatePriceOnSwapExactOut(
    address token0,
    address token1,
    uint24 fee,
    uint128 amount,
    bool zeroForOne
  ) external view returns (uint160 sqrtPriceNextX96, uint160 sqrtPriceCurrentX96) {
    //
    PoolAddress.PoolKey memory poolKey = PoolAddress.getPoolKey(token0, token1, fee);
    IUniswapV3Pool pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));
    // current
    uint128 liquidity = pool.liquidity();
    (sqrtPriceCurrentX96, , , , , , ) = pool.slot0();
    //
    sqrtPriceNextX96 = SqrtPriceMath.getNextSqrtPriceFromOutput(sqrtPriceCurrentX96, liquidity, amount, zeroForOne);
  }

  // get current price and liquidity
  function currentPrice(
    address token0,
    address token1,
    uint24 fee
  ) external view returns (uint160 sqrtPriceCurrentX96, uint128 liquidity) {
    //
    PoolAddress.PoolKey memory poolKey = PoolAddress.getPoolKey(token0, token1, fee);
    IUniswapV3Pool pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));
    // current
    liquidity = pool.liquidity();
    (sqrtPriceCurrentX96, , , , , , ) = pool.slot0();
  }
}
