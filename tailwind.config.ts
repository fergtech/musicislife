import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        surface: {
          0: "#0a0a0a",
          1: "#141414",
          2: "#1e1e1e",
          3: "#282828",
        },
        accent: {
          DEFAULT: "#a855f7",
          hover: "#9333ea",
        },
      },
    },
  },
  plugins: [],
};

export default config;
