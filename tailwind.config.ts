import type { Config } from "tailwindcss"

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // ── Uniform type system ──
        // Screen UI: Inter (body + all figures) + Outfit (headings only).
        // Gujarati UI & Formal: Lohit Gujarati.
        // Figures (amounts / counts / dates): Inter + lining tabular figures
        // (see body / .num in src/index.css). NEVER font-mono: mono is for
        // codes only (PAN / HRPN / bill & EDP numbers), where fixed-width
        // glyphs aid verification. Print areas are isolated in index.css
        // (.report-print-area) and keep their own pt stack.
        sans: ['Inter', '"Lohit Gujarati"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        heading: ['Outfit', 'Inter', '"Lohit Gujarati"', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
        guj: ['"Lohit Gujarati"', 'Shruti', 'serif'],
        // Latin/digits come from Inter; the browser falls back to Lohit
        // Gujarati per-glyph for Gujarati characters (Inter has no Gujarati).
        gujSans: ['Inter', '"Lohit Gujarati"', 'Shruti', 'sans-serif'],
        plexGu: ['"Lohit Gujarati"', 'sans-serif'],
      },
      colors: {
        border: "rgb(var(--border))",
        input: "rgb(var(--input))",
        ring: "rgb(var(--ring))",
        background: "rgb(var(--background))",
        foreground: "rgb(var(--foreground))",
        primary: {
          DEFAULT: "rgb(var(--primary))",
          foreground: "rgb(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary))",
          foreground: "rgb(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive))",
          foreground: "rgb(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "rgb(var(--muted))",
          foreground: "rgb(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "rgb(var(--accent))",
          foreground: "rgb(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "rgb(var(--popover))",
          foreground: "rgb(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "rgb(var(--card))",
          foreground: "rgb(var(--card-foreground))",
        },
        earning: {
          DEFAULT: "rgb(var(--earning))",
          light: "rgb(var(--earning-light))",
          border: "#A7F3D0",
        },
        deduction: {
          DEFAULT: "rgb(var(--deduction))",
          light: "rgb(var(--deduction-light))",
          border: "#FECDD3",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        gtrBox: "11px",
      },
      borderWidth: {
        l4: "4px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        card: "var(--shadow-card)",
        float: "var(--shadow-float)",
        gtr: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config