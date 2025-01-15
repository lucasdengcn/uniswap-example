// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity =0.7.6;
pragma abicoder v2;

import 'hardhat/console.sol';

import '@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3FlashCallback.sol';
import '@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol';

import '@uniswap/v3-periphery/contracts/base/PeripheryPayments.sol';
import '@uniswap/v3-periphery/contracts/base/PeripheryImmutableState.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol';
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';
import '@uniswap/v3-periphery/contracts/libraries/CallbackValidation.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol';

contract TwapExample is PeripheryImmutableState, PeripheryPayments {
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
}
