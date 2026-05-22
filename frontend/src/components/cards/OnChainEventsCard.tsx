"use client";

import {useCallback, useEffect, useState} from "react";
import {usePublicClient, useAccount} from "wagmi";
import {BentoCard} from "../BentoCard";
import {ChartIcon, ExternalLinkIcon} from "../Icon";
import {FUND_ADDRESS, ORACLE_ADDRESS, navOracleAbi, tokenizedFundAbi} from "@/lib/contracts";
import {explorerAddr, formatCentsAsUsd, shortAddr} from "@/lib/format";

type Entry = {
    kind: "Minted" | "Burned" | "Clawback" | "UserApproved" | "PriceUpdated" | "PriceCleared" | "Initialized";
    user?: string;
    amount?: bigint;
    nav?: bigint;
    extra?: string;
    block: bigint;
    txHash: string;
};

type Props = {
    adminAddress?: string;
};

export function OnChainEventsCard({adminAddress}: Props) {
    const client = usePublicClient();
    const {address: walletAddress} = useAccount();
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(false);
    const [range, setRange] = useState<{from: bigint; to: bigint} | null>(null);

    const load = useCallback(async () => {
        if (!client || !FUND_ADDRESS || !ORACLE_ADDRESS) return;
        setLoading(true);
        try {
            const head = await client.getBlockNumber();
            const from = head > 50_000n ? head - 50_000n : 0n;
            setRange({from, to: head});

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
                } else if (l.eventName === "Initialized") {
                    all.push({
                        kind: "Initialized",
                        extra: args.assetName as string,
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
            setEntries(all);
        } catch (e) {
            console.error("Failed to fetch on-chain events", e);
        } finally {
            setLoading(false);
        }
    }, [client]);

    useEffect(() => {
        load();
    }, [load]);

    const isAdminConnected =
        walletAddress && adminAddress && walletAddress.toLowerCase() === adminAddress.toLowerCase();

    return (
        <BentoCard
            accent="blue"
            title="On-Chain"
            subtitle="Contract events · Sepolia logs"
            icon={<ChartIcon size={16} />}
            action={
                <button
                    onClick={load}
                    disabled={loading}
                    className="rounded-full bg-cb-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-cb-700 disabled:opacity-50"
                >
                    {loading ? "Loading…" : "Fetch"}
                </button>
            }
        >
            {range && (
                <p className="-mt-2 mb-3 text-[10px] text-zinc-400">
                    Blocks {range.from.toLocaleString()} → {range.to.toLocaleString()} · ~
                    {Math.round((Number(range.to - range.from) * 12) / 3600)}h window
                </p>
            )}

            {adminAddress && (
                <div className="mb-4 rounded-xl border border-cb-200 bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-cb-700">Admin Wallet</p>
                    <a
                        href={explorerAddr(adminAddress)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 truncate font-mono text-xs text-cb-700 hover:text-cb-800"
                    >
                        {adminAddress}
                        <ExternalLinkIcon size={10} />
                    </a>
                    {walletAddress && (
                        <p className="mt-1 text-[11px] text-zinc-500">
                            {isAdminConnected
                                ? "✓ Your connected wallet is the admin"
                                : "Your connected wallet is not the admin"}
                        </p>
                    )}
                </div>
            )}

            <ol className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {entries.length === 0 && !loading && (
                    <li className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-5 text-center text-xs text-zinc-500">
                        No events yet. Mint or update the oracle to populate.
                    </li>
                )}
                {entries.map((e) => (
                    <li
                        key={e.txHash + e.kind + String(e.block)}
                        className="rounded-xl border border-zinc-200 bg-white p-3"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <KindBadge kind={e.kind} />
                            <a
                                href={`https://sepolia.etherscan.io/tx/${e.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-zinc-400 hover:text-zinc-700"
                                title="View tx"
                            >
                                <ExternalLinkIcon size={10} />
                            </a>
                        </div>
                        <p className="mt-1.5 text-sm text-zinc-700">
                            {e.kind === "Initialized" && (
                                <>
                                    Fund initialized: <span className="font-medium">{e.extra}</span>
                                </>
                            )}
                            {e.kind === "Minted" && (
                                <>
                                    Minted <span className="font-medium tabular-nums">+{e.amount?.toLocaleString()}</span> to{" "}
                                    {e.user && (
                                        <a
                                            href={explorerAddr(e.user)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-mono text-cb-600 hover:text-cb-700"
                                        >
                                            {shortAddr(e.user)}
                                        </a>
                                    )}
                                </>
                            )}
                            {e.kind === "Burned" && (
                                <>
                                    Burned <span className="font-medium tabular-nums">-{e.amount?.toLocaleString()}</span> from{" "}
                                    {e.user && (
                                        <a
                                            href={explorerAddr(e.user)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-mono text-cb-600 hover:text-cb-700"
                                        >
                                            {shortAddr(e.user)}
                                        </a>
                                    )}
                                </>
                            )}
                            {e.kind === "Clawback" && (
                                <>
                                    Clawback <span className="font-medium tabular-nums">-{e.amount?.toLocaleString()}</span> from{" "}
                                    {e.user && (
                                        <a
                                            href={explorerAddr(e.user)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-mono text-cb-600 hover:text-cb-700"
                                        >
                                            {shortAddr(e.user)}
                                        </a>
                                    )}
                                </>
                            )}
                            {e.kind === "UserApproved" && (
                                <>
                                    KYC approved{" "}
                                    {e.user && (
                                        <a
                                            href={explorerAddr(e.user)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-mono text-cb-600 hover:text-cb-700"
                                        >
                                            {shortAddr(e.user)}
                                        </a>
                                    )}
                                </>
                            )}
                            {e.kind === "PriceUpdated" && (
                                <>
                                    NAV updated to{" "}
                                    <span className="font-medium tabular-nums">{formatCentsAsUsd(e.nav)}</span>
                                </>
                            )}
                            {e.kind === "PriceCleared" && <>Oracle price cleared (atomic-revert demo)</>}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400">
                            <span>Block {e.block.toLocaleString()}</span>
                            {e.nav !== undefined && e.kind !== "PriceUpdated" && (
                                <span className="tabular-nums">@ {formatCentsAsUsd(e.nav)}</span>
                            )}
                            {e.extra && e.kind === "Clawback" && <span>· {e.extra}</span>}
                        </div>
                    </li>
                ))}
            </ol>
        </BentoCard>
    );
}

function KindBadge({kind}: {kind: Entry["kind"]}) {
    const colors: Record<Entry["kind"], string> = {
        Initialized: "bg-zinc-100 text-zinc-700 ring-zinc-200",
        Minted: "bg-emerald-100 text-emerald-700 ring-emerald-200",
        Burned: "bg-rose-100 text-rose-700 ring-rose-200",
        Clawback: "bg-amber-100 text-amber-700 ring-amber-200",
        UserApproved: "bg-cb-100 text-cb-700 ring-cb-200",
        PriceUpdated: "bg-cb-100 text-cb-700 ring-cb-200",
        PriceCleared: "bg-amber-100 text-amber-700 ring-amber-200",
    };
    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${colors[kind]}`}
        >
            {kind}
        </span>
    );
}
