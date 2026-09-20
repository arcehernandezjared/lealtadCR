import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter var",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#f2f1ff",
          100: "#e6e4ff",
          200: "#cdc8ff",
          300: "#aaa0ff",
          400: "#8b7bff",
          500: "#7057ff",
          600: "#5c3cf5",
          700: "#4c2fd1",
          800: "#3f28a8",
          900: "#352485",
          950: "#1f1450",
        },
        ink: {
          50: "#f7f7f9",
          100: "#eeeef2",
          200: "#d9d9e2",
          300: "#b7b7c6",
          400: "#8f8fa3",
          500: "#6f6f87",
          600: "#57576c",
          700: "#45455a",
          800: "#2b2b3a",
          900: "#17171f",
          950: "#0c0c11",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(23,23,31,0.04), 0 1px 6px -1px rgba(23,23,31,0.06)",
        "card-hover": "0 4px 16px -4px rgba(23,23,31,0.12), 0 2px 6px -2px rgba(23,23,31,0.06)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
