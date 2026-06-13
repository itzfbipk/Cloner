import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display, DM_Mono } from 'next/font/google';
import './globals.css';

const inter = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});

const dmSans = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '700'],
  style: ['normal', 'italic'],
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'WebCloner — AI Website Cloner',
  description:
    'Clone any website instantly. Paste a URL and receive a downloadable Next.js + TypeScript + Tailwind project that looks just like the original.',
  keywords: ['website cloner', 'web scraper', 'next.js', 'clone website'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
