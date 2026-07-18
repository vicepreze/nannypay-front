'use client';

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import type { ReactNode } from 'react';

const userButtonAppearance = {
  variables: {
    colorPrimary: '#6f74c4',
    colorText: '#1a1a1a',
    colorTextSecondary: '#8a8680',
    colorBackground: '#ffffff',
    borderRadius: '10px',
    fontFamily: 'inherit',
  },
  elements: {
    avatarBox: 'w-8 h-8',
    userButtonPopoverCard: 'shadow-lg border border-[#e4e2de]',
  },
};

const defaultLogo = (
  <Link href="/" className="font-serif text-[19px] tracking-tight text-[var(--ink)] no-underline">
    nounoulink<em className="text-[var(--sage)] not-italic">.</em>
  </Link>
);

const navLinkClass = 'text-sm text-[var(--dust)] hover:text-[var(--ink)] no-underline transition-colors';

interface AppHeaderProps {
  /** Contenu de la zone gauche (logo, ou logo + fil d'Ariane). Par défaut : logo seul. */
  left?: ReactNode;
  /** Éléments additionnels affichés entre la nav (Dashboard/Démo) et le UserButton (ex: indicateur de sauvegarde). */
  rightExtra?: ReactNode;
}

export function AppHeader({ left = defaultLogo, rightExtra }: AppHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center justify-between px-6 z-50">
      {left}
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className={navLinkClass}>Dashboard</Link>
        <Link href="/demo" className={navLinkClass}>Démo</Link>
        {rightExtra}
        <UserButton appearance={userButtonAppearance} />
      </div>
    </header>
  );
}
