import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: "#F5841F",
          dark: "#D96A08",
          light: "#FFF3E8",
        },
        black: "#1D1D1D",
        "grey-dark": "#444444",
        "grey-mid": "#666666",
        "grey-light": "#999999",
        border: "#E8E8E8",
        "bg-alt": "#F9F9F9",
        success: "#27AE60",
        error: "#EB5757",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
      },
      fontSize: {
        display: ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
        h1: ["36px", { lineHeight: "1.15", letterSpacing: "-0.015em", fontWeight: "800" }],
        h2: ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        h3: ["20px", { lineHeight: "1.3", fontWeight: "700" }],
        h4: ["16px", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["16px", { lineHeight: "1.65", fontWeight: "400" }],
        small: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "500" }],
      },
      borderRadius: {
        pill: "100px",
        card: "16px",
        input: "8px",
      },
      boxShadow: {
        "input-focus": "0 0 0 3px rgba(245,132,31,0.12)",
        card: "0 1px 3px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
