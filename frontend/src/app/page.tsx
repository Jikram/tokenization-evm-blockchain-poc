"use client";

import {useAccount} from "wagmi";
import {ConnectWallet} from "@/components/ConnectWallet";
import {BentoCard} from "@/components/BentoCard";
import {CopyableAddress} from "@/components/CopyableAddress";
import {NavOracleCard} from "@/components/cards/NavOracleCard";
import {AssetOverviewCard} from "@/components/cards/AssetOverviewCard";
import {KycCheckCard} from "@/components/cards/KycCheckCard";
import {AdminCard} from "@/components/cards/AdminCard";
import {ClawbackCard} from "@/components/cards/ClawbackCard";
import {ActivityLogCard} from "@/components/cards/ActivityLogCard";
import {OnChainEventsCard} from "@/components/cards/OnChainEventsCard";
import {useFundOverview, useUserState} from "@/hooks/useFund";
import {ShieldCheckIcon} from "@/components/Icon";
import {FUND_ADDRESS} from "@/lib/contracts";
import {formatUnits} from "@/lib/format";

export default function Home() {
    const {address} = useAccount();
    const overview = useFundOverview();
    const userQuery = useUserState(address);
    const balance = userQuery.data?.[0]?.result as bigint | undefined;
    const isUserApproved = userQuery.data?.[1]?.result as boolean | undefined;
    const isAdmin = Boolean(
        address && overview.admin && address.toLowerCase() === overview.admin.toLowerCase()
    );

    const onSettled = () => {
        overview.refetch();
        userQuery.refetch();
    };

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 md:py-10">
            <header className="mb-6 flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-violet-600 shadow-bento">
                        <ShieldCheckIcon size={24} className="text-white" />
                    </div>
                    <div className="max-w-3xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600">
                            Ethereum Sepolia · Solidity Smart Contract
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
                            Tokenized Asset Access Control
                        </h1>
                        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                            A regulated tokenized real-estate fund on Ethereum Sepolia. Investor wallets must be KYC-approved
                            on-chain before receiving tokens — enforced by a Solidity smart contract with atomic cross-contract
                            NAV oracle integration, not a database.
                        </p>
                    </div>
                </div>
                <div className="flex-shrink-0">
                    <ConnectWallet />
                </div>
            </header>

            {/* Address strip — wrapped in a violet card to match the Activity card */}
            {overview.hasAddresses && (
                <section className="mb-6">
                    <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-bento">
                        <div className="absolute inset-x-0 top-0 h-1 bg-violet-500" />
                        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-violet-300/40 blur-3xl" />
                        <div className="relative grid grid-cols-1 gap-3 md:grid-cols-2">
                            {FUND_ADDRESS && (
                                <CopyableAddress label="Token Fund" note="main contract" value={FUND_ADDRESS} />
                            )}
                            {address ? (
                                <div className="flex flex-col gap-2 rounded-lg border border-violet-200 bg-white p-1">
                                    <CopyableAddress label="Your Wallet" value={address} />
                                    <div className="flex items-center justify-between gap-2 px-3 pb-1">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-base font-semibold tabular-nums text-zinc-900">
                                                {formatUnits(balance)}
                                            </span>
                                            <span className="text-xs font-medium text-zinc-500">
                                                {overview.symbol ?? "TFUND"}
                                            </span>
                                        </div>
                                        {isUserApproved ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                <ShieldCheckIcon size={10} />
                                                KYC approved
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                                                Not on whitelist
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center rounded-lg border border-dashed border-violet-300 bg-white/60 px-3 py-3 text-xs text-violet-700">
                                    Connect a wallet to see your address, TFUND balance, and KYC status.
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {!overview.hasAddresses && (
                <section className="mb-6">
                    <BentoCard accent="amber" title="Setup required">
                        <p className="text-sm text-zinc-700">Contracts haven't been deployed yet.</p>
                    </BentoCard>
                </section>
            )}

            {overview.hasAddresses && (
                <>
                    {/* TOP ROW: NAV + Asset Overview + Activity — all same height */}
                    <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                        <div className="lg:col-span-3">
                            <NavOracleCard
                                priceCents={overview.priceCents}
                                hasPrice={overview.hasPrice}
                                isAdmin={isAdmin}
                                isConnected={Boolean(address)}
                                isLoading={overview.isLoading}
                                onSettled={onSettled}
                                onRefresh={overview.refetch}
                            />
                        </div>
                        <div className="lg:col-span-5">
                            <AssetOverviewCard
                                metadata={overview.metadata}
                                name={overview.name}
                                circulating={overview.circulating}
                                cap={overview.cap}
                            />
                        </div>
                        <div className="lg:col-span-4">
                            <ActivityLogCard />
                        </div>
                    </section>

                    {/* BOTTOM ROW: main column rest (col-span-8) + On-Chain (col-span-4) */}
                    <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                        <div className="space-y-4 lg:col-span-8">
                            <KycCheckCard />

                            <SectionHeader>
                                Admin Controls
                                {isAdmin ? (
                                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                        ✓ You are admin
                                    </span>
                                ) : (
                                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                                        Admin-only
                                    </span>
                                )}
                            </SectionHeader>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <AdminCard
                                    action="approve"
                                    title="Whitelist"
                                    subtitle="Approve KYC for a user"
                                    isAdmin={isAdmin}
                                    onSettled={onSettled}
                                />
                                <AdminCard
                                    action="mint"
                                    title="Mint"
                                    subtitle="Issue tokens · atomic w/ NAV"
                                    isAdmin={isAdmin}
                                    onSettled={onSettled}
                                />
                                <AdminCard
                                    action="burn"
                                    title="Burn"
                                    subtitle="Voluntary redemption"
                                    isAdmin={isAdmin}
                                    onSettled={onSettled}
                                />
                            </div>
                            <ClawbackCard isAdmin={isAdmin} onSettled={onSettled} />
                        </div>

                        <div className="lg:col-span-4">
                            <OnChainEventsCard adminAddress={overview.admin} />
                        </div>
                    </section>
                </>
            )}

            <footer className="mt-12 text-center text-xs text-zinc-400">
                Tokenized Fund POC · Sepolia · ERC-20 + KYC + NAV oracle ·{" "}
                <span className="text-zinc-500">crafted by Jamshaid</span>
            </footer>
        </main>
    );
}

function SectionHeader({children}: {children: React.ReactNode}) {
    return (
        <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="flex items-center text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {children}
            </span>
            <div className="h-px flex-1 bg-zinc-200" />
        </div>
    );
}
