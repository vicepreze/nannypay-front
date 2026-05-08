# Contexte projet NannyPay — document de référence Claude

## Vue d'ensemble

**NannyPay** est une application web de gestion de paie pour **garde partagée** (une nounou employée par deux familles simultanément). Elle calcule les salaires, charges, aides CAF (CMG) et reste à charge pour chaque famille.

- **Repo front** : `vicepreze/nannypay-front`
- **Repo back** : `vicepreze/nannypay-back`
- **Branche de travail** : `claude/fix-family-name-modal-cRs8R`
- **Stack** : Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma/PostgreSQL, NextAuth
- **Tests** : Vitest (`lib/calcul.test.ts`) — lancer avec `npx vitest run`
- **Déploiement** : Vercel (preview par branche)

---

## Architecture des pages

```
app/
├── dashboard/                          # Liste des gardes de l'utilisateur
├── nouvelle-garde/                     # Wizard création en 3 étapes
│   ├── acteurs/page.tsx                # Étape 1 : familles + enfants
│   ├── planning/page.tsx               # Étape 2 : horaires hebdo par enfant
│   └── paie/page.tsx                   # Étape 3 : taux, répartition, RAC
├── gardes/[id]/
│   ├── page.tsx                        # Tableau de bord d'une garde
│   ├── settings/SettingsClient.tsx     # Paramètres (répartition, RAC, taux…)
│   └── mois/[annee]/[mois]/page.tsx    # Fiche de paie mensuelle
└── public/                             # Pages sans auth (invitation nounou, fiche publique)
```

---

## SessionStorage — wizard nouvelle-garde

Les 3 étapes communiquent via sessionStorage. Clés :

| Clé | Contenu | Défini par |
|-----|---------|-----------|
| `ng_acteurs` | `{ famANom, famBNom, enfants: [{prenom, fam}] }` | `acteurs/page.tsx` |
| `ng_planning` | `{ planning: PerChildPlanning, hNormalesSemaine, hSup25Semaine, hSup50Semaine }` | `planning/page.tsx` |
| `ng_paie` | `{ repartitionA, racOptionActive, taux, navigo, indemKm, indemEntretien }` | `paie/page.tsx` |

**Format `PerChildPlanning`** : `{ [prenom]: { [jourNum "1"–"5"]: { actif, debut, fin } } }`

> ⚠️ Les prénoms peuvent être des chiffres ("1", "2", "3") si l'utilisateur les saisit ainsi — les fonctions de calcul doivent gérer ce cas.

---

## Moteur de calcul — `lib/calcul.ts`

### Constantes de charges

```typescript
K_SAL   = 0.2188 / 0.7812  // ≈ 0.2801 — charges salariales / salaire net
K_PAT   = 0.4470 / 0.7812  // ≈ 0.5722 — charges patronales / salaire net
K_TOTAL = 1 + K_SAL + K_PAT // ≈ 1.8523 — coût employeur / salaire net
```

Formule : `brut = net / 0.7812` ; `coût employeur = net × K_TOTAL`

### Fonctions exportées

#### `calcHeuresSemaineFromPlanning(joursJson: string)`
Calcule `{ hNormalesSemaine, hSup25Semaine, hSup50Semaine, joursActifsParSemaine }` depuis le JSON du planning.

- **Format per-child** (wizard) : `{ prenom: { "1"–"5": { actif, debut, fin } } }` → fait l'**union** des créneaux par jour (la nounou est là si *au moins un* enfant est là)
- **Format per-day** (legacy) : `{ "1"–"5": { actif, hDebut, hFin } }` → lecture directe
- **Détection** : si `firstValue` de l'objet n'a **pas** de propriété `actif` en surface → per-child. Ne pas se fier aux noms des clés (peuvent être "1","2","3" pour les deux formats).
- Plafond légal : 50h/semaine. Heures sup : 40–48h = +25%, >48h = +50%.

