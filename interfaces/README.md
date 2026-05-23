# Interfaces

Machine-readable contract ABIs for indexers, substreams, subgraphs, and any tool that needs to decode this POC's on-chain data.

## Files

| File | Contract | Purpose |
|---|---|---|
| `NavOracle.abi.json` | `NavOracle` | Full Solidity ABI (functions + events + errors + constructor) for the NAV oracle |
| `TokenizedFund.abi.json` | `TokenizedFund` | Full Solidity ABI for the KYC-gated ERC-20 fund |
| `events.json` | both | Substream-ready summary of every event emitted by the two contracts, with field types |

The full `*.abi.json` files are the standard format every EVM toolchain accepts:

- **The Graph** — paste into subgraph manifest under `dataSources[].mapping.abis[].file`
- **Goldsky / Substreams / Subsquid** — point your manifest at the file
- **viem / wagmi / ethers** — `import abi from "./NavOracle.abi.json"`
- **Etherscan verification** — `forge verify-contract --abi-path`
- **Foundry / Hardhat** — re-use directly in test scripts

## Regenerating

```bash
cd contracts
forge build
jq '.abi' out/NavOracle.sol/NavOracle.json     > ../interfaces/NavOracle.abi.json
jq '.abi' out/TokenizedFund.sol/TokenizedFund.json > ../interfaces/TokenizedFund.abi.json
```

The Foundry-generated ABIs at `contracts/out/*/[Name].json` always have a fresh ABI after a build.
