import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Apple-style near-black canvas with elevated translucent surfaces.
        bg: {
          DEFAULT: "#000000",
          elev: "rgba(255,255,255,0.03)",
          card: "rgba(28,28,30,0.72)",
          hover: "rgba(255,255,255,0.06)",
        },
        line: {
          DEFAULT: "rgba(255,255,255,0.08)",
          strong: "rgba(255,255,255,0.14)",
        },
        ink: {
          DEFAULT: "#f5f5f7",
          muted: "rgba(235,235,245,0.60)",
          dim: "rgba(235,235,245,0.30)",
        },
        // iOS system colors (dark variants)
        ios: {
          blue: "#0a84ff",
          green: "#30d158",
          indigo: "#5e5ce6",
          orange: "#ff9f0a",
          pink: "#ff375f",
          purple: "#bf5af2",
          red: "#ff453a",
          teal: "#64d2ff",
          yellow: "#ffd60a",
          gray: "#8e8e93",
          gray2: "#636366",
          gray3: "#48484a",
        },
        accent: { DEFAULT: "#0a84ff", soft: "rgba(10,132,255,0.16)" },
        success: "#30d158",
        warn: "#ff9f0a",
        danger: "#ff453a",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          "system-ui",
          "Inter",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          '"SF Pro Display"',
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          "ui-monospace",
          "Menlo",
          "Monaco",
          "monospace",
        ],
        arabic: ['"SF Arabic"', '"IBM Plex Sans Arabic"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
        "3xl": "24px",
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.40)",
        glow: "0 0 0 1px rgba(255,255,255,0.04), 0 24px 64px -16px rgba(0,0,0,0.6)",
      },
      letterSpacing: {
        tight: "-0.01em",
        tighter: "-0.02em",
        display: "-0.03em",
      },
      backdropBlur: {
        xs: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
