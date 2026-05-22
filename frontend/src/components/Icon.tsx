type IconProps = {size?: number; className?: string};

const stroke = {fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"} as const;

export function PulseIcon({size = 14, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    );
}

export function CoinsIcon({size = 16, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <circle cx="8" cy="8" r="6" />
            <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
            <path d="M7 6h1v4" />
            <path d="m16.71 13.88.7.71-2.82 2.82" />
        </svg>
    );
}

export function WalletIcon({size = 16, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
            <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
            <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
        </svg>
    );
}

export function ShieldCheckIcon({size = 16, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
        </svg>
    );
}

export function BuildingIcon({size = 16, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01" />
            <path d="M16 6h.01" />
            <path d="M12 6h.01" />
            <path d="M12 10h.01" />
            <path d="M12 14h.01" />
            <path d="M16 10h.01" />
            <path d="M16 14h.01" />
            <path d="M8 10h.01" />
            <path d="M8 14h.01" />
        </svg>
    );
}

export function MapPinIcon({size = 14, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}

export function HashIcon({size = 14, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
            <line x1="10" y1="3" x2="8" y2="21" />
            <line x1="16" y1="3" x2="14" y2="21" />
        </svg>
    );
}

export function FileTextIcon({size = 14, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
    );
}

export function UserCheckIcon({size = 16, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
        </svg>
    );
}

export function PlusCircleIcon({size = 16, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
    );
}

export function MinusCircleIcon({size = 16, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
    );
}

export function AlertTriangleIcon({size = 16, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

export function ActivityIcon({size = 16, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    );
}

export function ExternalLinkIcon({size = 12, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    );
}

export function ChartIcon({size = 16, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
    );
}

export function SparkleIcon({size = 14, className}: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
        </svg>
    );
}
