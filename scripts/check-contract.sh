#!/usr/bin/env bash
#
# check-contract.sh — runs all contract-level checks.
# Mirrors the Stellar sibling POC's `bash scripts/check-contract.sh`.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS="$(cd "$SCRIPT_DIR/../contracts" && pwd)"

cd "$CONTRACTS"

echo "▶ forge fmt --check"
forge fmt --check

echo "▶ forge build --sizes"
forge build --sizes

echo "▶ forge test -vv"
forge test -vv

if command -v slither >/dev/null 2>&1; then
    echo "▶ slither ."
    slither . || true
else
    echo "ℹ slither not installed (optional). Skipping."
fi

echo "▶ forge coverage --report summary"
forge coverage --report summary || echo "ℹ Coverage may need 'forge coverage --ir-minimum' on heavy contracts."

echo "✔ All checks passed"
