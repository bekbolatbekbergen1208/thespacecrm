import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#030712",
        midnight: "#071426",
        aurora: "#39d8ff",
        violet: "#8b5cf6",
        plasma: "#4f46e5",
      },
      boxShadow: {
        glow: "0 0 44px rgba(57, 216, 255, 0.22)",
        violet: "0 0 52px rgba(139, 92, 246, 0.2)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -14px, 0)" },
        },
        orbit: {
          "0%": { transform: "rotate(0deg) translateX(14px) rotate(0deg)" },
          "100%": { transform: "rotate(360deg) translateX(14px) rotate(-360deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        orbit: "orbit 12s linear infinite",
        shimmer: "shimmer 6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