#### `calcBModeRepartition(joursJson, enfants)`
Retourne `repartitionA` (0–1) proportionnelle aux heures totales de la famille A vs total.
- Per-child : somme les minutes par enfant, lookup `enfants.find(e => e.prenom === childName)`
- Fallback si heures = 0 ou format non per-child : `nbA / nbTotal`

#### `estimerCMG2025(revenusFiscaux, nbEnfants, salNet, chargesPatronales)`
Estime l'aide CMG CAF 2025. Trois tranches selon revenus fiscaux :
- Tranche 1 (≤ 31 000 €) : 85% coût employeur, plafond 1 075 € (1 enf) / 1 132 € (2+)  
- Tranche 2 (31–57 k€) : 70% coût employeur, mêmes plafonds
- Tranche 3 (> 57 000 €) : 570 € (1 enf) / 855 € (2+ enf) plafond fixe

#### `ciPlafondMensuel(nbEnfants)`
Plafond mensuel du crédit d'impôt :
- 1 enfant → 6 750 € / 12 = **562,50 €/mois**
- 2+ enfants → 7 500 € / 12 = **625 €/mois**

#### `calcEquitableRatioIteratif(salNetTotal, configA, configB, pProportionnel)`
Moteur itératif : scanne 981 ratios (0.010 à 0.990, pas 0.001), calcule pour chacun CMG + CI de chaque famille, retourne le ratio qui minimise `|racA/racTotal − pProportionnel|`.

Retourne `EquitableRACResult` :
```typescript
{ meilleurRatio, racA, racB, totalRac, cmgA, cmgB, ciAMens, ciBMens }
```

La CI est plafonnée : `ciA = Math.min(eligA × 0.5, ciPlafondMensuel(nbEnfantsA))`

#### `calculerMois(input: CalcInput)`
Calcul complet d'un mois : jours ouvrables, absences, salaires, charges, aides, reste à charge pour famA et famB.

---

## UI — composants clés

### `app/nouvelle-garde/paie/page.tsx`
Page étape 3 du wizard. Points importants :

- `joursJson` : state chargé depuis `ng_planning.planning` dans useEffect
- `planningHours` : **useMemo** de `calcHeuresSemaineFromPlanning(joursJson)` — réactif, ne pas utiliser de states séparés `hNorm/hSup25/hSup50`
- `salNetTotalMens` : useMemo dérivé de `planningHours` × `taux`
- `repartA` : initialisé via `calcBModeRepartition(joursStr, enf)` dans useEffect (jamais en dur à 0.5)
- `pProportionnel` : useMemo de `calcBModeRepartition(joursJson, enfants)` — affiché dans le bouton "↩ Revenir au calcul automatique"
- **Mode Magique** : toggle RAC ON → `calcEquitableRatioIteratif` → `setRepartA(res.meilleurRatio)`
- **Mode Expert** : inputs `revFiscauxA/B` (défaut 80 000 €) visibles seulement si `modeExpert = true`
- Slider : `min=20`, `max=80` (%), value = `repartA × 100`

### `app/gardes/[id]/settings/SettingsClient.tsx`
Même logique Mode Magique que la page paie, mais pour une garde existante. Reçoit les props `enfants`, `famA`, `famB` depuis le serveur.

- `nbEnfantsA/B` : dérivés de `enfants` prop via useMemo
- `racOptimal` : useMemo de `calcEquitableRatioIteratif(...)`, null si RAC off
- `handleRacToggle` : on → calcule optimal, auto-set `repartA = res.meilleurRatio`, reset modeExpert + revFiscaux à 80k
- `liveRac` : useMemo qui recompute RAC live au ratio courant (pour affichage temps réel pendant drag du slider)

### `FamPreview` (sous-composant dans les deux pages ci-dessus)
Affiche pour chaque famille :
- Salaire net à verser + % de répartition
- Reste à charge + % du total RAC (visible seulement si `racOption = true`)

