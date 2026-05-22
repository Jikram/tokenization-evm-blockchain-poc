# tokenization-evm-blockchain-poc

EVM/Solidity smartcontract KYC-gated tokenized real-estate fund with an on-chain NAV oracle. Demonstrates the compliance gated asset issuance design on the dominant smart contract platform.

## Project structure

- `contracts/` — Foundry project: NavOracle + TokenizedFund (ERC-20 + cap + KYC) + tests + deploy script
- `frontend/` — Next.js + viem + wagmi with a custom WalletConnect QR modal (MetaMask extension or mobile)
- `scripts/` — helper scripts for building, deploying, and checking contracts
- `docs/` — design notes

## Goals

- Deploy two smart contracts to Ethereum Sepolia and wire them together via cross-contract calls
- KYC-gated mint, burn, and clawback restricted to the contract admin
- ERC-20 transfers permitted only between KYC'd parties (enforced in the `_update` hook)
- Hard total-supply cap of 1,000,000 units, enforced by `ERC20Capped`
- Atomic cross-contract NAV check: if the oracle has no price set, mint/burn/clawback all revert and roll the entire transaction back
- WalletConnect-based UX so MetaMask Mobile (or any WC-compatible wallet) can scan a QR and sign — matching the sibling Stellar POC's two-button connect flow
- Bento / Linear-style light UI, visually distinct from the Stellar POC's dark amber/cyan theme

## Sibling project

Stellar Soroban version (Rust contracts, Freighter + WalletConnect): `../stellar-rust/tokenization-stellar-poc`

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

Open http://localhost:3000 and connect either MetaMask extension or scan the QR with MetaMask Mobile.

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
- **Custom WalletConnect QR modal** rendered against the `walletConnect` connector's `display_uri` event, matching the Stellar POC's UX
- **Bento / Linear light theme** with rounded cards, soft shadows, dotted background, indigo accent
- Cards live in `frontend/src/components/cards/` — each card is responsible for one concern (NAV, supply, metadata, user, admin actions, clawback, activity feed)


