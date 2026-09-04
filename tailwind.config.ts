import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f7f9fb",
        surface: "#ffffff",
        slate: "#475569",
        frame: "#131b2e",
        muted: "#f2f4f6",
        line: "#e2e8f0",
        text: "#191c1e",
        subtle: "#45464d",
        emerald: "#10b981",
        amber: "#f59e0b",
        danger: "#ef4444"
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"]
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem"
      }
    }
  },
  plugins: []
};

export default config;
