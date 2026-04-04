# NOUNOULINK — Contexte projet pour Claude Code (Frontend)

> Lis ce fichier EN ENTIER avant de toucher quoi que ce soit.

---

## 1. Vue d'ensemble

Frontend de **nounoulink** (nannypay) — HTML/CSS/JS pur, sans framework.

**URLs production** :
- Frontend : `https://pajemploi-facile.org` (Netlify)
- Backend : `https://nannypay-back-production.up.railway.app`

---

## 2. Stack & fichiers clés

- HTML/CSS/JS pur (pas de React, pas de Vue, pas de bundler)
- `js/api.js` — client API centralisé, **toujours utiliser ses méthodes** plutôt que fetch direct
- `css/style.css` — variables CSS globales : `--sage`, `--blue`, `--ink`, `--dust`, `--line`, `--paper`, `--red`, `--warn`

### Pages
| Fichier | Rôle |
|---|---|
| `index.html` | Login / Register |
| `dashboard.html` | Liste des gardes |
| `garde.html` | Détail d'une garde + modal modification |
| `mois.html` | Calcul mensuel |
| `public.html` | Vue publique nounou (sans auth) |
| `onboarding-1.html` à `onboarding-5.html` | Création d'une garde |
| `recap.html` | Récapitulatif |

---

## 3. Conventions critiques

- **Toujours** utiliser les méthodes de `js/api.js` — jamais de fetch vers `localhost:3000`
- `API_BASE` est exporté depuis `js/api.js` pour les rares fetch directs exceptionnels
- **Ne jamais** utiliser `toISOString()` pour afficher des dates → bug timezone UTC+1/+2, utiliser `getFullYear/getMonth/getDate`
- **Ne jamais** déclarer deux fois la même variable `const` dans le même scope
- **Éviter** les backticks imbriqués dans les template literals → utiliser la concaténation `+`

---

## 4. Architecture données (côté frontend)

Les objets reçus de l'API ont cette forme :

```javascript
// GET /gardes/:id
{
  id, nom, date_debut, statut, mode_calcul,  // champs garde (spreadés)
  familles: [{ id, label, nom_affiche, email_contact, statut_acces }],
  nounou:   { id, prenom, nom, email },
  enfants:  [{ id, prenom, famille_id, fam }],
  modele:   { taux_horaire_net, h_normales_semaine, repartition_appliquee_a, jours },
  hasValidatedMois: boolean
}
```

**Champs à ne pas confondre** :
- Familles : `nom_affiche` (pas `nom`), `email_contact` (pas `email`)
- Plages horaires : `heure_debut` / `heure_fin` (pas `debut` / `fin`)

---

## 5. Avant tout commit

```bash
# Extraire le script du HTML et vérifier la syntaxe :
node --check script_extrait.mjs
```

---

## 6. Bugs connus / à ne pas recasser

- **Timezone** : ne jamais `toISOString()` pour afficher → décalage +1 jour
- **IDs dupliqués** : `garde.html` a deux éléments avec `id="edit-enfants-list"` — ne pas en rajouter d'autres
- **Backticks imbriqués** : générer du HTML en concaténation `+` dans les map(), pas en template literal imbriqué

---

## 7. Chemin critique MVP

### P0
1. Page `/rejoindre.html` — Famille B rejoint via token d'invitation
2. Onboarding simplifié Famille B

### P1
3. Validation à 3 (nounou via lien public)
4. Déduction CP automatique depuis événements

### P2
5. Emails de notification
6. Fusion garde.html + mois.html (V2)

---

*Dernière mise à jour : 04 avril 2026 — session Claude Code*
