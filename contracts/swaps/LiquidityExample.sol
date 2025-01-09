// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity =0.7.6;
pragma abicoder v2;

import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';
import '@uniswap/v3-core/contracts/libraries/TickMath.sol';
import '@uniswap/v3-core/contracts/libraries/FullMath.sol';
import '@uniswap/v3-core/contracts/libraries/SqrtPriceMath.sol';
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';

import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/base/LiquidityManagement.sol';
import '@uniswap/v3-periphery/contracts/libraries/LiquidityAmounts.sol';

contract LiquidityExample is IERC721Receiver {
  // states
  uint24 public constant poolFee = 10000;
  address public token0;
  address public token1;
  //
  address public immutable poolAddress;
  address public immutable positionManager;

  //
  constructor(address _positionManager, address _token0, address _token1, address _poolAddress) {
    positionManager = _positionManager;
    token0 = _token0;
    token1 = _token1;
    poolAddress = _poolAddress;
  }

  //
  struct Deposit {
    address owner;
    uint128 liquidity;
  }
  // key is tokenId for checking position information from PositionManager
  // a pool can have multiple tokenId or just have one tokenId for simplicity.
  mapping(uint256 => Deposit) public deposits;
  // for this pool's request tokenIds
  mapping(string => uint256) public requestTokenIds;

  // events
  // requestId for link on-chain events between off-chain transaction records
  event MintPosition(
    string indexed requestId,
    uint256 indexed tokenId,
    address indexed poolAddress,
    address sender,
    uint128 liquidity,
    uint256 amount0,
    uint256 amount1
  );

  event IncreaseLiquidity(
    string indexed requestId,
    uint256 indexed tokenId,
    address indexed poolAddress,
    uint128 liquidity,
    uint256 amount0,
    uint256 amount1
  );

  event DecreaseLiquidity(
    string indexed requestId,
    uint256 indexed tokenId,
    address indexed poolAddress,
    uint128 liquidity,
    uint256 amount0,
    uint256 amount1
  );

  event CollectFee(
    string indexed requestId,
    uint256 indexed tokenId,
    address indexed poolAddress,
    address owner,
    uint256 amount0,
    uint256 amount1
  );

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
    INonfungiblePositionManager nft = INonfungiblePositionManager(positionManager);
    (, , , , , , , uint128 liquidity, , , , ) = nft.positions(tokenId);
    deposits[tokenId] = Deposit({ owner: owner, liquidity: liquidity });
  }

  // populate liquidity
  function deposit(uint256 tokenId) external {
    _createDeposit(msg.sender, tokenId);
  }

  // calculateRoundedTick to find the nearest tick
  function calculateRoundedTick(int24 tick, int24 tickSpacing) public pure returns (int24) {
    int24 rounded = (tick / tickSpacing) * tickSpacing;
    if (rounded < TickMath.MIN_TICK) {
      return rounded + tickSpacing;
    } else if (rounded > TickMath.MAX_TICK) {
      return rounded - tickSpacing;
    } else {
      return rounded;
    }
  }

  // estimateTickLowerUpper to estimate tick boundry given the nearest tick
  function estimateTickLowerUpper(
    int24 tick,
    int24 tickSpacing,
    int24 tickOffset
  ) internal pure returns (int24 tickLower, int24 tickUpper) {
    int24 roundedTick = calculateRoundedTick(tick, tickSpacing);
    tickLower = roundedTick - tickOffset * tickSpacing;
    tickUpper = roundedTick + tickOffset * tickSpacing;
  }

  // caluclate amounts to mint given tick boundry.
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
      amount0 = SqrtPriceMath.getAmount0Delta(sqrtRatioX96, TickMath.getSqrtRatioAtTick(tickUpper), liquidity, true);
      amount1 = SqrtPriceMath.getAmount1Delta(TickMath.getSqrtRatioAtTick(tickLower), sqrtRatioX96, liquidity, true);
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
  function estimateNewPosition(
    int24 tickOffset
  )
    external
    view
    returns (uint256 amount0Desired, uint256 amount1Desired, int24 tickLower, int24 tickUpper, uint160 sqrtRatioX96)
  {
    // get poolContract Info
    IUniswapV3Pool poolContract = IUniswapV3Pool(poolAddress);
    int24 tickSpacing = poolContract.tickSpacing();
    (uint160 _sqrtRatioX96, int24 tickCurrent, , , , , ) = poolContract.slot0();
    //
    sqrtRatioX96 = _sqrtRatioX96;
    uint128 liquidityCurrent = poolContract.liquidity();
    // estimate tickLower, tickUpper
    (tickLower, tickUpper) = estimateTickLowerUpper(tickCurrent, tickSpacing, tickOffset);
    // amount0Desired, amount1Desired
    (amount0Desired, amount1Desired) = _mintAmounts(tickCurrent, tickLower, tickUpper, sqrtRatioX96, liquidityCurrent);
  }

  // external functions
  // mintNewPosition to mint new position for token pair and add liqudity
  function mintNewPosition(
    string calldata requestId,
    uint256 amount0Desired,
    uint256 amount1Desired,
    int24 tickLower,
    int24 tickUpper
  ) external returns (uint256 tokenId, uint128 liquidityNew, uint256 amount0, uint256 amount1) {
    // TODO: check balance
    IUniswapV3Pool poolContract = IUniswapV3Pool(poolAddress);
    uint24 fee = poolContract.fee();
    // owner --> contract --> positionManaer
    TransferHelper.safeTransferFrom(token0, msg.sender, address(this), amount0Desired);
    TransferHelper.safeApprove(token0, positionManager, amount0Desired);
    //
    TransferHelper.safeTransferFrom(token1, msg.sender, address(this), amount1Desired);
    TransferHelper.safeApprove(token1, positionManager, amount1Desired);
    // TODO: estimate amount0Min, amount1Min
    // params
    INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
      token0: token0,
      token1: token1,
      fee: fee,
      tickLower: tickLower,
      tickUpper: tickUpper,
      amount0Desired: amount0Desired,
      amount1Desired: amount1Desired,
      amount0Min: 0,
      amount1Min: 0,
      recipient: address(this), // NFT owner
      deadline: block.timestamp
    });
    // tokenId is important to check position later.
    // Pool will emit Mint(msg.sender, recipient, tickLower, tickUpper, amount, amount0, amount1)
    // PositionManager will emit IncreaseLiquidity(tokenId, liquidity, amount0, amount1)
    (tokenId, liquidityNew, amount0, amount1) = INonfungiblePositionManager(positionManager).mint(params);
    emit MintPosition(requestId, tokenId, poolAddress, msg.sender, liquidityNew, amount0, amount1);
    //
    requestTokenIds[requestId] = tokenId;
    // owner is to caller
    _createDeposit(msg.sender, tokenId);
    //
    if (amount0 < amount0Desired) {
      TransferHelper.safeApprove(token0, positionManager, 0);
      uint256 refund0 = amount0Desired - amount0;
      TransferHelper.safeTransfer(token0, msg.sender, refund0);
    }
    if (amount1 < amount1Desired) {
      TransferHelper.safeApprove(token1, positionManager, 0);
      uint256 refund1 = amount1Desired - amount1;
      TransferHelper.safeTransfer(token1, msg.sender, refund1);
    }
  }

  // current holding amounts of token0, token1.
  function currentHoldings(
    uint128 tokenId
  )
    external
    view
    returns (
      uint256 amount0,
      uint256 amount1,
      uint160 sqrtRatioX96,
      uint128 liquidity,
      int24 tickLower,
      int24 tickUpper,
      uint128 tokensOwed0,
      uint128 tokensOwed1
    )
  {
    INonfungiblePositionManager nft = INonfungiblePositionManager(positionManager);
    // (uint96 nonce, address operator, address token0, address token1, uint24 fee,
    // int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128,
    // uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)
    (, , , , , tickLower, tickUpper, liquidity, , , tokensOwed0, tokensOwed1) = nft.positions(tokenId);
    //
    IUniswapV3Pool poolContract = IUniswapV3Pool(poolAddress);
    (sqrtRatioX96, , , , , , ) = poolContract.slot0();
    //
    uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(tickLower);
    uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(tickUpper);
    //
    (amount0, amount1) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, liquidity);
  }

  /// @notice Collects the fees associated with provided liquidity
  /// @dev The contract must hold the erc721 token before it can collect fees
  /// @param tokenId The id of the erc721 token
  /// @return amount0 The amount of fees collected in token0
  /// @return amount1 The amount of fees collected in token1
  function collectAllFees(
    string calldata requestId,
    uint256 tokenId
  ) external returns (uint256 amount0, uint256 amount1) {
    // require(deposits[tokenId].owner != address(0), 'TokenId not found');
    // caller must be the owner of the NFT
    // require(msg.sender == deposits[tokenId].owner, 'Not the owner');
    // Caller must own the ERC721 position
    // Call to safeTransfer will trigger `onERC721Received` which must return the selector else transfer will fail

    INonfungiblePositionManager nfpm = INonfungiblePositionManager(positionManager);
    nfpm.approve(msg.sender, tokenId);
    // set amount0Max and amount1Max to uint256.max to collect all fees
    // alternatively can set recipient to msg.sender and avoid another transaction in `sendToOwner`
    INonfungiblePositionManager.CollectParams memory params = INonfungiblePositionManager.CollectParams({
      tokenId: tokenId,
      recipient: address(this),
      amount0Max: type(uint128).max,
      amount1Max: type(uint128).max
    });

    (amount0, amount1) = nfpm.collect(params);

    // send collected feed back to owner
    _sendToOwner(tokenId, amount0, amount1);
    //
    emit CollectFee(requestId, tokenId, poolAddress, msg.sender, amount0, amount1);
  }

  /// @notice Transfers funds to owner of NFT
  /// @param tokenId The id of the erc721
  /// @param amount0 The amount of token0
  /// @param amount1 The amount of token1
  function _sendToOwner(uint256 tokenId, uint256 amount0, uint256 amount1) internal {
    // get owner of contract
    address owner = deposits[tokenId].owner;
    //
    TransferHelper.safeTransfer(token0, owner, amount0);
    TransferHelper.safeTransfer(token1, owner, amount1);
    //
  }

  // estimateDescreaseLiquidity to get correct amount0Min, amount1Min
  // for slippage protection
  function estimateDescreaseLiquidity(
    uint256 tokenId,
    uint24 percentage,
    uint128 change
  ) external view returns (uint256 amount0Min, uint256 amount1Min, uint128 liquidityToChange) {
    require(deposits[tokenId].owner != address(0), 'TokenId not found');
    // caller must be the owner of the NFT
    require(msg.sender == deposits[tokenId].owner, 'Not the owner');
    // get liquidity data for tokenId
    uint128 _liquidityToChange = change;
    if (percentage > 0) {
      uint128 liquidity = deposits[tokenId].liquidity;
      _liquidityToChange = uint128(FullMath.mulDiv(uint256(liquidity), uint256(percentage), 100));
    }
    //
    INonfungiblePositionManager nfpm = INonfungiblePositionManager(positionManager);
    //
    (uint160 sqrtRatioX96, , , , , , ) = IUniswapV3Pool(poolAddress).slot0();
    (, , , , , int24 lowerTick, int24 upperTick, , , , , ) = nfpm.positions(tokenId);
    //estimate amounts on current spot price
    (amount0Min, amount1Min) = LiquidityAmounts.getAmountsForLiquidity(
      sqrtRatioX96,
      TickMath.getSqrtRatioAtTick(lowerTick),
      TickMath.getSqrtRatioAtTick(upperTick),
      _liquidityToChange
    );
    liquidityToChange = _liquidityToChange;
  }

  /// @notice A function that decreases the current liquidity by percentage or change amount.
  /// @param tokenId The id of the erc721 token
  /// @return amount0 The amount received back in token0
  /// @return amount1 The amount returned back in token1
  function decreaseLiquidity(
    string calldata requestId,
    uint256 tokenId,
    uint256 amount0Min,
    uint256 amount1Min,
    uint128 liquidityToChange
  ) external returns (uint256 amount0, uint256 amount1) {
    require(deposits[tokenId].owner != address(0), 'TokenId not found');
    // caller must be the owner of the NFT
    require(msg.sender == deposits[tokenId].owner, 'Not the owner');
    //
    INonfungiblePositionManager nfpm = INonfungiblePositionManager(positionManager);
    // amount0Min and amount1Min are price slippage checks
    // if the amount received after burning is not greater than these minimums, transaction will fail
    INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager
      .DecreaseLiquidityParams({
        tokenId: tokenId,
        liquidity: liquidityToChange,
        amount0Min: amount0Min,
        amount1Min: amount1Min,
        deadline: block.timestamp
      });

    (amount0, amount1) = nfpm.decreaseLiquidity(params);
    // Collect the decreased liquidity to trigger the real transfer from Pool to recipient.
    nfpm.collect(
      INonfungiblePositionManager.CollectParams({
        tokenId: tokenId,
        recipient: address(this),
        amount0Max: uint128(amount0),
        amount1Max: uint128(amount1)
      })
    );
    //send liquidity back to owner
    _sendToOwner(tokenId, amount0, amount1);
    //
    // the changed values
    emit DecreaseLiquidity(requestId, tokenId, poolAddress, liquidityToChange, amount0, amount1);
  }

  /// @notice Increases liquidity in the current range
  /// @dev Pool must be initialized already to add liquidity
  /// @param tokenId The id of the erc721 token
  /// @param amount0 The amount to add of token0
  /// @param amount1 The amount to add of token1
  function increaseLiquidityCurrentRange(
    string calldata requestId,
    uint256 tokenId,
    uint256 amountAdd0,
    uint256 amountAdd1
  ) external returns (uint128 liquidity, uint256 amount0, uint256 amount1) {
    require(deposits[tokenId].owner != address(0), 'TokenId not found');
    require(msg.sender == deposits[tokenId].owner, 'Not the owner');
    //
    // In production, amountAdd0, amount0Min and amountAdd1, amount1Min should be adjusted to create slippage protections.
    //
    // owner --> contract --> positionManaer
    TransferHelper.safeTransferFrom(token0, msg.sender, address(this), amountAdd0);
    TransferHelper.safeApprove(token0, positionManager, amountAdd0);
    //
    TransferHelper.safeTransferFrom(token1, msg.sender, address(this), amountAdd1);
    TransferHelper.safeApprove(token1, positionManager, amountAdd1);
    //
    INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager
      .IncreaseLiquidityParams({
        tokenId: tokenId,
        amount0Desired: amountAdd0,
        amount1Desired: amountAdd1,
        amount0Min: 0,
        amount1Min: 0,
        deadline: block.timestamp
      });

    (liquidity, amount0, amount1) = INonfungiblePositionManager(positionManager).increaseLiquidity(params);
    // the incremental values
    emit IncreaseLiquidity(requestId, tokenId, poolAddress, liquidity, amount0, amount1);
    // refund
    if (amount0 < amountAdd0) {
      TransferHelper.safeApprove(token0, positionManager, 0);
      uint256 refund0 = amountAdd0 - amount0;
      TransferHelper.safeTransfer(token0, msg.sender, refund0);
    }
    if (amount1 < amountAdd1) {
      TransferHelper.safeApprove(token1, positionManager, 0);
      uint256 refund1 = amountAdd1 - amount1;
      TransferHelper.safeTransfer(token1, msg.sender, refund1);
    }
  }
}
