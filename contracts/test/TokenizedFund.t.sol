// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {NavOracle} from "../src/NavOracle.sol";
import {TokenizedFund} from "../src/TokenizedFund.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

contract TokenizedFundTest is Test {
    NavOracle oracle;
    TokenizedFund fund;
    address admin = makeAddr("admin");
    address user = makeAddr("user");
    address user2 = makeAddr("user2");
    address attacker = makeAddr("attacker");

    function setUp() public {
        oracle = new NavOracle(admin);
        vm.prank(admin);
        oracle.updatePrice(100_000); // $1,000.00
        fund = new TokenizedFund(admin, "Tokenized Real Estate Fund Series A", address(oracle));
    }

    // ─── Initialization ────────────────────────────────────────────────────

    function test_initialize_sets_admin_and_oracle() public view {
        assertEq(fund.admin(), admin);
        assertEq(fund.getOracle(), address(oracle));
        assertEq(fund.circulatingSupply(), 0);
        assertFalse(fund.isApproved(user));
    }

    function test_metadata_returns_stored_values() public view {
        TokenizedFund.AssetMetadata memory m = fund.getMetadata();
        assertEq(m.assetType, "real-estate");
        assertEq(m.totalSupplyCap, 1_000_000);
        assertEq(m.minInvestment, 1000);
        assertEq(m.region, "Dallas");
        assertEq(m.country, "TX");
        assertEq(m.isin, "US0231351067");
    }

    function test_decimals_is_zero() public view {
        assertEq(fund.decimals(), 0);
    }

    // ─── KYC ───────────────────────────────────────────────────────────────

    function test_admin_can_approve_user() public {
        vm.prank(admin);
        fund.approveUser(user);
        assertTrue(fund.isApproved(user));
    }

    function test_non_admin_cannot_approve() public {
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker)
        );
        fund.approveUser(user);
    }

    function test_unapproved_user_cannot_be_minted_to() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(TokenizedFund.UserNotApproved.selector, user)
        );
        fund.mint(user, 100);
    }

    // ─── Mint ──────────────────────────────────────────────────────────────

    function test_admin_can_approve_and_mint() public {
        vm.prank(admin);
        fund.approveUser(user);
        vm.prank(admin);
        uint256 newBalance = fund.mint(user, 500);
        assertEq(newBalance, 500);
        assertEq(fund.balanceOf(user), 500);
        assertEq(fund.circulatingSupply(), 500);
    }

    function test_mint_records_oracle_price_in_event() public {
        vm.prank(admin);
        fund.approveUser(user);
        vm.prank(admin);
        oracle.updatePrice(125_000);

        vm.expectEmit(true, true, false, true, address(fund));
        emit TokenizedFund.Minted(admin, user, 10, 10, 10, 125_000, block.timestamp);
        vm.prank(admin);
        fund.mint(user, 10);
    }

    function test_cannot_mint_beyond_total_supply() public {
        vm.prank(admin);
        fund.approveUser(user);
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(ERC20Capped.ERC20ExceededCap.selector, 1_000_001, 1_000_000)
        );
        fund.mint(user, 1_000_001);
    }

    function test_non_admin_cannot_mint() public {
        vm.prank(admin);
        fund.approveUser(user);
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker)
        );
        fund.mint(user, 100);
    }

    // ─── Burn ──────────────────────────────────────────────────────────────

    function test_burn_reduces_balance_and_circulating_supply() public {
        vm.startPrank(admin);
        fund.approveUser(user);
        fund.mint(user, 500);
        uint256 newBalance = fund.burn(user, 200);
        vm.stopPrank();
        assertEq(newBalance, 300);
        assertEq(fund.balanceOf(user), 300);
        assertEq(fund.circulatingSupply(), 300);
    }

    function test_cannot_burn_more_than_balance() public {
        vm.startPrank(admin);
        fund.approveUser(user);
        fund.mint(user, 100);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, user, 100, 200)
        );
        fund.burn(user, 200);
        vm.stopPrank();
    }

    // ─── Clawback ──────────────────────────────────────────────────────────

    function test_clawback_works() public {
        vm.startPrank(admin);
        fund.approveUser(user);
        fund.mint(user, 500);
        uint256 newBalance = fund.clawback(user, 100, "sanctions", 9, 20260515001);
        vm.stopPrank();
        assertEq(newBalance, 400);
        assertEq(fund.balanceOf(user), 400);
        assertEq(fund.circulatingSupply(), 400);
    }

    function test_cannot_clawback_more_than_balance() public {
        vm.startPrank(admin);
        fund.approveUser(user);
        fund.mint(user, 100);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, user, 100, 200)
        );
        fund.clawback(user, 200, "fraud", 5, 20260515002);
        vm.stopPrank();
    }

    function test_clawback_works_even_after_kyc_revoked_conceptually() public {
        // In our design, burning bypasses the KYC `_update` check by setting `to == address(0)`,
        // so clawback succeeds even for users we never re-approve.
        vm.startPrank(admin);
        fund.approveUser(user);
        fund.mint(user, 100);
        // (We don't have a revoke method; the property under test is that burn/clawback don't
        // *require* the approved gate on `from` when `to == 0`.)
        fund.clawback(user, 50, "compliance", 5, 1);
        vm.stopPrank();
        assertEq(fund.balanceOf(user), 50);
    }

    // ─── Multi-investor supply tracking ────────────────────────────────────

    function test_circulating_supply_tracks_across_multiple_investors() public {
        vm.startPrank(admin);
        fund.approveUser(user);
        fund.approveUser(user2);
        fund.mint(user, 300);
        fund.mint(user2, 200);
        vm.stopPrank();
        assertEq(fund.circulatingSupply(), 500);

        vm.prank(admin);
        fund.burn(user, 100);
        assertEq(fund.circulatingSupply(), 400);
    }

    // ─── Peer-to-peer transfer (KYC enforced) ──────────────────────────────

    function test_transfer_between_kyc_users_succeeds() public {
        vm.startPrank(admin);
        fund.approveUser(user);
        fund.approveUser(user2);
        fund.mint(user, 100);
        vm.stopPrank();
        vm.prank(user);
        fund.transfer(user2, 30);
        assertEq(fund.balanceOf(user), 70);
        assertEq(fund.balanceOf(user2), 30);
    }

    function test_transfer_to_non_kyc_user_reverts() public {
        vm.startPrank(admin);
        fund.approveUser(user);
        fund.mint(user, 100);
        vm.stopPrank();
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(TokenizedFund.UserNotApproved.selector, user2));
        fund.transfer(user2, 30);
    }

    function test_transfer_from_non_kyc_user_reverts() public {
        // Mint to user1, then have admin approve user2, then revoke... we can't revoke;
        // so we test the symmetric path: user2 (no KYC) attempts transfer to user (KYC'd).
        // user2 has 0 balance but the check runs before the balance check.
        vm.startPrank(admin);
        fund.approveUser(user);
        vm.stopPrank();
        vm.prank(user2);
        vm.expectRevert(abi.encodeWithSelector(TokenizedFund.UserNotApproved.selector, user2));
        fund.transfer(user, 1);
    }

    // ─── Oracle failure / atomicity ────────────────────────────────────────

    function test_mint_reverts_when_oracle_has_no_price() public {
        vm.prank(admin);
        oracle.clearPrice();
        vm.prank(admin);
        fund.approveUser(user);
        vm.prank(admin);
        vm.expectRevert(NavOracle.NoPriceSet.selector);
        fund.mint(user, 100);
    }

    function test_burn_reverts_when_oracle_has_no_price() public {
        vm.startPrank(admin);
        fund.approveUser(user);
        fund.mint(user, 100);
        vm.stopPrank();

        vm.prank(admin);
        oracle.clearPrice();

        vm.prank(admin);
        vm.expectRevert(NavOracle.NoPriceSet.selector);
        fund.burn(user, 50);
    }

    function test_clawback_reverts_when_oracle_has_no_price() public {
        vm.startPrank(admin);
        fund.approveUser(user);
        fund.mint(user, 100);
        vm.stopPrank();

        vm.prank(admin);
        oracle.clearPrice();

        vm.prank(admin);
        vm.expectRevert(NavOracle.NoPriceSet.selector);
        fund.clawback(user, 50, "audit", 5, 1);
    }

    function test_balance_unchanged_after_oracle_failure() public {
        vm.startPrank(admin);
        fund.approveUser(user);
        fund.mint(user, 100);
        vm.stopPrank();
        assertEq(fund.balanceOf(user), 100);
        assertEq(fund.circulatingSupply(), 100);

        vm.prank(admin);
        oracle.clearPrice();

        vm.prank(admin);
        vm.expectRevert(NavOracle.NoPriceSet.selector);
        fund.burn(user, 50);

        // Atomicity: balance and supply unchanged.
        assertEq(fund.balanceOf(user), 100);
        assertEq(fund.circulatingSupply(), 100);
    }

    function test_mint_resumes_after_oracle_price_restored() public {
        vm.prank(admin);
        fund.approveUser(user);
        vm.prank(admin);
        oracle.clearPrice();

        vm.prank(admin);
        vm.expectRevert(NavOracle.NoPriceSet.selector);
        fund.mint(user, 100);

        vm.prank(admin);
        oracle.updatePrice(110_000); // $1,100.00
        vm.prank(admin);
        fund.mint(user, 100);
        assertEq(fund.balanceOf(user), 100);
    }

    // ─── Admin immutability ────────────────────────────────────────────────

    function test_admin_cannot_transfer_ownership() public {
        vm.prank(admin);
        vm.expectRevert(TokenizedFund.AdminImmutable.selector);
        fund.transferOwnership(attacker);
    }

    function test_admin_cannot_renounce_ownership() public {
        vm.prank(admin);
        vm.expectRevert(TokenizedFund.AdminImmutable.selector);
        fund.renounceOwnership();
    }

    // ─── Fuzz ──────────────────────────────────────────────────────────────

    function testFuzz_mint_never_exceeds_total_supply(uint256 amount) public {
        amount = bound(amount, 1, 5_000_000); // include over-cap values
        vm.prank(admin);
        fund.approveUser(user);

        if (amount <= 1_000_000) {
            vm.prank(admin);
            fund.mint(user, amount);
            assertLe(fund.circulatingSupply(), 1_000_000);
        } else {
            vm.prank(admin);
            vm.expectRevert(
                abi.encodeWithSelector(ERC20Capped.ERC20ExceededCap.selector, amount, 1_000_000)
            );
            fund.mint(user, amount);
        }
    }

    function testFuzz_approval_is_permanent_under_repeated_approvals(uint8 noisyCount) public {
        vm.prank(admin);
        fund.approveUser(user);
        for (uint8 i = 0; i < noisyCount; i++) {
            address other = makeAddr(string.concat("noise", vm.toString(i)));
            vm.prank(admin);
            fund.approveUser(other);
        }
        assertTrue(fund.isApproved(user));
    }
}
