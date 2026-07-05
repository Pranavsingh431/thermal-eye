import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral (true-black) gray scale — removes the default blue tint so dark
        // mode reads as black, not navy. Applies app-wide via every `*-gray-*` class.
        gray: colors.neutral,
        // Driven by CSS variables so each org can be white-labeled at runtime.
        brand: {
          DEFAULT: "hsl(var(--brand))",
          fg: "hsl(var(--brand-fg))",
        },
        accent: { DEFAULT: "hsl(var(--accent))" },
        critical: "#dc2626",
        warning: "#d97706",
        normal: "#16a34a",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.1rem",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "none" } },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "0.65", transform: "scale(1.06)" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "scan-y": {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "10%, 90%": { opacity: "1" },
          "100%": { transform: "translateY(2000%)", opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        float: "float 6s ease-in-out infinite",
        marquee: "marquee 32s linear infinite",
        "pulse-glow": "pulse-glow 5s ease-in-out infinite",
        "gradient-pan": "gradient-pan 6s ease infinite",
        "scan-y": "scan-y 3.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
