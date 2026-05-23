"use client";

import {useAccount} from "wagmi";
import {BentoCard} from "../BentoCard";
import {WalletIcon, ShieldCheckIcon} from "../Icon";
import {CopyableAddress} from "../CopyableAddress";
import {FUND_ADDRESS} from "@/lib/contracts";
import {formatUnits} from "@/lib/format";

type Props = {
    balance?: bigint;
    approved?: boolean;
    symbol?: string;
};

export function UserCard({balance, approved, symbol}: Props) {
    const {address, isConnected} = useAccount();

    return (
        <BentoCard accent="emerald" title="Your Wallet" icon={<WalletIcon size={16} />}>
            {/* Balance + KYC pill row */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">
                            {isConnected ? formatUnits(balance) : "—"}
                        </div>
                        <div className="text-sm font-medium text-zinc-500">{symbol ?? "TFUND"}</div>
                    </div>
                    {isConnected ? (
                        approved ? (
                            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                <ShieldCheckIcon size={11} />
                                KYC approved
                            </span>
                        ) : (
                            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                                Not on KYC whitelist
                            </span>
                        )
                    ) : (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 ring-1 ring-zinc-200">
                            Not connected
                        </span>
                    )}
                </div>
            </div>

            {/* Address rows */}
            <div className="mt-4 space-y-2">
                {address ? (
                    <CopyableAddress label="Your wallet" value={address} />
                ) : (
                    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-500">
                        Connect your wallet to see and copy its address.
                    </div>
                )}
                {FUND_ADDRESS && (
                    <CopyableAddress label="Token Fund" note="main contract" value={FUND_ADDRESS} />
                )}
            </div>
        </BentoCard>
    );
}
