"use client";

import {useState} from "react";
import {useAccount, useWriteContract} from "wagmi";
import {sepolia} from "wagmi/chains";
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
    approve: "amber",
    mint: "amber",
    burn: "amber",
};

const BTN_BG: Record<Action, string> = {
    approve: "bg-amber-600 hover:bg-amber-700",
    mint: "bg-amber-600 hover:bg-amber-700",
    burn: "bg-amber-600 hover:bg-amber-700",
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
    const {address: connectedAddress, isConnected} = useAccount();
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
                {address: FUND_ADDRESS, abi: tokenizedFundAbi, functionName: "approveUser", args: [userAddr], chainId: sepolia.id},
                {onSuccess: (h) => onResult(h), onError: (e) => onResult(undefined, e)}
            );
        } else if (action === "mint") {
            writeContract(
                {address: FUND_ADDRESS, abi: tokenizedFundAbi, functionName: "mint", args: [userAddr, BigInt(amount)], chainId: sepolia.id},
                {onSuccess: (h) => onResult(h), onError: (e) => onResult(undefined, e)}
            );
        } else {
            writeContract(
                {address: FUND_ADDRESS, abi: tokenizedFundAbi, functionName: "burn", args: [userAddr, BigInt(amount)], chainId: sepolia.id},
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
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
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
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm font-mono focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
                />
                {action === "approve" && isConnected && connectedAddress && (
                    <button
                        type="button"
                        onClick={() => setUser(connectedAddress)}
                        disabled={disabled}
                        className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Prefill with your connected wallet"
                    >
                        Use my wallet
                        <span className="font-mono text-zinc-500">({shortAddr(connectedAddress)})</span>
                    </button>
                )}
                {action !== "approve" && (
                    <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="Amount (whole tokens)"
                        disabled={disabled}
                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm tabular-nums focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
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
