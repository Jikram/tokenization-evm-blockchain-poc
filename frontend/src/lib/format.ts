export function formatCentsAsUsd(cents?: bigint): string {
    if (cents === undefined) return "—";
    const dollars = Number(cents) / 100;
    return dollars.toLocaleString("en-US", {style: "currency", currency: "USD"});
}

export function formatUnits(n?: bigint): string {
    if (n === undefined) return "—";
    return n.toLocaleString("en-US");
}

export function shortAddr(a?: string): string {
    if (!a) return "";
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function explorerAddr(a?: string): string {
    if (!a) return "#";
    return `https://sepolia.etherscan.io/address/${a}`;
}

export function explorerTx(h?: string): string {
    if (!h) return "#";
    return `https://sepolia.etherscan.io/tx/${h}`;
}
