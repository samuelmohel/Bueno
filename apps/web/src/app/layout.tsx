import type { Metadata, Viewport } from 'next';
import { Inter, Outfit, JetBrains_Mono } from 'next/font/google';
import { ToastHost } from '@/components/ui/ToastHost';
import { BRAND } from '@/lib/theme';
import './globals.css';

/**
 * Fonts are downloaded at build time and served from this origin.
 *
 * They were previously pulled in with an `@import` at the top of globals.css,
 * which is the slowest option available: the browser must fetch and parse the
 * stylesheet before it even discovers the font request, and the text reflows
 * when it finally arrives. `display: 'swap'` plus a real fallback stack means
 * content is readable immediately.
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://360.specklessinnovations.com'),
  title: {
    default: 'Bueno Logistics — Nigerian Rail Freight Operations',
    template: '%s · Bueno Logistics',
  },
  description:
    'Real-time rail freight tracking, terminal operations and manifest auditing for industrial consignees across Nigeria.',
  applicationName: 'Bueno Logistics Freight OS',
  keywords: [
    'rail freight Nigeria',
    'logistics tracking',
    'cargo management',
    'NRC',
    'Apapa port',
    'Moniya yard',
  ],
  openGraph: {
    title: 'Bueno Logistics — Nigerian Rail Freight Operations',
    description:
      'Track industrial rail freight from loading terminal to destination across Nigeria.',
    type: 'website',
    siteName: 'Bueno Logistics',
    locale: 'en_NG',
  },
  // The operational portal must never be indexed; the public marketing and
  // tracking pages opt back in individually.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: BRAND.navy,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${inter.variable} ${outfit.variable} ${jetbrains.variable}`}>
      <body className="antialiased">
        {/*
          Lets a keyboard user reach the page content without tabbing through
          the entire navigation. Visually hidden until focused.
        */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white"
        >
          Skip to main content
        </a>
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
