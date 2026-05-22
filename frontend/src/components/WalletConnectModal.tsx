"use client";

import {useEffect, useRef, useState} from "react";
import QRCode from "qrcode";

type Props = {
    uri: string | null;
    onCancel: () => void;
};

export function WalletConnectModal({uri, onCancel}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!uri || !canvasRef.current) return;
        // Error-correction level H tolerates ~30% obstruction — leaves room for the centered logo.
        QRCode.toCanvas(canvasRef.current, uri, {
            width: 288,
            margin: 1,
            color: {dark: "#18181b", light: "#ffffff"},
            errorCorrectionLevel: "H",
        });
    }, [uri]);

    useEffect(() => {
        if (!copied) return;
        const t = setTimeout(() => setCopied(false), 1500);
        return () => clearTimeout(t);
    }, [copied]);

    if (!uri) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4"
            onClick={onCancel}
        >
            <div
                className="pop-in w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-bento-lg"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative mb-5 flex items-center justify-center">
                    <h3 className="text-base font-semibold text-zinc-900">WalletConnect</h3>
                    <button
                        onClick={onCancel}
                        className="absolute right-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                        aria-label="Close"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 6l12 12M18 6l-12 12" />
                        </svg>
                    </button>
                </div>

                {/* QR with centered WalletConnect logo */}
                <div className="relative mx-auto flex h-72 w-72 items-center justify-center rounded-2xl bg-white">
                    <canvas ref={canvasRef} className="rounded-md" />
                    <div className="pointer-events-none absolute flex h-16 w-16 items-center justify-center rounded-2xl bg-white">
                        <WalletConnectLogo />
                    </div>
                </div>

                <p className="mt-4 text-center text-sm text-zinc-600">
                    Scan this QR Code with your phone
                </p>

                {/* Copy link button (filled chip) */}
                <div className="mt-4 flex justify-center">
                    <button
                        onClick={async () => {
                            await navigator.clipboard.writeText(uri);
                            setCopied(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200"
                    >
                        <CopyIcon />
                        {copied ? "Copied!" : "Copy link"}
                    </button>
                </div>

                {/* Search Wallet row */}
                <a
                    href="https://explorer.walletconnect.com/?type=wallet"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 transition hover:bg-zinc-50"
                >
                    <div className="flex items-center gap-2.5">
                        <SearchIcon />
                        <span className="font-medium">Search Wallet</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-zinc-400">80+</span>
                        <ChevronIcon />
                    </div>
                </a>
            </div>
        </div>
    );
}

function WalletConnectLogo() {
    return (
        <svg
            width="48"
            height="48"
            viewBox="0 0 480 480"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="WalletConnect"
        >
            <rect width="480" height="480" rx="120" fill="#3396FF" />
            <path
                d="M126.613 168.973c62.622-61.296 164.149-61.296 226.771 0l7.539 7.378c3.131 3.064 3.131 8.035 0 11.099l-25.793 25.245c-1.566 1.532-4.105 1.532-5.671 0l-10.378-10.158c-43.689-42.762-114.572-42.762-158.261 0l-11.114 10.879c-1.566 1.532-4.105 1.532-5.671 0L118.242 188.17c-3.131-3.064-3.131-8.035 0-11.099l8.371-8.098Zm280.105 52.224 22.953 22.466c3.131 3.064 3.131 8.035 0 11.099L325.179 358.187c-3.131 3.064-8.21 3.064-11.342 0l-73.493-71.95a1.995 1.995 0 0 0-2.835 0l-73.491 71.95c-3.131 3.064-8.21 3.064-11.342 0L48.184 254.762c-3.131-3.064-3.131-8.035 0-11.099l22.953-22.466c3.131-3.064 8.21-3.064 11.342 0l73.494 71.95a1.995 1.995 0 0 0 2.835 0l73.491-71.95c3.131-3.064 8.21-3.064 11.342 0l73.494 71.95a1.995 1.995 0 0 0 2.835 0l73.493-71.95c3.131-3.064 8.21-3.064 11.342 0Z"
                fill="#fff"
            />
        </svg>
    );
}

function CopyIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    );
}

function SearchIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

function ChevronIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}
