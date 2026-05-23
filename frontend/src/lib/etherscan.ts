import {decodeEventLog, type Abi, type Hex} from "viem";

const ETHERSCAN_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY ?? "";

// Etherscan v2 unified endpoint requires an API key.
// Without a key, fall back to the legacy v1 sepolia subdomain which still
// answers low-volume unauthenticated requests for POC use.
const V2_BASE = "https://api.etherscan.io/v2/api";
const V1_SEPOLIA_BASE = "https://api-sepolia.etherscan.io/api";
const SEPOLIA_CHAIN_ID = 11155111;

export type DecodedLog<T extends string = string> = {
    eventName: T;
    args: Record<string, unknown>;
    blockNumber: bigint;
    transactionHash: Hex;
    logIndex: number;
    timestamp: bigint;
};

type RawLog = {
    address: string;
    topics: Hex[];
    data: Hex;
    blockNumber: Hex;
    timeStamp: Hex;
    transactionHash: Hex;
    logIndex: Hex;
};

type EtherscanResponse = {
    status: "0" | "1";
    message: string;
    result: RawLog[] | string;
};

/**
 * Fetch all event logs for `address` from Etherscan v2 and decode them against
 * the provided ABI. Unlike `eth_getLogs`, Etherscan indexes the full chain,
 * so we don't need a fromBlock / toBlock window.
 */
export async function fetchEventsFromEtherscan(
    address: Hex,
    abi: Abi
): Promise<DecodedLog[]> {
    const useV2 = Boolean(ETHERSCAN_KEY);
    const params = new URLSearchParams({
        module: "logs",
        action: "getLogs",
        address,
        fromBlock: "0",
        toBlock: "latest",
        page: "1",
        offset: "1000",
    });
    if (useV2) {
        params.set("chainid", String(SEPOLIA_CHAIN_ID));
        params.set("apikey", ETHERSCAN_KEY);
    }
    const base = useV2 ? V2_BASE : V1_SEPOLIA_BASE;

    const res = await fetch(`${base}?${params.toString()}`);
    if (!res.ok) {
        throw new Error(`Etherscan HTTP ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as EtherscanResponse;

    // "No records found" is a successful empty response
    if (json.status === "0" && typeof json.result === "string") {
        if (json.message === "No records found" || json.result === "") return [];
        if (/api ?key/i.test(json.result) || /api ?key/i.test(json.message)) {
            throw new Error(
                "Etherscan API key required. Get one free at https://etherscan.io/myapikey, then set NEXT_PUBLIC_ETHERSCAN_API_KEY in Vercel env."
            );
        }
        throw new Error(`Etherscan: ${json.result || json.message}`);
    }
    if (!Array.isArray(json.result)) {
        throw new Error(`Etherscan: unexpected response`);
    }

    const decoded: DecodedLog[] = [];
    for (const log of json.result) {
        try {
            const ev = decodeEventLog({
                abi,
                data: log.data,
                topics: log.topics as [Hex, ...Hex[]],
            });
            decoded.push({
                eventName: ev.eventName as unknown as string,
                args: (ev.args ?? {}) as Record<string, unknown>,
                blockNumber: BigInt(log.blockNumber),
                transactionHash: log.transactionHash,
                logIndex: parseInt(log.logIndex, 16),
                timestamp: BigInt(log.timeStamp),
            });
        } catch {
            // Skip logs we can't decode (e.g. ABI mismatch / unrelated topics)
        }
    }
    return decoded;
}
