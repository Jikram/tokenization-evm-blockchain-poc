import {BentoCard} from "../BentoCard";
import {CoinsIcon} from "../Icon";
import {formatUnits} from "@/lib/format";

export function SupplyCard({circulating, cap}: {circulating?: bigint; cap?: bigint}) {
    const pct =
        circulating !== undefined && cap !== undefined && cap > 0n
            ? Number((circulating * 10000n) / cap) / 100
            : 0;
    const radius = 40;
    const stroke = 8;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;

    return (
        <BentoCard accent="violet" title="Circulating Supply" icon={<CoinsIcon size={16} />}>
            <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 flex-shrink-0">
                    <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
                        <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke="url(#supplyGradient)"
                            strokeWidth={stroke}
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            style={{transition: "stroke-dashoffset 600ms ease"}}
                        />
                        <defs>
                            <linearGradient id="supplyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-sm font-bold text-zinc-900 tabular-nums">{pct.toFixed(1)}%</div>
                        <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">minted</div>
                    </div>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">
                        {formatUnits(circulating)}
                    </div>
                    <div className="text-xs text-zinc-500">of {formatUnits(cap)} cap</div>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                        ERC-20 · decimals 0
                    </div>
                </div>
            </div>
        </BentoCard>
    );
}
