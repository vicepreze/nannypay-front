import Link from 'next/link';

type Props = {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
};

export function LegalLayout({ title, updatedAt, children }: Props) {
  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center justify-between px-4 md:px-6 z-50">
        <Link href="/" className="font-serif text-[19px] tracking-tight text-[var(--ink)] no-underline">
          nounoulink<em className="text-[var(--sage)] not-italic">.</em>
        </Link>
        <Link href="/" className="text-sm text-[var(--dust)] hover:text-[var(--ink)] transition-colors no-underline">
          Retour à l&apos;accueil
        </Link>
      </header>

      <main className="pt-14 max-w-2xl mx-auto px-5 md:px-6 py-12">
        <h1 className="font-serif text-[28px] md:text-[34px] leading-tight text-[var(--ink)] mb-2">{title}</h1>
        <p className="text-xs text-[var(--dust)] mb-10">Dernière mise à jour : {updatedAt}</p>

        <div className="space-y-8 text-sm leading-relaxed text-[var(--ink)] [&_h2]:font-serif [&_h2]:text-lg [&_h2]:mb-3 [&_p]:text-[var(--dust)] [&_p]:mb-2 [&_li]:text-[var(--dust)] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-[var(--sage)] [&_a]:underline">
          {children}
        </div>
      </main>

      <footer className="border-t border-[var(--line)] py-6 px-5 md:px-6">
        <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-4 text-xs text-[var(--dust)]">
          <Link href="/mentions-legales" className="hover:text-[var(--ink)] transition-colors no-underline">Mentions légales</Link>
          <Link href="/politique-confidentialite" className="hover:text-[var(--ink)] transition-colors no-underline">Politique de confidentialité</Link>
          <Link href="/cgu" className="hover:text-[var(--ink)] transition-colors no-underline">CGU</Link>
          <span>© {new Date().getFullYear()} nounoulink</span>
        </div>
      </footer>
    </div>
  );
}
