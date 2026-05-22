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
    /** Visual emphasis: "card" (default, full bento card) or "hero" (slightly bigger title, gradient blob). */
    variant?: "card" | "hero";
};

const ACCENT_BG: Record<Accent, string> = {
    blue: "bg-gradient-to-br from-cb-50/80 via-white to-white",
    emerald: "bg-gradient-to-br from-emerald-50/70 via-white to-white",
    violet: "bg-gradient-to-br from-violet-50/70 via-white to-white",
    amber: "bg-gradient-to-br from-amber-50/70 via-white to-white",
    rose: "bg-gradient-to-br from-rose-50/70 via-white to-white",
    orange: "bg-gradient-to-br from-orange-50/70 via-white to-white",
    teal: "bg-gradient-to-br from-teal-50/70 via-white to-white",
    cyan: "bg-gradient-to-br from-cyan-50/70 via-white to-white",
    slate: "bg-gradient-to-br from-slate-50/70 via-white to-white",
};

const ACCENT_BORDER: Record<Accent, string> = {
    blue: "border-cb-100",
    emerald: "border-emerald-100",
    violet: "border-violet-100",
    amber: "border-amber-100",
    rose: "border-rose-100",
    orange: "border-orange-100",
    teal: "border-teal-100",
    cyan: "border-cyan-100",
    slate: "border-slate-200",
};

const ACCENT_BLOB: Record<Accent, string> = {
    blue: "bg-cb-200/40",
    emerald: "bg-emerald-200/40",
    violet: "bg-violet-200/40",
    amber: "bg-amber-200/40",
    rose: "bg-rose-200/40",
    orange: "bg-orange-200/40",
    teal: "bg-teal-200/40",
    cyan: "bg-cyan-200/40",
    slate: "bg-slate-200/40",
};

const ICON_BG: Record<Accent, string> = {
    blue: "bg-cb-600 text-white",
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
                "group relative overflow-hidden rounded-2xl border p-5 shadow-bento transition-all duration-150 hover:-translate-y-px hover:shadow-bento-lg",
                ACCENT_BG[accent],
                ACCENT_BORDER[accent],
                className
            )}
        >
            <div
                className={clsx(
                    "pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl",
                    ACCENT_BLOB[accent],
                    variant === "hero" ? "opacity-100" : "opacity-50"
                )}
            />
            {(title || subtitle || icon || action) && (
                <div className="relative mb-4 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                        {icon && (
                            <div
                                className={clsx(
                                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-white/30",
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
            <div className="relative">{children}</div>
        </div>
    );
}
