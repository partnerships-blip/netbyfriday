import type { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';
import '@fontsource-variable/plus-jakarta-sans';
import { brandVars } from '@/lib/brand';
import './globals.css';

export const metadata: Metadata = { title: 'netbyfriday', description: 'The business workspace for creators.', robots: { index: false } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistMono.variable}>
      <body className="font-sans" style={brandVars() as React.CSSProperties}>{children}</body>
    </html>
  );
}
