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
# Flags:
#   --skip-checks  — skip forge fmt + build + test before deploy
#   --skip-op      — bypass 1Password auto-detection; use plain contracts/.env
#                    even if op:// references are present and `op` CLI is installed
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACTS="$ROOT/contracts"
FRONTEND="$ROOT/frontend"

# ──────────────────────────────────────────────────────────────────────────
# Env file selection: 1Password if available, plaintext otherwise.
#
# This logic is fully automatic — no user action required when your 1Password
# trial expires or you uninstall the `op` CLI.
#
#   • If contracts/.env.1password exists AND `op` CLI is installed AND
#     `op whoami` succeeds (active session) → use that file via `op run`
#     (secrets resolved from the vault, never written to disk).
#
#   • Otherwise → fall back to contracts/.env (plaintext values).
#
# Both files are gitignored. Keep contracts/.env with plain values as your
# always-available fallback; contracts/.env.1password is an optional overlay
# that you create only while your 1Password trial is active.
#
# Flags:
#   --skip-op : force the plaintext path even when op would otherwise be used
#               (debugging, one-off plain-key deploy)
#   --no-op   : internal flag set by the recursive exec to avoid infinite loops
# ──────────────────────────────────────────────────────────────────────────
USE_OP=true
for arg in "$@"; do
    if [[ "$arg" == "--no-op" || "$arg" == "--skip-op" ]]; then USE_OP=false; fi
done

OP_ENV="$CONTRACTS/.env.1password"
PLAIN_ENV="$CONTRACTS/.env"

if $USE_OP \
   && [[ -f "$OP_ENV" ]] \
   && command -v op >/dev/null 2>&1 \
   && op whoami >/dev/null 2>&1; then
    echo "▶ 1Password session active — resolving secrets from $OP_ENV"
    # SECRETS_SOURCE marker so the frontend can surface "built via 1Password"
    # in the UI. Passed through op run into the recursive invocation.
    exec env SECRETS_SOURCE=1password op run --env-file "$OP_ENV" -- "$0" "$@" --no-op
fi

# Default marker when we don't go through the op path
SECRETS_SOURCE="${SECRETS_SOURCE:-plain}"

if ! $USE_OP; then
    echo "▶ Skipping 1Password (--skip-op flag passed)"
elif [[ -f "$OP_ENV" ]] && command -v op >/dev/null 2>&1; then
    echo "ℹ contracts/.env.1password exists but 1Password session is inactive — falling back to plaintext"
fi

# Filter --no-op and --skip-op out of the args before continuing
ARGS=()
for arg in "$@"; do
    if [[ "$arg" != "--no-op" && "$arg" != "--skip-op" ]]; then ARGS+=("$arg"); fi
done
set -- "${ARGS[@]}"

# Source plaintext env from the always-available fallback file
if [[ -f "$PLAIN_ENV" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$PLAIN_ENV"
    set +a
fi

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
echo "▶ Writing $ENV_FILE (secrets source: $SECRETS_SOURCE)"
cat > "$ENV_FILE" <<EOF
NEXT_PUBLIC_ORACLE_ADDRESS=$ORACLE
NEXT_PUBLIC_FUND_ADDRESS=$FUND
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:-${WALLETCONNECT_PROJECT_ID:-}}
NEXT_PUBLIC_SEPOLIA_RPC_URL=$SEPOLIA_RPC_URL
NEXT_PUBLIC_SECRETS_SOURCE=$SECRETS_SOURCE
EOF

echo ""
echo "Done. Run \`cd frontend && npm install && npm run dev\` to start the UI."
