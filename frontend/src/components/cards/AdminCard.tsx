"use client";

import {useState} from "react";
import {useAccount, useWriteContract} from "wagmi";
import {isAddress} from "viem";
import {BentoCard, type Accent} from "../BentoCard";
import {UserCheckIcon, PlusCircleIcon, MinusCircleIcon} from "../Icon";
import {FUND_ADDRESS, tokenizedFundAbi} from "@/lib/contracts";
import {useActivityLog, type ActivityType} from "@/hooks/useActivityLog";
import {shortAddr} from "@/lib/format";

type Action = "approve" | "mint" | "burn";

type Props = {
    action: Action;
    title: string;
    subtitle: string;
    isAdmin: boolean;
    onSettled: () => void;
};

const ACCENTS: Record<Action, Accent> = {
    approve: "blue",
    mint: "emerald",
    burn: "rose",
};

const BTN_BG: Record<Action, string> = {
    approve: "bg-cb-600 hover:bg-cb-700",
    mint: "bg-emerald-600 hover:bg-emerald-700",
    burn: "bg-rose-600 hover:bg-rose-700",
};

function iconFor(action: Action) {
    if (action === "approve") return <UserCheckIcon size={16} />;
    if (action === "mint") return <PlusCircleIcon size={16} />;
    return <MinusCircleIcon size={16} />;
}

function activityType(action: Action): ActivityType {
    if (action === "approve") return "kyc_approve";
    if (action === "mint") return "mint";
    return "burn";
}

export function AdminCard({action, title, subtitle, isAdmin, onSettled}: Props) {
    const {isConnected} = useAccount();
    const {writeContract, isPending} = useWriteContract();
    const {push, update} = useActivityLog();
    const [user, setUser] = useState("");
    const [amount, setAmount] = useState("");

    const disabled = !isConnected || !isAdmin;
    const valid =
        !disabled &&
        isAddress(user as `0x${string}`) &&
        (action === "approve" || (amount !== "" && Number(amount) > 0));

    const submit = () => {
        if (!valid) return;
        const userAddr = user as `0x${string}`;
        const type = activityType(action);
        const msg =
            action === "approve"
                ? `KYC approve ${shortAddr(userAddr)}`
                : `${action === "mint" ? "Mint" : "Burn"} ${amount} → ${shortAddr(userAddr)}`;
        const id = push({type, status: "pending", message: msg});

        const onResult = (txHash?: `0x${string}`, error?: Error) => {
            if (error) {
                update(id, {status: "error", message: `${msg} · ${error.message.slice(0, 80)}`});
            } else {
                update(id, {status: "success", txHash, message: msg});
                setUser("");
                if (action !== "approve") setAmount("");
            }
            onSettled();
        };

        if (action === "approve") {
            writeContract(
                {address: FUND_ADDRESS, abi: tokenizedFundAbi, functionName: "approveUser", args: [userAddr]},
                {onSuccess: (h) => onResult(h), onError: (e) => onResult(undefined, e)}
            );
        } else if (action === "mint") {
            writeContract(
                {address: FUND_ADDRESS, abi: tokenizedFundAbi, functionName: "mint", args: [userAddr, BigInt(amount)]},
                {onSuccess: (h) => onResult(h), onError: (e) => onResult(undefined, e)}
            );
        } else {
            writeContract(
                {address: FUND_ADDRESS, abi: tokenizedFundAbi, functionName: "burn", args: [userAddr, BigInt(amount)]},
                {onSuccess: (h) => onResult(h), onError: (e) => onResult(undefined, e)}
            );
        }
    };

    return (
        <BentoCard
            accent={ACCENTS[action]}
            title={title}
            subtitle={subtitle}
            icon={iconFor(action)}
            action={
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    Admin
                </span>
            }
        >
            <div className="space-y-2">
                <input
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="0x… user address"
                    disabled={disabled}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-mono focus:border-cb-500 focus:outline-none focus:ring-2 focus:ring-cb-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
                />
                {action !== "approve" && (
                    <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="Amount (whole tokens)"
                        disabled={disabled}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm tabular-nums focus:border-cb-500 focus:outline-none focus:ring-2 focus:ring-cb-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
                    />
                )}
                <button
                    onClick={submit}
                    disabled={isPending || !valid}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${BTN_BG[action]}`}
                >
                    {iconFor(action)}
                    {isPending ? "Submitting…" : title}
                </button>
                {!isConnected && (
                    <p className="text-center text-[11px] text-zinc-400">Connect wallet to enable.</p>
                )}
                {isConnected && !isAdmin && (
                    <p className="text-center text-[11px] text-amber-600">Admin-only · connect admin wallet.</p>
                )}
            </div>
        </BentoCard>
    );
}
