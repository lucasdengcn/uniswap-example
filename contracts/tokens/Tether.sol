// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity >=0.7.6 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Tether is ERC20, Ownable {
    constructor() ERC20("Tether", "USDT") {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
