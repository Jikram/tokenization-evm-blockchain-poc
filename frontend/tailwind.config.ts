import type {Config} from "tailwindcss";

const config: Config = {
    content: [
        "./src/app/**/*.{ts,tsx}",
        "./src/components/**/*.{ts,tsx}",
        "./src/lib/**/*.{ts,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: [
                    "Inter",
                    "-apple-system",
                    "BlinkMacSystemFont",
                    "SF Pro Text",
                    "ui-sans-serif",
                    "system-ui",
                    "sans-serif",
                ],
                mono: ["JetBrains Mono", "SF Mono", "ui-monospace", "monospace"],
            },
            boxShadow: {
                bento: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
                "bento-lg":
                    "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
            },
            colors: {
                accent: {
                    DEFAULT: "#0052FF", // Coinbase blue
                    soft: "#E6EEFF",
                },
                cb: {
                    50: "#EFF4FF",
                    100: "#DBE6FF",
                    200: "#B8CCFF",
                    300: "#86A8FF",
                    400: "#4d7fff",
                    500: "#1f5cff",
                    600: "#0052FF",
                    700: "#0042CC",
                    800: "#003399",
                    900: "#002766",
                },
                ink: {
                    DEFAULT: "#0A0B0D",
                    muted: "#5B6473",
                },
            },
        },
    },
    plugins: [],
};
export default config;
