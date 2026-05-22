"use client";

import {useAccount} from "wagmi";
import {ConnectWallet} from "@/components/ConnectWallet";
import {BentoCard} from "@/components/BentoCard";
import {NavOracleCard} from "@/components/cards/NavOracleCard";
import {SupplyCard} from "@/components/cards/SupplyCard";
import {MetadataCard} from "@/components/cards/MetadataCard";
import {PropertiesCard} from "@/components/cards/PropertiesCard";
import {UserCard} from "@/components/cards/UserCard";
import {KycCheckCard} from "@/components/cards/KycCheckCard";
import {AdminCard} from "@/components/cards/AdminCard";
import {ClawbackCard} from "@/components/cards/ClawbackCard";
import {ActivityLogCard} from "@/components/cards/ActivityLogCard";
import {OnChainEventsCard} from "@/components/cards/OnChainEventsCard";
import {useFundOverview, useUserState} from "@/hooks/useFund";
import {explorerAddr, shortAddr} from "@/lib/format";
import {FUND_ADDRESS, ORACLE_ADDRESS} from "@/lib/contracts";
import {ExternalLinkIcon, ShieldCheckIcon} from "@/components/Icon";

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
            <header className="mb-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cb-600 shadow-bento">
                        <ShieldCheckIcon size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-900">
                            Tokenized Fund POC
                            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 ring-1 ring-zinc-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Sepolia
                            </span>
                        </h1>
                        <p className="mt-0.5 text-sm text-zinc-500">
                            KYC-gated ERC-20 with on-chain NAV oracle · Solidity · Foundry · viem
                        </p>
                    </div>
                </div>
                <ConnectWallet />
            </header>

            {!overview.hasAddresses && (
                <section className="mb-6">
                    <BentoCard accent="amber" title="Setup required">
                        <p className="text-sm text-zinc-700">Contracts haven't been deployed yet.</p>
                    </BentoCard>
                </section>
            )}

            {overview.hasAddresses && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-2">
                        {/* Top row: NAV (tall) + Supply + Wallet */}
                        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="md:col-span-1 md:row-span-2">
                                <NavOracleCard
                                    priceCents={overview.priceCents}
                                    hasPrice={overview.hasPrice}
                                    isAdmin={isAdmin}
                                    onSettled={onSettled}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <SupplyCard circulating={overview.circulating} cap={overview.cap} />
                            </div>
                            <div className="md:col-span-2">
                                <UserCard
                                    balance={balance}
                                    approved={isUserApproved}
                                    symbol={overview.symbol}
                                />
                            </div>
                        </section>

                        {/* Metadata + Properties */}
                        <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
                            <div className="md:col-span-3">
                                <MetadataCard metadata={overview.metadata} name={overview.name} />
                            </div>
                            <div className="md:col-span-2">
                                <PropertiesCard
                                    keys={overview.metadata?.propertyKeys}
                                    values={overview.metadata?.propertyValues}
                                />
                            </div>
                        </section>

                        {/* KYC lookup (anyone) + Contracts strip */}
                        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <KycCheckCard />
                            <BentoCard accent="slate" title="Contracts" subtitle="Sepolia deployments">
                                <div className="space-y-2">
                                    <ContractRow label="Fund (TokenizedFund)" value={FUND_ADDRESS} />
                                    <ContractRow label="NAV Oracle" value={ORACLE_ADDRESS} />
                                    <ContractRow label="Admin" value={overview.admin} />
                                </div>
                            </BentoCard>
                        </section>

                        {/* Admin actions — visible always, disabled when not admin */}
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
                        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                        </section>
                        <ClawbackCard isAdmin={isAdmin} onSettled={onSettled} />
                    </div>

                    {/* Sidebar: Activity log + On-chain */}
                    <aside className="space-y-4 lg:col-span-1">
                        <ActivityLogCard />
                        <OnChainEventsCard adminAddress={overview.admin} />
                    </aside>
                </div>
            )}

            <footer className="mt-12 text-center text-xs text-zinc-400">
                Tokenized Fund POC · Sepolia · ERC-20 + KYC + NAV oracle
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

function ContractRow({label, value}: {label: string; value?: string}) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-white px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
            {value ? (
                <a
                    href={explorerAddr(value)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs text-cb-600 hover:text-cb-700"
                >
                    {shortAddr(value)}
                    <ExternalLinkIcon size={10} />
                </a>
            ) : (
                <span className="text-zinc-400">—</span>
            )}
        </div>
    );
}
