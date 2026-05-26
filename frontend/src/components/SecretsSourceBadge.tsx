"use client";

/**
 * Small badge that shows whether this build's env vars were resolved from
 * 1Password (via `op run`) or read as plaintext from `.env.local`.
 *
 * The value is baked in at build time from `NEXT_PUBLIC_SECRETS_SOURCE`:
 *   • Set to "1password" by `frontend/.env.1password` (used when running
 *     `op run --env-file frontend/.env.1password -- npm run build|dev`)
 *   • Set to "1password" or "plain" by `scripts/deploy-full.sh` when it
 *     auto-writes `frontend/.env.local` after a contract deploy
 *   • Defaults to "plain" when the var is unset
 */
export function SecretsSourceBadge() {
    const raw = process.env.NEXT_PUBLIC_SECRETS_SOURCE;
    const source = raw === "1password" ? "1password" : "plain";

    if (source === "1password") {
        return (
            <span
                className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700 ring-1 ring-violet-200"
                title="Env vars resolved from 1Password vault via `op run`"
            >
                <LockClosedIcon />
                Secrets: 1Password
            </span>
        );
    }

    return (
        <span
            className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 ring-1 ring-zinc-200"
            title="Env vars sourced from plaintext .env / .env.local files"
        >
            <LockOpenIcon />
            Secrets: Plain .env
        </span>
    );
}

function LockClosedIcon() {
    return (
        <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

function LockOpenIcon() {
    return (
        <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </svg>
    );
}
