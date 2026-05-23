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
          "Arial",
          "sans-serif",
        ],
        mono: ["var(--font-geist-mono)", "Consolas", "monospace"],
      },
      boxShadow: {
        insetLine: "inset 0 1px 0 rgba(255,255,255,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
