// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity >=0.7.6 <0.9.0;
pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract SingleSwapExample {
    //
    address public immutable swapRouter;
    uint24 public constant poolFee = 10000;

    //
    constructor(address _swapRouter) {
        swapRouter = _swapRouter;
    }

    //
    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        // transfer amount of token from sender to this contract
        address owner = msg.sender;
        // step1: transfer (owner --> contract)
        // step2: update allowance (owner --> caller (contract))
        TransferHelper.safeTransferFrom(
            tokenIn,
            owner,
            address(this),
            amountIn
        );
        // approve the router to spend tokenIn
        TransferHelper.safeApprove(tokenIn, swapRouter, amountIn);
        //
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: owner,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0, // 0 means no limit
                sqrtPriceLimitX96: 0 // 0 means no limit
            });
        //
        amountOut = ISwapRouter(swapRouter).exactInputSingle(params);
    }

    //
    function swapExactOutputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        uint256 amountInMax
    ) external returns (uint256 amountIn) {
        // allowance
        TransferHelper.safeTransferFrom(
            tokenIn,
            msg.sender,
            address(this),
            amountInMax
        );
        //
        TransferHelper.safeApprove(tokenIn, swapRouter, amountInMax);
        //
        ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter
            .ExactOutputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountOut: amountOut,
                amountInMaximum: amountInMax,
                sqrtPriceLimitX96: 0 // 0 means no limit
            });
        //
        amountIn = ISwapRouter(swapRouter).exactOutputSingle(params);
        //
        if (amountIn < amountInMax) {
            // token, to, amount
            TransferHelper.safeApprove(tokenIn, swapRouter, 0);
            // token, to, amount
            TransferHelper.safeTransfer(
                tokenIn,
                msg.sender,
                amountInMax - amountIn
            );
        }
    }
}
