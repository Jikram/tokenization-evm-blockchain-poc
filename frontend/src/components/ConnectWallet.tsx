"use client";

import {useEffect, useRef, useState} from "react";
import {useAccount, useConnect, useConnectors, useDisconnect} from "wagmi";
import {WalletPickerModal} from "./WalletPickerModal";
import {useActivityLog} from "@/hooks/useActivityLog";

function shortAddr(a?: string) {
    if (!a) return "";
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function ConnectWallet() {
    const {address, isConnected} = useAccount();
    const {connect, isPending} = useConnect();
    const {disconnect} = useDisconnect();
    const connectors = useConnectors();
    const {push} = useActivityLog();
    const [pickerOpen, setPickerOpen] = useState(false);
    const [wcUri, setWcUri] = useState<string | null>(null);
    const prevConnected = useRef(false);

    const injectedConnector = connectors.find((c) => c.id === "injected" || c.type === "injected");
    const wcConnector = connectors.find((c) => c.id === "walletConnect");

    // Wire up the WalletConnect provider's display_uri event
    useEffect(() => {
        if (!wcConnector) return;
        let cleanup: (() => void) | undefined;
        let cancelled = false;
        (async () => {
            try {
                const provider = (await wcConnector.getProvider()) as {
                    on?: (e: string, cb: (uri: string) => void) => void;
                    removeListener?: (e: string, cb: (uri: string) => void) => void;
                };
                if (cancelled) return;
                const handler = (uri: string) => setWcUri(uri);
                provider?.on?.("display_uri", handler);
                cleanup = () => provider?.removeListener?.("display_uri", handler);
            } catch (e) {
                console.error("Failed to attach WC display_uri listener", e);
            }
        })();
        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, [wcConnector]);

    // Auto-close picker on successful connect
    useEffect(() => {
        if (isConnected) {
            setWcUri(null);
            setPickerOpen(false);
        }
    }, [isConnected]);

    // Log wallet connect / disconnect
    useEffect(() => {
        if (isConnected && !prevConnected.current && address) {
            push({
                type: "wallet_connect",
                status: "success",
                message: `Wallet connected: ${shortAddr(address)}`,
            });
        } else if (!isConnected && prevConnected.current) {
            push({type: "wallet_disconnect", status: "success", message: "Wallet disconnected"});
        }
        prevConnected.current = isConnected;
    }, [isConnected, address, push]);

    if (isConnected && address) {
        return (
            <div className="inline-flex items-center gap-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-800 shadow-bento">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="font-mono">{shortAddr(address)}</span>
                </div>
                <button
                    onClick={() => disconnect()}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 shadow-bento transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                    title="Disconnect wallet"
                    aria-label="Disconnect wallet"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 6l12 12M18 6l-12 12" />
                    </svg>
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="inline-flex items-center gap-1.5">
                <button
                    onClick={() => setPickerOpen(true)}
                    disabled={isPending}
                    className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-semibold text-white shadow-bento transition hover:bg-violet-700 disabled:opacity-60"
                >
                    {isPending ? "Connecting…" : "Connect wallet"}
                </button>
                {(pickerOpen || isPending) && (
                    <button
                        onClick={() => {
                            setPickerOpen(false);
                            setWcUri(null);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 shadow-bento transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                        title="Cancel"
                        aria-label="Cancel connect wallet"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 6l12 12M18 6l-12 12" />
                        </svg>
                    </button>
                )}
            </div>
            <WalletPickerModal
                isOpen={pickerOpen}
                onClose={() => {
                    setPickerOpen(false);
                    setWcUri(null);
                }}
                wcUri={wcUri}
                onPickExtension={() => {
                    if (injectedConnector) connect({connector: injectedConnector});
                }}
                onStartWalletConnect={() => {
                    if (wcConnector) connect({connector: wcConnector});
                }}
            />
        </>
    );
}
