import type { Config } from 'tailwindcss'
import { BRAND_SCALE } from './src/lib/theme'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // Brand colours come from src/lib/theme.ts so that Tailwind classes and
      // the raw values used in SVG attributes cannot drift apart.
      colors: BRAND_SCALE as unknown as Record<string, Record<string, string>>,

      // Wired to the next/font variables declared in app/layout.tsx. Fonts are
      // self-hosted by the build rather than fetched from Google at runtime.
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },

      // The interface uses a lot of small type. These give the smallest sizes
      // names and, crucially, rem units — an absolute `text-[10px]` ignores the
      // reader's browser font-size setting entirely.
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
    },
  },
  plugins: [],
}
export default config
