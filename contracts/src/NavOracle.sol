// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title NavOracle
/// @notice On-chain NAV (net asset value) feed for the tokenized fund. Price stored in cents
///         (100_000 = $1,000.00), matching the Stellar Soroban sibling POC.
///         The token contract calls `getPrice()` atomically during mint/burn/clawback — if no
///         price is set, `getPrice()` reverts and the entire token operation rolls back.
contract NavOracle is Ownable {
    uint256 private _price;
    bool public hasPrice;

    event PriceUpdated(address indexed admin, uint256 price, uint256 timestamp);
    event PriceCleared(address indexed admin, uint256 timestamp);

    error NoPriceSet();
    error PriceMustBePositive();

    constructor(address admin) Ownable(admin) {}

    /// @notice Set the NAV price in cents. Must be > 0.
    function updatePrice(uint256 price) external onlyOwner {
        if (price == 0) revert PriceMustBePositive();
        _price = price;
        hasPrice = true;
        emit PriceUpdated(msg.sender, price, block.timestamp);
    }

    /// @notice Get the NAV price in cents. Reverts if no price has been set.
    ///         Called cross-contract by the token contract during mint/burn/clawback;
    ///         a revert here rolls back the entire token transaction atomically.
    function getPrice() external view returns (uint256) {
        if (!hasPrice) revert NoPriceSet();
        return _price;
    }

    /// @notice Removes the price. Demonstrates oracle failure: subsequent mint/burn/clawback
    ///         calls on the token contract will revert atomically.
    function clearPrice() external onlyOwner {
        _price = 0;
        hasPrice = false;
        emit PriceCleared(msg.sender, block.timestamp);
    }
}
