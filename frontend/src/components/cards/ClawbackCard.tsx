"use client";

import {useState} from "react";
import {useAccount, useWriteContract} from "wagmi";
import {sepolia} from "wagmi/chains";
import {isAddress} from "viem";
import {BentoCard} from "../BentoCard";
import {AlertTriangleIcon} from "../Icon";
import {FUND_ADDRESS, tokenizedFundAbi} from "@/lib/contracts";
import {useActivityLog} from "@/hooks/useActivityLog";
import {shortAddr} from "@/lib/format";

export function ClawbackCard({isAdmin, onSettled}: {isAdmin: boolean; onSettled: () => void}) {
    const {isConnected} = useAccount();
    const {writeContract, isPending} = useWriteContract();
    const {push, update} = useActivityLog();
    const [user, setUser] = useState("");
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("sanctions");
    const [severity, setSeverity] = useState("9");
    const [caseRef, setCaseRef] = useState(String(Date.now()));

    const INT64_MAX = 9_223_372_036_854_775_807n; // 2^63 - 1
    const INT32_MAX = 2_147_483_647; // 2^31 - 1
    const INT32_MIN = -2_147_483_648;

    const disabled = !isConnected || !isAdmin;

    // Field-level validation so we never send out-of-range integers
    const severityNum = Number(severity);
    const caseRefValid = (() => {
        if (caseRef === "" || caseRef === "-") return false;
        try {
            const v = BigInt(caseRef);
            return v >= -INT64_MAX && v <= INT64_MAX;
        } catch {
            return false;
        }
    })();
    const severityValid =
        severity !== "" && Number.isFinite(severityNum) && severityNum >= INT32_MIN && severityNum <= INT32_MAX;

    const valid =
        !disabled &&
        isAddress(user as `0x${string}`) &&
        amount !== "" &&
        Number(amount) > 0 &&
        reason.length > 0 &&
        severityValid &&
        caseRefValid;

    const submit = () => {
        if (!valid) return;
        const id = push({
            type: "clawback",
            status: "pending",
            message: `Clawback ${amount} from ${shortAddr(user)} · ${reason}`,
        });
        writeContract(
            {
                address: FUND_ADDRESS,
                abi: tokenizedFundAbi,
                functionName: "clawback",
                args: [
                    user as `0x${string}`,
                    BigInt(amount),
                    reason,
                    Number(severity),
                    BigInt(caseRef),
                ],
                chainId: sepolia.id,
            },
            {
                onSuccess: (txHash) => {
                    update(id, {
                        status: "success",
                        txHash,
                        message: `Clawback ${amount} from ${shortAddr(user)} · ${reason}`,
                    });
                    onSettled();
                },
                onError: (e) => {
                    update(id, {status: "error", message: `Clawback failed · ${e.message.slice(0, 80)}`});
                    onSettled();
                },
            }
        );
    };

    return (
        <BentoCard
            accent="amber"
            title="Clawback"
            subtitle="Forced redemption · compliance action"
            icon={<AlertTriangleIcon size={16} />}
            action={
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
                    Admin
                </span>
            }
        >
            <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                <input
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="0x… holder address"
                    disabled={disabled}
                    className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm font-mono focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 md:col-span-5"
                />
                <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Amount"
                    disabled={disabled}
                    className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm tabular-nums focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 md:col-span-2"
                />
                <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason"
                    disabled={disabled}
                    className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 md:col-span-2"
                />
                <input
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value.replace(/[^0-9-]/g, ""))}
                    placeholder="Severity 1-10"
                    disabled={disabled}
                    className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm tabular-nums focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 md:col-span-2"
                />
                <input
                    value={caseRef}
                    onChange={(e) => {
                        // int64 fits in 19 digits (max 9,223,372,036,854,775,807).
                        // Allow leading minus + up to 19 digits.
                        const v = e.target.value.replace(/[^0-9-]/g, "");
                        const digits = v.replace(/-/g, "");
                        if (digits.length > 19) return;
                        setCaseRef(v);
                    }}
                    placeholder="Case ref"
                    disabled={disabled}
                    title="int64 — max 19 digits"
                    className={`rounded-lg border bg-white px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 md:col-span-1 ${
                        caseRef !== "" && !caseRefValid
                            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                            : "border-amber-200 focus:border-amber-500 focus:ring-amber-100"
                    }`}
                />
            </div>
            {!isConnected && (
                <p className="mt-2 text-center text-[11px] text-zinc-400">Connect wallet to enable.</p>
            )}
            {isConnected && !isAdmin && (
                <p className="mt-2 text-center text-[11px] text-amber-600">Admin-only · connect admin wallet.</p>
            )}
            {isConnected && isAdmin && caseRef !== "" && !caseRefValid && (
                <p className="mt-2 text-center text-[11px] text-rose-600">
                    Case reference must fit in int64 (max 19 digits, ≤ 9.22 × 10¹⁸).
                </p>
            )}
            <button
                onClick={submit}
                disabled={isPending || !valid}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <AlertTriangleIcon size={14} />
                {isPending ? "Submitting…" : "Clawback"}
            </button>
        </BentoCard>
    );
}
