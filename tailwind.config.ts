import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#030304",
        foreground: "#ECEDEA",
        surface: {
          DEFAULT: "#0B0B0D",
          raised: "#121215",
          border: "rgba(236,237,234,0.12)",
          "border-hover": "rgba(236,237,234,0.24)",
        },
        muted: {
          light: "#D6D9D7",
          DEFAULT: "#B9BDBA",
          dark: "#8E9390",
          faint: "#6F7471",
        },
        ice: {
          DEFAULT: "#3B86FF",
          glow: "rgba(59, 134, 255, 0.25)",
          light: "#EAF2FF",
        },
        amber: {
          DEFAULT: "#EF5F22",
          primary: "#F07A2B",
          glow: "rgba(239, 95, 34, 0.25)",
          light: "#FFE9D2",
        },
        positive: "#8FD3A8",
        negative: "#F08A7A",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Geist", "Helvetica Neue", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Geist Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
