import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        graphite: "var(--graphite)",
        "graphite-2": "var(--graphite-2)",
        line: "var(--line)",
        blueprint: "var(--blueprint)",
        "blueprint-dim": "var(--blueprint-dim)",
        hazard: "var(--hazard)",
        danger: "var(--danger)",
        chalk: "var(--chalk)",
        muted: "var(--muted)",
        "muted-2": "var(--muted-2)",
      },
      fontFamily: {
        sans: ["var(--font-grotesk)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
      letterSpacing: {
        widest2: "0.24em",
      },
      keyframes: {
        "spin-slow": { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "spin-slow": "spin-slow 9s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
