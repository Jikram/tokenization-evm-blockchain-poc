# Stellar (Soroban) vs Ethereum (Solidity) — Detailed Comparison

> Notes from building two functionally-equivalent POCs of the same tokenized real-estate fund:
> a Stellar Soroban version (Rust + `soroban-sdk`, deployed to Stellar Testnet) and an EVM version
> (Solidity + Foundry, deployed to Sepolia — this repo).
>
> Both implement: KYC whitelist, admin-only mint/burn/clawback, atomic cross-contract NAV oracle,
> hard supply cap, immutable admin.

---

## 1. Quick summary — one-liner per dimension

| Dimension | Stellar (Soroban) | Ethereum (EVM) |
|---|---|---|
| Contract language | Rust + `soroban-sdk` | Solidity |
| Compile target | WASM | EVM bytecode |
| Build tool | `cargo build --target wasm32v1-none` + `stellar contract build` | `forge build` |
| Test framework | `cargo test` + `soroban-sdk testutils` | `forge test` |
| Local devnet | `stellar quickstart` | `anvil` |
| Public testnet | Stellar Testnet | Sepolia |
| Block / ledger time | ~5 sec | ~12 sec |
| Account address | `G…` (Ed25519, 56 chars) or `C…` (contract) | `0x…` (20 bytes, 42 chars) |
| Native asset | XLM | ETH |
| Fee model | Resource fee from simulation (cheap) | Gas × gas price (variable) |
| Standard token | Trait `TokenInterface` (custom impl) | ERC-20 (OpenZeppelin) |
| Block explorer | `stellar.expert`, Stellar Lab | Etherscan |
| Indexer / events API | `stellar.expert` API, Soroban RPC `getEvents` | Etherscan API v2, The Graph |
| Frontend wallet kit | Freighter, WalletConnect via `stellar-wallets-kit` | MetaMask + WalletConnect via `wagmi` |
| Frontend SDK | `@stellar/stellar-sdk` | `viem` + `wagmi` |

---

## 2. Language & type system

| Concept | Stellar (Rust) | Solidity |
|---|---|---|
| Module declaration | `#![no_std]` + `mod` | `pragma solidity 0.8.28;` + file per contract |
| Imports | `use soroban_sdk::{contract, contractimpl, ...}` | `import {X} from "..."` |
| Contract entrypoint | `#[contract] pub struct MyContract;` + `#[contractimpl] impl MyContract { ... }` | `contract MyContract { ... }` |
| Primitives | `bool, u32, u64, u128, i32, i64, i128, Address, Symbol, String, Bytes, BytesN<32>` | `bool, uint8/16/32/64/128/256, int8…256, address, bytes, bytesN, string` |
| **Max integer** | `u128` / `i128` natively (`u256` opt-in) | `uint256` / `int256` |
| Strings | `String` (Soroban type, no allocations on chain) | `string` (dynamic-length, expensive in storage) |
| Optional | `Option<T>` (Rust) | No native — use sentinel (`address(0)`, `bytes32(0)`) or a separate `bool isSet` flag |
| List / vector | `Vec<T>` | `T[]` (dynamic) or `T[N]` (fixed) |
| Map / dictionary | `Map<K, V>` | `mapping(K => V)` — no enumeration, no `length` |
| Custom struct | `#[contracttype] pub struct Foo { … }` | `struct Foo { … }` |
| Custom enum | `#[contracttype] pub enum Bar { A, B(u32) }` | `enum Bar { A, B }` (no associated data — use struct + tag) |
| Memory model | Rust ownership, no GC | Reference / value types, value types passed by copy |

**Big mental shift:** Solidity's go-to primitive is `uint256`. Stellar uses `u32` / `i128` more naturally.
Porting Stellar's `u32 amount` to Solidity becomes `uint256 amount`, and you have to decide on
decimals. This POC uses `decimals = 0` to preserve the original 1-to-1 unit semantics.

---

## 3. Storage model

| | Stellar | EVM |
|---|---|---|
| API | `env.storage().instance()`, `.persistent()`, `.temporary()` | Direct state variables: `mapping(address => uint256) balances;` |
| Persistence tiers | **Three:** `temporary` (cheap, can be evicted), `persistent` (expires unless extended), `instance` (lives with contract) | **One:** all storage is persistent forever, no expiry |
| TTL / extending | Required to keep persistent data alive (`extend_ttl`) | No TTL concept |
| Cost model | Pay-per-byte rent on read/write | Pay-per-slot SSTORE (very expensive: 20k gas first write, 5k on update) |
| Read / write | `env.storage().instance().set(&key, &value)` | `myMap[key] = value;` |
| Enumeration | Limited (`Map` doesn't enumerate; need parallel list) | No (`mapping` doesn't enumerate; need parallel array) |

