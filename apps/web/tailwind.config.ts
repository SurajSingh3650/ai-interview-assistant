import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          light: "#f7fafc",
          dark: "#070b14"
        },
        brand: {
          50: "#edf4ff",
          100: "#d7e8ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8"
        }
      },
      boxShadow: {
        panel: "0 12px 40px rgba(4, 10, 24, 0.14)"
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at 1px 1px, rgba(59,130,246,0.20) 1px, transparent 0)"
      }
    }
  },
  plugins: []
};

export default config;
