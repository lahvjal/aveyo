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
        // Aveyo Brand Colors
        brand: {
          black: "#212120",
          white: "#FFFFFF",
          navy: "#0A1628",
          dark: "#0D1D2E",
          green: "#4CAF50",
          gold: "#D4A84B",
          cream: "#F5F3EE",
          gray: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["'PP Telegraf'", "system-ui", "sans-serif"],
        telegraf: ["'PP Telegraf'", "system-ui", "sans-serif"],
      },
      fontWeight: {
        ultralight: "200",
        regular: "400",
        bold: "700",
        ultrabold: "800",
        black: "900",
      },
    },
  },
  plugins: [],
};

export default config;