**EVM trap:** Storage operations are the #1 source of gas cost. In Stellar you don't think about
TTL for one-off demos; on EVM you don't think about TTL ever, but you always think about storage
slot writes.

---

## 4. Access control / admin pattern

| | Stellar | EVM |
|---|---|---|
| Auth primitive | `address.require_auth()` — wallet must sign | `msg.sender` is the caller address; check it in code |
| "Only admin" check | `admin: Address = env.storage().get(&ADMIN_KEY).unwrap(); admin.require_auth();` | `require(msg.sender == owner, "not owner")` or use `Ownable`'s `onlyOwner` modifier |
| "Initialize once" | Manual: `if storage.has(&ADMIN) { panic!("already init") }` in `initialize(admin)` | Constructor runs once at deploy; admin set there — but `Ownable.transferOwnership` allows changing it unless you override |
| Make admin immutable | Don't expose any setter | **Must explicitly override** `transferOwnership` and `renounceOwnership` to `revert AdminImmutable()` (this POC does that in both `NavOracle.sol` and `TokenizedFund.sol`) |
| Multi-sig admin | Use a Soroban multi-sig contract | Use Gnosis Safe (the de-facto standard) |

---

## 5. Tokens

| | Stellar | EVM |
|---|---|---|
| Standard | `TokenInterface` (Soroban) — custom impl per contract | **ERC-20** is the universal fungible standard; OpenZeppelin's implementation is the canonical one |
| Inheritance | None — write all methods from scratch | `contract Token is ERC20, Ownable { … }` — multiple inheritance |
| Cap on supply | Manual check before mint | `ERC20Capped` extension does it automatically |
| Transfer hooks | Define your own `transfer` method | Override `_update(from, to, value)` (OpenZeppelin v5 unified hook) — fires for mint, burn, and transfer |
| KYC gate | Custom: `if !approved.contains(user) panic!("not approved")` | Override `_update` to check `approved[from] && approved[to]`, skipping when one side is `address(0)` (mint or burn) |
| Decimals | Not part of spec | `decimals()` returns `uint8` (default 18). This POC uses `0` to match Stellar's `u32` unit semantics |

---

## 6. Events

| | Stellar | EVM |
|---|---|---|
| Declaration | `#[contractevent] pub struct Init { admin: Address, … }` | `event Initialized(address indexed admin, …)` |
| Emission | `env.events().publish((symbol_short!("init"),), event_data);` | `emit Initialized(admin, …);` |
| Topics | First-class field on event — used for filtering | `indexed` parameters become topics (max 3 indexed per event; topic[0] is always the keccak-hashed signature) |
| Data | The rest of the struct | Non-indexed parameters, ABI-encoded into `data` |
| Indexed query | `stellar.expert` API or Soroban RPC `getEvents(filter)` | Etherscan v2 `?module=logs&action=getLogs&address=…` or RPC `eth_getLogs` (with block-window limits) |
| Struct in event | Yes — embed the whole struct natively | Yes (since 0.5+) — encoded as a tuple ABI param; viem/ethers decode them as nested objects |

Both POCs emit a rich `Init` / `Initialized` event with the full `AssetMetadata` struct. Stellar's
version queries `stellar.expert` API for full history; EVM's queries Etherscan v2 API because the
direct `eth_getLogs` RPC has a 10k-block window per call which often misses older deploys.

---

## 7. Cross-contract calls

| | Stellar | EVM |
|---|---|---|
| Pattern | `Client::new(&env, &other_contract_id).method(args)` | `IOther(otherAddr).method(args)` (interface call) |
| Atomicity | **Yes** — if cross-contract call panics, whole tx reverts | **Yes** — if external call reverts, parent reverts (unless you wrap in `try/catch`) |
| Catching failures | Limited — `try_invoke_contract_unchecked` returns `Result` | `try OtherContract(addr).method() returns (uint x) { … } catch { … }` |
| Address type | `Address` — same type as user wallet | `address` for both EOAs and contracts (you can branch on `.code.length > 0`) |
| Gas | Resource fees aggregate naturally | Caller pays gas for callee; pass `{gas: X}` to limit |
| Reentrancy | Not a typical concern on Stellar | Major concern on EVM — use OpenZeppelin's `ReentrancyGuard` or the checks-effects-interactions pattern |

