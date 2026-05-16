'use client';

import { useClerk } from '@clerk/nextjs';

export function SignOutButton() {
  const { signOut } = useClerk();
  return (
    <button
      onClick={() => signOut({ redirectUrl: '/' })}
      className="text-sm text-[var(--dust)] hover:text-[var(--ink)] transition-colors"
    >
      Déconnexion
    </button>
  );
}
