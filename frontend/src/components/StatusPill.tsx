import {clsx} from "clsx";
import {ReactNode} from "react";

type Tone = "ok" | "warn" | "muted" | "info";

export function StatusPill({tone = "info", children}: {tone?: Tone; children: ReactNode}) {
    return (
        <span
            className={clsx(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                tone === "ok" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
                tone === "warn" && "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
                tone === "muted" && "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200",
                tone === "info" && "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
            )}
        >
            {tone === "ok" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
            {tone === "warn" && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
            {tone === "info" && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
            {children}
        </span>
    );
}
