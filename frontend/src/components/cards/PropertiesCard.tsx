import {BentoCard} from "../BentoCard";
import {SparkleIcon} from "../Icon";

type Props = {
    keys?: readonly string[];
    values?: readonly string[];
};

const RISK_TONE: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    medium: "bg-amber-100 text-amber-700 ring-amber-200",
    high: "bg-rose-100 text-rose-700 ring-rose-200",
};

const LIQUIDITY_TONE: Record<string, string> = {
    high: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    medium: "bg-amber-100 text-amber-700 ring-amber-200",
    low: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

function format(key: string): string {
    return key.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function valueElement(key: string, value: string) {
    const k = key.toLowerCase();
    if (k === "risk_level") {
        const tone = RISK_TONE[value.toLowerCase()] ?? "bg-zinc-100 text-zinc-700 ring-zinc-200";
        return (
            <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tone}`}
            >
                {value}
            </span>
        );
    }
    if (k === "liquidity") {
        const tone = LIQUIDITY_TONE[value.toLowerCase()] ?? "bg-zinc-100 text-zinc-700 ring-zinc-200";
        return (
            <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tone}`}
            >
                {value}
            </span>
        );
    }
    if (k === "fund_manager") {
        return (
            <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cb-600 to-violet-500 text-[11px] font-bold text-white shadow-sm">
                    {value.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-zinc-800">{value}</span>
            </div>
        );
    }
    return <span className="text-sm font-medium text-zinc-800">{value}</span>;
}

export function PropertiesCard({keys, values}: Props) {
    if (!keys || !values || keys.length === 0) {
        return (
            <BentoCard accent="teal" title="Properties" icon={<SparkleIcon size={16} />}>
                <div className="text-sm text-zinc-400">No properties set.</div>
            </BentoCard>
        );
    }

    return (
        <BentoCard
            accent="teal"
            title="Properties"
            subtitle="On-chain key/value attributes"
            icon={<SparkleIcon size={16} />}
        >
            <dl className="divide-y divide-zinc-100">
                {keys.map((k, i) => (
                    <div key={k} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{format(k)}</dt>
                        <dd>{valueElement(k, values[i] ?? "")}</dd>
                    </div>
                ))}
            </dl>
        </BentoCard>
    );
}
