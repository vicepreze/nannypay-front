import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const QUEUE_PATH = path.join(ROOT, 'blog/queue.json');
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `Tu es le rédacteur SEO de nounoulink., un outil de gestion de paie pour gardes d'enfants à domicile partagées entre deux familles en France.

RÈGLES ABSOLUES — ne jamais déroger :
- Terminologie : "assistant parental" (jamais "garde d'enfants à domicile") depuis janvier 2026
- Exemples toujours nommés : Sophie, Lucas, Emma, Théo, Louise, Hugo, Léa…
- Résumé 1 min : principes uniquement, jamais de chiffres précis
- Heures supplémentaires : seuil 40h/semaine civile, +25% (41e-48e h), +50% (>48h). Les congés payés ne neutralisent JAMAIS les heures sup. Arrêt maladie = pas d'heures sup la semaine concernée.
- Absences famille : déplacent la charge, ne la suppriment pas
- Répartition : prorata = point de départ pas obligation légale. 3 enfants 2+1 = expliquer 60/40 vs 66/33
- Pajemploi : toujours le NET. Chaque famille déclare SA part uniquement. Frais transport/repas = cases séparées
- CMG : mentionner existence uniquement, renvoyer vers caf.fr
- Chiffres 2026 : 12,89 €/h (niveau A), 13,08 €/h (niveau B), SMIC 12,02 €/h

STRUCTURE OBLIGATOIRE du contenu (children) :
1. <SummaryBox> — résumé 1 min, principes uniquement
2. Introduction 2 paragraphes (<p>)
3. <Note type="info"> — terminologie 2026 ("assistant parental")
4. 5 à 7 sections <h2> numérotées avec <SectionNum>
5. <CtaMid> après la 3e section — texte axé démo nounoulink.
6. Section erreurs fréquentes : <h2> avec <SectionNum n="!" error /> puis <Steps> de <Step error>
7. <CtaMid> final — texte différent, axé onboarding nounoulink.
8. <SourcesSection> avec des sources officielles réelles (Pajemploi, Urssaf, Légifrance, CAF, Service-Public.fr)

COMPOSANTS DISPONIBLES (import depuis '../_components/ArticleBlocks'), à utiliser et UNIQUEMENT ceux-là :
SummaryBox, Note, FormulaBox, CalcCard (avec CalcRow, CalcSubtotalRow, CalcTotalRow, CalcNoteRow à l'intérieur), Tag, Step, Steps, CtaMid, HSupVisual, SourcesSection, FieldBlock, SectionNum

Le layout de page (header, hero, footer) est géré par <ArticleLayout>, importé depuis '../_components/ArticleLayout'. Tu ne génères QUE le contenu de la page, pas le header/footer.

LONGUEUR : 8-10 min de lecture, 2-4 CalcCard, 1-2 FormulaBox, 2-4 Note, 1 section erreurs (3-4 Step).

Réponds UNIQUEMENT avec un objet JSON valide (aucun texte avant ni après, pas de bloc de code markdown), avec exactement ces clés :
{
  "articleTitle": "titre H1 de l'article (peut différer légèrement du titre SEO)",
  "metaTitle": "titre SEO <title> avec | nounoulink. à la fin",
  "metaDescription": "meta description 150-160 caractères",
  "excerpt": "1-2 phrases pour la card dans la liste du blog",
  "category": "catégorie courte (ex: Répartition, Pajemploi, Contrat...)",
  "readingTime": "X min",
  "tag": "étiquette courte (ex: Guide complet, Cas pratique...)",
  "tsx": "le code source COMPLET du fichier page.tsx, en une seule chaîne avec \\n pour les retours à la ligne et guillemets échappés"
}

Le champ "tsx" doit être un fichier .tsx valide et complet :
- import type { Metadata } from 'next';
- import { ArticleLayout } from '../_components/ArticleLayout';
- import { SummaryBox, Note, FormulaBox, CalcCard, CalcRow, CalcSubtotalRow, CalcTotalRow, CalcNoteRow, Tag, Step, Steps, CtaMid, HSupVisual, SourcesSection, FieldBlock, SectionNum } from '../_components/ArticleBlocks';
- export const metadata: Metadata = { title, description, alternates: { canonical: 'https://nounoulink.fr/blog/<slug>' } };
- export default function Article() { return (<ArticleLayout title="..." intro="..." category="..." publishedAt="YYYY-MM-DD"><contenu selon la structure ci-dessus></ArticleLayout>); }
- Utilise className Tailwind cohérent avec le reste (prose-blog gère déjà h2/h3/p/ul dans ArticleLayout, donc pas besoin de classes sur ces balises basiques, seulement sur les composants custom).`;

function stripCodeFences(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\n([\s\S]*)\n```$/);
  return fenced ? fenced[1] : trimmed;
}

async function callAnthropic(item) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY manquant dans l\'environnement');
  }

  const userMessage = `Sujet à rédiger :
- slug: ${item.slug}
- titre: ${item.title}
- meta_description: ${item.meta_description}
- angle: ${item.angle}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.content?.map((b) => b.text ?? '').join('') ?? '';
  const jsonText = stripCodeFences(text);

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`Réponse Claude non-JSON : ${err.message}\n---\n${text.slice(0, 2000)}`);
  }

  const required = ['articleTitle', 'metaTitle', 'metaDescription', 'excerpt', 'category', 'readingTime', 'tag', 'tsx'];
  for (const key of required) {
    if (!parsed[key]) throw new Error(`Champ manquant dans la réponse Claude : ${key}`);
  }
  return parsed;
}

async function main() {
  if (!existsSync(QUEUE_PATH)) {
    console.log('Aucun article en queue');
    process.exit(0);
  }

  const queue = JSON.parse(readFileSync(QUEUE_PATH, 'utf-8'));
  const item = queue.find((q) => q.status === 'queued');

  if (!item) {
    console.log('Aucun article en queue');
    process.exit(0);
  }

  console.log(`Génération de l'article : ${item.slug}`);
  const result = await callAnthropic(item);

  const articleDir = path.join(ROOT, 'app/blog', item.slug);
  mkdirSync(articleDir, { recursive: true });
  writeFileSync(path.join(articleDir, 'page.tsx'), result.tsx, 'utf-8');

  const metaDir = path.join(ROOT, 'blog/meta');
  mkdirSync(metaDir, { recursive: true });
  const publishedAt = new Date().toISOString().slice(0, 10);
  const meta = {
    slug: item.slug,
    title: result.articleTitle,
    metaTitle: result.metaTitle,
    metaDescription: result.metaDescription,
    excerpt: result.excerpt,
    category: result.category,
    readingTime: result.readingTime,
    tag: result.tag,
    publishedAt,
    angle: item.angle,
  };
  writeFileSync(path.join(metaDir, `${item.slug}.json`), JSON.stringify(meta, null, 2), 'utf-8');

  console.log(`Écrit : app/blog/${item.slug}/page.tsx`);
  console.log(`Écrit : blog/meta/${item.slug}.json`);

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `slug=${item.slug}\n`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
