import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef0fc",
          100: "#d9dcf7",
          200: "#b3b9f0",
          300: "#8d96e8",
          400: "#6773e0",
          500: "#3C50E0",
          600: "#3345C8",
          700: "#2a38b0",
          800: "#1e2060",
          900: "#181a4e"
        },
        sidebar: {
          DEFAULT: "#1C2434",
          text: "#DEE4EE",
          muted: "#8899A8",
          active: "#333A48"
        },
        body: "#F1F5F9",
        surface: "#FFFFFF",
        "border-base": "#E2E8F0",
        "text-primary": "#1C2434",
        "text-secondary": "#64748B",
        "text-muted": "#8899A8",
        success: {
          DEFAULT: "#219653",
          bg: "#DCFCE7",
          text: "#166534"
        },
        warning: {
          DEFAULT: "#FFA70B",
          bg: "#FEF9C3",
          text: "#854D0E"
        },
        danger: {
          DEFAULT: "#D34053",
          bg: "#FEE2E2",
          text: "#991B1B"
        }
      },
      fontFamily: {
        sans: ["Satoshi", "Inter", "system-ui", "sans-serif"]
      },
      borderRadius: {
        card: "10px"
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)"
      }
    }
  },
  plugins: []
};

export default config;
