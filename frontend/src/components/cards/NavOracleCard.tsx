"use client";

import {useState} from "react";
import {useAccount, useWriteContract} from "wagmi";
import {sepolia} from "wagmi/chains";
import {BentoCard} from "../BentoCard";
import {ChartIcon, ExternalLinkIcon, SparkleIcon} from "../Icon";
import {ORACLE_ADDRESS, navOracleAbi} from "@/lib/contracts";
import {explorerAddr, formatCentsAsUsd, shortAddr} from "@/lib/format";
import {useActivityLog} from "@/hooks/useActivityLog";

type Props = {
    priceCents?: bigint;
    hasPrice?: boolean;
    isAdmin: boolean;
    isConnected: boolean;
    isLoading: boolean;
    onSettled: () => void;
    onRefresh: () => void;
};

export function NavOracleCard({
    priceCents,
    hasPrice,
    isAdmin,
    isConnected,
    isLoading,
    onSettled,
    onRefresh,
}: Props) {
    const {isConnected: walletConnected} = useAccount();
    const {writeContract, isPending} = useWriteContract();
    const {push, update} = useActivityLog();
    const [draftDollars, setDraftDollars] = useState("");

    const submit = () => {
        const dollars = Number(draftDollars);
        if (!dollars || dollars <= 0) return;
        const cents = BigInt(Math.round(dollars * 100));
        const id = push({type: "oracle_update", status: "pending", message: `Update NAV → $${dollars.toFixed(2)}`});
        writeContract(
            {address: ORACLE_ADDRESS, abi: navOracleAbi, functionName: "updatePrice", args: [cents], chainId: sepolia.id},
            {
                onSuccess: (txHash) => {
                    update(id, {status: "success", txHash, message: `NAV updated → $${dollars.toFixed(2)}`});
                    setDraftDollars("");
                    onSettled();
                },
                onError: (e) => {
                    update(id, {status: "error", message: `NAV update failed · ${e.message.slice(0, 80)}`});
                    onSettled();
                },
            }
        );
    };

    const clear = () => {
        const id = push({type: "oracle_clear", status: "pending", message: "Clear NAV price"});
        writeContract(
            {address: ORACLE_ADDRESS, abi: navOracleAbi, functionName: "clearPrice", chainId: sepolia.id},
            {
                onSuccess: (txHash) => {
                    update(id, {status: "success", txHash, message: "Oracle price cleared (atomic-revert demo)"});
                    onSettled();
                },
                onError: (e) => {
                    update(id, {status: "error", message: `Clear price failed · ${e.message.slice(0, 80)}`});
                    onSettled();
                },
            }
        );
    };

    const inputDisabled = !walletConnected || !isAdmin || isPending;

    return (
        <BentoCard
            accent="blue"
            variant="hero"
            title="Cross-Contract NAV Oracle"
            subtitle="Atomic price feed · called from mint/burn/clawback"
            icon={<ChartIcon size={16} />}
            className="h-full"
            action={
                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold text-zinc-600 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-50"
                >
                    {isLoading ? "…" : "Refresh"}
                </button>
            }
        >
            {/* Price block */}
            <div className="rounded-xl border border-zinc-100 bg-white p-5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Net Asset Value / Unit
                </p>
                {hasPrice ? (
                    <>
                        <p className="mt-2 text-4xl font-semibold tracking-tight text-zinc-900 tabular-nums">
                            {formatCentsAsUsd(priceCents)}
                        </p>
                        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            Live · fetched from oracle contract
                        </p>
                    </>
                ) : (
                    <>
                        <p className="mt-2 text-3xl font-semibold tracking-tight text-rose-600">No price set</p>
                        <p className="mt-2 text-[11px] font-semibold text-rose-500">
                            Mint, burn, and clawback will revert atomically
                        </p>
                    </>
                )}
            </div>

            {/* Oracle contract address */}
            {ORACLE_ADDRESS && (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-zinc-100 bg-white px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Oracle</span>
                    <a
                        href={explorerAddr(ORACLE_ADDRESS)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-violet-600 hover:text-violet-700"
                    >
                        {shortAddr(ORACLE_ADDRESS)}
                        <ExternalLinkIcon size={10} />
                    </a>
                </div>
            )}

            {/* Stats strip */}
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-zinc-100 pt-3">
                <Stat label="Asset" value="Real Estate" />
                <Stat label="Quote" value="USD" />
                <Stat label="Format" value="cents (uint256)" />
                <Stat label="Atomicity" value={<span className="font-semibold text-emerald-600">guaranteed</span>} />
            </div>

            {/* Admin block — amber, always visible, disabled when not admin. mt-auto pushes to bottom */}
            <div className="mt-auto pt-4">
                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                            <SparkleIcon size={11} /> Oracle Admin
                        </label>
                        {isAdmin ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                                ✓ You are admin
                            </span>
                        ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
                                Admin only
                            </span>
                        )}
                    </div>
                    <div className="flex items-stretch gap-2">
                        <input
                            value={draftDollars}
                            onChange={(e) => setDraftDollars(e.target.value)}
                            placeholder="USD per unit"
                            disabled={inputDisabled}
                            className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
                        />
                        <button
                            onClick={submit}
                            disabled={inputDisabled || !draftDollars}
                            className="flex-shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {isPending ? "…" : "Update"}
                        </button>
                    </div>
                    <button
                        onClick={clear}
                        disabled={inputDisabled || !hasPrice}
                        className="w-full rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Demonstrates oracle failure: token mint/burn/clawback will revert"
                    >
                        Clear Price — Demo Oracle Failure
                    </button>
                    <p className="text-[10px] leading-relaxed text-zinc-600">
                        Clearing the price causes mint/burn/clawback to revert atomically — the token contract calls this oracle mid-transaction, and if it reverts, the entire tx rolls back.
                    </p>
                    {walletConnected && !isAdmin && (
                        <p className="text-[10px] text-amber-600">Switch to the admin wallet to update the oracle price.</p>
                    )}
                    {!isConnected && (
                        <p className="text-[10px] text-zinc-400">Connect wallet to enable.</p>
                    )}
                </div>
            </div>
        </BentoCard>
    );
}

function Stat({label, value}: {label: string; value: React.ReactNode}) {
    return (
        <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{label}</div>
            <div className="mt-0.5 text-sm font-medium text-zinc-700">{value}</div>
        </div>
    );
}
