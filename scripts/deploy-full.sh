#!/usr/bin/env bash
#
# deploy-full.sh — mirrors scripts/deploy-full.sh from the Stellar Soroban sibling POC.
#
# 1. Runs format, lint, and tests (skippable with --skip-checks)
# 2. Deploys NavOracle, sets initial price, deploys TokenizedFund pointed at the oracle
# 3. Writes the deployed addresses into frontend/.env.local
#
# Required env vars:
#   PRIVATE_KEY        — deployer + admin private key (0x-prefixed)
#   SEPOLIA_RPC_URL    — RPC for Sepolia (Alchemy, Infura, public…)
# Optional env vars:
#   INITIAL_PRICE      — NAV price in cents (default: 100000 = $1,000.00)
#   ASSET_NAME         — token name (default: "Tokenized Real Estate Fund Series A")
#   ETHERSCAN_API_KEY  — if set, verifies the contracts on Etherscan
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACTS="$ROOT/contracts"
FRONTEND="$ROOT/frontend"

INITIAL_PRICE="${INITIAL_PRICE:-100000}"
ASSET_NAME="${ASSET_NAME:-Tokenized Real Estate Fund Series A}"

skip_checks=false
for arg in "$@"; do
    if [[ "$arg" == "--skip-checks" ]]; then skip_checks=true; fi
done

if [[ -z "${PRIVATE_KEY:-}" || -z "${SEPOLIA_RPC_URL:-}" ]]; then
    echo "✗ PRIVATE_KEY and SEPOLIA_RPC_URL must be set"
    exit 1
fi

cd "$CONTRACTS"

if ! $skip_checks; then
    echo "▶ forge fmt --check"
    forge fmt --check
    echo "▶ forge build"
    forge build
    echo "▶ forge test"
    forge test -vv
fi

echo "▶ Deploying to Sepolia (initial NAV = $INITIAL_PRICE cents = \$$(echo "scale=2; $INITIAL_PRICE / 100" | bc))…"

VERIFY_FLAG=""
if [[ -n "${ETHERSCAN_API_KEY:-}" ]]; then
    VERIFY_FLAG="--verify --etherscan-api-key $ETHERSCAN_API_KEY"
fi

# shellcheck disable=SC2086
PRIVATE_KEY="$PRIVATE_KEY" \
INITIAL_PRICE="$INITIAL_PRICE" \
ASSET_NAME="$ASSET_NAME" \
forge script script/Deploy.s.sol:Deploy \
    --rpc-url "$SEPOLIA_RPC_URL" \
    --broadcast \
    $VERIFY_FLAG \
    -vvv | tee /tmp/evm-poc-deploy.log

ORACLE=$(grep -E "NavOracle:" /tmp/evm-poc-deploy.log | tail -1 | awk '{print $NF}')
FUND=$(grep -E "TokenizedFund:" /tmp/evm-poc-deploy.log | tail -1 | awk '{print $NF}')

if [[ -z "$ORACLE" || -z "$FUND" ]]; then
    echo "✗ Could not parse deployed addresses from deploy log"
    exit 1
fi

echo ""
echo "✔ NavOracle:     $ORACLE"
echo "✔ TokenizedFund: $FUND"

ENV_FILE="$FRONTEND/.env.local"
echo "▶ Writing $ENV_FILE"
cat > "$ENV_FILE" <<EOF
NEXT_PUBLIC_ORACLE_ADDRESS=$ORACLE
NEXT_PUBLIC_FUND_ADDRESS=$FUND
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:-${WALLETCONNECT_PROJECT_ID:-}}
NEXT_PUBLIC_SEPOLIA_RPC_URL=$SEPOLIA_RPC_URL
EOF

echo ""
echo "Done. Run \`cd frontend && npm install && npm run dev\` to start the UI."
