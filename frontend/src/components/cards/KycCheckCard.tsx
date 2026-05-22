"use client";

import {useState} from "react";
import {usePublicClient} from "wagmi";
import {isAddress} from "viem";
import {BentoCard} from "../BentoCard";
import {ShieldCheckIcon} from "../Icon";
import {FUND_ADDRESS, tokenizedFundAbi} from "@/lib/contracts";
import {useActivityLog} from "@/hooks/useActivityLog";
import {shortAddr} from "@/lib/format";

type Result = {address: string; approved: boolean} | null;

export function KycCheckCard() {
    const client = usePublicClient();
    const {push, update} = useActivityLog();
    const [user, setUser] = useState("");
    const [result, setResult] = useState<Result>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const valid = isAddress(user as `0x${string}`);

    const check = async () => {
        if (!valid || !client) return;
        setError(null);
        setResult(null);
        setLoading(true);
        const target = user as `0x${string}`;
        const id = push({
            type: "kyc_check",
            status: "pending",
            message: `Reading KYC status for ${shortAddr(target)}…`,
        });
        try {
            const approved = (await client.readContract({
                address: FUND_ADDRESS,
                abi: tokenizedFundAbi,
                functionName: "isApproved",
                args: [target],
            })) as boolean;
            setResult({address: target, approved});
            update(id, {
                status: "success",
                message: `${shortAddr(target)} is ${approved ? "KYC approved ✓" : "not KYC approved ✗"}`,
            });
        } catch (e) {
            const msg = (e as Error).message?.slice(0, 80) ?? "unknown error";
            setError(msg);
            update(id, {status: "error", message: `KYC read failed · ${msg}`});
        } finally {
            setLoading(false);
        }
    };

    return (
        <BentoCard
            accent="cyan"
            title="KYC Lookup"
            subtitle="Read on-chain whitelist (public)"
            icon={<ShieldCheckIcon size={16} />}
        >
            <div className="space-y-2">
                <div className="flex gap-2">
                    <input
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                        placeholder="0x… any address"
                        className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-mono focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
                    />
                    <button
                        onClick={check}
                        disabled={loading || !valid}
                        className="rounded-lg bg-cyan-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-40"
                    >
                        {loading ? "…" : "Check"}
                    </button>
                </div>

                {result && (
                    <div
                        className={`rounded-lg border p-3 text-sm ${
                            result.approved
                                ? "border-emerald-200 bg-emerald-50/60"
                                : "border-zinc-200 bg-zinc-50/60"
                        }`}
                    >
                        <div className="font-mono text-xs text-zinc-500">{result.address}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                            {result.approved ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                    <ShieldCheckIcon size={11} /> KYC approved
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 ring-1 ring-zinc-200">
                                    Not on whitelist
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                        {error}
                    </div>
                )}
            </div>
        </BentoCard>
    );
}
