import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CargoTrace — Nigerian Rail Freight Operations System',
  description: 'Real-time rail freight tracking, terminal operations, and manifest auditing for industrial consignees across Nigeria.',
  keywords: 'rail freight Nigeria, logistics tracking, cargo management, Lafarge, Dangote, NRC',
  openGraph: {
    title: 'CargoTrace — Nigerian Rail Freight OS',
    description: 'Track industrial rail freight from loading terminal to destination across Nigeria.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
