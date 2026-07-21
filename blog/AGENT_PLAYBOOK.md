# Playbook — Community Manager blog nounoulink.

Ce fichier est la seule source de vérité du pipeline de génération/publication d'articles de blog. Il est conçu pour être suivi par une session Claude Code qui n'a **aucune mémoire** de ce qui précède — que ce soit une tâche planifiée qui se déclenche toutes les 48h, ou une demande manuelle ("génère le prochain article de blog").

Repo : `/Users/arthurboueilh/Documents/GitHub/nannypay-front`

Il n'y a **aucun secret, aucune API externe, aucun email** dans ce pipeline. Tout se fait avec les outils normaux d'une session Claude Code (git, gh, lecture/écriture de fichiers, navigateur de preview) sur ce repo.

## Étape 1 — Synchroniser

```bash
cd /Users/arthurboueilh/Documents/GitHub/nannypay-front
git status --short   # si des changements non commités traînent (autre session en cours), s'arrêter et prévenir l'utilisateur plutôt que d'écraser quoi que ce soit
git checkout main
git pull origin main
```

## Étape 2 — Choisir le sujet

Lire `blog/queue.json`. Prendre le premier objet avec `"status": "queued"`.

Si aucun sujet en `queued` : dire clairement "Aucun article en queue — ajoutez un sujet dans blog/queue.json" et s'arrêter là. Ne rien inventer.

## Étape 3 — Rédiger l'article

Avant d'écrire, lire pour context :
- `Context_20260720.md`, section "Règles Blog et Contenu" (terminologie, chiffres 2026, règles heures sup/absences/répartition/Pajemploi/CMG, longueur cible)
- `app/blog/_components/ArticleLayout.tsx` (shell header/hero/footer, props `title`/`intro`/`category`/`publishedAt`)
- `app/blog/_components/ArticleBlocks.tsx` (tous les blocs disponibles : `SummaryBox`, `Note`, `FormulaBox`, `CalcCard`+`CalcRow`/`CalcSubtotalRow`/`CalcTotalRow`/`CalcNoteRow`, `Tag`, `Step`/`Steps`, `CtaMid`, `HSupVisual`, `SourcesSection`, `FieldBlock`, `SectionNum`) — n'utiliser QUE ces composants, ne pas en inventer d'autres ni réécrire du JSX brut équivalent
- `app/blog/calculer-salaire-nounou-garde-partagee/page.tsx` comme exemple de ton et de niveau de détail (article historique, structure légèrement différente mais même esprit)

Structure obligatoire du contenu (`children` de `ArticleLayout`) :
1. `SummaryBox` — résumé 1 minute, principes uniquement, jamais de chiffres précis
2. Introduction, 2 paragraphes
3. `Note type="info"` — rappel terminologie 2026 ("assistant parental")
4. 5 à 7 sections `h2` numérotées avec `SectionNum`
5. `CtaMid` après la 3e section — texte axé démo
6. Section erreurs fréquentes : `h2` avec `SectionNum n="!" error`, puis `Steps` de `Step error` (3-4 items)
7. `CtaMid` final — texte différent, axé onboarding
8. `SourcesSection` avec de vraies sources officielles (Pajemploi, Urssaf, Légifrance, CAF, Service-Public.fr)

Longueur cible : 8-10 min de lecture, 2-4 `CalcCard`, 1-2 `FormulaBox`, 2-4 `Note`.

Écrire :
- `app/blog/<slug>/page.tsx` (TSX complet : imports, `metadata` Next avec `alternates.canonical`, `export default function`)
- `blog/meta/<slug>.json` avec les clés : `slug`, `title`, `metaTitle`, `metaDescription`, `excerpt`, `category`, `readingTime`, `tag`, `publishedAt` (date du jour, `YYYY-MM-DD`), `angle` (copié depuis la queue)

## Étape 4 — Brancher

```bash
git checkout -b draft/<slug>
```
Dans `blog/queue.json`, passer le `status` du sujet choisi à `"pending"`.

```bash
git add app/blog/<slug>/page.tsx blog/meta/<slug>.json blog/queue.json
git commit -m "feat(blog): génère l'article <slug>"
git push -u origin draft/<slug>
```

## Étape 5 — Vérifier

```bash
npx next lint
npx vitest run
```
Les deux doivent passer avant de présenter quoi que ce soit à l'utilisateur. Si `next lint` échoue, corriger et recommit avant de continuer.

## Étape 6 — Aperçu visuel

Démarrer le serveur de dev (config `.claude/launch.json`), ouvrir `http://localhost:3000/blog/<slug>` dans le navigateur de preview, prendre un screenshot, puis arrêter le serveur. Ne pas laisser tourner le serveur après cette étape.

## Étape 7 — Présenter et attendre

Montrer à l'utilisateur, dans le message :
- Le titre et l'angle de l'article
- Le screenshot capturé à l'étape 6
- Le lien de la branche : `https://github.com/vicepreze/nannypay-front/tree/draft/<slug>`
- Une invitation explicite : "Dites-moi ce qu'il faut changer, ou dites 'publie' / 'valide' pour mettre en ligne."

**S'arrêter ici et attendre la réponse de l'utilisateur dans cette même session.** Ne jamais passer à l'étape 9 sans un message explicite de validation.

## Étape 8 — Demandes de modification (boucle)

Si l'utilisateur demande des changements : éditer `app/blog/<slug>/page.tsx` sur la branche `draft/<slug>`, recommit, repush, refaire les étapes 5 et 6, re-présenter. Répéter autant de fois que nécessaire.

## Étape 9 — Publier (uniquement sur validation explicite)

Ne déclencher cette étape QUE si l'utilisateur a explicitement validé dans cette session ("publie", "valide", "go", etc.). Jamais automatiquement, jamais sur simple absence de réponse.

```bash
git checkout main
git pull origin main
git merge --no-ff draft/<slug> -m "Merge draft/<slug> into main"
node scripts/publish-article.mjs <slug>
git add public/sitemap.xml blog/queue.json blog/published blog/meta
git commit -m "chore(blog): publie <slug>"
git push origin main
git push origin --delete draft/<slug>
git branch -d draft/<slug>
```

Confirmer à l'utilisateur avec l'URL finale : `https://nounoulink.fr/blog/<slug>`.
