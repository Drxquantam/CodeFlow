import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        carbon: {
          950: "#050505",
          900: "#0a0a0b",
          850: "#101011",
          800: "#151516",
          700: "#1f2022",
          600: "#2b2c2f",
        },
        editor: {
          950: "#06060e",
          900: "#09091a",
          850: "#0d0d1e",
          800: "#111122",
          750: "#161628",
          700: "#1c1c30",
        },
        signal: {
          green: "#00c853",
          blue: "#4ea1ff",
          yellow: "#facc15",
          red: "#ef4444",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "Cascadia Code",
          "Cascadia Mono",
          "SFMono-Regular",
          "Consolas",
          "Menlo",
          "Monaco",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      boxShadow: {
        insetLine: "inset 0 1px 0 rgba(255,255,255,0.04)",
        "glow-xs": "0 0 0 1px rgba(99,102,241,0.18)",
        "glow-sm": "0 0 24px rgba(99,102,241,0.12), 0 0 0 1px rgba(99,102,241,0.18)",
        glow: "0 0 50px rgba(99,102,241,0.15), 0 0 0 1px rgba(99,102,241,0.22), inset 0 1px 0 rgba(255,255,255,0.04)",
        "glow-lg": "0 8px 40px rgba(0,0,0,0.6), 0 0 80px rgba(99,102,241,0.14), 0 0 0 1px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
        workspace: "0 40px 140px rgba(0,0,0,0.9), 0 0 100px rgba(99,102,241,0.08), 0 0 0 1px rgba(99,102,241,0.15)",
        "card-hover": "0 20px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
