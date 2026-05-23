import {BentoCard} from "../BentoCard";
import {BuildingIcon, MapPinIcon, HashIcon, FileTextIcon, CoinsIcon} from "../Icon";
import {formatUnits} from "@/lib/format";

type Metadata = {
    assetType: string;
    country: string;
    region: string;
    isin: string;
    minInvestment: bigint;
    issuedAt: bigint;
    documentHash: `0x${string}`;
    status: number;
    tags: readonly string[];
    propertyKeys: readonly string[];
    propertyValues: readonly string[];
};

const STATUS_LABELS = ["Active", "Suspended", "Redeemed"];

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

type Props = {
    metadata?: Metadata;
    name?: string;
    circulating?: bigint;
    cap?: bigint;
};

export function AssetOverviewCard({metadata, name, circulating, cap}: Props) {
    if (!metadata) {
        return (
            <BentoCard accent="orange" title="Asset Overview" icon={<BuildingIcon size={16} />}>
                <div className="text-zinc-400">—</div>
            </BentoCard>
        );
    }
    const issuedDate = new Date(Number(metadata.issuedAt) * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
    const docHashShort = `${metadata.documentHash.slice(0, 10)}…${metadata.documentHash.slice(-6)}`;

    const pct =
        circulating !== undefined && cap !== undefined && cap > 0n
            ? Number((circulating * 10000n) / cap) / 100
            : 0;
    const radius = 40;
    const stroke = 8;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;

    return (
        <BentoCard
            accent="orange"
            title="Asset Overview"
            subtitle={name ?? "—"}
            icon={<BuildingIcon size={16} />}
            className="h-full"
            action={
                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ${
                        metadata.status === 0
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-amber-50 text-amber-700 ring-amber-200"
                    }`}
                >
                    {STATUS_LABELS[metadata.status] ?? "Unknown"}
                </span>
            }
        >
            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
                {metadata.tags.map((t) => (
                    <span
                        key={t}
                        className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700 ring-1 ring-inset ring-orange-200"
                    >
                        {t}
                    </span>
                ))}
            </div>

            {/* Metadata grid */}
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Row label="Asset type" icon={<BuildingIcon size={12} />} value={metadata.assetType} />
                <Row
                    label="Min investment"
                    icon={<FileTextIcon size={12} />}
                    value={`$${metadata.minInvestment.toLocaleString()}`}
                />
                <Row
                    label="Location"
                    icon={<MapPinIcon size={12} />}
                    value={`${metadata.region}, ${metadata.country}`}
                />
                <Row label="Issued" icon={<FileTextIcon size={12} />} value={issuedDate} />
                <Row
                    label="ISIN"
                    icon={<HashIcon size={12} />}
                    value={<span className="font-mono text-xs">{metadata.isin}</span>}
                />
                <Row
                    label="Document hash"
                    icon={<HashIcon size={12} />}
                    value={<span className="font-mono text-xs">{docHashShort}</span>}
                />
            </div>

            {/* Properties */}
            <SubsectionHeader>Properties</SubsectionHeader>
            <dl className="divide-y divide-orange-200/50">
                {metadata.propertyKeys.map((k, i) => (
                    <div key={k} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            {formatKey(k)}
                        </dt>
                        <dd>{renderPropertyValue(k, metadata.propertyValues[i] ?? "")}</dd>
                    </div>
                ))}
            </dl>

            {/* Circulating Supply — mt-auto pushes to bottom so cards equalize */}
            <div className="mt-auto">
            <SubsectionHeader>Circulating Supply</SubsectionHeader>
            <div className="flex items-center gap-4 rounded-xl border border-orange-100 bg-white/60 p-3">
                <div className="relative h-24 w-24 flex-shrink-0">
                    <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r={radius} fill="none" stroke="#fff7ed" strokeWidth={stroke} />
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
                                <stop offset="0%" stopColor="#f97316" />
                                <stop offset="100%" stopColor="#0052FF" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-sm font-bold text-zinc-900 tabular-nums">{pct.toFixed(1)}%</div>
                        <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                            minted
                        </div>
                    </div>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">
                        {formatUnits(circulating)}
                    </div>
                    <div className="text-xs text-zinc-500">of {formatUnits(cap)} cap</div>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-700">
                        <CoinsIcon size={10} />
                        ERC-20 · decimals 0
                    </div>
                </div>
            </div>
            </div>
        </BentoCard>
    );
}

function Row({label, icon, value}: {label: string; icon?: React.ReactNode; value: React.ReactNode}) {
    return (
        <div>
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {icon}
                {label}
            </div>
            <div className="mt-0.5 text-sm font-medium text-zinc-800">{value}</div>
        </div>
    );
}

function SubsectionHeader({children}: {children: React.ReactNode}) {
    return (
        <div className="mt-5 mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-orange-200/60" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{children}</span>
            <div className="h-px flex-1 bg-orange-200/60" />
        </div>
    );
}

function formatKey(key: string): string {
    return key.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function renderPropertyValue(key: string, value: string) {
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
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-violet-500 text-[11px] font-bold text-white shadow-sm">
                    {value.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-zinc-800">{value}</span>
            </div>
        );
    }
    return <span className="text-sm font-medium text-zinc-800">{value}</span>;
}
