import {ReactNode} from "react";
import {clsx} from "clsx";

export type Accent = "blue" | "emerald" | "violet" | "amber" | "rose" | "orange" | "teal" | "cyan" | "slate";

type Props = {
    title?: ReactNode;
    subtitle?: ReactNode;
    icon?: ReactNode;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    accent?: Accent;
    variant?: "card" | "hero";
};

const CARD_BG: Record<Accent, string> = {
    blue: "bg-violet-50",
    emerald: "bg-emerald-50",
    violet: "bg-violet-50",
    amber: "bg-amber-50",
    rose: "bg-rose-50",
    orange: "bg-orange-50",
    teal: "bg-teal-50",
    cyan: "bg-cyan-50",
    slate: "bg-slate-50",
};

const CARD_BORDER: Record<Accent, string> = {
    blue: "border-violet-200",
    emerald: "border-emerald-200",
    violet: "border-violet-200",
    amber: "border-amber-200",
    rose: "border-rose-200",
    orange: "border-orange-200",
    teal: "border-teal-200",
    cyan: "border-cyan-200",
    slate: "border-slate-200",
};

const TOP_STRIPE: Record<Accent, string> = {
    blue: "bg-violet-500",
    emerald: "bg-emerald-500",
    violet: "bg-violet-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    orange: "bg-orange-500",
    teal: "bg-teal-500",
    cyan: "bg-cyan-500",
    slate: "bg-slate-500",
};

const BLOB: Record<Accent, string> = {
    blue: "bg-violet-300/40",
    emerald: "bg-emerald-300/40",
    violet: "bg-violet-300/40",
    amber: "bg-amber-300/40",
    rose: "bg-rose-300/40",
    orange: "bg-orange-300/40",
    teal: "bg-teal-300/40",
    cyan: "bg-cyan-300/40",
    slate: "bg-slate-300/40",
};

const ICON_BG: Record<Accent, string> = {
    blue: "bg-violet-600 text-white",
    emerald: "bg-emerald-500 text-white",
    violet: "bg-violet-500 text-white",
    amber: "bg-amber-500 text-white",
    rose: "bg-rose-500 text-white",
    orange: "bg-orange-500 text-white",
    teal: "bg-teal-500 text-white",
    cyan: "bg-cyan-500 text-white",
    slate: "bg-slate-600 text-white",
};

export function BentoCard({
    title,
    subtitle,
    icon,
    action,
    children,
    className,
    accent = "slate",
    variant = "card",
}: Props) {
    return (
        <div
            className={clsx(
                "group relative flex flex-col overflow-hidden rounded-2xl border p-5 shadow-bento transition-all duration-150 hover:-translate-y-px hover:shadow-bento-lg",
                CARD_BG[accent],
                CARD_BORDER[accent],
                className
            )}
        >
            {/* Top accent stripe */}
            <div className={clsx("absolute inset-x-0 top-0 h-1", TOP_STRIPE[accent])} />

            {/* Corner blob */}
            <div
                className={clsx(
                    "pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl",
                    BLOB[accent],
                    variant === "hero" ? "opacity-100" : "opacity-70"
                )}
            />
            {(title || subtitle || icon || action) && (
                <div className="relative mb-4 flex items-start justify-between gap-2 pt-1">
                    <div className="flex items-start gap-3">
                        {icon && (
                            <div
                                className={clsx(
                                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-white/60",
                                    ICON_BG[accent]
                                )}
                            >
                                {icon}
                            </div>
                        )}
                        <div className="min-w-0">
                            {title && (
                                <div
                                    className={clsx(
                                        "font-semibold text-zinc-900",
                                        variant === "hero" ? "text-base" : "text-sm"
                                    )}
                                >
                                    {title}
                                </div>
                            )}
                            {subtitle && (
                                <div className="mt-0.5 text-xs text-zinc-500">{subtitle}</div>
                            )}
                        </div>
                    </div>
                    {action && <div className="flex-shrink-0">{action}</div>}
                </div>
            )}
            <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
    );
}
