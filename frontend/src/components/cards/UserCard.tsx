"use client";

import {useAccount} from "wagmi";
import {BentoCard} from "../BentoCard";
import {WalletIcon, ShieldCheckIcon} from "../Icon";
import {formatUnits, shortAddr} from "@/lib/format";

type Props = {
    balance?: bigint;
    approved?: boolean;
    symbol?: string;
};

export function UserCard({balance, approved, symbol}: Props) {
    const {address, isConnected} = useAccount();

    if (!isConnected) {
        return (
            <BentoCard accent="emerald" title="Your Wallet" subtitle="Not connected" icon={<WalletIcon size={16} />}>
                <div className="flex h-full flex-col justify-center py-2">
                    <p className="text-sm text-zinc-500">
                        Connect your wallet to see your balance and KYC status.
                    </p>
                </div>
            </BentoCard>
        );
    }

    return (
        <BentoCard
            accent="emerald"
            title="Your Wallet"
            subtitle={<span className="font-mono">{shortAddr(address)}</span>}
            icon={<WalletIcon size={16} />}
        >
            <div className="flex items-baseline gap-2">
                <div className="text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">
                    {formatUnits(balance)}
                </div>
                <div className="text-sm font-medium text-zinc-500">{symbol ?? "TFUND"}</div>
            </div>
            <div className="mt-3">
                {approved ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        <ShieldCheckIcon size={11} />
                        KYC approved
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                        Not on KYC whitelist
                    </span>
                )}
            </div>
        </BentoCard>
    );
}
