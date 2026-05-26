# Secrets management with 1Password

> Optional, team-friendly pattern for handling deploy secrets without passing
> them through chat or email. Skip this entirely if you'd rather use plain
> `.env` files locally — the deploy scripts work both ways.

## Why this exists

Today, sharing the four secrets this POC needs (deployer private key, Alchemy
RPC URL, Etherscan API key, WalletConnect project ID) usually happens via
Slack DMs or email. That has three problems:

- **No audit trail.** You can't tell who accessed a key and when.
- **No rotation.** Replacing a leaked key means hunting down every chat where
  it was pasted.
- **Onboarding friction.** New teammates wait for someone to DM them values.

Storing the secrets in a shared 1Password vault and referencing them from
`.env` files via `op://` URIs fixes all three.

## The vault

Create one vault for this POC:

```
Tokenization POC - EVM Smart Contracts
├─ Sepolia Deployer            (login)
│   ├─ address           0x1F6A8e7f4e6e8DbaE6829c44A02f9c164023DB48
│   └─ private_key       0x…
├─ Alchemy Sepolia             (api credential)
│   └─ url               https://eth-sepolia.g.alchemy.com/v2/<key>
├─ Etherscan API               (api credential)
│   └─ api_key           <40-char etherscan key>
├─ WalletConnect Project       (api credential)
│   └─ project_id        <32-char reown projectId>
└─ Sepolia Deployment          (secure note)
    ├─ oracle_address    0xdD0505aE6aca4a4b93Ddac4BFCcCb413801104C4
    └─ fund_address      0xDd830F76A80947c3B4445D78F7d74b86Dc754Acd
```

Give your team **Edit** access to this vault. They never need to know any of
the literal values — they reference them.

For larger setups you'd split into multiple vaults (one per team — Contracts,
Frontend, Subgraph, Substreams), but for a single-app POC one vault is
plenty.

## One-time setup per developer

1. **Sign in to 1Password** in the desktop app + browser extension.
2. **Install the CLI:**
   ```bash
   brew install --cask 1password-cli   # macOS
   op signin                            # browser-based, one-time
   ```
3. **Verify access:**
   ```bash
   op vault list
   op item list --vault "Tokenization POC - EVM Smart Contracts"
   ```

## File layout (two files, both gitignored)

The script always has a plaintext fallback so nothing breaks when your trial
ends. You'll have **both** files side by side:

```
contracts/
├── .env                     ← plaintext values (always present, always works)
├── .env.1password           ← op:// references (you create this; optional)
└── .env.1password.example   ← committed template (you copy from this)

frontend/
├── .env.local               ← plaintext values (auto-written by deploy script)
├── .env.1password           ← op:// references (you create this; optional)
└── .env.1password.example   ← committed template
```

To enable 1Password mode, copy the template once:

```bash
cp contracts/.env.1password.example contracts/.env.1password
cp frontend/.env.1password.example   frontend/.env.1password
```

That's it. No edits needed — the references in the template already point at
the expected vault items.

## Running deploys

```bash
bash scripts/deploy-full.sh
```

The script automatically picks the right mode:

1. If `contracts/.env.1password` exists **AND** `op` CLI is installed **AND**
   `op whoami` succeeds (active session) → wraps in `op run` and resolves
   secrets from the vault.
2. Otherwise → uses plain `contracts/.env`.

Same command, both modes. Zero flags to memorize, zero file edits when your
trial expires.

For the frontend, choose per-command:

```bash
# Use 1Password (during trial)
op run --env-file frontend/.env.1password -- npm --prefix frontend run dev

# Plain (default after trial — Next.js reads .env.local automatically)
npm --prefix frontend run dev
```

### Escape hatch: `--skip-op`

If you have `op` installed but want to deploy from a plain `.env` for one run
(trial expired, debugging, swapping in a one-off key), use:

```bash
bash scripts/deploy-full.sh --skip-op
```

The flag bypasses auto-detection and sources `contracts/.env` directly,
regardless of whether it contains `op://` references. Useful when you've
temporarily commented out the references and pasted a plaintext value to test
something quickly.

## CI / GitHub Actions

Use a 1Password **service account** so CI runners can fetch secrets without
human interaction.

1. **Create a service account** in 1Password Business settings → "Developer
   Tools" → "Service Accounts". Grant it read-only access to the vault.
2. **Copy the service account token** (shown once on creation).
3. **In GitHub** → Settings → Secrets and variables → Actions → add
   `OP_SERVICE_ACCOUNT_TOKEN` = the token from step 2.
4. **Use the workflow** at [`.github/workflows/deploy-with-1password.yml`](../.github/workflows/deploy-with-1password.yml).

That workflow uses [`1password/install-cli-action`](https://github.com/1Password/install-cli-action)
+ [`1password/load-secrets-action`](https://github.com/1Password/load-secrets-action)
to resolve every `op://` reference at runtime. The actual secret values never
appear in the workflow YAML, the logs, or repo settings. Only the service
account token does, and it's scoped to read-only on this one vault.

## What this replaces

| Before | After |
|---|---|
| Slack DM: "send me the deployer key" | Add user to vault → they see all current values + future rotations automatically |
| `.env` file passed around | Commit `.env.1password.example` (no real secrets); each dev runs `op run` locally |
| GitHub Actions has 5+ secrets (`PRIVATE_KEY`, `ALCHEMY_URL`, `ETHERSCAN_KEY`, …) | GitHub Actions has 1 secret (`OP_SERVICE_ACCOUNT_TOKEN`); the rest live in 1Password |
| Rotate a key = update Slack pin, hope everyone notices | Rotate a key in 1Password → next deploy automatically uses the new value |
| Person leaves = audit and rotate everything they touched | Remove from vault; audit log shows what they accessed and when |

## Things to avoid

- **Don't store mainnet deployer private keys in 1Password.** Use a Gnosis
  Safe multi-sig + hardware wallet for mainnet. 1Password is appropriate for
  testnet (Sepolia) and staging keys where the blast radius is testnet-only
  funds.
- **Don't share items via 1Password "shared link"** for ongoing secrets. The
  URL is the key — anyone with the URL can read it. Use vault permissions
  instead.
- **Don't paste secrets into terminals you don't fully control** (screen
  sharing, pair programming with someone external). The scrollback is
  forever.

## What happens when your trial expires (TL;DR: nothing)

After day 14, 1Password's session token becomes invalid. The next time you
run `bash scripts/deploy-full.sh`:

1. The script checks `op whoami` → fails silently (no active session)
2. The script automatically uses `contracts/.env` (plaintext) instead
3. Deploy succeeds exactly as it did before any of this

You do **not** need to:
- Delete or edit `contracts/.env.1password`
- Uninstall the `op` CLI
- Pass any flag
- Touch the GitHub Actions workflow (it doesn't run on push, only manual)

The plaintext `contracts/.env` was always sitting there as the safety net.
1Password is an optional overlay; plain `.env` is the foundation.

## When you want to bypass 1Password for one deploy

Even with an active session, you can force the plaintext path:

```bash
bash scripts/deploy-full.sh --skip-op
```

Useful when you're debugging a specific value or want to deploy with a
one-off plaintext key you don't want sitting in your vault.