The atomic NAV demo works the same way on both chains: if `oracle.getPrice()` reverts (no price
set), the parent `mint` / `burn` / `clawback` call reverts and state is unchanged. Both POCs have
explicit tests for this.

---

## 8. Errors

| | Stellar | EVM |
|---|---|---|
| Throwing | `panic!("message")` or `panic_with_error!(&env, MyError::Foo)` | `revert("message")` (string, expensive) or `revert MyError(arg)` (custom error, cheap) |
| Custom error type | `#[contracterror] pub enum Error { NotInitialized = 1, … }` | `error MyError(address user);` — selector is `keccak256("MyError(address)")[:4]` |
| Catching | Caller gets `Result<T, Error>` via `try_invoke_contract_unchecked` | `try …  catch (bytes memory reason) { … }` |
| Reverts in tests | `#[test] #[should_panic(expected = "…")]` | `vm.expectRevert(MyError.selector)` or `vm.expectRevert(abi.encodeWithSelector(MyError.selector, arg))` |

---

## 9. Frontend SDK & wallet integration

| | Stellar | EVM |
|---|---|---|
| Read-only RPC | `@stellar/stellar-sdk` (`Server` / `SorobanServer`) | `viem` (createPublicClient + http transport) |
| Wallet connection lib | `@creit.tech/stellar-wallets-kit` (or direct `@stellar/freighter-api`) | `wagmi` (built on viem) |
| Browser-extension wallets | Freighter, Albedo | MetaMask, Coinbase Wallet, Rabby, Frame |
| Mobile wallets via WalletConnect | Lobstr, XBULL | MetaMask Mobile, Trust, Rainbow, Phantom, OKX, Argent, Coinbase, etc. (~80+) |
| WalletConnect QR pattern | `@walletconnect/sign-client` + `qrcode` (custom modal) | `wagmi` `walletConnect` connector with `showQrModal: false` + custom modal listening to `display_uri` event |
| Sign transaction | `signTransaction(xdr, opts)` returns signed XDR | `useWriteContract().writeContract({chainId, address, abi, functionName, args})` — wagmi handles signing |
| React hooks | None canonical — use Stellar SDK directly | wagmi: `useAccount`, `useReadContract`, `useReadContracts`, `useWriteContract`, `useChainId`, `useSwitchChain`, `useDisconnect` |

Both POCs use a **custom WalletConnect modal** driven off the WalletConnect `display_uri` event,
instead of using AppKit / RainbowKit's default modal. Reason: AppKit's stale deeplink sessions
caused bugs in the Stellar version that were easier to avoid by rolling a thin custom modal.

---

## 10. Network & explorer reference

| | Stellar Testnet | Ethereum Sepolia |
|---|---|---|
| Chain ID | (passphrase: "Test SDF Network ; September 2015") | `11155111` |
| RPC | `https://soroban-testnet.stellar.org` | Alchemy / Infura / public (e.g., `https://eth-sepolia.g.alchemy.com/v2/<key>`) |
| Faucet | `https://friendbot.stellar.org?addr=…` (instant 10k XLM) | Google Cloud Web3 faucet, Alchemy faucet (~0.05 ETH/day) |
| Explorer | `stellar.expert/explorer/testnet/contract/<id>` | `sepolia.etherscan.io/address/<addr>` |
| Indexer / event API | `stellar.expert` REST API | Etherscan v2 (`api.etherscan.io/v2/api?chainid=11155111&…`) — **API key required** |
| Block time | ~5 sec | ~12 sec |

---

## 11. POC architecture mapping — function for function

Stellar `approval-control/src/lib.rs` ↔ Solidity `TokenizedFund.sol`:

