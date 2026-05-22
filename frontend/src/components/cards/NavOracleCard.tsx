"use client";

import {useState} from "react";
import {useAccount, useWriteContract} from "wagmi";
import {BentoCard} from "../BentoCard";
import {ChartIcon, SparkleIcon} from "../Icon";
import {ORACLE_ADDRESS, navOracleAbi} from "@/lib/contracts";
import {formatCentsAsUsd} from "@/lib/format";
import {useActivityLog} from "@/hooks/useActivityLog";

type Props = {
    priceCents?: bigint;
    hasPrice?: boolean;
    isAdmin: boolean;
    onSettled: () => void;
};

export function NavOracleCard({priceCents, hasPrice, isAdmin, onSettled}: Props) {
    const {isConnected} = useAccount();
    const {writeContract, isPending} = useWriteContract();
    const {push, update} = useActivityLog();
    const [draftDollars, setDraftDollars] = useState("");

    const submit = () => {
        const dollars = Number(draftDollars);
        if (!dollars || dollars <= 0) return;
        const cents = BigInt(Math.round(dollars * 100));
        const id = push({type: "oracle_update", status: "pending", message: `Update NAV → $${dollars.toFixed(2)}`});
        writeContract(
            {address: ORACLE_ADDRESS, abi: navOracleAbi, functionName: "updatePrice", args: [cents]},
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
            {address: ORACLE_ADDRESS, abi: navOracleAbi, functionName: "clearPrice"},
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

    return (
        <BentoCard
            accent="blue"
            variant="hero"
            title="Net Asset Value"
            subtitle="Live oracle · cross-contract atomic"
            icon={<ChartIcon size={16} />}
            className="md:row-span-2"
        >
            <div className="flex items-baseline gap-3">
                <div className="text-5xl font-semibold tracking-tight text-zinc-900 tabular-nums">
                    {hasPrice ? formatCentsAsUsd(priceCents) : "—"}
                </div>
                {hasPrice ? (
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Live</span>
                    </div>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> No price
                    </span>
                )}
            </div>

            <div className="mt-1 text-xs text-zinc-500">per unit · published by admin</div>

            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-zinc-100 pt-4">
                <Stat label="Asset" value="Real Estate" />
                <Stat label="Quote" value="USD" />
                <Stat label="Format" value="cents" />
                <Stat label="Atomicity" value={<span className="font-semibold text-emerald-600">guaranteed</span>} />
            </div>

            {!hasPrice && (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-800">
                    Mint, burn, and clawback will revert atomically until a price is set.
                </p>
            )}

            {isAdmin && (
                <div className="mt-5 space-y-2 border-t border-zinc-100 pt-4">
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        <SparkleIcon size={11} /> Admin · update price
                    </label>
                    <div className="flex gap-2">
                        <input
                            value={draftDollars}
                            onChange={(e) => setDraftDollars(e.target.value)}
                            placeholder="USD per unit (e.g. 1000.00)"
                            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm focus:border-cb-500 focus:outline-none focus:ring-2 focus:ring-cb-100"
                        />
                        <button
                            onClick={submit}
                            disabled={!isConnected || isPending || !draftDollars}
                            className="rounded-lg bg-cb-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-cb-700 disabled:opacity-40"
                        >
                            {isPending ? "…" : "Set"}
                        </button>
                    </div>
                    <button
                        onClick={clear}
                        disabled={!isConnected || isPending || !hasPrice}
                        className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-40"
                        title="Demonstrates oracle failure: token mint/burn/clawback will revert"
                    >
                        Clear price (demo failure)
                    </button>
                </div>
            )}
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
