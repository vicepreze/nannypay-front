# PROGRESS.md — nounoulink · Suivi des Travaux

> Dernière mise à jour : 14 juin 2026  
> Branch active : `calendar-color` (preview Vercel)  
> Branch principale : `main`

---

## Légende
- ✅ Livré en production (main)
- 🟡 Terminé, en attente de merge (branch dédiée)
- 🔴 Bug connu, non corrigé
- 🔜 Planifié, non commencé
- 🔍 À investiguer

---

## Historique des Livraisons

### ✅ #7–8 — Blog SEO + Premier article
Création structure blog + article "calculer le salaire d'une nounou en garde partagée".

### ✅ #9 — Fix UX Blog
Cards cliquables, layout article, lien Blog mobile.

### ✅ #10 — Fix entretien + répartition indemnités
- Suppression du bug `× qp` sur le calcul des frais d'entretien
- Ajout `repartitionIndemA` : répartition des indemnités **indépendante** du ratio salarial

### ✅ #11–14 — Migration NextAuth → Clerk v5
- Google OAuth via Clerk v5 (⚠️ pas v7, incompatible Next 14)
- Middleware `auth().protect()`
- Webhook `/api/webhooks/clerk` pour sync User en DB
- `ClerkProvider` gracieux si `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` absent au build

### ✅ #16 — Simplification wizard acteurs
Page acteurs réduite aux **compteurs d'enfants** uniquement (plus de saisie de noms).  
SessionStorage `ng_acteurs` : `{ nbEnfantsA, nbEnfantsB, enfants[{prenom, fam}] }`.

### ✅ #17 — Context.md
Ajout du cerveau externe `Context_20260516.md` (renommé `Context_20260614.md` le 14 juin 2026).

### ✅ #18 — Fix validation garde (erreur 400)
Suppression de la validation stricte `nounouPrenom`/`famANom` dans `POST /api/gardes`.  
Fallbacks : `'Notre nounou'`, `'Famille A'`.

### ✅ Refonte UX paie (`feat/d27f4c5`)
Hiérarchie visuelle et lisibilité de la page `nouvelle-garde/paie` — répartition RAC.  
Suppression prop `totalRac` de `FamPreview` (inutilisée).

---

## En Cours

### 🟡 `calendar-color` — Vue mensuelle + grammaire couleur
**Commits** : `dc5971b`, `9539af9`, `1037e80`  
**Preview Vercel** : déployée ✅ (build passé après 2 rounds de fix ESLint)

**Ce qui a changé :**
- `app/gardes/[id]/mois/[annee]/[mois]/page.tsx` : sidebar gauche supprimée entièrement (invitation, partage, archivage, validation). Layout 2 colonnes `[1fr 280px]`.
- `components/CalendrierMoisView.tsx` : 
  - Grammaire couleur complète (`DayType`: worked / cp / sick / holiday / off)
  - Détection automatique des jours fériés français (algo Pâques grégorien + 11 fériés)
  - Tags dans chaque cellule
  - Affichage heures/jour sur les jours travaillés (`heuresParJour`, badge `+` si heures sup)
  - Props supprimées : `jaValide`, `saving`, `monLabel`, `onValider`, `racOptionActive`
  - Props ajoutées : `heuresParJour?: number | null`, `hasOvertime?: boolean`
  - Bannière stats (Résumé), carte Validation, lignes RAC — **supprimées**

**À faire avant merge :**
- [ ] Créer la PR `calendar-color` → `main`

---

## Bugs Connus

### 🔴 `DATABASE_URL` "Needs Attention" dans Vercel
La connexion Neon est marquée en alerte dans le dashboard Vercel.  
**Impact** : potentiellement bloquant en production.  
**Action** : vérifier le statut Neon + tester une requête Prisma en prod.

---

## Backlog Priorisé

### 🔜 P1 — Onglet "Personnaliser" dans Settings
**Fichier** : `app/gardes/[id]/settings/`  
Ajouter un 4ème onglet pour permettre à l'utilisateur de saisir :
- Prénom de la nounou
- Nom affiché Famille A + Famille B
- Prénoms des enfants (remplace Simone / Giselle / Suzanne)

Débloque la suppression des prénoms par défaut "en dur" dans le wizard.

### 🔜 P2 — Mode Expert RAC (UI)
**Plan détaillé** : `~/.claude/plans/generic-beaming-corbato.md`  
**Fichiers concernés** : `lib/calcul.ts`, `SettingsClient.tsx`, `app/nouvelle-garde/paie/page.tsx`

Fonctionnement cible :
- Bouton "⚙️ Ajuster mes aides manuellement" sous les résultats Mode Magique
- Pré-remplissage depuis les estimations magiques
- Réactivité temps réel + bouton Reset

### 🔍 P3 — Vercel Analytics post-migration Clerk
Vérifier que les events Analytics sont bien trackés depuis la migration NextAuth → Clerk.

---

## Décisions Techniques Clés

| Date | Décision | Raison |
|------|----------|--------|
| Mai 2026 | Clerk v5 (pas v7) | Next.js 14 incompatible avec l'API v7 (`await auth.protect()`) |
| Mai 2026 | `repartitionIndemA` indépendante de `repartitionA` | Les indemnités ne suivent pas le ratio salarial — bug corrigé |
| Mai 2026 | Wizard acteurs = compteurs uniquement | Progressive disclosure : les noms viennent dans Settings/Personnaliser |
| Juin 2026 | `npx next lint` comme seul gate CI | `tsc --noEmit` échoue en local (types Clerk absents) ; c'est ESLint qui bloque Vercel |
| Juin 2026 | Sidebar supprimée de la vue mois | Simplification UX — fonctions invitation/partage/archivage retirées |

---

## QA & CI

- **ESLint** : `npx next lint` — bloquant sur Vercel (`next build` inclut ESLint)
- **Tests** : `npx vitest run` — 92 tests Vitest sur `lib/calcul.ts`
- **TypeScript** : `tsc --noEmit` échoue en local (types `@clerk/nextjs`, `svix` absents) — ne pas utiliser comme gate
- **Hook pre-commit** : `.claude/settings.json` (gitignored) — lance `npx next lint` automatiquement avant chaque `git commit` Claude Code. Requiert `jq` (`brew install jq`).
