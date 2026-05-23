// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface INavOracle {
    function getPrice() external view returns (uint256);
}

/// @title TokenizedFund
/// @notice KYC-gated ERC-20 tokenized real-estate fund. EVM port of the Stellar
///         `approval-control` contract.
///         - Admin-only mint, burn, clawback.
///         - Peer-to-peer ERC-20 transfers allowed only between KYC'd parties (enforced in `_update`).
///         - Hard total-supply cap of 1,000,000 units (decimals = 0).
///         - Every state-changing admin action cross-contract-calls the NAV oracle. If the
///           oracle has no price, the entire transaction reverts atomically.
contract TokenizedFund is ERC20Capped, Ownable {
    INavOracle public immutable oracle;

    mapping(address => bool) private _approved;

    enum AssetStatus {Active, Suspended, Redeemed}

    struct GeoLocation {
        string country;
        string region;
    }

    struct AssetMetadata {
        string assetType;
        bytes documentHash;
        string country;
        string region;
        uint256 issuedAt;
        uint256 minInvestment;
        string isin;
        uint256 totalSupplyCap;
        AssetStatus status;
        string[] tags;
        string[] propertyKeys;
        string[] propertyValues;
    }

    AssetMetadata private _metadata;

    event Initialized(
        address indexed admin, string assetName, AssetMetadata metadata, uint256 timestamp
    );
    event UserApproved(
        address indexed admin, address indexed user, bool approved, uint256 timestamp
    );
    event Minted(
        address indexed admin,
        address indexed user,
        uint256 amount,
        uint256 newBalance,
        uint256 circulatingSupply,
        uint256 navPrice,
        uint256 timestamp
    );
    event Burned(
        address indexed admin,
        address indexed user,
        uint256 amount,
        uint256 newBalance,
        uint256 circulatingSupply,
        uint256 navPrice,
        uint256 timestamp
    );
    event Clawback(
        address indexed admin,
        address indexed user,
        uint256 amount,
        uint256 newBalance,
        uint256 circulatingSupply,
        uint256 navPrice,
        string reason,
        int32 severity,
        int64 caseReference,
        uint256 timestamp
    );

    error UserNotApproved(address user);
    error ZeroAddress();
    error AdminImmutable();

    constructor(address admin, string memory assetName, address oracleAddress)
        ERC20(assetName, "TFUND")
        ERC20Capped(1_000_000)
        Ownable(admin)
    {
        if (oracleAddress == address(0)) revert ZeroAddress();
        if (admin == address(0)) revert ZeroAddress();
        oracle = INavOracle(oracleAddress);

        string[] memory tags = new string[](4);
        tags[0] = "real-estate";
        tags[1] = "series-a";
        tags[2] = "kyc-gated";
        tags[3] = "testnet";

        string[] memory propKeys = new string[](3);
        string[] memory propValues = new string[](3);
        propKeys[0] = "risk_level";
        propValues[0] = "medium";
        propKeys[1] = "liquidity";
        propValues[1] = "low";
        propKeys[2] = "fund_manager";
        propValues[2] = "Jamshaid";

        _metadata = AssetMetadata({
            assetType: "real-estate",
            documentHash: hex"deadbeefcafebabe0123456789abcdef",
            country: "TX",
            region: "Dallas",
            issuedAt: block.timestamp,
            minInvestment: 1000,
            isin: "US0231351067",
            totalSupplyCap: 1_000_000,
            status: AssetStatus.Active,
            tags: tags,
            propertyKeys: propKeys,
            propertyValues: propValues
        });
        emit Initialized(admin, assetName, _metadata, block.timestamp);
    }

    /// @notice Admin is locked at deploy time and cannot be changed — matches the
    ///         Stellar sibling POC's `initialize-once` semantics.
    function transferOwnership(address) public pure override {
        revert AdminImmutable();
    }

    function renounceOwnership() public pure override {
        revert AdminImmutable();
    }

    /// @notice Whole-token decimals so balances mirror Stellar's `u32` semantics 1:1.
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    // ─── KYC ───────────────────────────────────────────────────────────────

    function approveUser(address user) external onlyOwner {
        if (user == address(0)) revert ZeroAddress();
        _approved[user] = true;
        emit UserApproved(msg.sender, user, true, block.timestamp);
    }

    function isApproved(address user) external view returns (bool) {
        return _approved[user];
    }

    // ─── Reads ─────────────────────────────────────────────────────────────

    function admin() external view returns (address) {
        return owner();
    }

    function getOracle() external view returns (address) {
        return address(oracle);
    }

    function circulatingSupply() external view returns (uint256) {
        return totalSupply();
    }

    function getMetadata() external view returns (AssetMetadata memory) {
        return _metadata;
    }

    // ─── Admin actions (atomic with oracle) ────────────────────────────────

    function mint(address user, uint256 amount) external onlyOwner returns (uint256) {
        if (!_approved[user]) revert UserNotApproved(user);
        uint256 navPrice = oracle.getPrice();
        _mint(user, amount);
        uint256 newBalance = balanceOf(user);
        emit Minted(
            msg.sender, user, amount, newBalance, totalSupply(), navPrice, block.timestamp
        );
        return newBalance;
    }

    function burn(address user, uint256 amount) external onlyOwner returns (uint256) {
        uint256 navPrice = oracle.getPrice();
        _burn(user, amount);
        uint256 newBalance = balanceOf(user);
        emit Burned(
            msg.sender, user, amount, newBalance, totalSupply(), navPrice, block.timestamp
        );
        return newBalance;
    }

    function clawback(
        address user,
        uint256 amount,
        string calldata reason,
        int32 severity,
        int64 caseReference
    ) external onlyOwner returns (uint256) {
        uint256 navPrice = oracle.getPrice();
        _burn(user, amount);
        uint256 newBalance = balanceOf(user);
        emit Clawback(
            msg.sender,
            user,
            amount,
            newBalance,
            totalSupply(),
            navPrice,
            reason,
            severity,
            caseReference,
            block.timestamp
        );
        return newBalance;
    }

    // ─── Compliance hook ───────────────────────────────────────────────────

    /// @dev Peer-to-peer transfers must be between KYC'd parties. Mint (from == 0) only
    ///      requires the recipient to be approved (enforced in `mint`). Burn (to == 0) bypasses
    ///      KYC so admin can burn/clawback from sanctioned/revoked users.
    function _update(address from, address to, uint256 value) internal override(ERC20Capped) {
        if (from != address(0) && to != address(0)) {
            if (!_approved[from]) revert UserNotApproved(from);
            if (!_approved[to]) revert UserNotApproved(to);
        }
        super._update(from, to, value);
    }
}
