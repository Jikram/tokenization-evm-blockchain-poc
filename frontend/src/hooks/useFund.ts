"use client";

import {useReadContract, useReadContracts} from "wagmi";
import {FUND_ADDRESS, ORACLE_ADDRESS, navOracleAbi, tokenizedFundAbi} from "@/lib/contracts";

export function useFundOverview() {
    const hasAddresses = Boolean(FUND_ADDRESS && ORACLE_ADDRESS);
    const {data, isLoading, refetch} = useReadContracts({
        query: {enabled: hasAddresses, refetchInterval: 8_000},
        contracts: [
            {address: FUND_ADDRESS, abi: tokenizedFundAbi, functionName: "name"},
            {address: FUND_ADDRESS, abi: tokenizedFundAbi, functionName: "symbol"},
            {address: FUND_ADDRESS, abi: tokenizedFundAbi, functionName: "circulatingSupply"},
            {address: FUND_ADDRESS, abi: tokenizedFundAbi, functionName: "cap"},
            {address: FUND_ADDRESS, abi: tokenizedFundAbi, functionName: "admin"},
            {address: FUND_ADDRESS, abi: tokenizedFundAbi, functionName: "getOracle"},
            {address: FUND_ADDRESS, abi: tokenizedFundAbi, functionName: "getMetadata"},
            {address: ORACLE_ADDRESS, abi: navOracleAbi, functionName: "hasPrice"},
            {address: ORACLE_ADDRESS, abi: navOracleAbi, functionName: "getPrice"},
        ],
    });

    const [name, symbol, circulating, cap, admin, oracle, metadata, hasPrice, price] = data ?? [];

    return {
        hasAddresses,
        isLoading,
        refetch,
        name: name?.result as string | undefined,
        symbol: symbol?.result as string | undefined,
        circulating: circulating?.result as bigint | undefined,
        cap: cap?.result as bigint | undefined,
        admin: admin?.result as `0x${string}` | undefined,
        oracle: oracle?.result as `0x${string}` | undefined,
        metadata: metadata?.result as
            | {
                  assetType: string;
                  documentHash: `0x${string}`;
                  country: string;
                  region: string;
                  issuedAt: bigint;
                  minInvestment: bigint;
                  isin: string;
                  totalSupplyCap: bigint;
                  status: number;
                  tags: readonly string[];
                  propertyKeys: readonly string[];
                  propertyValues: readonly string[];
              }
            | undefined,
        hasPrice: hasPrice?.result as boolean | undefined,
        priceCents: price?.status === "success" ? (price.result as bigint) : undefined,
    };
}

export function useUserState(address?: `0x${string}`) {
    const enabled = Boolean(address && FUND_ADDRESS);
    return useReadContracts({
        query: {enabled, refetchInterval: 8_000},
        contracts: [
            {address: FUND_ADDRESS, abi: tokenizedFundAbi, functionName: "balanceOf", args: [address!]},
            {address: FUND_ADDRESS, abi: tokenizedFundAbi, functionName: "isApproved", args: [address!]},
        ],
    });
}
