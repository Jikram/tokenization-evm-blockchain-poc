import {createConfig, http} from "wagmi";
import {sepolia} from "wagmi/chains";
import {injected, walletConnect} from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

if (!projectId && typeof window !== "undefined") {
    console.warn(
        "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. WalletConnect button will fail until you set it."
    );
}

export const config = createConfig({
    chains: [sepolia],
    connectors: [
        injected({target: "metaMask"}),
        walletConnect({
            projectId,
            showQrModal: false, // we render our own QR modal to match the Bento/Linear look
            metadata: {
                name: "Tokenized Fund POC (EVM)",
                description: "KYC-gated tokenized real-estate fund on Sepolia",
                url: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
                icons: [],
            },
        }),
    ],
    transports: {
        [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || undefined),
    },
    ssr: true,
});

declare module "wagmi" {
    interface Register {
        config: typeof config;
    }
}
