import { auth } from '@clerk/nextjs/server';

import { redirect } from 'next/navigation';

import { TabsNav } from '@/components/nouvelle-garde/TabsNav';

export default async function NouvelleGardeLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center justify-between px-6 z-50">
        <a href="/" className="font-serif text-[19px] text-[var(--ink)] no-underline tracking-tight">
          nounoulink<em className="text-[var(--sage)] not-italic">.</em>
        </a>
        <span className="text-sm text-[var(--dust)]">{userId}</span>
      </header>

      <div className="pt-14 max-w-2xl mx-auto px-6 pb-16">
        {/* Titre */}
        <div className="pt-10 mb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--dust)] mb-2">
            Nouvelle garde
          </p>
          <h1 className="font-serif text-3xl text-[var(--ink)]">
            Configurez votre garde partagée
          </h1>
        </div>

        {/* Tabs */}
        <TabsNav />

        {/* Content */}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
