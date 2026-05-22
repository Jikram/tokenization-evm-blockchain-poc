import type {Metadata} from "next";
import {Providers} from "./providers";
import "./globals.css";

export const metadata: Metadata = {
    title: "Tokenized Fund POC — EVM",
    description: "KYC-gated tokenized real-estate fund on Sepolia. Solidity + Foundry + viem/wagmi.",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
    return (
        <html lang="en">
            <body className="min-h-screen font-sans">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
