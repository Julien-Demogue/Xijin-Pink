import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          accent: {
            DEFAULT: "#AA3363",
            dark: "#772445",
            light: "#C87A9A",
            soft: "#F2E0E8",
          },
          primary: {
            DEFAULT: "#FB5CA1",
            dark: "#B04071",
            light: "#FC95C2",
            soft: "#FEE7F1",
          },
          secondary: {
            DEFAULT: "#FFA2BC",
            dark: "#B37184",
            light: "#FFC3D3",
            soft: "#FFF1F5",
          },
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      boxShadow: {
        brand: "0 10px 30px -10px rgba(251, 92, 161, 0.45)",
      },
      keyframes: {
        "led-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.15" },
        },
      },
      animation: {
        "led-blink": "led-blink 0.6s steps(1, end) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
