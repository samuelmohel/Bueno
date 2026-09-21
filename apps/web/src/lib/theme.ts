/**
 * Bueno Freight OS — brand tokens
 *
 * The single definition of the brand palette. Tailwind reads this to generate
 * `bg-brand`, `text-navy` and friends; the handful of places that need a raw
 * value (SVG attributes, the Leaflet polyline renderer) import it directly.
 *
 * Before this existed the palette lived as 137 copies of `#62BC37` spread
 * across fifteen files, so changing the brand — or correcting a contrast
 * failure — meant a find-and-replace and hoping none were missed.
 *
 * Deliberately dependency-free: `tailwind.config.ts` imports this at build
 * time, before any path aliases or React are available.
 */

export const BRAND = {
  /** Bueno green. Primary actions, active states, positive emphasis. */
  green: '#62BC37',
  /** Pressed and hover state for green surfaces. */
  greenDark: '#52A02D',
  /** Accessible green for text on white — the base green fails WCAG AA at body size. */
  greenText: '#3F7D22',
  /** Corporate navy. Headings, secondary emphasis, print documents. */
  navy: '#0E4B88',
  /** Hover state for navy surfaces. */
  navyDark: '#0A3A6B',
} as const;

/**
 * Tailwind colour scales.
 *
 * `DEFAULT` is what bare `bg-brand` resolves to, so the existing markup reads
 * naturally. The numbered stops exist so future work has somewhere to go
 * without reaching for arbitrary values again.
 */
export const BRAND_SCALE = {
  brand: {
    DEFAULT: BRAND.green,
    50: '#F1F9EC',
    100: '#DFF2D3',
    200: '#C1E5AC',
    300: '#9DD57F',
    400: '#7EC85A',
    500: BRAND.green,
    600: BRAND.greenDark,
    700: BRAND.greenText,
    800: '#31611B',
    900: '#284F16',
    text: BRAND.greenText,
    dark: BRAND.greenDark,
  },
  navy: {
    DEFAULT: BRAND.navy,
    50: '#EAF1F8',
    100: '#CBDCEF',
    200: '#9CBCDF',
    300: '#6D9CCE',
    400: '#3E7CBE',
    500: BRAND.navy,
    600: BRAND.navyDark,
    700: '#082D53',
    800: '#06213D',
    900: '#041626',
    dark: BRAND.navyDark,
  },
} as const;
