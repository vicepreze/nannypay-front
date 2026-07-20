import type { Metadata } from 'next';
import Link from 'next/link';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const metadata: Metadata = {
  title: 'Blog nounoulink — Conseils garde à domicile partagée',
  description:
    'Guides pratiques pour les parents en garde partagée : calcul du salaire, Pajemploi, congés payés, heures supplémentaires.',
  alternates: { canonical: 'https://nounoulink.fr/blog' },
};

type Article = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  category: string;
  readingTime: string;
  tag: string;
};

const STATIC_ARTICLES: Article[] = [
  {
    slug: 'calculer-salaire-nounou-garde-partagee',
    title: "Comment calculer le salaire d'une nounou en garde partagée",
    excerpt: "Formule, exemples chiffrés, heures supplémentaires et règles Pajemploi — guide complet 2026.",
    publishedAt: '2026-05-11',
    category: 'Calcul de salaire',
    readingTime: '9 min',
    tag: 'Guide complet',
  },
];

function getPublishedArticles(): Article[] {
  const dir = path.join(process.cwd(), 'blog/published');
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    return STATIC_ARTICLES;
  }

  const generated: Article[] = files.map((file) => {
    const meta = JSON.parse(readFileSync(path.join(dir, file), 'utf-8'));
    return {
      slug: meta.slug,
      title: meta.title,
      excerpt: meta.excerpt,
      publishedAt: meta.publishedAt,
      category: meta.category,
      readingTime: meta.readingTime,
      tag: meta.tag,
    };
  });

  return [...STATIC_ARTICLES, ...generated].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export default function BlogIndex() {
  const articles = getPublishedArticles();
  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center justify-between px-4 md:px-6 z-50">
        <Link href="/" className="font-serif text-[19px] tracking-tight text-[var(--ink)] no-underline">
          nounoulink<em className="text-[var(--sage)] not-italic">.</em>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-[var(--dust)]">
          <Link href="/blog" className="text-[var(--sage)] font-medium no-underline">Blog</Link>
          <Link
            href="/"
            className="px-4 py-2 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--sage-dark)] transition-colors no-underline"
          >
            Essayer l&apos;app
          </Link>
        </nav>
      </header>

      <main className="pt-14">

        {/* Hero */}
        <section className="max-w-2xl mx-auto px-5 md:px-6 pt-12 md:pt-16 pb-10 text-center">
          <p className="text-xs font-bold tracking-widest text-[var(--sage)] uppercase mb-3">Blog</p>
          <h1 className="font-serif text-[32px] md:text-[38px] leading-tight text-[var(--ink)] mb-4">
            Conseils garde à domicile partagée
          </h1>
          <p className="text-[15px] md:text-[16px] text-[var(--dust)] leading-relaxed max-w-lg mx-auto">
            Guides pratiques sur le calcul du salaire, Pajemploi, les congés payés,
            les heures supplémentaires — tout ce qu&apos;il faut savoir pour gérer
            sereinement une garde partagée.
          </p>
        </section>

        {/* Liste des articles */}
        <section className="max-w-2xl mx-auto px-5 md:px-6 pb-20">
          {articles.length === 0 ? (
            <div className="border border-dashed border-[var(--line)] rounded-2xl px-8 py-16 text-center">
              <p className="text-[var(--dust)] text-sm">Les articles arrivent bientôt.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {articles.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/blog/${article.slug}`}
                    className="flex items-start justify-between gap-4 py-6 px-4 -mx-4 rounded-xl group no-underline hover:bg-[var(--paper)] transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-2.5">
                        <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-[var(--sage)] bg-[var(--sage-light)] px-2 py-0.5 rounded">
                          {article.tag}
                        </span>
                        <span className="text-[var(--line)]">·</span>
                        <span className="text-xs text-[var(--dust)]">{article.category}</span>
                        <span className="text-[var(--line)]">·</span>
                        <time
                          dateTime={article.publishedAt}
                          className="text-xs text-[var(--dust)]"
                        >
                          {new Date(article.publishedAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </time>
                        <span className="text-[var(--line)]">·</span>
                        <span className="text-xs text-[var(--dust)]">{article.readingTime} de lecture</span>
                      </div>
                      <h2 className="text-[17px] font-semibold text-[var(--ink)] mb-1.5 group-hover:text-[var(--sage)] transition-colors leading-snug">
                        {article.title}
                      </h2>
                      <p className="text-sm text-[var(--dust)] leading-relaxed">{article.excerpt}</p>
                    </div>
                    <span className="flex-shrink-0 text-[var(--dust)] group-hover:text-[var(--sage)] group-hover:translate-x-1 transition-all text-base mt-1">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
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
