# tokenization-evm-blockchain-poc

A KYC-gated, tokenized real-estate fund on Ethereum with an on-chain NAV oracle. Demonstrates a compliance-gated asset-issuance design: admin-only mint/burn/clawback, peer-to-peer transfers restricted to KYC'd parties, and atomic cross-contract NAV checks that revert the entire transaction if the oracle has no price set.

**Live demo:** https://evm-tokenization-ji.vercel.app

## Project structure

- `contracts/` — Foundry project: `NavOracle` + `TokenizedFund` (ERC-20 + cap + KYC) + tests + deploy script
- `frontend/` — Next.js + viem + wagmi with a custom WalletConnect QR modal (MetaMask extension or any WalletConnect-compatible mobile wallet)
- `scripts/` — helper scripts for building, deploying, and checking contracts
- `docs/` — design notes

## Goals

- Deploy two smart contracts to Ethereum Sepolia and wire them together via cross-contract calls
- KYC-gated mint, burn, and clawback restricted to the contract admin
- ERC-20 transfers permitted only between KYC'd parties (enforced in the `_update` hook)
- Hard total-supply cap of 1,000,000 units, enforced by `ERC20Capped`
- Atomic cross-contract NAV check: if the oracle has no price set, mint/burn/clawback all revert and roll the entire transaction back
- WalletConnect-based UX so MetaMask Mobile (or any WC-compatible wallet) can scan a QR and sign
- Bento / Linear-style light UI with Coinbase-blue accents

## Getting started

### 1. Install tooling

- **Foundry** — `curl -L https://foundry.paradigm.xyz | bash && foundryup`. On macOS you'll also need `libusb` (via Homebrew) or compile from source with `cargo install --git https://github.com/foundry-rs/foundry --profile release --locked forge cast anvil chisel`.
- **Node.js 20+** and npm (Node 18 works but ships warnings)
- **MetaMask** (browser extension or mobile)

### 2. Build & test the contracts

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
forge build
forge test -vv
```

### 3. Deploy to Sepolia

```bash
# Required:
export PRIVATE_KEY=0x...                   # deployer + admin
export SEPOLIA_RPC_URL=https://...         # Alchemy / Infura / public

# Optional:
export INITIAL_PRICE=100000                # cents — default $1,000.00
export ASSET_NAME="Tokenized Real Estate Fund Series A"
export ETHERSCAN_API_KEY=...               # if set, contracts are verified

