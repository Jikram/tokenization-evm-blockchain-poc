"use client";

import {useCallback, useEffect, useState} from "react";

export type ActivityStatus = "pending" | "success" | "error";

export type ActivityType =
    | "wallet_connect"
    | "wallet_disconnect"
    | "kyc_check"
    | "kyc_approve"
    | "mint"
    | "burn"
    | "clawback"
    | "oracle_update"
    | "oracle_clear";

export type ActivityEntry = {
    id: string;
    timestamp: string;
    type: ActivityType;
    status: ActivityStatus;
    message: string;
    txHash?: string;
};

const STORAGE_KEY = "evm_poc_activity_log";
const MAX_ENTRIES = 25;

let listeners: Array<(entries: ActivityEntry[]) => void> = [];
let cache: ActivityEntry[] = [];

function load(): ActivityEntry[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
    } catch {
        return [];
    }
}

function persist(entries: ActivityEntry[]) {
    cache = entries;
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
        // ignore quota errors
    }
    listeners.forEach((fn) => fn(entries));
}

export function useActivityLog() {
    const [entries, setEntries] = useState<ActivityEntry[]>(cache);

    useEffect(() => {
        // hydrate from storage on first mount
        const loaded = load();
        cache = loaded;
        setEntries(loaded);
        const listener = (next: ActivityEntry[]) => setEntries(next);
        listeners.push(listener);
        return () => {
            listeners = listeners.filter((l) => l !== listener);
        };
    }, []);

    const push = useCallback((entry: Omit<ActivityEntry, "id" | "timestamp"> & {timestamp?: string}) => {
        const item: ActivityEntry = {
            id: Math.random().toString(36).slice(2, 10),
            timestamp: entry.timestamp ?? new Date().toISOString(),
            type: entry.type,
            status: entry.status,
            message: entry.message,
            txHash: entry.txHash,
        };
        const next = [item, ...cache].slice(0, MAX_ENTRIES);
        persist(next);
        return item.id;
    }, []);

    const update = useCallback((id: string, patch: Partial<ActivityEntry>) => {
        const next = cache.map((e) => (e.id === id ? {...e, ...patch} : e));
        persist(next);
    }, []);

    const clear = useCallback(() => {
        persist([]);
    }, []);

    return {entries, push, update, clear};
}
