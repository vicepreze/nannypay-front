import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const GITHUB_REPO = process.env.GITHUB_REPOSITORY_URL || 'https://github.com/vicepreze/nannypay-front';
const RESEND_FROM = process.env.RESEND_FROM || 'nounoulink. blog <blog@notifications.nounoulink.fr>';
const APPROVER_EMAIL = process.env.APPROVER_EMAIL || 'arthur@nounoulink.fr';

async function sendEmail({ subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY manquant dans l\'environnement');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [APPROVER_EMAIL],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API ${res.status}: ${body}`);
  }
}

async function main() {
  const slug = process.argv[2] || process.env.SLUG;
  if (!slug) throw new Error('Usage: node send-preview-email.mjs <slug>');

  const metaPath = path.join(ROOT, 'blog/meta', `${slug}.json`);
  if (!existsSync(metaPath)) throw new Error(`Métadonnées introuvables : ${metaPath}`);
  const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));

  const branchUrl = `${GITHUB_REPO}/tree/draft/${slug}`;

  const subject = `[nounoulink. blog] Aperçu article : ${meta.title}`;
  const text = `Aperçu de l'article : ${meta.title}

Angle : ${meta.angle}

Prévisualiser la branche GitHub : ${branchUrl}

Pour publier : ouvrez une session Claude Code et demandez la publication de l'article "${slug}" (validation manuelle), ou lancez le workflow "Blog Agent" depuis GitHub Actions → Run workflow, avec slug=${slug}.`;
  const html = `<p><strong>Aperçu de l'article :</strong> ${meta.title}</p>
<p><strong>Angle :</strong> ${meta.angle}</p>
<p><a href="${branchUrl}">Prévisualiser la branche GitHub</a></p>
<p><strong>Pour publier :</strong> ouvrez une session Claude Code et demandez la publication de l'article <code>${slug}</code> (validation manuelle), ou lancez le workflow « Blog Agent » depuis GitHub Actions → Run workflow, avec <code>slug=${slug}</code>.</p>`;

  await sendEmail({ subject, html, text });
  console.log(`Email d'aperçu envoyé pour ${slug}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
