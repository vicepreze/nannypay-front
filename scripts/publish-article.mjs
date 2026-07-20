import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITEMAP_PATH = path.join(ROOT, 'public/sitemap.xml');
const QUEUE_PATH = path.join(ROOT, 'blog/queue.json');
const PROD_ORIGIN = process.env.PROD_ORIGIN || 'https://nounoulink.fr';
const SITEMAP_MARKER = '  <!--\n    Les prochains articles seront ajoutés ici.';

function updateSitemap(slug, lastmod) {
  const xml = readFileSync(SITEMAP_PATH, 'utf-8');
  if (xml.includes(`/blog/${slug}<`)) return xml;

  const block = `  <url>
    <loc>${PROD_ORIGIN}/blog/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

${SITEMAP_MARKER}`;

  if (!xml.includes(SITEMAP_MARKER)) {
    throw new Error('Marqueur sitemap introuvable — insertion impossible');
  }
  return xml.replace(SITEMAP_MARKER, block);
}

function updateQueue(slug) {
  const queue = JSON.parse(readFileSync(QUEUE_PATH, 'utf-8'));
  const item = queue.find((q) => q.slug === slug);
  if (item) item.status = 'published';
  writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2) + '\n', 'utf-8');
}

function main() {
  const slug = process.argv[2] || process.env.SLUG;
  if (!slug) throw new Error('Usage: node publish-article.mjs <slug>');

  const metaPath = path.join(ROOT, 'blog/meta', `${slug}.json`);
  if (!existsSync(metaPath)) throw new Error(`Métadonnées introuvables : ${metaPath}`);
  const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));

  const publishedDir = path.join(ROOT, 'blog/published');
  mkdirSync(publishedDir, { recursive: true });
  writeFileSync(path.join(publishedDir, `${slug}.json`), JSON.stringify(meta, null, 2) + '\n', 'utf-8');
  rmSync(metaPath);

  const sitemap = updateSitemap(slug, meta.publishedAt);
  writeFileSync(SITEMAP_PATH, sitemap, 'utf-8');

  updateQueue(slug);

  console.log(`Article publié : ${slug}`);
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
