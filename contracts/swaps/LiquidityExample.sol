// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity =0.7.6;
pragma abicoder v2;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@uniswap/v3-core/contracts/libraries/SqrtPriceMath.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/base/LiquidityManagement.sol";

contract LiquidityExample is IERC721Receiver {
    // states
    uint24 public constant poolFee = 10000;
    address public token0;
    address public token1;
    //
    address public immutable poolAddress;
    address public immutable positionManager;

    //
    constructor(
        address _positionManager,
        address _token0,
        address _token1,
        address _poolAddress
    ) {
        positionManager = _positionManager;
        token0 = _token0;
        token1 = _token1;
        poolAddress = _poolAddress;
    }

    //
    struct Deposit {
        address owner;
        uint128 liquidity;
        address token0;
        address token1;
    }
    //
    mapping(uint256 => Deposit) public deposits;

    // override
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        _createDeposit(operator, tokenId);
        return this.onERC721Received.selector;
    }

    // internal functions
    function _createDeposit(address owner, uint256 tokenId) internal {
        (
            ,
            ,
            address _token0,
            address _token1,
            ,
            ,
            ,
            uint128 liquidity,
            ,
            ,
            ,

        ) = INonfungiblePositionManager(positionManager).positions(tokenId);
        deposits[tokenId] = Deposit({
            owner: owner,
            liquidity: liquidity,
            token0: _token0,
            token1: _token1
        });
    }

    function calculateRoundedTick(
        int24 tick,
        int24 tickSpacing
    ) public pure returns (int24) {
        int24 rounded = (tick / tickSpacing) * tickSpacing;
        if (rounded < TickMath.MIN_TICK) {
            return rounded + tickSpacing;
        } else if (rounded > TickMath.MAX_TICK) {
            return rounded - tickSpacing;
        } else {
            return rounded;
        }
    }

    function estimateTickLowerUpper(
        int24 tick,
        int24 tickSpacing
    ) public pure returns (int24 tickLower, int24 tickUpper) {
        int24 roundedTick = calculateRoundedTick(tick, tickSpacing);
        tickLower = roundedTick - 2 * tickSpacing;
        tickUpper = roundedTick + 2 * tickSpacing;
    }

    function _mintAmounts(
        int24 tickCurrent,
        int24 tickLower,
        int24 tickUpper,
        uint160 sqrtRatioX96,
        uint128 liquidity
    ) internal pure returns (uint256 amount0, uint256 amount1) {
        if (tickCurrent < tickLower) {
            amount0 = SqrtPriceMath.getAmount0Delta(
                TickMath.getSqrtRatioAtTick(tickLower),
                TickMath.getSqrtRatioAtTick(tickUpper),
                liquidity,
                true
            );
            amount1 = 0;
        } else if (tickCurrent < tickUpper) {
            amount0 = SqrtPriceMath.getAmount0Delta(
                sqrtRatioX96,
                TickMath.getSqrtRatioAtTick(tickUpper),
                liquidity,
                true
            );
            amount1 = SqrtPriceMath.getAmount1Delta(
                TickMath.getSqrtRatioAtTick(tickLower),
                sqrtRatioX96,
                liquidity,
                true
            );
        } else {
            amount0 = 0;
            amount1 = SqrtPriceMath.getAmount1Delta(
                TickMath.getSqrtRatioAtTick(tickLower),
                TickMath.getSqrtRatioAtTick(tickUpper),
                liquidity,
                true
            );
        }
    }

    // estimate the new position should be minted given pool's current
    function estimateNewPosition()
        external
        view
        returns (
            uint24 fee,
            uint256 amount0Desired,
            uint256 amount1Desired,
            int24 tickLower,
            int24 tickUpper
        )
    {
        // get poolContract Info
        IUniswapV3Pool poolContract = IUniswapV3Pool(poolAddress);
        int24 tickSpacing = poolContract.tickSpacing();
        fee = poolContract.fee();
        (uint160 sqrtRatioX96, int24 tickCurrent, , , , , ) = poolContract
            .slot0();
        uint128 liquidityCurrent = poolContract.liquidity();
        // estimate tickLower, tickUpper
        (tickLower, tickUpper) = estimateTickLowerUpper(
            tickCurrent,
            tickSpacing
        );
        // amount0Desired, amount1Desired
        (amount0Desired, amount1Desired) = _mintAmounts(
            tickCurrent,
            tickLower,
            tickUpper,
            sqrtRatioX96,
            liquidityCurrent
        );
    }

    // external functions
    function mintNewPosition(
        uint24 fee,
        uint256 amount0Desired,
        uint256 amount1Desired,
        int24 tickLower,
        int24 tickUpper
    )
        external
        returns (
            uint256 tokenId,
            uint128 liquidityNew,
            uint256 amount0,
            uint256 amount1
        )
    {
        // owner --> contract --> positionManaer
        TransferHelper.safeTransferFrom(
            token0,
            msg.sender,
            address(this),
            amount0Desired
        );
        TransferHelper.safeTransferFrom(
            token1,
            msg.sender,
            address(this),
            amount1Desired
        );
        //
        TransferHelper.safeApprove(
            token0,
            address(positionManager),
            amount0Desired
        );
        TransferHelper.safeApprove(
            token1,
            address(positionManager),
            amount1Desired
        );
        // TODO: estimate amount0Min, amount1Min
        // params
        INonfungiblePositionManager.MintParams
            memory params = INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: fee,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp
            });
        // tokenId is important to check position later.
        // Pool will emit Mint(msg.sender, recipient, tickLower, tickUpper, amount, amount0, amount1)
        // PositionManager will emit IncreaseLiquidity(tokenId, liquidity, amount0, amount1)
        (tokenId, liquidityNew, amount0, amount1) = INonfungiblePositionManager(
            positionManager
        ).mint(params);
        //
        _createDeposit(msg.sender, tokenId);
        //
        if (amount0 < amount0Desired) {
            TransferHelper.safeApprove(token0, address(positionManager), 0);
            uint256 refund0 = amount0Desired - amount0;
            TransferHelper.safeTransfer(token0, msg.sender, refund0);
        }
        if (amount1 < amount1Desired) {
            TransferHelper.safeApprove(token1, address(positionManager), 0);
            uint256 refund1 = amount1Desired - amount1;
            TransferHelper.safeTransfer(token1, msg.sender, refund1);
        }
    }

    /// @notice Collects the fees associated with provided liquidity
    /// @dev The contract must hold the erc721 token before it can collect fees
    /// @param tokenId The id of the erc721 token
    /// @return amount0 The amount of fees collected in token0
    /// @return amount1 The amount of fees collected in token1
    function collectAllFees(
        uint256 tokenId
    ) external returns (uint256 amount0, uint256 amount1) {
        // Caller must own the ERC721 position
        // Call to safeTransfer will trigger `onERC721Received` which must return the selector else transfer will fail
        INonfungiblePositionManager(positionManager).safeTransferFrom(
            msg.sender,
            address(this),
            tokenId
        );

        // set amount0Max and amount1Max to uint256.max to collect all fees
        // alternatively can set recipient to msg.sender and avoid another transaction in `sendToOwner`
        INonfungiblePositionManager.CollectParams
            memory params = INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            });

        (amount0, amount1) = INonfungiblePositionManager(positionManager)
            .collect(params);

        // send collected feed back to owner
        _sendToOwner(tokenId, amount0, amount1);
    }

    /// @notice Transfers funds to owner of NFT
    /// @param tokenId The id of the erc721
    /// @param amount0 The amount of token0
    /// @param amount1 The amount of token1
    function _sendToOwner(
        uint256 tokenId,
        uint256 amount0,
        uint256 amount1
    ) internal {
        // get owner of contract
        address owner = deposits[tokenId].owner;
        address _token0 = deposits[tokenId].token0;
        address _token1 = deposits[tokenId].token1;
        // send collected fees to owner
        TransferHelper.safeTransfer(_token0, owner, amount0);
        TransferHelper.safeTransfer(_token1, owner, amount1);
    }

    /// @notice A function that decreases the current liquidity by half. An example to show how to call the `decreaseLiquidity` function defined in periphery.
    /// @param tokenId The id of the erc721 token
    /// @return amount0 The amount received back in token0
    /// @return amount1 The amount returned back in token1
    function decreaseLiquidityInHalf(
        uint256 tokenId
    ) external returns (uint256 amount0, uint256 amount1) {
        // caller must be the owner of the NFT
        require(msg.sender == deposits[tokenId].owner, "Not the owner");
        // get liquidity data for tokenId
        uint128 liquidity = deposits[tokenId].liquidity;
        uint128 halfLiquidity = liquidity / 2;

        // amount0Min and amount1Min are price slippage checks
        // if the amount received after burning is not greater than these minimums, transaction will fail
        INonfungiblePositionManager.DecreaseLiquidityParams
            memory params = INonfungiblePositionManager
                .DecreaseLiquidityParams({
                    tokenId: tokenId,
                    liquidity: halfLiquidity,
                    amount0Min: 0,
                    amount1Min: 0,
                    deadline: block.timestamp
                });

        (amount0, amount1) = INonfungiblePositionManager(positionManager)
            .decreaseLiquidity(params);

        //send liquidity back to owner
        _sendToOwner(tokenId, amount0, amount1);
    }

    /// @notice Increases liquidity in the current range
    /// @dev Pool must be initialized already to add liquidity
    /// @param tokenId The id of the erc721 token
    /// @param amount0 The amount to add of token0
    /// @param amount1 The amount to add of token1
    function increaseLiquidityCurrentRange(
        uint256 tokenId,
        uint256 amountAdd0,
        uint256 amountAdd1
    ) external returns (uint128 liquidity, uint256 amount0, uint256 amount1) {
        //
        // In production, amount0Min and amount1Min should be adjusted to create slippage protections.
        //
        INonfungiblePositionManager.IncreaseLiquidityParams
            memory params = INonfungiblePositionManager
                .IncreaseLiquidityParams({
                    tokenId: tokenId,
                    amount0Desired: amountAdd0,
                    amount1Desired: amountAdd1,
                    amount0Min: 0,
                    amount1Min: 0,
                    deadline: block.timestamp
                });

        (liquidity, amount0, amount1) = INonfungiblePositionManager(
            positionManager
        ).increaseLiquidity(params);
    }
}
