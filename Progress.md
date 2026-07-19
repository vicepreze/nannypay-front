# PROGRESS.md — nounoulink · Suivi des Travaux

> Dernière mise à jour : 26 juin 2026  
> Branch active : `main`

---

## Légende
- ✅ Livré en production (main)
- 🟡 Terminé, en attente de merge (branch dédiée)
- 🔴 Bug connu, non corrigé
- 🔜 Planifié, non commencé
- 🔍 À investiguer

---

## Historique des Livraisons

### ✅ PR #19 — Vue mensuelle : grammaire couleur, Prévu→Réel, absences famille
**Mergé** : `98ac3f6` (squash, 26 juin 2026) — branch `calendar-color` → `main`

- **Grammaire couleur calendrier** : cellules colorées par `DayType` (worked/cp/sick/holiday/off), détection auto des jours fériés français (algo Pâques grégorien), tags par cellule, heures/jour affichées sur les jours travaillés
- **Vue mensuelle refactorisée** : sidebar gauche supprimée (invitation/partage/archivage/validation), layout 2 colonnes `[1fr 280px]`
- **Absences famille A/B** (`absence_famille_a`/`absence_famille_b`) : nouveaux types d'événements, aucun impact financier, **cumulables avec n'importe quel autre événement** (maladie/CP restent mutuellement exclusifs entre eux). Tags affichés sur tous les types de jour, pas seulement `worked`.
- **Bloc "Prévu → Réel"** dans la sidebar : comparaison salaire net + indemnités entretien (théorique vs réel) par famille, n'apparaît que s'il y a un écart réel. Waterfall des événements du mois avec chips d'impact (`salaire −X €`, `entretien −X €`, `→ IJSS sécu`, `🔒 intact`). Remplace l'ancien bouton "Voir le calcul détaillé"/`DetailedCalcTable`.
- **Notes maladie CCN IDCC 3239** : vue familles (démarche Cerfa S3201 si arrêt ≥ 4 jours ouvrés consécutifs, sinon note légère) + vue nounou (démarche CPAM/IRCEM), non dismissables
- **Fix** : `repartitionIndemA` était silencieusement ignoré dans l'appel à `calculerMois` (page privée) — corrigé
- Helpers exportés : `frenchHolidays` (depuis `CalendrierMoisView`), `joursOuvrablesIntersect` (depuis `lib/calcul`)

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
Ajout du cerveau externe `Context_20260516.md` (renommé `Context_20260614.md` le 14 juin 2026, puis `Context_20260720.md` le 20 juillet 2026).

### ✅ #18 — Fix validation garde (erreur 400)
Suppression de la validation stricte `nounouPrenom`/`famANom` dans `POST /api/gardes`.  
Fallbacks : `'Notre nounou'`, `'Famille A'`.

### ✅ Refonte UX paie (`feat/d27f4c5`)
Hiérarchie visuelle et lisibilité de la page `nouvelle-garde/paie` — répartition RAC.  
Suppression prop `totalRac` de `FamPreview` (inutilisée).

---

## En Cours

_Rien en cours — dernier lot livré ci-dessous._

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
