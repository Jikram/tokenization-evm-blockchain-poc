"use client";

import {useEffect, useState} from "react";
import {ExternalLinkIcon} from "./Icon";
import {explorerAddr, shortAddr} from "@/lib/format";

type Props = {
    label: string;
    value: string;
    /** Optional sub-label shown under the label */
    note?: string;
};

export function CopyableAddress({label, value, note}: Props) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const t = setTimeout(() => setCopied(false), 1200);
        return () => clearTimeout(t);
    }, [copied]);

    return (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2">
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">{label}</p>
                {note && <p className="text-[10px] text-violet-500">{note}</p>}
                <p className="mt-0.5 truncate font-mono text-xs text-zinc-700">{shortAddr(value)}</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
                <button
                    onClick={async () => {
                        await navigator.clipboard.writeText(value);
                        setCopied(true);
                    }}
                    className="rounded-md border border-violet-200 bg-white px-2 py-1 text-[10px] font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-50"
                    title="Copy address"
                >
                    {copied ? "✓ Copied" : "Copy"}
                </button>
                <a
                    href={explorerAddr(value)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-violet-200 bg-white p-1.5 text-violet-600 transition hover:border-violet-400 hover:bg-violet-50 hover:text-violet-800"
                    title="Open in Sepolia Etherscan"
                >
                    <ExternalLinkIcon size={12} />
                </a>
            </div>
        </div>
    );
}
