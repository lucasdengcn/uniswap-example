// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity >=0.7.6 <0.9.0;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@uniswap/v3-core/contracts/libraries/FullMath.sol';
import '@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol';

library MathUtils {
  uint256 private constant _EXPO_2_192 = 2 ** 192;
  uint256 private constant _EXPO_2_96 = 2 ** 96;

  /**
   * @dev Returns the square root of a number. If the number is not a perfect square, the value is rounded
   * towards zero.
   *
   * This method is based on Newton's method for computing square roots; the algorithm is restricted to only
   * using integer operations.
   */
  function sqrt(uint256 a) public pure returns (uint256) {
    //unchecked {
    // Take care of easy edge cases when a == 0 or a == 1
    if (a <= 1) {
      return a;
    }

    // In this function, we use Newton's method to get a root of `f(x) := x² - a`. It involves building a
    // sequence x_n that converges toward sqrt(a). For each iteration x_n, we also define the error between
    // the current value as `ε_n = | x_n - sqrt(a) |`.
    //
    // For our first estimation, we consider `e` the smallest power of 2 which is bigger than the square root
    // of the target. (i.e. `2**(e-1) ≤ sqrt(a) < 2**e`). We know that `e ≤ 128` because `(2¹²⁸)² = 2²⁵⁶` is
    // bigger than any uint256.
    //
    // By noticing that
    // `2**(e-1) ≤ sqrt(a) < 2**e → (2**(e-1))² ≤ a < (2**e)² → 2**(2*e-2) ≤ a < 2**(2*e)`
    // we can deduce that `e - 1` is `log2(a) / 2`. We can thus compute `x_n = 2**(e-1)` using a method similar
    // to the msb function.
    uint256 aa = a;
    uint256 xn = 1;

    if (aa >= (1 << 128)) {
      aa >>= 128;
      xn <<= 64;
    }
    if (aa >= (1 << 64)) {
      aa >>= 64;
      xn <<= 32;
    }
    if (aa >= (1 << 32)) {
      aa >>= 32;
      xn <<= 16;
    }
    if (aa >= (1 << 16)) {
      aa >>= 16;
      xn <<= 8;
    }
    if (aa >= (1 << 8)) {
      aa >>= 8;
      xn <<= 4;
    }
    if (aa >= (1 << 4)) {
      aa >>= 4;
      xn <<= 2;
    }
    if (aa >= (1 << 2)) {
      xn <<= 1;
    }

    // We now have x_n such that `x_n = 2**(e-1) ≤ sqrt(a) < 2**e = 2 * x_n`. This implies ε_n ≤ 2**(e-1).
    //
    // We can refine our estimation by noticing that the middle of that interval minimizes the error.
    // If we move x_n to equal 2**(e-1) + 2**(e-2), then we reduce the error to ε_n ≤ 2**(e-2).
    // This is going to be our x_0 (and ε_0)
    xn = (3 * xn) >> 1; // ε_0 := | x_0 - sqrt(a) | ≤ 2**(e-2)

    // From here, Newton's method give us:
    // x_{n+1} = (x_n + a / x_n) / 2
    //
    // One should note that:
    // x_{n+1}² - a = ((x_n + a / x_n) / 2)² - a
    //              = ((x_n² + a) / (2 * x_n))² - a
    //              = (x_n⁴ + 2 * a * x_n² + a²) / (4 * x_n²) - a
    //              = (x_n⁴ + 2 * a * x_n² + a² - 4 * a * x_n²) / (4 * x_n²)
    //              = (x_n⁴ - 2 * a * x_n² + a²) / (4 * x_n²)
    //              = (x_n² - a)² / (2 * x_n)²
    //              = ((x_n² - a) / (2 * x_n))²
    //              ≥ 0
    // Which proves that for all n ≥ 1, sqrt(a) ≤ x_n
    //
    // This gives us the proof of quadratic convergence of the sequence:
    // ε_{n+1} = | x_{n+1} - sqrt(a) |
    //         = | (x_n + a / x_n) / 2 - sqrt(a) |
    //         = | (x_n² + a - 2*x_n*sqrt(a)) / (2 * x_n) |
    //         = | (x_n - sqrt(a))² / (2 * x_n) |
    //         = | ε_n² / (2 * x_n) |
    //         = ε_n² / | (2 * x_n) |
    //
    // For the first iteration, we have a special case where x_0 is known:
    // ε_1 = ε_0² / | (2 * x_0) |
    //     ≤ (2**(e-2))² / (2 * (2**(e-1) + 2**(e-2)))
    //     ≤ 2**(2*e-4) / (3 * 2**(e-1))
    //     ≤ 2**(e-3) / 3
    //     ≤ 2**(e-3-log2(3))
    //     ≤ 2**(e-4.5)
    //
    // For the following iterations, we use the fact that, 2**(e-1) ≤ sqrt(a) ≤ x_n:
    // ε_{n+1} = ε_n² / | (2 * x_n) |
    //         ≤ (2**(e-k))² / (2 * 2**(e-1))
    //         ≤ 2**(2*e-2*k) / 2**e
    //         ≤ 2**(e-2*k)
    xn = (xn + a / xn) >> 1; // ε_1 := | x_1 - sqrt(a) | ≤ 2**(e-4.5)  -- special case, see above
    xn = (xn + a / xn) >> 1; // ε_2 := | x_2 - sqrt(a) | ≤ 2**(e-9)    -- general case with k = 4.5
    xn = (xn + a / xn) >> 1; // ε_3 := | x_3 - sqrt(a) | ≤ 2**(e-18)   -- general case with k = 9
    xn = (xn + a / xn) >> 1; // ε_4 := | x_4 - sqrt(a) | ≤ 2**(e-36)   -- general case with k = 18
    xn = (xn + a / xn) >> 1; // ε_5 := | x_5 - sqrt(a) | ≤ 2**(e-72)   -- general case with k = 36
    xn = (xn + a / xn) >> 1; // ε_6 := | x_6 - sqrt(a) | ≤ 2**(e-144)  -- general case with k = 72

    // Because e ≤ 128 (as discussed during the first estimation phase), we know have reached a precision
    // ε_6 ≤ 2**(e-144) < 1. Given we're operating on integers, then we can ensure that xn is now either
    // sqrt(a) or sqrt(a) + 1.
    return xn - toUint(xn > a / xn);
    //}
  }

  /**
   * @dev Cast a boolean (false or true) to a uint256 (0 or 1) with no jump.
   */
  function toUint(bool b) internal pure returns (uint256 u) {
    assembly {
      u := iszero(iszero(b))
    }
  }

  /// given a Pool (token0,token1,fee)
  /// @param sqrtPriceX96 the sqrtPriceX96 of token pair, sqrtPriceX96 is in token1/token0 form.
  /// @param decimal0 token0 decmial places
  /// @param decimal1 token1 decimal places
  /// @return price0 human readable price of token0, in terms of token0/token1, then price1 = 1/price0
  //
  function sqrtPriceX96ToPrice0(
    uint160 sqrtPriceX96,
    uint8 decimal0,
    uint8 decimal1
  ) public pure returns (uint256 price0) {
    uint256 numerator = FullMath.mulDiv(sqrtPriceX96, sqrtPriceX96, _EXPO_2_192); // token1/token0
    uint256 denominator = 10 ** (decimal1 - decimal0);
    price0 = SafeMath.div(denominator, numerator); // token0/token1
  }
}