'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="text-sm text-[var(--dust)] hover:text-[var(--ink)] transition-colors"
    >
      Déconnexion
    </button>
  );
}
