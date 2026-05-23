"use client";

import {useAccount, useChainId, useSwitchChain} from "wagmi";
import {sepolia} from "wagmi/chains";

export function WrongChainBanner() {
    const {isConnected} = useAccount();
    const chainId = useChainId();
    const {switchChain, isPending} = useSwitchChain();

    if (!isConnected) return null;
    if (chainId === sepolia.id) return null;

    return (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 p-3 shadow-bento">
            <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                </span>
                <div>
                    <p className="text-sm font-semibold text-rose-800">Wrong network</p>
                    <p className="text-xs text-rose-700">
                        Your wallet is on chain ID <span className="font-mono">{chainId}</span>. This dApp runs on Sepolia (chain ID 11155111).
                    </p>
                </div>
            </div>
            <button
                onClick={() => switchChain({chainId: sepolia.id})}
                disabled={isPending}
                className="flex-shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
                {isPending ? "Switching…" : "Switch to Sepolia"}
            </button>
        </div>
    );
}
