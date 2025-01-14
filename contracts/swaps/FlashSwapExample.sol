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

//
contract FlashSwapExample is IUniswapV3FlashCallback, PeripheryImmutableState, PeripheryPayments {
  using LowGasSafeMath for uint24;
  using LowGasSafeMath for uint256;
  // state variables
  address public immutable swapRouter;

  constructor(address _swapRouter, address _factory, address _WETH9) PeripheryImmutableState(_factory, _WETH9) {
    swapRouter = _swapRouter;
  }

  event FlashSwapProfit(
    address indexed receipt,
    address indexed token0,
    address indexed token1,
    uint24 fee,
    uint256 profit,
    address token
  );

  // borrow tokens(amount0, amount1) to this contract.
  // swapping in pool1: token1 --> token0 (amount1, fee2) -> amountOut0
  // swapping in pool2: token0 --> token1 (amount0, fee3) -> amountOut1

  // execute after Pool has transfer amount of tokens to this contract.
  function uniswapV3FlashCallback(uint256 fee0, uint256 fee1, bytes calldata data) external override {
    // console.log('uniswapV3FlashCallback fees: fee0:', fee0, ', fee1: ', fee1);
    //
    FlashCallbackData memory decoded = abi.decode(data, (FlashCallbackData));
    CallbackValidation.verifyCallback(factory, decoded.poolKey);
    //
    address token0 = decoded.poolKey.token0;
    address token1 = decoded.poolKey.token1;
    // allowance from this contract to swapRouter (borrowed tokens)
    if (decoded.amount0 > 0) {
      TransferHelper.safeApprove(token0, swapRouter, decoded.amount0);
    }
    if (decoded.amount1 > 0) {
      TransferHelper.safeApprove(token1, swapRouter, decoded.amount1);
    }
    // profitable check
    // exactInputSingle will fail if this amount not met
    // only profitable if swap can get at least amount of.
    uint256 amount1Min = LowGasSafeMath.add(decoded.amount1, fee1);
    uint256 amount0Min = LowGasSafeMath.add(decoded.amount0, fee0);
    // Step2: call exactInputSingle for swapping token1(borrowed) for token0 in pool w/fee2
    // this contract will get amount of token0 (borrowed + swapped)
    uint256 amountOut0;
    if (decoded.amount1 > 0) {
      amountOut0 = ISwapRouter(swapRouter).exactInputSingle(
        ISwapRouter.ExactInputSingleParams({
          tokenIn: token1,
          tokenOut: token0,
          fee: decoded.poolFee2,
          recipient: address(this),
          deadline: block.timestamp,
          amountIn: decoded.amount1, // INPUT
          amountOutMinimum: amount0Min,
          sqrtPriceLimitX96: 0
        })
      );
      // this contract's balance will increase by amountOut0
      // console.log('Swap token1 for token0: ', amountOut0);
    }
    // Step3: call exactInputSingle for swapping token0 for token1 in pool w/fee3
    // this contract will get amount of token1
    uint256 amountOut1;
    if (decoded.amount0 > 0) {
      amountOut1 = ISwapRouter(swapRouter).exactInputSingle(
        ISwapRouter.ExactInputSingleParams({
          tokenIn: token0,
          tokenOut: token1,
          fee: decoded.poolFee3,
          recipient: address(this),
          deadline: block.timestamp + 200,
          amountIn: decoded.amount0, // INPUT
          amountOutMinimum: amount1Min,
          sqrtPriceLimitX96: 0
        })
      );
      // this contract's balance will increase by amountOut1
      // console.log('Swap token0 for token1: ', amountOut1);
    }

    // token0 process
    // borrowed amount + fee
    uint256 amount0Owed = amount0Min;
    // console.log('FlashSwapCallback token0:', amount0Owed, amountOut0, decoded.amount0);
    // pay back borrowed token
    TransferHelper.safeApprove(token0, address(this), amount0Owed);
    if (amount0Owed > 0) {
      pay(token0, address(this), msg.sender, amount0Owed);
    }
    // collect profits
    if (amountOut0 > amount0Owed) {
      uint256 profit0 = LowGasSafeMath.sub(amountOut0, amount0Owed);
      TransferHelper.safeApprove(token0, address(this), profit0);
      pay(token0, address(this), decoded.payer, profit0);
      emit FlashSwapProfit(decoded.payer, token0, token1, decoded.poolFee2, profit0, token0);
    }
    // token1 process
    //
    uint256 amount1Owed = amount1Min;
    // console.log('FlashSwapCallback token1:', amount1Owed, amountOut1, decoded.amount1);
    TransferHelper.safeApprove(token1, address(this), amount1Owed);
    if (amount1Owed > 0) {
      pay(token1, address(this), msg.sender, amount1Owed);
    }
    if (amountOut1 > amount1Owed) {
      uint256 profit1 = LowGasSafeMath.sub(amountOut1, amount1Owed);
      TransferHelper.safeApprove(token1, address(this), profit1);
      pay(token1, address(this), decoded.payer, profit1);
      emit FlashSwapProfit(decoded.payer, token0, token1, decoded.poolFee3, profit1, token1);
    }
  }

  // fee1 is the fee of the pool rom the initial borrow
  // fee2 is the fee of the first pool to arbitrage from
  // fee2 is the fee of the second pool to arbitrage from
  struct FlashParams {
    address token0;
    address token1;
    uint24 fee1;
    uint256 amount0;
    uint256 amount1;
    uint24 fee2;
    uint24 fee3;
  }

  struct FlashCallbackData {
    uint256 amount0;
    uint256 amount1;
    address payer;
    PoolAddress.PoolKey poolKey;
    uint24 poolFee2;
    uint24 poolFee3;
  }

  // borrow tokens(amount0, amount1) to this contract.
  // swapping in pool1: token1 --> token0 (amount1, fee2) -> amountOut0
  // swapping in pool2: token0 --> token1 (amount0, fee3) -> amountOut1
  function startFlash(FlashParams calldata params) external {
    require(params.amount0 > 0, 'amount0 shoud be gt zero');
    require(params.amount1 > 0, 'amount1 shoud be gt zero');
    // for locating pool
    PoolAddress.PoolKey memory poolKey = PoolAddress.getPoolKey(params.token0, params.token1, params.fee1);
    IUniswapV3Pool pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));
    // start flash, recipient address should be this contract
    // uniswapV3FlashCallback will receive the result.
    // step1: transfer amount of token from Pool to this contract
    pool.flash(
      address(this), // recipient address for receive borrowed tokens
      params.amount0,
      params.amount1,
      abi.encode(
        FlashCallbackData({
          amount0: params.amount0,
          amount1: params.amount1,
          payer: msg.sender,
          poolKey: poolKey,
          poolFee2: params.fee2,
          poolFee3: params.fee3
        })
      )
    );
  }
}
