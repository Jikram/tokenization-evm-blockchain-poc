"use client";

import {useCallback, useEffect, useState} from "react";
import {usePublicClient, useAccount} from "wagmi";
import {BentoCard} from "../BentoCard";
import {ChartIcon, ExternalLinkIcon} from "../Icon";
import {FUND_ADDRESS, ORACLE_ADDRESS, navOracleAbi, tokenizedFundAbi} from "@/lib/contracts";
import {explorerAddr, formatCentsAsUsd, shortAddr} from "@/lib/format";

type InitMetadata = {
    assetType: string;
    documentHash: `0x${string}`;
    country: string;
    region: string;
    issuedAt: bigint;
    minInvestment: bigint;
    isin: string;
    totalSupplyCap: bigint;
    status: number;
    tags: readonly string[];
    propertyKeys: readonly string[];
    propertyValues: readonly string[];
};

type Entry = {
    kind: "Minted" | "Burned" | "Clawback" | "UserApproved" | "PriceUpdated" | "PriceCleared" | "Initialized";
    user?: string;
    amount?: bigint;
    nav?: bigint;
    extra?: string;
    initMetadata?: InitMetadata;
    initAdmin?: string;
    initAssetName?: string;
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
                        initAdmin: args.admin as string,
                        initAssetName: args.assetName as string,
                        initMetadata: args.metadata as InitMetadata,
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
            className="h-full"
            action={
                <button
                    onClick={load}
                    disabled={loading}
                    className="rounded-full bg-violet-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
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

            <div className="mb-4 space-y-2">
                <ContractRow label="Token Fund" value={FUND_ADDRESS} />
                {adminAddress && (
                    <div className="rounded-xl border border-violet-200 bg-white p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">Admin Wallet</p>
                        <a
                            href={explorerAddr(adminAddress)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 truncate font-mono text-xs text-violet-700 hover:text-violet-800"
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
            </div>

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
                                    Fund initialized: <span className="font-medium">{e.initAssetName}</span>
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
                                            className="font-mono text-violet-600 hover:text-violet-700"
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
                                            className="font-mono text-violet-600 hover:text-violet-700"
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
                                            className="font-mono text-violet-600 hover:text-violet-700"
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
                                            className="font-mono text-violet-600 hover:text-violet-700"
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

                        {/* Rich init metadata panel — captured at deploy time, admin immutable */}
                        {e.kind === "Initialized" && e.initMetadata && (
                            <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50/60 p-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                                    Asset Metadata · captured at init · admin immutable
                                </p>
                                {e.initAdmin && (
                                    <p className="mt-1 truncate font-mono text-[10px] text-zinc-600">
                                        admin: {e.initAdmin}
                                    </p>
                                )}
                                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                                    <MetaRow label="Type" value={e.initMetadata.assetType} />
                                    <MetaRow
                                        label="Status"
                                        value={["Active", "Suspended", "Redeemed"][e.initMetadata.status] ?? "?"}
                                    />
                                    <MetaRow
                                        label="Total Supply"
                                        value={`${e.initMetadata.totalSupplyCap.toLocaleString()} units`}
                                    />
                                    <MetaRow
                                        label="Min Investment"
                                        value={`$${e.initMetadata.minInvestment.toLocaleString()}`}
                                    />
                                    <MetaRow label="ISIN" value={e.initMetadata.isin} mono />
                                    <MetaRow
                                        label="Location"
                                        value={`${e.initMetadata.region}, ${e.initMetadata.country}`}
                                    />
                                    <MetaRow
                                        label="Issued At"
                                        value={new Date(Number(e.initMetadata.issuedAt) * 1000).toLocaleString()}
                                    />
                                    <MetaRow
                                        label="Doc Hash"
                                        value={`${e.initMetadata.documentHash.slice(0, 10)}…${e.initMetadata.documentHash.slice(-6)}`}
                                        mono
                                    />
                                </dl>
                                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-violet-700">Tags</p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {e.initMetadata.tags.map((t) => (
                                        <span
                                            key={t}
                                            className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700"
                                        >
                                            {t}
                                        </span>
                                    ))}
                                </div>
                                {e.initMetadata.propertyKeys.length > 0 && (
                                    <>
                                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                                            Properties
                                        </p>
                                        <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                                            {e.initMetadata.propertyKeys.map((k, i) => (
                                                <MetaRow
                                                    key={k}
                                                    label={k.replaceAll("_", " ")}
                                                    value={e.initMetadata?.propertyValues[i] ?? ""}
                                                />
                                            ))}
                                        </dl>
                                    </>
                                )}
                            </div>
                        )}

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

function MetaRow({label, value, mono}: {label: string; value: string; mono?: boolean}) {
    return (
        <div>
            <dt className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">{label}</dt>
            <dd className={`mt-0.5 truncate text-zinc-800 ${mono ? "font-mono text-[10px]" : ""}`}>{value}</dd>
        </div>
    );
}

function ContractRow({label, value}: {label: string; value?: string}) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
            {value ? (
                <a
                    href={explorerAddr(value)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs text-violet-700 hover:text-violet-800"
                >
                    {shortAddr(value)}
                    <ExternalLinkIcon size={10} />
                </a>
            ) : (
                <span className="text-zinc-400">—</span>
            )}
        </div>
    );
}

function KindBadge({kind}: {kind: Entry["kind"]}) {
    const colors: Record<Entry["kind"], string> = {
        Initialized: "bg-zinc-100 text-zinc-700 ring-zinc-200",
        Minted: "bg-emerald-100 text-emerald-700 ring-emerald-200",
        Burned: "bg-rose-100 text-rose-700 ring-rose-200",
        Clawback: "bg-amber-100 text-amber-700 ring-amber-200",
        UserApproved: "bg-violet-100 text-violet-700 ring-violet-200",
        PriceUpdated: "bg-violet-100 text-violet-700 ring-violet-200",
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
