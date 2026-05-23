"use client";

import {useActivityLog, type ActivityEntry} from "@/hooks/useActivityLog";

const TYPE_LABEL: Record<ActivityEntry["type"], string> = {
    wallet_connect: "wallet connect",
    wallet_disconnect: "wallet disconnect",
    kyc_check: "KYC check",
    kyc_approve: "KYC approval",
    mint: "mint",
    burn: "burn",
    clawback: "clawback",
    oracle_update: "oracle update",
    oracle_clear: "oracle clear",
};

/**
 * Floating toast that appears whenever any activity entry is in `pending` state
 * (i.e. waiting for the user to sign the transaction in their wallet, or
 * waiting for the network to confirm).
 */
export function PendingTxToast() {
    const {entries} = useActivityLog();
    const pending = entries.filter((e) => e.status === "pending");
    if (pending.length === 0) return null;

    const top = pending[0]; // most recent

    return (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 transform">
            <div className="pop-in flex items-center gap-3 rounded-xl border border-violet-300 bg-white px-4 py-3 shadow-bento-lg">
                <Spinner />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">
                        Approve the {TYPE_LABEL[top.type]} transaction in your wallet
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {top.message}
                        {pending.length > 1 && (
                            <span className="ml-1 text-violet-600">
                                · +{pending.length - 1} more pending
                            </span>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}

function Spinner() {
    return (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
            <svg className="h-7 w-7 animate-spin text-violet-600" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
                <path
                    d="M22 12a10 10 0 0 1-10 10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    );
}
