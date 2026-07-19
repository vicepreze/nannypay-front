# CLAUDE.md — nounoulink · Bootstrap Session

> Ce fichier est chargé automatiquement au démarrage de chaque session Claude Code dans ce repo.  
> Il donne l'accès aux ressources essentielles et oriente vers les fichiers de contexte.

---

## Ressources Externes

| Ressource | URL / Identifiant |
|-----------|-------------------|
| Repo GitHub | https://github.com/vicepreze/nannypay-front |
| Production | https://pajemploi-facile.org |
| Vercel project | https://vercel.com/vicepreze/nannypay-front |
| Neon (base de données) | https://console.neon.tech → projet `nannypay` |

### Commandes GitHub / Vercel utiles
```bash
# Voir les PRs ouvertes
gh pr list

# Créer une PR
gh pr create --title "feat: ..." --body "..."

# Merger en squash
gh pr merge <n> --squash

# Voir les déploiements Vercel
vercel ls

# Voir les logs d'un déploiement
vercel logs <deployment-url>
```

---

## Fichiers de Contexte — Lire en Priorité

1. **[Context_20260720.md](./Context_20260720.md)** — Cerveau externe du projet  
   Stack, architecture, règles métier Pajemploi, principes UX, points de vigilance récurrents.

2. **[Progress.md](./Progress.md)** — Suivi des travaux  
   Ce qui est livré, ce qui est en cours, les bugs connus, le backlog priorisé, les décisions techniques.

> Lire ces deux fichiers avant toute intervention sur le code.

---

## Résumé Express

- **App** : wizard création garde partagée (3 étapes) + vue mensuelle calendrier + settings
- **Calcul** : `lib/calcul.ts` — formules Pajemploi, 92 tests Vitest
- **Auth** : Clerk v5 (⚠️ pas v7 — incompatible Next 14)
- **DB** : PostgreSQL Neon via Prisma 6
- **CI** : Vercel bloque sur ESLint — toujours vérifier avec `npx next lint` avant commit

## Branch Active
```bash
git branch        # vérifier la branch courante
git log --oneline -5   # voir les derniers commits
```
⚠️ Plusieurs sessions Claude Code tournent souvent en parallèle sur ce repo. Ne jamais coder directement sur `main` ni continuer sur une branche dont le sujet ne correspond pas à la demande — créer une branche dédiée dès le début de session (voir Règles de Travail, point 6).

Consulter [Progress.md](./Progress.md) pour l'état exact des branches en cours.

---

## Règles de Travail

1. **Lire Context_20260720.md + Progress.md avant de coder**
2. **Gate CI** : `npx next lint` (pas `tsc --noEmit` — échoue en local, types Clerk absents)
3. **Tests** : `npx vitest run` avant tout commit touchant `lib/calcul.ts`
4. **Dead code** : quand on supprime du JSX, nettoyer en même temps les imports / états / fonctions / props — sinon ESLint bloque Vercel
5. **Commits** : `feat:` / `fix:` + `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
6. **Branche dédiée par session** : en tout début de session, avant le premier edit de fichier, vérifier `git branch`. Si on est sur `main` (ou sur une branche dont le sujet ne correspond visiblement pas à la demande en cours), créer et checkout immédiatement une nouvelle branche `type/sujet-court` (ex: `fix/export-donnees-rgpd`, `feat/mentions-legales`) — sans attendre confirmation, sauf si le sujet est encore ambigu (voir règle 7). Si la branche courante correspond déjà au sujet demandé (reprise d'une session précédente), la réutiliser telle quelle. But : plusieurs sessions Claude Code tournent en parallèle sur ce repo — une branche par sujet évite que leurs changements se mélangent au moment de pousser en preview/production. PR squash vers `main` en fin de feature.
7. **Questions d'abord** : avant tout coding, poser les questions jusqu'à 100% de confiance
8. **Demander avant de pousser** : toujours demander confirmation explicite avant tout `git push` déclenchant un déploiement preview Vercel, et avant toute création/merge de PR vers `main` (production) — jamais de merge automatique sans validation humaine
