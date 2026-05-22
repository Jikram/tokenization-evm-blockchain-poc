"use client";

import {useEffect, useState} from "react";
import {usePublicClient} from "wagmi";
import {BentoCard} from "../BentoCard";
import {FUND_ADDRESS, ORACLE_ADDRESS, navOracleAbi, tokenizedFundAbi} from "@/lib/contracts";
import {explorerAddr, formatCentsAsUsd, shortAddr} from "@/lib/format";

type Entry = {
    kind: "Minted" | "Burned" | "Clawback" | "UserApproved" | "PriceUpdated" | "PriceCleared";
    user?: string;
    amount?: bigint;
    nav?: bigint;
    extra?: string;
    block: bigint;
    txHash: string;
};

export function ActivityCard() {
    const client = usePublicClient();
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!client || !FUND_ADDRESS || !ORACLE_ADDRESS) return;
        let alive = true;

        const load = async () => {
            try {
                const head = await client.getBlockNumber();
                const from = head > 5_000n ? head - 5_000n : 0n;

                const [fundLogs, oracleLogs] = await Promise.all([
                    client.getContractEvents({
                        abi: tokenizedFundAbi,
                        address: FUND_ADDRESS,
                        fromBlock: from,
                        toBlock: head,
                    }),
                    client.getContractEvents({
                        abi: navOracleAbi,
                        address: ORACLE_ADDRESS,
                        fromBlock: from,
                        toBlock: head,
                    }),
                ]);

                const all: Entry[] = [];
                for (const l of fundLogs) {
                    if (l.blockNumber === null || l.transactionHash === null) continue;
                    const args = l.args as Record<string, unknown>;
                    if (l.eventName === "Minted" || l.eventName === "Burned" || l.eventName === "Clawback") {
                        all.push({
                            kind: l.eventName,
                            user: args.user as string,
                            amount: args.amount as bigint,
                            nav: args.navPrice as bigint,
                            extra: l.eventName === "Clawback" ? (args.reason as string) : undefined,
                            block: l.blockNumber,
                            txHash: l.transactionHash,
                        });
                    } else if (l.eventName === "UserApproved") {
                        all.push({
                            kind: "UserApproved",
                            user: args.user as string,
                            block: l.blockNumber,
                            txHash: l.transactionHash,
                        });
                    }
                }
                for (const l of oracleLogs) {
                    if (l.blockNumber === null || l.transactionHash === null) continue;
                    const args = l.args as Record<string, unknown>;
                    if (l.eventName === "PriceUpdated") {
                        all.push({
                            kind: "PriceUpdated",
                            nav: args.price as bigint,
                            block: l.blockNumber,
                            txHash: l.transactionHash,
                        });
                    } else if (l.eventName === "PriceCleared") {
                        all.push({
                            kind: "PriceCleared",
                            block: l.blockNumber,
                            txHash: l.transactionHash,
                        });
                    }
                }
                all.sort((a, b) => (b.block > a.block ? 1 : b.block < a.block ? -1 : 0));
                if (alive) {
                    setEntries(all.slice(0, 12));
                    setLoading(false);
                }
            } catch (e) {
                console.error("Failed to load activity", e);
                if (alive) setLoading(false);
            }
        };

        load();
        const t = setInterval(load, 15_000);
        return () => {
            alive = false;
            clearInterval(t);
        };
    }, [client]);

    return (
        <BentoCard title="Recent Activity" subtitle={loading ? "Loading…" : `${entries.length} event(s)`}>
            {entries.length === 0 && !loading && (
                <p className="text-sm text-zinc-500">No events yet. Mint or update price to see them here.</p>
            )}
            <ul className="space-y-2 text-sm">
                {entries.map((e) => (
                    <li key={e.txHash + e.kind + String(e.block)} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2">
                        <div className="flex items-center gap-2">
                            <KindBadge kind={e.kind} />
                            <span className="text-zinc-700">
                                {e.kind === "Minted" && `+${e.amount} to `}
                                {e.kind === "Burned" && `-${e.amount} from `}
                                {e.kind === "Clawback" && `-${e.amount} from `}
                                {e.kind === "UserApproved" && "KYC approved "}
                                {e.kind === "PriceUpdated" && `NAV → ${formatCentsAsUsd(e.nav)}`}
                                {e.kind === "PriceCleared" && "Oracle price cleared"}
                                {e.user && (
                                    <a
                                        href={explorerAddr(e.user)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-mono text-indigo-600 hover:text-indigo-800"
                                    >
                                        {shortAddr(e.user)}
                                    </a>
                                )}
                            </span>
                            {e.kind !== "PriceUpdated" && e.kind !== "PriceCleared" && e.kind !== "UserApproved" && e.nav !== undefined && (
                                <span className="text-xs text-zinc-400">@ {formatCentsAsUsd(e.nav)}</span>
                            )}
                            {e.extra && <span className="text-xs text-zinc-500">· {e.extra}</span>}
                        </div>
                        <a
                            href={`https://sepolia.etherscan.io/tx/${e.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-zinc-400 hover:text-zinc-700"
                        >
                            ↗
                        </a>
                    </li>
                ))}
            </ul>
        </BentoCard>
    );
}

function KindBadge({kind}: {kind: Entry["kind"]}) {
    const colors: Record<Entry["kind"], string> = {
        Minted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        Burned: "bg-zinc-100 text-zinc-700 ring-zinc-200",
        Clawback: "bg-amber-50 text-amber-700 ring-amber-200",
        UserApproved: "bg-indigo-50 text-indigo-700 ring-indigo-200",
        PriceUpdated: "bg-indigo-50 text-indigo-700 ring-indigo-200",
        PriceCleared: "bg-amber-50 text-amber-700 ring-amber-200",
    };
    return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${colors[kind]}`}>
            {kind}
        </span>
    );
}
