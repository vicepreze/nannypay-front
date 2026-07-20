import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RESEND_FROM = process.env.RESEND_FROM || 'nounoulink. blog <blog@notifications.nounoulink.fr>';
const APPROVER_EMAIL = process.env.APPROVER_EMAIL || 'arthur@nounoulink.fr';
const PROD_ORIGIN = process.env.PROD_ORIGIN || 'https://nounoulink.fr';

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
  if (!slug) throw new Error('Usage: node send-confirmation-email.mjs <slug>');

  const metaPath = path.join(ROOT, 'blog/published', `${slug}.json`);
  const title = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf-8')).title : slug;

  const articleUrl = `${PROD_ORIGIN}/blog/${slug}`;
  const subject = `[nounoulink. blog] ✅ Article publié : ${title}`;
  const text = `L'article "${title}" est en ligne : ${articleUrl}

Pour annuler : git revert HEAD~1 depuis GitHub → Actions → Re-run.`;
  const html = `<p>L'article <strong>${title}</strong> est en ligne : <a href="${articleUrl}">${articleUrl}</a></p>
<p>Pour annuler : <code>git revert HEAD~1</code> depuis GitHub → Actions → Re-run.</p>`;

  await sendEmail({ subject, html, text });
  console.log(`Email de confirmation envoyé pour ${slug}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
