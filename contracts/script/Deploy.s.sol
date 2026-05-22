// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {NavOracle} from "../src/NavOracle.sol";
import {TokenizedFund} from "../src/TokenizedFund.sol";

/// @notice Deploys NavOracle, sets the initial price, then deploys TokenizedFund pointing
///         at the oracle. Mirrors the Stellar POC's `deploy-full.sh` orchestration.
///
/// Required env vars:
///   PRIVATE_KEY        — deployer + admin private key
///   INITIAL_PRICE      — NAV price in cents (e.g. 100000 = $1,000.00)
///   ASSET_NAME         — name of the tokenized fund (e.g. "Tokenized Real Estate Fund Series A")
contract Deploy is Script {
    function run() external returns (address oracleAddr, address fundAddr) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        uint256 initialPrice = vm.envUint("INITIAL_PRICE");
        string memory assetName = vm.envString("ASSET_NAME");
        address admin = vm.addr(pk);

        vm.startBroadcast(pk);
        NavOracle oracle = new NavOracle(admin);
        oracle.updatePrice(initialPrice);
        TokenizedFund fund = new TokenizedFund(admin, assetName, address(oracle));
        vm.stopBroadcast();

        console2.log("NavOracle:    ", address(oracle));
        console2.log("TokenizedFund:", address(fund));
        console2.log("Admin:        ", admin);
        console2.log("Initial NAV:  ", initialPrice);

        return (address(oracle), address(fund));
    }
}
