import {BentoCard} from "../BentoCard";
import {BuildingIcon, MapPinIcon, HashIcon, FileTextIcon} from "../Icon";

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
};

const STATUS_LABELS = ["Active", "Suspended", "Redeemed"];

export function MetadataCard({metadata, name}: {metadata?: Metadata; name?: string}) {
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

    return (
        <BentoCard
            accent="orange"
            title="Asset Overview"
            subtitle={name ?? "—"}
            icon={<BuildingIcon size={16} />}
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
            <div className="-mb-1 flex flex-wrap gap-1.5">
                {metadata.tags.map((t) => (
                    <span
                        key={t}
                        className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700 ring-1 ring-inset ring-orange-200"
                    >
                        {t}
                    </span>
                ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Row label="Asset type" icon={<BuildingIcon size={12} />} value={metadata.assetType} />
                <Row
                    label="Location"
                    icon={<MapPinIcon size={12} />}
                    value={`${metadata.region}, ${metadata.country}`}
                />
                <Row
                    label="ISIN"
                    icon={<HashIcon size={12} />}
                    value={<span className="font-mono text-xs">{metadata.isin}</span>}
                />
                <Row
                    label="Min investment"
                    icon={<FileTextIcon size={12} />}
                    value={`$${metadata.minInvestment.toLocaleString()}`}
                />
                <Row label="Issued" icon={<FileTextIcon size={12} />} value={issuedDate} />
                <Row
                    label="Document hash"
                    icon={<HashIcon size={12} />}
                    value={<span className="font-mono text-xs">{docHashShort}</span>}
                />
            </div>
        </BentoCard>
    );
}

function Row({label, icon, value}: {label: string; icon?: React.ReactNode; value: React.ReactNode}) {
    return (
        <div>
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                {icon}
                {label}
            </div>
            <div className="mt-0.5 text-sm font-medium text-zinc-800">{value}</div>
        </div>
    );
}
