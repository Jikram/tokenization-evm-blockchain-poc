// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {NavOracle} from "../src/NavOracle.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract NavOracleTest is Test {
    NavOracle oracle;
    address admin = makeAddr("admin");
    address attacker = makeAddr("attacker");

    function setUp() public {
        oracle = new NavOracle(admin);
    }

    function test_initialize_sets_admin_and_no_price() public view {
        assertEq(oracle.owner(), admin);
        assertFalse(oracle.hasPrice());
    }

    function test_update_and_get_price() public {
        vm.prank(admin);
        oracle.updatePrice(100_000);
        assertTrue(oracle.hasPrice());
        assertEq(oracle.getPrice(), 100_000);
    }

    function test_price_update_replaces_old_price() public {
        vm.prank(admin);
        oracle.updatePrice(100_000);
        vm.prank(admin);
        oracle.updatePrice(125_000);
        assertEq(oracle.getPrice(), 125_000);
    }

    function test_get_price_without_set_reverts() public {
        vm.expectRevert(NavOracle.NoPriceSet.selector);
        oracle.getPrice();
    }

    function test_clear_price() public {
        vm.prank(admin);
        oracle.updatePrice(100_000);
        assertTrue(oracle.hasPrice());
        vm.prank(admin);
        oracle.clearPrice();
        assertFalse(oracle.hasPrice());
    }

    function test_get_price_after_clear_reverts() public {
        vm.prank(admin);
        oracle.updatePrice(100_000);
        vm.prank(admin);
        oracle.clearPrice();
        vm.expectRevert(NavOracle.NoPriceSet.selector);
        oracle.getPrice();
    }

    function test_non_admin_cannot_update_price() public {
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker)
        );
        oracle.updatePrice(100_000);
    }

    function test_non_admin_cannot_clear_price() public {
        vm.prank(admin);
        oracle.updatePrice(100_000);
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker)
        );
        oracle.clearPrice();
    }

    function test_zero_price_rejected() public {
        vm.prank(admin);
        vm.expectRevert(NavOracle.PriceMustBePositive.selector);
        oracle.updatePrice(0);
    }

    function test_price_updated_event_fired() public {
        vm.expectEmit(true, false, false, false, address(oracle));
        emit NavOracle.PriceUpdated(admin, 100_000, block.timestamp);
        vm.prank(admin);
        oracle.updatePrice(100_000);
    }
}