---

## Patterns à connaître

### Détection format planning (CRITIQUE)
```typescript
const keys = Object.keys(planning);
const firstValue = keys.length > 0 ? planning[keys[0]] : null;
// per-child si firstValue est un objet SANS propriété 'actif' en surface
const isPerChild = firstValue !== null 
  && typeof firstValue === 'object' 
  && !('actif' in (firstValue as object));
```
Ne pas utiliser `keys.every(k => ['1','2','3','4','5'].includes(k))` — cassé quand prénoms = "1","2","3".

### Mensualisation
```
heures mensuelles = hSemaine × 52 / 12
salaire net mensuel = hNorm × 52/12 × taux + hSup25 × 52/12 × taux × 1.25 + hSup50 × 52/12 × taux × 1.50
```

### Coût employeur mensuel
```
coûtEmployeur = salNet × K_TOTAL  (≈ salNet × 1.8523)
```

---

## Tests (89 tests — `lib/calcul.test.ts`)

Exécuter : `npx vitest run`

Blocs de tests :
- `constants` : K_SAL, K_PAT, K_TOTAL
- `calcBModeRepartition` : per-child, fallback count, cas limites
- `calcEquitableRatioA` : sans aides, clamp, asymétries
- `calcHeuresSemaineFromPlanning` : per-day, per-child texte, per-child numérique, plafond 50h
- `calculerMois` : jours ouvrables, absences, CP, charges, RAC
- `Scénario 1` : 50/50, avr. 2029, 21j
- `Scénario 2` : 60/40, jan. 2025, 23j
- `Scénario 3` : RAC 3 enfants, 47,5h @ 12,80 €, rev. 80k/80k — valeurs pinned
- `estimerCMG2025` : tranches 1/2/3, frontières
- `ciPlafondMensuel` : 1 et 2+ enfants
- `calcEquitableRatioIteratif` : scénario 3 enfants, valeurs exactes pinned

---

## Valeurs de référence (Scénario 3 — pinned)

Planning : 3 enfants (2A + 1B), 47,5h/sem, taux 12,80 €, revenus 80 000 €/an chacun

| Grandeur | Valeur |
|----------|--------|
| `salNetTotalMens` | 2 738,67 € |
| `pProportionnel` | 0.6667 (2/3) |
| `meilleurRatio` | 0.615 |
| `cmgA` (2 enf, tr.3) | 855 € |
| `cmgB` (1 enf, tr.3) | 570 € |
| `ciAMens` | 625 € (plafond 2+ enf) |
| `ciBMens` | 562,50 € (plafond 1 enf) |
| `racA` | 1 639,76 € |
| `racB` | 820,52 € |

---

## Points d'attention / pièges connus

1. **SessionStorage stale** : en test Vercel, créer un nouveau compte pour avoir un sessionStorage vierge. Les anciens `ng_paie`/`ng_planning` avec valeurs zéro masquent les corrections.

2. **Prénoms numériques** : le format per-child avec prénoms "1","2","3" a exactement les mêmes clés qu'un planning per-day. La détection doit examiner les *valeurs*, pas les clés.

3. **useMemo vs state pour les heures** : dans `paie/page.tsx`, NE PAS utiliser `useState` pour `hNorm/hSup25/hSup50` — utiliser `planningHours = useMemo(() => calcHeuresSemaineFromPlanning(joursJson), [joursJson])` qui est réactif.

4. **ESLint Vercel** : toujours vérifier qu'aucun import/variable/composant n'est déclaré mais non utilisé avant de pusher (`no-unused-vars` bloque le build).

5. **Hydration** : les pages du wizard ont `const [hydrated, setHydrated] = useState(false)` — elles retournent `null` jusqu'à ce que useEffect ait chargé sessionStorage. Ne jamais initialiser les states qui dépendent de sessionStorage avec leurs valeurs finales.