bash scripts/deploy-full.sh
# Skip format/test/coverage with:
bash scripts/deploy-full.sh --skip-checks
```

The script deploys `NavOracle`, sets the initial price, deploys `TokenizedFund` pointing at the oracle, and writes both addresses into `frontend/.env.local`.

### 4. Run the frontend

```bash
cd frontend
cp .env.example .env.local   # fill NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID from https://cloud.reown.com
npm install
npm run dev
```

The live deployment is at https://evm-tokenization-ji.vercel.app. Connect with the MetaMask extension or scan the QR with MetaMask Mobile (or any WalletConnect-compatible wallet).

## Code quality checks

```bash
bash scripts/check-contract.sh   # fmt + build + test + (optional) slither + coverage
```

Per-tool:

```bash
cd contracts
forge fmt --check
forge build --sizes
forge test -vv
forge coverage --report summary
```

## Architecture

### Contracts

- **`NavOracle`** (`contracts/src/NavOracle.sol`) — Single-storage-slot price feed in cents (100_000 = $1,000.00). Admin can `updatePrice` or `clearPrice`. `getPrice` reverts with `NoPriceSet()` if no price is set; this revert propagates atomically through any cross-contract caller.
- **`TokenizedFund`** (`contracts/src/TokenizedFund.sol`) — `ERC20Capped` + `Ownable`. KYC whitelist via `_approved` mapping. Admin-only `mint`, `burn`, `clawback`. `_update` hook enforces KYC on peer-to-peer transfers but lets mint/burn bypass so the admin can still claw back from sanctioned users. Every state-changing admin action calls `oracle.getPrice()` first — if the oracle has no price, the entire transaction reverts.

### Frontend

- **wagmi + viem** for typed contract reads/writes, no RainbowKit
- **Custom WalletConnect QR modal** rendered against the `walletConnect` connector's `display_uri` event, with an inline wallet picker (MetaMask Mobile, Trust, Rainbow, Coinbase Wallet, Phantom, etc.)
- **Bento / Linear light theme** with rounded cards, soft shadows, Coinbase-blue accents, and per-card accent tints
- Cards live in `frontend/src/components/cards/` — each card is responsible for one concern (NAV oracle, supply, metadata, properties, user, KYC lookup, admin actions, clawback, activity log, on-chain events)

## Data types — what the POC emits on-chain

Machine-readable ABIs for indexers / substreams / subgraphs are at [`interfaces/`](./interfaces/) (see [`interfaces/README.md`](./interfaces/README.md)).

### Events emitted

| Contract | Event | Indexed topics | Data fields |
|---|---|---|---|
| **NavOracle** | `PriceUpdated` | `admin: address` | `price: uint256` (cents), `timestamp: uint256` |
| | `PriceCleared` | `admin: address` | `timestamp: uint256` |
| | `OwnershipTransferred` | `previousOwner: address`, `newOwner: address` | (none) |
| **TokenizedFund** | `Initialized` | `admin: address` | `assetName: string`, `timestamp: uint256` |
| | `UserApproved` | `admin: address`, `user: address` | `approved: bool`, `timestamp: uint256` |
| | `Minted` | `admin: address`, `user: address` | `amount: uint256`, `newBalance: uint256`, `circulatingSupply: uint256`, `navPrice: uint256`, `timestamp: uint256` |
| | `Burned` | `admin: address`, `user: address` | `amount: uint256`, `newBalance: uint256`, `circulatingSupply: uint256`, `navPrice: uint256`, `timestamp: uint256` |
| | `Clawback` | `admin: address`, `user: address` | `amount: uint256`, `newBalance: uint256`, `circulatingSupply: uint256`, `navPrice: uint256`, `reason: string`, `severity: int32`, `caseReference: int64`, `timestamp: uint256` |
| | `Transfer` (ERC-20) | `from: address`, `to: address` | `value: uint256` |
| | `Approval` (ERC-20) | `owner: address`, `spender: address` | `value: uint256` |
| | `OwnershipTransferred` | `previousOwner: address`, `newOwner: address` | (none) |

### Structs

`TokenizedFund.AssetMetadata` (returned by `getMetadata()`):

| Field | Type | Notes |
|---|---|---|
| `assetType` | `string` | e.g. "real-estate" |
| `documentHash` | `bytes` | document fingerprint |
| `country` | `string` | ISO country code (e.g. "TX") |
| `region` | `string` | sub-region (e.g. "Dallas") |
| `issuedAt` | `uint256` | unix timestamp of issuance |
| `minInvestment` | `uint256` | in USD whole dollars |
| `isin` | `string` | optional ISIN identifier |
| `totalSupplyCap` | `uint256` | matches `cap()` from ERC20Capped |
| `status` | `uint8` | enum: 0=Active, 1=Suspended, 2=Redeemed |
| `tags` | `string[]` | e.g. `["real-estate", "series-a", "kyc-gated", "testnet"]` |
| `propertyKeys` | `string[]` | parallel array w/ `propertyValues` (mappings can't live in structs) |
| `propertyValues` | `string[]` | e.g. `["medium", "low", "Jamshaid"]` |

### Custom errors (selector-decoded reverts)

| Contract | Error | Args |
|---|---|---|
| **NavOracle** | `NoPriceSet()` | (none) |
| | `PriceMustBePositive()` | (none) |
| **TokenizedFund** | `UserNotApproved(address user)` | the rejected address |
| | `ZeroAddress()` | (none) |
| | `ERC20ExceededCap(uint256 increasedSupply, uint256 cap)` | from `ERC20Capped` |
| | `ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)` | from `ERC20` |
| | `OwnableUnauthorizedAccount(address account)` | from `Ownable` |

### Solidity primitive types in use

`address`, `bool`, `bytes`, `int32`, `int64`, `uint8`, `uint256`, `string`, `string[]`, plus the `AssetMetadata` struct and `AssetStatus` enum.

## License

MIT
