'use client';

import { ClerkProvider } from '@clerk/nextjs';

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function Providers({ children }: { children: React.ReactNode }) {
  // Sans clé (build time ou env manquant) → on rend sans Clerk pour ne pas crasher
  if (!PUBLISHABLE_KEY) {
    return <>{children}</>;
  }
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      {children}
    </ClerkProvider>
  );
}