| Stellar | Solidity |
|---|---|
| `initialize(env, admin, asset_name, oracle_id)` (panics if already init'd) | `constructor(address admin, string assetName, address oracleAddress)` (runs once at deploy) + override `transferOwnership` to enforce immutability |
| `approve_user(env, admin, user)` (`admin.require_auth()`) | `approveUser(address user) onlyOwner` |
| `is_approved(env, user) -> bool` | `isApproved(address user) view returns (bool)` |
| `get_balance(env, user) -> u32` | `balanceOf(address)` (from ERC20) |
| `get_circulating_supply(env) -> u32` | `totalSupply()` (from ERC20) — exposed as `circulatingSupply()` |
| `mint(env, admin, user, amount)` — calls oracle, panics if no price | `mint(address user, uint256 amount) onlyOwner` — `oracle.getPrice()` reverts atomically |
| `burn(env, admin, user, amount)` | `burn(address user, uint256 amount) onlyOwner` |
| `clawback(env, admin, user, amount, reason, severity, case_reference)` | `clawback(address user, uint256 amount, string reason, int32 severity, int64 caseReference) onlyOwner` |
| `get_metadata(env) -> AssetMetadata` | `getMetadata() view returns (AssetMetadata memory)` |
| Events: `Init, Approved, Minted, Burned, Clawback` | Events: `Initialized, UserApproved, Minted, Burned, Clawback` (plus ERC-20 `Transfer`/`Approval` and `Ownable`'s `OwnershipTransferred`) |

Stellar `nav-oracle/src/lib.rs` ↔ Solidity `NavOracle.sol`:

| Stellar | Solidity |
|---|---|
| `initialize(env, admin)` | `constructor(address admin)` |
| `update_price(env, admin, price_cents: i128)` | `updatePrice(uint256 price) onlyOwner` |
| `get_price(env) -> i128` (panics if not set) | `getPrice() view returns (uint256)` (reverts `NoPriceSet()` if not set) |
| `has_price(env) -> bool` | `hasPrice() returns (bool)` |
| `clear_price(env, admin)` | `clearPrice() onlyOwner` |

---

## 12. Side-by-side code: "admin-only function that mints"

### Stellar (Rust)
```rust
pub fn mint(env: Env, admin: Address, user: Address, amount: u32) -> u32 {
    admin.require_auth();
    Self::assert_admin(&env, &admin);

    let approved: Map<Address, bool> = env.storage().instance().get(&APPROVED).unwrap();
    if !approved.get(user.clone()).unwrap_or(false) {
        panic!("user not approved");
    }

    // Cross-contract: get NAV price (panics if unset → atomic revert)
    let oracle_id: Address = env.storage().instance().get(&ORACLE).unwrap();
    let nav_price: i128 = oracle::Client::new(&env, &oracle_id).get_price();

    let mut balances: Map<Address, u32> = env.storage().instance().get(&BALANCES).unwrap();
    let new_balance = balances.get(user.clone()).unwrap_or(0) + amount;
    balances.set(user.clone(), new_balance);
    env.storage().instance().set(&BALANCES, &balances);

    env.events().publish(
        (symbol_short!("minted"), admin),
        (user, amount, new_balance, nav_price, env.ledger().timestamp()),
    );
    new_balance
}
```

### Solidity
```solidity
function mint(address user, uint256 amount) external onlyOwner returns (uint256) {
    if (!_approved[user]) revert UserNotApproved(user);
    uint256 navPrice = oracle.getPrice();           // reverts atomically if unset
    _mint(user, amount);                            // ERC20Capped enforces cap; ERC20 emits Transfer
    uint256 newBalance = balanceOf(user);
    emit Minted(msg.sender, user, amount, newBalance, totalSupply(), navPrice, block.timestamp);
    return newBalance;
}
```

The Solidity version is roughly half the lines because OpenZeppelin handles balance bookkeeping,
the supply cap, and the standard `Transfer` event. Stellar requires you to write everything from
scratch (no standard token library yet in `soroban-sdk`).

---

## 13. Build / test / deploy commands

| | Stellar | Foundry |
|---|---|---|
| Install toolchain | `cargo install --locked stellar-cli` | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` (needs `libusb` on macOS — `brew install libusb`) |
| Init project | `cargo new --lib my-contract` + edit `Cargo.toml` for Soroban | `forge init` |
| Add dependency | Add to `Cargo.toml`: `soroban-sdk = "…"` | `forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std --no-commit` (creates git submodules) |
| Build | `stellar contract build` | `forge build` |
| Test | `cargo test` | `forge test -vv` |
| Fuzz | `proptest` / Rust quickcheck | Built-in: any param-taking test runs 256 fuzz iterations |
| Format check | `cargo fmt --check` | `forge fmt --check` |
| Coverage | Manual (kcov / tarpaulin) | `forge coverage --report summary` |
| Local devnet | `stellar quickstart` (Docker) | `anvil` (single binary) |
| Deploy | `stellar contract deploy --wasm <file> --source <key>` | `forge create` or `forge script script/Deploy.s.sol --rpc-url $RPC --broadcast` |
| Init after deploy | Separate `stellar contract invoke … -- initialize …` call | Done in constructor at deploy time (no second tx) |
| Etherscan verify | (no equivalent) | `--verify --etherscan-api-key $KEY` (or `forge verify-contract`) |

---

## 14. Common gotchas when crossing from Stellar to Solidity

1. **No `Option<T>` in Solidity.** Use sentinel values (`address(0)`, `bytes32(0)`) or pair a value
   with a `bool isSet` flag. Or pack into a struct.
2. **Reentrancy is real.** A contract you `call` can call you back. Use the checks-effects-
   interactions pattern or `ReentrancyGuard`. Stellar doesn't worry about this much because
   cross-contract calls are bounded.
3. **`mapping` is not iterable.** No `.entries()`, no `.size()`. Maintain a parallel `address[]`
   array if you need to enumerate (this POC does that for `tags`, `propertyKeys`/`propertyValues`).
4. **Strings are expensive in storage.** Each character is part of a dynamic byte array, costing
   SSTORE per 32 bytes. Prefer `bytes32` or short symbols where possible.
5. **`require_auth` ≈ `onlyOwner`, but Ownable's owner can transfer.** Override `transferOwnership`
   and `renounceOwnership` to revert if you want Stellar's "init-once" semantic.
6. **No `panic!` — use `revert`.** Solidity 0.8.4+ added custom errors (`error MyError();`) which
   are cheaper than `require(false, "string")`. Always prefer custom errors.
7. **24 KB contract size limit (EIP-170).** Stellar contracts can be larger. On EVM, you often need
   to split a large contract into multiple, or move logic to libraries.
8. **No `String` / `Symbol` distinction.** Solidity has `string` (dynamic UTF-8) and `bytes32`
   (fixed). No interning. `keccak256(bytes("…"))` is the usual way to get a stable id.
9. **Decimals matter.** ERC-20 default is 18. This POC uses 0 to mirror Stellar's `u32` unit
   semantics — easier to reason about in tests + cleaner UI numbers.
10. **Etherscan API requires a key (since 2024).** The legacy chain-specific subdomains
    (`api-sepolia.etherscan.io`) are deprecated; you must use the v2 unified endpoint with
    `chainid=` parameter + API key.
11. **Block-range limit on `eth_getLogs`.** Providers (Alchemy, Infura) cap requests at 10–50k
    blocks. For full history, use Etherscan API (no block-range limit).
12. **Wallet chain switching.** When the dApp is hardcoded to Sepolia but the wallet is on mainnet,
    you must pass `chainId: sepolia.id` to `writeContract` so wagmi can request the wallet to
    switch.

---

## 15. Further reading

**Stellar / Soroban**
- `developers.stellar.org/docs/build/smart-contracts`
- `developers.stellar.org/docs/networks` (testnet, futurenet, mainnet)
- Soroban SDK on `docs.rs/soroban-sdk`
- `stellar.expert` API reference

**Solidity / EVM**
- `docs.soliditylang.org` (language spec)
- `docs.openzeppelin.com/contracts/5.x` (battle-tested standard library)
- `book.getfoundry.sh` (Foundry book — best Solidity tooling docs)
- `viem.sh` and `wagmi.sh` (frontend SDK)
- `docs.etherscan.io` (v2 API)
- `ethereum.org/developers` (general)

**Cross-chain mental model**
- "Why three storage tiers on Stellar but one on EVM?" → Stellar bills rent for keeping data
  alive; EVM bills you upfront per slot write. Same goal, different timing.
- "Why does Stellar have a `TokenInterface` trait but EVM has ERC-20?" → ERC-20 is older and was
  standardized as an Ethereum convention; Stellar designed `TokenInterface` after observing what
  worked.
- "Why do I need a proxy for upgrades on EVM but not on Stellar?" → Stellar contracts have native
  upgradability via `env.deployer().with_address()`. EVM contract bytecode is immutable
  post-deploy — proxies (UUPS, Transparent) are the workaround.
