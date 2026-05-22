"use client";

import {useActivityLog, type ActivityEntry} from "@/hooks/useActivityLog";
import {BentoCard} from "../BentoCard";
import {ActivityIcon, ExternalLinkIcon} from "../Icon";

const TYPE_LABEL: Record<ActivityEntry["type"], string> = {
    wallet_connect: "Wallet Connect",
    wallet_disconnect: "Wallet Disconnect",
    kyc_check: "KYC Check",
    kyc_approve: "KYC Approve",
    mint: "Mint",
    burn: "Burn",
    clawback: "Clawback",
    oracle_update: "Oracle Update",
    oracle_clear: "Oracle Clear",
};

function timeStr(iso: string) {
    return new Date(iso).toLocaleTimeString();
}

export function ActivityLogCard() {
    const {entries, clear} = useActivityLog();

    return (
        <BentoCard
            accent="violet"
            title="Activity"
            subtitle="Local session log"
            icon={<ActivityIcon size={16} />}
            action={
                entries.length > 0 ? (
                    <button
                        onClick={clear}
                        className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700"
                    >
                        Clear
                    </button>
                ) : null
            }
        >
            {entries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-5 text-center text-xs text-zinc-500">
                    No activity yet. Connect a wallet and interact with the contract.
                </div>
            ) : (
                <ol className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {entries.map((e) => (
                        <li
                            key={e.id}
                            className={`rounded-xl border bg-white p-3 ${
                                e.status === "success"
                                    ? "border-emerald-200"
                                    : e.status === "error"
                                    ? "border-rose-200"
                                    : "border-amber-200"
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                                    {TYPE_LABEL[e.type]}
                                </span>
                                <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
                                        e.status === "success"
                                            ? "text-emerald-600"
                                            : e.status === "error"
                                            ? "text-rose-600"
                                            : "text-amber-600"
                                    }`}
                                >
                                    {e.status === "pending" && (
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                                    )}
                                    {e.status}
                                </span>
                            </div>
                            <p className="mt-1.5 text-sm text-zinc-700">{e.message}</p>
                            {e.txHash && (
                                <a
                                    href={`https://sepolia.etherscan.io/tx/${e.txHash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1.5 inline-flex items-center gap-1 truncate font-mono text-[11px] text-cb-600 hover:text-cb-700"
                                >
                                    {e.txHash.slice(0, 10)}…{e.txHash.slice(-8)}
                                    <ExternalLinkIcon size={10} />
                                </a>
                            )}
                            <p className="mt-1 text-[10px] text-zinc-400">{timeStr(e.timestamp)}</p>
                        </li>
                    ))}
                </ol>
            )}
        </BentoCard>
    );
}
