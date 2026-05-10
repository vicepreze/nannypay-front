import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s — Blog nounoulink',
    default: 'Blog nounoulink — Conseils garde à domicile partagée',
  },
  description:
    'Guides pratiques pour les parents en garde partagée : calcul du salaire, Pajemploi, congés payés, heures supplémentaires.',
  openGraph: {
    siteName: 'nounoulink',
    locale: 'fr_FR',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
