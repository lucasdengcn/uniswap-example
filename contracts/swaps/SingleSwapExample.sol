// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity >=0.7.6 <0.9.0;
pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "hardhat/console.sol";

contract SingleSwapExample {
    //
    address public immutable swapRouter;
    uint24 public constant poolFee = 10000;

    //
    constructor(address _swapRouter) {
        swapRouter = _swapRouter;
    }

    event SwapResult(
        address indexed receipt,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    //
    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        // transfer amount of token from sender to this contract
        // step1: transfer (owner --> contract)
        // step2: update allowance (owner --> caller (contract))
        TransferHelper.safeTransferFrom(
            tokenIn,
            msg.sender,
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
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0, // 0 means no limit
                sqrtPriceLimitX96: 0 // 0 means no limit
            });
        //
        amountOut = ISwapRouter(swapRouter).exactInputSingle(params);
        //
        emit SwapResult(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
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
        console.log("safeTransferFrom: ", amountInMax);
        //
        TransferHelper.safeApprove(tokenIn, swapRouter, amountInMax);
        console.log("safeApprove: ", amountInMax);
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
        console.log("exactAmountIn: ", amountIn);
        emit SwapResult(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
        //
        if (amountIn < amountInMax) {
            // token, to, amount
            TransferHelper.safeApprove(tokenIn, swapRouter, 0);
            console.log("safeApprove: ", 0);
            // token, to, amount
            TransferHelper.safeTransfer(
                tokenIn,
                msg.sender,
                amountInMax - amountIn
            );
            console.log("transfer left back to owner.");
        }
    }

    /// @notice swapExactInputMultihop swaps a fixed amount of DAI for a maximum possible amount of WETH9 through an intermediary pool.
    /// For this example, we will swap DAI to USDC, then USDC to WETH9 to achieve our desired output.
    /// @dev The calling address must approve this contract to spend at least `amountIn` worth of its DAI for this function to succeed.
    /// @param amountIn The amount of DAI to be swapped.
    /// @return amountOut The amount of WETH9 received after the swap.
    function swapExactInputMultihop(
        address tokenIn,
        address token2,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        // Transfer `amountIn` of DAI to this contract.
        TransferHelper.safeTransferFrom(
            tokenIn,
            msg.sender,
            address(this),
            amountIn
        );
        console.log("safeTransferFrom");
        // Approve the router to spend DAI.
        TransferHelper.safeApprove(tokenIn, swapRouter, amountIn);
        console.log("safeApprove");

        // Multiple pool swaps are encoded through bytes called a `path`. A path is a sequence of token addresses and poolFees that define the pools used in the swaps.
        // The format for pool encoding is (tokenIn, fee, tokenOut/tokenIn, fee, tokenOut) where tokenIn/tokenOut parameter is the shared token across the pools.
        // Since we are swapping DAI to USDC and then USDC to WETH9 the path encoding is (DAI, 0.3%, USDC, 0.3%, WETH9).
        ISwapRouter.ExactInputParams memory params = ISwapRouter
            .ExactInputParams({
                path: abi.encodePacked(
                    tokenIn,
                    poolFee,
                    token2,
                    poolFee,
                    tokenOut
                ),
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0
            });

        // Executes the swap.
        amountOut = ISwapRouter(swapRouter).exactInput(params);
        emit SwapResult(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    /// @notice swapExactOutputMultihop swaps a minimum possible amount of DAI for a fixed amount of WETH through an intermediary pool.
    /// For this example, we want to swap DAI for WETH9 through a USDC pool but we specify the desired amountOut of WETH9. Notice how the path encoding is slightly different in for exact output swaps.
    /// @dev The calling address must approve this contract to spend its DAI for this function to succeed. As the amount of input DAI is variable,
    /// the calling address will need to approve for a slightly higher amount, anticipating some variance.
    /// @param amountOut The desired amount of WETH9.
    /// @param amountInMaximum The maximum amount of DAI willing to be swapped for the specified amountOut of WETH9.
    /// @return amountIn The amountIn of DAI actually spent to receive the desired amountOut.
    function swapExactOutputMultihop(
        address tokenIn,
        address token2,
        address tokenOut,
        uint256 amountOut,
        uint256 amountInMaximum
    ) external returns (uint256 amountIn) {
        // Transfer the specified `amountInMaximum` to this contract.
        TransferHelper.safeTransferFrom(
            tokenIn,
            msg.sender,
            address(this),
            amountInMaximum
        );
        console.log("safeTransferFrom");
        // Approve the router to spend  `amountInMaximum`.
        TransferHelper.safeApprove(tokenIn, swapRouter, amountInMaximum);
        console.log("safeApprove");

        // The parameter path is encoded as (tokenOut, fee, tokenIn/tokenOut, fee, tokenIn)
        // The tokenIn/tokenOut field is the shared token between the two pools used in the multiple pool swap. In this case USDC is the "shared" token.
        // For an exactOutput swap, the first swap that occurs is the swap which returns the eventual desired token.
        // In this case, our desired output token is WETH9 so that swap happens first, and is encoded in the path accordingly.
        ISwapRouter.ExactOutputParams memory params = ISwapRouter
            .ExactOutputParams({
                path: abi.encodePacked(
                    tokenOut,
                    poolFee,
                    token2,
                    poolFee,
                    tokenIn
                ),
                recipient: msg.sender,
                deadline: block.timestamp,
                amountOut: amountOut,
                amountInMaximum: amountInMaximum
            });

        // Executes the swap, returning the amountIn actually spent.
        amountIn = ISwapRouter(swapRouter).exactOutput(params);
        console.log("exactAmountIn: ", amountIn);
        emit SwapResult(msg.sender, tokenIn, tokenOut, amountIn, amountOut);

        // If the swap did not require the full amountInMaximum to achieve the exact amountOut
        // then we refund msg.sender and approve the router to spend 0.
        if (amountIn < amountInMaximum) {
            TransferHelper.safeApprove(tokenIn, swapRouter, 0);
            console.log("safeApprove1");
            TransferHelper.safeTransfer(
                tokenIn,
                msg.sender,
                amountInMaximum - amountIn
            );
            console.log("safeTransfer1");
        }
    }
}
