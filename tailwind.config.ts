import type { Config } from "tailwindcss";

// EduVanta design tokens — premium/minimal/academic, not generic-LMS.
// See ARCHITECTURE.md for the full rationale on palette choices.
//
// Colors are defined as CSS custom properties (see globals.css) rather
// than hardcoded hex here, so every existing `bg-paper`, `text-ink/70`,
// `border-signal/30` etc. usage across the app automatically respects
// dark mode without any component needing a `dark:` variant added by
// hand. The `rgb(var(--x) / <alpha-value>)` pattern is what lets
// Tailwind's opacity modifiers (`/70`, `/30`, `/5`) keep working.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        cobalt: {
          DEFAULT: "rgb(var(--cobalt) / <alpha-value>)",
          soft: "rgb(var(--cobalt-soft) / <alpha-value>)",
        },
        // Amber is reserved for Nova / AI-generated moments only — never used
        // for ordinary UI chrome — so it stays meaningful as "the AI said this."
        signal: {
          DEFAULT: "rgb(var(--signal) / <alpha-value>)",
          soft: "rgb(var(--signal-soft) / <alpha-value>)",
        },
        mastery: {
          mastered: "rgb(var(--mastery-mastered) / <alpha-value>)",
          strong: "rgb(var(--mastery-strong) / <alpha-value>)",
          developing: "rgb(var(--mastery-developing) / <alpha-value>)",
          attention: "rgb(var(--mastery-attention) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
