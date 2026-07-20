import Link from 'next/link';

export interface ArticleLayoutProps {
  /** Titre de l'article — utilisé dans le <h1> et le <title> via generateMetadata */
  title: string;
  /** Sous-titre ou accroche affichée sous le H1 */
  intro: string;
  /** Catégorie thématique (ex. "Calcul de salaire") */
  category: string;
  /** Date de publication au format ISO : "2026-05-11" */
  publishedAt: string;
  /** Contenu de l'article */
  children: React.ReactNode;
}

/**
 * Template réutilisable pour chaque article de blog.
 *
 * Usage dans app/blog/[slug]/page.tsx :
 *
 *   import { ArticleLayout } from '../_components/ArticleLayout';
 *   import type { Metadata } from 'next';
 *
 *   export const metadata: Metadata = {
 *     title: 'Comment calculer le salaire d\'une nounou en garde partagée',
 *     description: 'Guide complet pour calculer le salaire net...',
 *     alternates: { canonical: 'https://nounoulink.fr/blog/calculer-salaire-nounou-garde-partagee' },
 *   };
 *
 *   export default function Article() {
 *     return (
 *       <ArticleLayout
 *         title="Comment calculer le salaire d'une nounou en garde partagée"
 *         intro="Guide complet pour calculer le salaire net et brut..."
 *         category="Calcul de salaire"
 *         publishedAt="2026-05-11"
 *       >
 *         <h2>Première partie</h2>
 *         <p>...</p>
 *
 *         <h2>Deuxième partie</h2>
 *         <p>...</p>
 *       </ArticleLayout>
 *     );
 *   }
 */
export function ArticleLayout({
  title,
  intro,
  category,
  publishedAt,
  children,
}: ArticleLayoutProps) {
  const dateFormatted = new Date(publishedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center justify-between px-4 md:px-6 z-50">
        <Link href="/" className="font-serif text-[19px] tracking-tight text-[var(--ink)] no-underline">
          nounoulink<em className="text-[var(--sage)] not-italic">.</em>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-[var(--dust)]">
          <Link href="/blog" className="hover:text-[var(--ink)] transition-colors no-underline">Blog</Link>
          <Link
            href="/"
            className="px-4 py-2 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--sage-dark)] transition-colors no-underline"
          >
            Essayer l&apos;app
          </Link>
        </nav>
      </header>

      <main className="pt-14">

        {/* En-tête article */}
        <header className="max-w-2xl mx-auto px-5 md:px-6 pt-12 md:pt-16 pb-8 border-b border-[var(--line)]">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--dust)] hover:text-[var(--ink)] transition-colors no-underline mb-6"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Tous les articles
          </Link>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--sage)]">
              {category}
            </span>
            <span className="text-[var(--line)]">·</span>
            <time dateTime={publishedAt} className="text-xs text-[var(--dust)]">
              {dateFormatted}
            </time>
          </div>

          <h1 className="font-serif text-[28px] md:text-[34px] leading-tight text-[var(--ink)] mb-4">
            {title}
          </h1>
          <p className="text-[16px] text-[var(--dust)] leading-relaxed">
            {intro}
          </p>
        </header>

        {/* Corps de l'article */}
        <article className="max-w-2xl mx-auto px-5 md:px-6 py-10 prose-blog">
          {children}
        </article>

        {/* CTA */}
        <section className="max-w-2xl mx-auto px-5 md:px-6 pb-16">
          <div className="bg-[var(--sage-light)] border border-[var(--sage-mid)] rounded-2xl px-6 py-8 text-center">
            <p className="text-xs font-bold tracking-widest text-[var(--sage)] uppercase mb-3">
              Passez à la pratique
            </p>
            <h2 className="font-serif text-[22px] md:text-[26px] leading-tight text-[var(--ink)] mb-3">
              Calculez le salaire de votre nounou en 30 secondes
            </h2>
            <p className="text-sm text-[var(--dust)] leading-relaxed mb-6 max-w-sm mx-auto">
              nounoulink coordonne le calcul entre les deux familles, génère le récapitulatif
              mensuel et gère les absences automatiquement.
            </p>
            <Link
              href="/"
              className="inline-block px-8 py-3 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-semibold hover:bg-[var(--sage-dark)] transition-colors no-underline"
            >
              Essayer gratuitement →
            </Link>
            <p className="text-xs text-[var(--dust)] mt-3">
              Configuration en 2 min · La nounou n&apos;a pas besoin de compte
            </p>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[var(--line)] py-6 px-5 md:px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center md:justify-between gap-4 text-center md:text-left">
          <span className="font-serif text-[15px] text-[var(--ink)]">
            nounoulink<em className="text-[var(--sage)] not-italic">.</em>
          </span>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6 text-xs text-[var(--dust)]">
            <Link href="/mentions-legales" className="hover:text-[var(--ink)] transition-colors no-underline">Mentions légales</Link>
            <Link href="/politique-confidentialite" className="hover:text-[var(--ink)] transition-colors no-underline">Politique de confidentialité</Link>
            <Link href="/cgu" className="hover:text-[var(--ink)] transition-colors no-underline">CGU</Link>
            <Link href="/faq" className="hover:text-[var(--ink)] transition-colors no-underline">FAQ</Link>
            <Link href="mailto:pajemploi.facile@gmail.com" className="hover:text-[var(--ink)] transition-colors no-underline">Contact</Link>
          </div>
          <span className="text-xs text-[var(--dust)]">© {new Date().getFullYear()} nounoulink</span>
        </div>
      </footer>

    </div>
  );
}
