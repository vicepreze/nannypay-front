import type { Metadata, Viewport } from 'next';
import { DM_Sans, DM_Serif_Display, DM_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Analytics } from '@vercel/analytics/react';
import FeedbackButton from '@/components/FeedbackButton';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-dm-serif-display',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-dm-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'nounoulink — Garde partagée simplifiée',
  description: 'Coordonnez votre garde partagée sereinement. Calcul Pajemploi, planning, validation à 3.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${dmSerifDisplay.variable} ${dmMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <FeedbackButton />
        <Analytics />
      </body>
    </html>
  );
}
