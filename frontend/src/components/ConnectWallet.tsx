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
            <button
                onClick={() => disconnect()}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-bento transition hover:bg-zinc-50"
                title="Disconnect"
            >
                <span className="font-mono">{shortAddr(address)}</span>
                <span className="ml-2 text-zinc-400">↗</span>
            </button>
        );
    }

    return (
        <>
            <button
                onClick={() => setPickerOpen(true)}
                disabled={isPending}
                className="rounded-lg bg-cb-600 px-4 py-1.5 text-sm font-semibold text-white shadow-bento transition hover:bg-cb-700 disabled:opacity-60"
            >
                {isPending ? "Connecting…" : "Connect wallet"}
            </button>
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
