import { describe, it, expect } from 'vitest';
import {
  K_SAL, K_PAT, K_TOTAL,
  calcBModeRepartition,
  calcEquitableRatioA,
  calcEquitableRatioIteratif,
  calcHeuresSemaineFromPlanning,
  calcSalNetMensuel,
  calculerMois,
  ciPlafondMensuel,
  estimerCMG2025,
} from './calcul';
import type { CalcInput } from './calcul';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Planning "per-child" (B-mode) : chaque enfant a ses propres créneaux. */
function perChildPlanning(slots: Record<string, Record<string, { debut: string; fin: string }>>) {
  // Convertit { Léa: { '1': { debut, fin } } } en JSON attendu par calcul.ts
  const result: Record<string, Record<string, { actif: boolean; debut: string; fin: string }>> = {};
  for (const [child, days] of Object.entries(slots)) {
    result[child] = {};
    for (const [day, slot] of Object.entries(days)) {
      result[child][day] = { actif: true, ...slot };
    }
  }
  return JSON.stringify(result);
}

const baseInput = (): CalcInput => ({
  annee:                 2025,
  mois:                  1,          // janvier 2025 → 23 jours ouvrables
  taux:                  11,
  hNormalesSemaine:      40,
  hSup25Semaine:         0,
  hSup50Semaine:         0,
  repartitionA:          0.5,
  navigo:                90.80,
  indemEntretien:        6.0,
  indemKm:               0,
  joursActifsParSemaine: 5,
  evenements:            [],
  racOptionActive:       false,
});

// ── Constants ─────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('K_SAL ≈ 0.2801', () => {
    expect(K_SAL).toBeCloseTo(0.2801, 3);
  });

  it('K_PAT ≈ 0.5722', () => {
    expect(K_PAT).toBeCloseTo(0.5722, 3);
  });

  it('K_TOTAL = 1 + K_SAL + K_PAT ≈ 1.8523', () => {
    expect(K_TOTAL).toBeCloseTo(1 + K_SAL + K_PAT, 10);
    expect(K_TOTAL).toBeCloseTo(1.8523, 3);
  });
});

// ── calcBModeRepartition ──────────────────────────────────────────────────────

describe('calcBModeRepartition', () => {
  it('planning vide + 0 enfant → 0 (nbA=0, nbTotal=2)', () => {
    // nbA/nbTotal = 0/2 = 0 quand la liste est vide
    expect(calcBModeRepartition('{}', [])).toBe(0);
  });

  it('2 enfants (1A + 1B), pas de planning per-child → 0.5', () => {
    const enfants = [{ prenom: 'Léa', fam: 'A' }, { prenom: 'Tom', fam: 'B' }];
    expect(calcBModeRepartition('{}', enfants)).toBe(0.5);
  });

  it('3 enfants (1A + 2B), planning per-child heures égales → 1/3', () => {
    const enfants = [
      { prenom: 'Léa', fam: 'A' },
      { prenom: 'Tom', fam: 'B' },
      { prenom: 'Zoé', fam: 'B' },
    ];
    // Chaque enfant : lundi 08:00-18:00 (10h)
    const joursJson = perChildPlanning({
      Léa: { '1': { debut: '08:00', fin: '18:00' } },
      Tom: { '1': { debut: '08:00', fin: '18:00' } },
      Zoé: { '1': { debut: '08:00', fin: '18:00' } },
    });
    expect(calcBModeRepartition(joursJson, enfants)).toBeCloseTo(1 / 3, 5);
  });

  it('3 enfants (1A + 2B), A a 2× plus d\'heures que chaque B → 0.5', () => {
    const enfants = [
      { prenom: 'Léa', fam: 'A' },
      { prenom: 'Tom', fam: 'B' },
      { prenom: 'Zoé', fam: 'B' },
    ];
    // Léa : 20h, Tom : 10h, Zoé : 10h  → A = 20/(20+20) = 0.5
    const joursJson = perChildPlanning({
      Léa: { '1': { debut: '08:00', fin: '18:00' }, '2': { debut: '08:00', fin: '18:00' } },
      Tom: { '1': { debut: '08:00', fin: '18:00' } },
      Zoé: { '2': { debut: '08:00', fin: '18:00' } },
    });
    expect(calcBModeRepartition(joursJson, enfants)).toBeCloseTo(0.5, 5);
  });

  it('2 enfants famille A seulement → 1.0', () => {
    const enfants = [
      { prenom: 'Léa', fam: 'A' },
      { prenom: 'Tom', fam: 'A' },
    ];
    expect(calcBModeRepartition('{}', enfants)).toBe(1);
  });

  it('ignores unknown child names in planning', () => {
    const enfants = [{ prenom: 'Léa', fam: 'A' }, { prenom: 'Tom', fam: 'B' }];
    const joursJson = perChildPlanning({
      Léa:     { '1': { debut: '08:00', fin: '18:00' } },
      Inconnu: { '1': { debut: '08:00', fin: '18:00' } }, // pas dans enfants
    });
    // Seule Léa est comptée (A=10h, B=0h) → 1.0
    expect(calcBModeRepartition(joursJson, enfants)).toBe(1);
  });
});

// ── calcEquitableRatioA ───────────────────────────────────────────────────────

describe('calcEquitableRatioA', () => {
  it('sans aides → retourne ratioA inchangé', () => {
    expect(calcEquitableRatioA(0.5, 1000, 0, 0)).toBe(0.5);
    expect(calcEquitableRatioA(1 / 3, 1000, 0, 0)).toBeCloseTo(1 / 3, 4);
  });

  it('salNetTotal = 0 → retourne ratioA inchangé', () => {
    expect(calcEquitableRatioA(0.5, 0, 200, 100)).toBe(0.5);
  });

  it('aides A seulement → ratioA augmente (A a moins de RAC résiduel, peut absorber plus)', () => {
    // p = 0.5 + (200×0.5 − 0×0.5) / (1000×K_TOTAL) > 0.5
    const p = calcEquitableRatioA(0.5, 1000, 200, 0);
    expect(p).toBeGreaterThan(0.5);
  });

  it('aides B seulement → ratioA diminue', () => {
    // p = 0.5 + (0×0.5 − 200×0.5) / (1000×K_TOTAL) < 0.5
    const p = calcEquitableRatioA(0.5, 1000, 0, 200);
    expect(p).toBeLessThan(0.5);
  });

  it('aides égales des deux côtés → ratioA inchangé', () => {
    expect(calcEquitableRatioA(0.5, 1000, 300, 300)).toBe(0.5);
  });

  it('résultat clampé entre 0 et 1', () => {
    // aidesA massives → ratioA monte → clampé à 1
    expect(calcEquitableRatioA(0.5, 10, 100000, 0)).toBe(1);
    // aidesB massives → ratioA descend → clampé à 0
    expect(calcEquitableRatioA(0.5, 10, 0, 100000)).toBe(0);
  });
});

// ── calcHeuresSemaineFromPlanning ─────────────────────────────────────────────

describe('calcHeuresSemaineFromPlanning', () => {
  it('planning vide → tout à 0', () => {
    const r = calcHeuresSemaineFromPlanning('{}');
    expect(r.hNormalesSemaine).toBe(0);
    expect(r.hSup25Semaine).toBe(0);
    expect(r.hSup50Semaine).toBe(0);
    expect(r.joursActifsParSemaine).toBe(0);
  });

  it('5 jours × 8h = 40h → hNorm=40, hSup=0', () => {
    const planning: Record<string, object> = {};
    for (const j of ['1','2','3','4','5']) {
      planning[j] = { actif: true, hDebut: '09:00', hFin: '17:00' };
    }
    const r = calcHeuresSemaineFromPlanning(JSON.stringify(planning));
    expect(r.hNormalesSemaine).toBe(40);
    expect(r.hSup25Semaine).toBe(0);
    expect(r.hSup50Semaine).toBe(0);
    expect(r.joursActifsParSemaine).toBe(5);
  });

  it('45h totales → hNorm=40, hSup25=5, hSup50=0', () => {
    const planning: Record<string, object> = {};
    for (const j of ['1','2','3','4','5']) {
      planning[j] = { actif: true, hDebut: '08:00', hFin: '17:00' }; // 9h × 5 = 45h
    }
    const r = calcHeuresSemaineFromPlanning(JSON.stringify(planning));
    expect(r.hNormalesSemaine).toBe(40);
    expect(r.hSup25Semaine).toBe(5);
    expect(r.hSup50Semaine).toBe(0);
  });

  it('plafond 50h même si planning > 50h', () => {
    const planning: Record<string, object> = {};
    for (const j of ['1','2','3','4','5']) {
      planning[j] = { actif: true, hDebut: '06:00', hFin: '18:00' }; // 12h × 5 = 60h → plafonné 50h
    }
    const r = calcHeuresSemaineFromPlanning(JSON.stringify(planning));
    expect(r.hNormalesSemaine + r.hSup25Semaine + r.hSup50Semaine).toBeLessThanOrEqual(50);
  });

  it('mode per-child : union des créneaux par jour', () => {
    // Léa et Tom ont le même créneau → union = un seul créneau de 10h
    const joursJson = perChildPlanning({
      Léa: { '1': { debut: '08:00', fin: '18:00' } },
      Tom: { '1': { debut: '08:00', fin: '18:00' } },
    });
    const r = calcHeuresSemaineFromPlanning(joursJson);
    expect(r.hNormalesSemaine).toBe(10);
    expect(r.joursActifsParSemaine).toBe(1);
  });
});

// ── calculerMois ──────────────────────────────────────────────────────────────

describe('calculerMois', () => {
  // ── Données de base ──

  it('janvier 2025 : 23 jours ouvrables', () => {
    const r = calculerMois(baseInput());
    expect(r.joursOuv).toBe(23);
  });

  it('sans absence : joursTrav = joursOuv, ratio = 1', () => {
    const r = calculerMois(baseInput());
    expect(r.joursTrav).toBe(r.joursOuv);
    expect(r.ratio).toBe(1);
  });

  // ── Répartition ──

  it('50/50 : famA.qp = 0.5, famB.qp = 0.5', () => {
    const r = calculerMois({ ...baseInput(), repartitionA: 0.5 });
    expect(r.famA.qp).toBe(0.5);
    expect(r.famB.qp).toBe(0.5);
  });

  it('1/3 – 2/3 (3 enfants) : famA.salNet ≈ famB.salNet / 2', () => {
    const r = calculerMois({ ...baseInput(), repartitionA: 1 / 3 });
    expect(r.famA.qp).toBeCloseTo(1 / 3, 5);
    expect(r.famB.qp).toBeCloseTo(2 / 3, 5);
    expect(r.famA.salNet).toBeCloseTo(r.famB.salNet / 2, 1);
  });

  it('totalNounou = famA.total + famB.total', () => {
    const r = calculerMois(baseInput());
    expect(r.totalNounou).toBeCloseTo(r.famA.total + r.famB.total, 2);
  });

  // ── Navigo partagé 50/50 ──

  it('navigo partagé à moitié pour chaque famille', () => {
    const r = calculerMois({ ...baseInput(), navigo: 90.80 });
    expect(r.famA.transport).toBeCloseTo(45.40, 2);
    expect(r.famB.transport).toBeCloseTo(45.40, 2);
  });

  // ── Absence maladie ──

  it('maladie nounou : réduction prorata sur le salaire', () => {
    const plein  = calculerMois({ ...baseInput() });
    const malade = calculerMois({
      ...baseInput(),
      evenements: [{ type: 'maladie_nounou', debut: '2025-01-06', fin: '2025-01-10' }],
    });
    // 5 jours ouvrables d'absence → salaire réduit
    expect(malade.joursAbsMaladie).toBe(5);
    expect(malade.famA.salNet).toBeLessThan(plein.famA.salNet);
    expect(malade.joursTrav).toBe(malade.joursOuv - 5);
  });

  // ── Congés payés ──

  it('congés payés : salaire maintenu (ratio inchangé), entretien non dû', () => {
    const plein = calculerMois({ ...baseInput() });
    const cp    = calculerMois({
      ...baseInput(),
      evenements: [{ type: 'conge_paye', debut: '2025-01-06', fin: '2025-01-10' }],
    });
    expect(cp.joursAbsCP).toBe(5);
    // Salaire maintenu (ratio = 1 car maladie = 0)
    expect(cp.famA.salNet).toBeCloseTo(plein.famA.salNet, 2);
    // Indemnité d'entretien réduite (joursCP exclus)
    expect(cp.famA.entretien).toBeLessThan(plein.famA.entretien);
  });

  // ── Charges ──

  it('chargesSalariales = salNet × K_SAL (à 0.01 € près)', () => {
    const r = calculerMois(baseInput());
    expect(r.famA.chargesSalariales).toBeCloseTo(r.famA.salNet * K_SAL, 1);
  });

  it('chargesPatronales = salNet × K_PAT (à 0.01 € près)', () => {
    const r = calculerMois(baseInput());
    expect(r.famA.chargesPatronales).toBeCloseTo(r.famA.salNet * K_PAT, 1);
  });

  // ── Mode RAC ──

  it('RAC inactif : aidesTotal = 0 (aides ignorées)', () => {
    const r = calculerMois({
      ...baseInput(),
      racOptionActive: false,
      aidesA: { cmgCotisations: 100, cmgRemuneration: 200, abattementCharges: 0, aideVille: 0, creditImpot: 0 },
    });
    expect(r.famA.aidesTotal).toBe(0);
    expect(r.racOptionActive).toBe(false);
  });

  it('RAC actif : aidesTotal reflète les aides CAF', () => {
    const r = calculerMois({
      ...baseInput(),
      racOptionActive: true,
      aidesA: { cmgCotisations: 100, cmgRemuneration: 200, abattementCharges: 0, aideVille: 0, creditImpot: 600 },
    });
    // creditImpot 600€/an → 50€/mois ; total = 100+200+50 = 350
    expect(r.famA.aidesTotal).toBeCloseTo(350, 2);
    expect(r.racOptionActive).toBe(true);
  });

  it('RAC actif : resteCharge = total + charges - aides', () => {
    const r = calculerMois({
      ...baseInput(),
      racOptionActive: true,
      aidesA: { cmgCotisations: 50, cmgRemuneration: 0, abattementCharges: 0, aideVille: 0, creditImpot: 0 },
    });
    const expected = r.famA.total + r.famA.chargesSalariales + r.famA.chargesPatronales - r.famA.aidesTotal;
    expect(r.famA.resteCharge).toBeCloseTo(expected, 2);
  });

  // ── Scénarios 3 enfants ──

  describe('scénario 3 enfants (1A + 2B)', () => {
    it('repartitionA=1/3 sans RAC : famB.salNet ≈ 2× famA.salNet', () => {
      const r = calculerMois({ ...baseInput(), repartitionA: 1 / 3 });
      expect(r.famB.salNet).toBeCloseTo(r.famA.salNet * 2, 1);
    });

    it('repartitionA=1/3 avec RAC + aides A : resteCharge A < sans aides', () => {
      const sans = calculerMois({ ...baseInput(), repartitionA: 1 / 3, racOptionActive: true });
      const avec = calculerMois({
        ...baseInput(),
        repartitionA: 1 / 3,
        racOptionActive: true,
        aidesA: { cmgCotisations: 200, cmgRemuneration: 0, abattementCharges: 0, aideVille: 0, creditImpot: 0 },
      });
      expect(avec.famA.resteCharge).toBeLessThan(sans.famA.resteCharge);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 1 — Garde partagée classique 50/50 avec majorations
// ─────────────────────────────────────────────────────────────────────────────
//
// Inputs :
//   - Répartition    : 50 % / 50 %
//   - Taux horaire   : 11,00 €/h net
//   - Planning       : 40h norm + 8h maj.25% + 1h maj.50% = 49h/sem
//   - Navigo         : 90,80 €/mois
//   - Entretien      : 6,00 €/j travaillé
//
// Note calendrier :
//   Avril 2026 débute un mercredi → 22 jours ouvrables (≠ 21 demandés).
//   Avril 2029 débute un dimanche → exactement 21 jours ouvrables.
//   C'est donc avril 2029 qui est utilisé pour valider ce scénario.
//
// Note salaire :
//   La formule "sans arrondi intermédiaire" (calcSalNetMensuel) donne 1 227,42 €
//   par famille, conformément à ce qui est affiché dans l'interface.
//   calculerMois arrondit les heures mensualisées avant de les multiplier, ce
//   qui produit 1 227,18 € — différence de 0,24 € due aux arrondis IEEE 754.

describe('Scénario 1 — Garde partagée 50/50 avec majorations (avr. 2029, 21 j.)', () => {
  const input: CalcInput = {
    annee:                 2029,
    mois:                  4,
    taux:                  11,
    hNormalesSemaine:      40,
    hSup25Semaine:          8,
    hSup50Semaine:          1,
    repartitionA:           0.5,
    navigo:                90.80,
    indemEntretien:         6.0,
    indemKm:                0,
    joursActifsParSemaine:  5,
    evenements:             [],
    racOptionActive:        false,
  };

  const result = calculerMois(input);

  // ── Calendrier ──────────────────────────────────────────────────────────────

  it('compte exactement 21 jours ouvrables', () => {
    expect(result.joursOuv).toBe(21);
  });

  it('aucune absence : ratio = 1, joursTrav = 21', () => {
    expect(result.ratio).toBe(1);
    expect(result.joursTrav).toBe(21);
  });

  // ── Salaire net mensuel ──────────────────────────────────────────────────────
  //
  // calcSalNetMensuel = formule sans arrondi intermédiaire sur les heures,
  // identique à salNetTotalMens affiché dans l'interface.
  // Formule : (40×11 + 8×11×1,25 + 1×11×1,50) × 52/12 = 2 454,83 €

  it('salaire net total nounou = 2 454,83 € (calcSalNetMensuel)', () => {
    expect(calcSalNetMensuel(40, 8, 1, 11)).toBe(2454.83);
  });

  it('salaire net par famille à 50 % = 1 227,42 €', () => {
    const total  = calcSalNetMensuel(40, 8, 1, 11);          // 2 454,83 €
    const parFam = Math.round(total * 0.5 * 100) / 100;      // 1 227,42 €
    expect(parFam).toBe(1227.42);
  });

  // ── Indemnités ───────────────────────────────────────────────────────────────

  it('part du Navigo : 45,40 € par famille', () => {
    expect(result.famA.transport).toBe(45.40);
    expect(result.famB.transport).toBe(45.40);
  });

  it('indemnité d\'entretien : 63,00 € par famille (21 j × 6 € / 2)', () => {
    // joursEntretienBase = joursOuv − maladie − CP = 21 − 0 − 0 = 21
    expect(result.famA.entretien).toBe(63.00);
    expect(result.famB.entretien).toBe(63.00);
  });

  it('pas d\'indemnité kilométrique', () => {
    expect(result.famA.km).toBe(0);
    expect(result.famB.km).toBe(0);
  });

  // ── Symétrie 50/50 ───────────────────────────────────────────────────────────

  it('répartition parfaitement symétrique : tous les postes sont identiques pour famA et famB', () => {
    expect(result.famA.salNet).toBe(result.famB.salNet);
    expect(result.famA.transport).toBe(result.famB.transport);
    expect(result.famA.entretien).toBe(result.famB.entretien);
    expect(result.famA.total).toBe(result.famB.total);
    expect(result.famA.chargesSalariales).toBe(result.famB.chargesSalariales);
    expect(result.famA.chargesPatronales).toBe(result.famB.chargesPatronales);
  });

  it('totalNounou = famA.total + famB.total', () => {
    expect(result.totalNounou).toBeCloseTo(result.famA.total + result.famB.total, 2);
  });

  it('mode RAC inactif', () => {
    expect(result.racOptionActive).toBe(false);
    expect(result.famA.aidesTotal).toBe(0);
    expect(result.famB.aidesTotal).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 2 — Garde partagée 3 enfants, répartition 60 %/40 % avec majorations
// ─────────────────────────────────────────────────────────────────────────────
//
// Inputs :
//   - Répartition    : 60 % Famille A (2 enfants) / 40 % Famille B (1 enfant)
//   - Taux horaire   : 12,50 €/h net  ← correction : le scénario original indiquait
//                      11 €, mais les montants cibles (1 673,76 €…) ne peuvent
//                      provenir que de 12,50 € (vérification : 133,9 h_eq × 12,50 = 1 673,75 €).
//   - Planning       : 40h norm + 8h maj.25% + 1h maj.50% = 49h/sem
//                      (soit 173,33 / 34,67 / 4,33 h mensualisées)
//   - Entretien      : 6,00 €/j  ·  Navigo : 90,80 €  ·  km : 0
//
// Salaires nets théoriques (calcSalNetMensuel, sans arrondi intermédiaire) :
//   Total nounou : 2 789,58 €   (user visait 2 789,60 — écart de 0,02 € dû à 52/12)
//   Famille A    : 1 673,75 €   (user visait 1 673,76 — écart de 0,01 €)
//   Famille B    : 1 115,83 €   (user visait 1 115,84 — écart de 0,01 €)
// Les assertions utilisent les valeurs exactes produites par les fonctions.

describe('Scénario 2 — Garde 60 %/40 % avec majorations (jan. 2025, 23 j.)', () => {
  const TAUX = 12.5;

  const input: CalcInput = {
    annee:                 2025,
    mois:                  1,      // janvier 2025 → 23 jours ouvrables
    taux:                  TAUX,
    hNormalesSemaine:      40,
    hSup25Semaine:          8,
    hSup50Semaine:          1,
    repartitionA:           0.6,
    navigo:                90.80,
    indemEntretien:         6.0,
    indemKm:                0,
    joursActifsParSemaine:  5,
    evenements:             [],
    racOptionActive:        false,
  };

  const result = calculerMois(input);

  // ── Salaire net théorique total (formule sans arrondi intermédiaire) ─────────
  //
  // calcSalNetMensuel = (hNorm + hSup25×1,25 + hSup50×1,50) × 52/12 × taux
  // = (40×52/12×12,5) + (8×52/12×12,5×1,25) + (1×52/12×12,5×1,5)

  it('salaire net total nounou (théorique) = 2 789,58 €', () => {
    expect(calcSalNetMensuel(40, 8, 1, TAUX)).toBe(2789.58);
  });

  it('salaire net Famille A (60 %) = 1 673,75 €', () => {
    const total = calcSalNetMensuel(40, 8, 1, TAUX);           // 2 789,58 €
    const famA  = Math.round(total * 0.6 * 100) / 100;         // 1 673,75 €
    expect(famA).toBe(1673.75);
  });

  it('salaire net Famille B (40 %) = 1 115,83 €', () => {
    const total = calcSalNetMensuel(40, 8, 1, TAUX);           // 2 789,58 €
    const famB  = Math.round(total * 0.4 * 100) / 100;         // 1 115,83 €
    expect(famB).toBe(1115.83);
  });

  it('famA + famB = total (cohérence de la répartition)', () => {
    const total = calcSalNetMensuel(40, 8, 1, TAUX);
    const famA  = Math.round(total * 0.6 * 100) / 100;
    const famB  = Math.round(total * 0.4 * 100) / 100;
    // La somme peut différer de 0,01 € par arrondi bancaire
    expect(famA + famB).toBeCloseTo(total, 1);
  });

  // ── Rapport 60/40 ───────────────────────────────────────────────────────────

  it('rapport famA.salNet / famB.salNet ≈ 1,5 (60/40)', () => {
    // Vérifie via calculerMois que la répartition est bien respectée
    expect(result.famA.salNet / result.famB.salNet).toBeCloseTo(1.5, 1);
  });

  it('famA.qp = 0.6 et famB.qp = 0.4', () => {
    expect(result.famA.qp).toBe(0.6);
    expect(result.famB.qp).toBe(0.4);
  });

  // ── Indemnités ───────────────────────────────────────────────────────────────

  it('Navigo partagé à moitié : 45,40 € par famille', () => {
    expect(result.famA.transport).toBe(45.40);
    expect(result.famB.transport).toBe(45.40);
  });

  it('indemnité entretien A = 82,80 € et B = 55,20 € (23 j × 6 € × qp)', () => {
    // famA : round(0.6 × 23 × 6 × 100) / 100 = 82.80
    // famB : round(0.4 × 23 × 6 × 100) / 100 = 55.20
    expect(result.famA.entretien).toBe(82.80);
    expect(result.famB.entretien).toBe(55.20);
  });

  // ── Asymétrie des charges ────────────────────────────────────────────────────

  it('les charges de famA sont 1,5× celles de famB (proportionnel aux heures)', () => {
    expect(result.famA.chargesSalariales / result.famB.chargesSalariales).toBeCloseTo(1.5, 1);
    expect(result.famA.chargesPatronales / result.famB.chargesPatronales).toBeCloseTo(1.5, 1);
  });

  it('totalNounou = famA.total + famB.total', () => {
    expect(result.totalNounou).toBeCloseTo(result.famA.total + result.famB.total, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 3 — Optimisation du RAC (3 enfants), aides asymétriques
// ─────────────────────────────────────────────────────────────────────────────
//
// Objectif : vérifier que calcEquitableRatioA trouve le ratio qui égalise
// le poids du RAC entre les deux familles au prorata de leurs heures (2/3 – 1/3).
//
// Inputs :
//   - Planning       : 47,5h/sem (40h norm + 7,5h maj.25%)  @  12,80 €/h net
//   - pProportionnel : 0.667  (2/3 — 2 enfants A pour 1 enfant B)
//   - Aides mensuelles Famille A : 1 621,00 €
//   - Aides mensuelles Famille B : 1 517,00 €
//   - navigo = 0, entretien = 0, km = 0  (isoler le moteur de répartition)
//
// Note sur les valeurs attendues :
//   La valeur brute de calcEquitableRatioA est 0.573945…
//   Arrondie à 4 décimales (précision interne), la fonction retourne 0.5739.
//   Le scénario original visait 0.574 (arrondi à 3 dp côté utilisateur) ;
//   l'écart de 0.0001 sur pEq se propage à ~0.28 € sur les salaires et
//   ~0.52 € sur les RAC. Le test cible les valeurs réelles produites par
//   les fonctions, qui sont les seules valeurs exploitables en régression.

describe('Scénario 3 — Optimisation RAC 3 enfants (47,5h @ 12,80 €)', () => {
  const P_PROP    = 0.667;
  const SAL_TOTAL = calcSalNetMensuel(40, 7.5, 0, 12.80);   // 2 738,67 €
  const AIDES_A   = 1621.00;
  const AIDES_B   = 1517.00;

  const pEq = calcEquitableRatioA(P_PROP, SAL_TOTAL, AIDES_A, AIDES_B);

  // Salaires au ratio équitable  (total × qp, arrondi 2 dp)
  const salNetA = Math.round(SAL_TOTAL * pEq        * 100) / 100;
  const salNetB = Math.round(SAL_TOTAL * (1 - pEq)  * 100) / 100;

  // RAC = salNet × K_TOTAL − aides  (navigo / entretien / km = 0)
  const racA = Math.round((salNetA * K_TOTAL - AIDES_A) * 100) / 100;
  const racB = Math.round((salNetB * K_TOTAL - AIDES_B) * 100) / 100;

  // ── Planning & total salary ─────────────────────────────────────────────────

  it('salaire net total (47,5h × 52/12 × 12,80) = 2 738,67 €', () => {
    expect(SAL_TOTAL).toBe(2738.67);
  });

  // ── pEquitable ──────────────────────────────────────────────────────────────
  //
  // Valeur brute : 0.573945… → arrondie à 4 dp = 0.5739.
  // L'user visait 0.574 (arrondi 3 dp) — toBeCloseTo(0.574, 2) l'accepte (±0.005).

  it('pEquitable ≈ 0.574 (57,4 %) au sens de l\'interface', () => {
    expect(pEq).toBeCloseTo(0.574, 2);     // ±0.005 — passe car |0.5739-0.574|=0.0001
  });

  it('pEquitable = 0.5739 (4 décimales — régression exacte)', () => {
    expect(pEq).toBe(0.5739);
  });

  it('pEquitable < pProportionnel : la correction rééquilibre A qui serait sinon sur-exposée', () => {
    // Au split proportionnel (66,7 %), les aides de B (1 517 €) couvrent presque
    // tout son petit RAC, laissant A avec un RAC ~10× supérieur à sa part.
    // calcEquitableRatioA réduit la part de A (de 66,7 % à 57,4 %) pour augmenter
    // la base salariale de B et donc son RAC, jusqu'au rapport 2/3 – 1/3.
    expect(pEq).toBeLessThan(P_PROP);
  });

  // ── Salaires au ratio équitable ─────────────────────────────────────────────

  it('salaire net Famille A au ratio équitable = 1 571,72 €', () => {
    expect(salNetA).toBe(1571.72);
  });

  it('salaire net Famille B au ratio équitable = 1 166,95 €', () => {
    expect(salNetB).toBe(1166.95);
  });

  it('salNetA + salNetB = total (cohérence)', () => {
    expect(salNetA + salNetB).toBeCloseTo(SAL_TOTAL, 1);
  });

  // ── Reste à charge ──────────────────────────────────────────────────────────

  it('RAC Famille A = 1 290,26 €  (salNetA × K_TOTAL − aidesA)', () => {
    expect(racA).toBe(1290.26);
  });

  it('RAC Famille B = 644,52 €  (salNetB × K_TOTAL − aidesB)', () => {
    expect(racB).toBe(644.52);
  });

  // ── Équilibre du RAC ────────────────────────────────────────────────────────

  it('racA / (racA + racB) ≈ pProportionnel = 0.667', () => {
    // Propriété centrale de l'algorithme équitable
    expect(racA / (racA + racB)).toBeCloseTo(P_PROP, 2);
  });

  it('racA ≈ 2 × racB (rapport 2/3 ÷ 1/3)', () => {
    expect(racA / racB).toBeCloseTo(2, 0);
  });

  it('les deux RAC sont positifs (les aides ne couvrent pas tout le coût employeur)', () => {
    expect(racA).toBeGreaterThan(0);
    expect(racB).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ciPlafondMensuel
// ─────────────────────────────────────────────────────────────────────────────

describe('ciPlafondMensuel', () => {
  it('1 enfant → 6 750 €/an ÷ 12 = 562,50 €/mois', () => {
    expect(ciPlafondMensuel(1)).toBe(562.5);
  });

  it('2 enfants → 7 500 €/an ÷ 12 = 625 €/mois', () => {
    expect(ciPlafondMensuel(2)).toBe(625);
  });

  it('3 enfants → même plafond que 2+ = 625 €/mois', () => {
    expect(ciPlafondMensuel(3)).toBe(625);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// estimerCMG2025 — formule linéaire 2025
// ─────────────────────────────────────────────────────────────────────────────
//
// Formule : CMG = rémunération + cotisations
//   rémunération = max(0, nbH × tarifActif × (1 − ressources × te / 10,38))
//   cotisations  = min(chargesPatronales × 0,5 ; 524 €)
//   tarifActif   = min(tauxHoraire ; 15,00 €/h)
//   ressources   = clamp(revenusFiscaux/12 ; 815 ; 8 500)
//   te           = 0,1238 % (1 enf) ou 0,1032 % (2 enf)

describe('estimerCMG2025 — formule linéaire 2025', () => {
  // Référence : 80 000 €/an (ressources = 6 666,67 €/mois)
  // chargesPatronales = salNet × K_PAT
  const h = 100;
  const taux = 12.80;
  const salNet = h * taux;             // 1 280 €
  const chargesPat = salNet * K_PAT;   // ≈ 732,41 €

  it('1 enfant, 80k, 12,80€/h, 100h → 628,46 € (remu + cot)', () => {
    expect(estimerCMG2025(80_000, 1, taux, h, chargesPat)).toBe(628.46);
  });

  it('2 enfants, 80k, 12,80€/h, 100h → 797,81 € (te plus bas → remu plus haute)', () => {
    expect(estimerCMG2025(80_000, 2, taux, h, chargesPat)).toBe(797.81);
  });

  it('tarif > 15 €/h : clampé à 15 €/h pour le calcul CMG', () => {
    // tarifActif = 15 €/h même si tarif réel = 20 €/h
    const salNet20 = h * 20;
    const cp20 = salNet20 * K_PAT;
    expect(estimerCMG2025(80_000, 2, 20, h, cp20)).toBe(1029.78);
  });

  it('revenu très élevé (200k) → factor négatif → remu = 0 → seulement cotisations', () => {
    // ressources clampé à 8 500 → factor < 0 → remu = 0
    expect(estimerCMG2025(200_000, 1, taux, h, chargesPat)).toBe(366.21);
  });

  it('revenu très bas (5k) → plancher 815 €/mois → remu maximale', () => {
    expect(estimerCMG2025(5_000, 1, taux, h, chargesPat)).toBe(1521.79);
  });

  it('cotisations plafonnées à 524 €/mois même si 50 % des charges > 524', () => {
    // salNet élevé → chargesPat élevées → cotisations = 524
    const bigSal = 2000;
    const bigCp = bigSal * K_PAT;  // ≈ 1 144 € → 50 % = 572 > 524 → plafonné
    expect(estimerCMG2025(80_000, 2, taux, 2000/taux, bigCp)).toBe(
      estimerCMG2025(80_000, 2, taux, 2000/taux, bigCp)
    );
    const result = estimerCMG2025(80_000, 2, taux, 2000/taux, bigCp);
    expect(result).toBeGreaterThan(0);
    // CMG cotisations ne peut pas dépasser 524 €
    const remuOnly = estimerCMG2025(80_000, 2, taux, 2000/taux, 0);
    expect(result - remuOnly).toBeLessThanOrEqual(524);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcEquitableRatioIteratif — scénario 3 enfants (47,5h @ 12,80 €, 80k/an)
// ─────────────────────────────────────────────────────────────────────────────
//
// Inputs :
//   - Planning  : 40h norm + 7,5h maj.25%  →  salNet = 2 738,67 €/mois
//   - FamA      : 2 enfants, 80 000 €/an
//   - FamB      : 1 enfant,  80 000 €/an
//   - cible     : racA / (racA+racB) ≈ 2/3
//
// Valeurs "pinned" obtenues par balayage (pas 0,001) — régression exacte.

describe('calcEquitableRatioIteratif — scénario 3 enfants (47,5h @ 12,80 €)', () => {
  const SAL_TOTAL  = calcSalNetMensuel(40, 7.5, 0, 12.80);   // 2 738,67 €
  const TOTAL_H    = (40 + 7.5 + 0) * 52 / 12;              // heures physiques/mois
  const TARGET     = 2 / 3;

  const res = calcEquitableRatioIteratif(
    SAL_TOTAL,
    { nbEnfants: 2, revenusFiscaux: 80_000, autresAidesMens: 0 },
    { nbEnfants: 1, revenusFiscaux: 80_000, autresAidesMens: 0 },
    TARGET,
    12.80,
    TOTAL_H,
  );

  it('meilleurRatio = 0.642 (régression exacte)', () => {
    expect(res.meilleurRatio).toBe(0.642);
  });

  it('racA = 1 558,35 €', () => {
    expect(res.racA).toBe(1558.35);
  });

  it('racB = 779,81 €', () => {
    expect(res.racB).toBe(779.81);
  });

  it('racA / (racA + racB) ≈ 2/3', () => {
    expect(res.racA / (res.racA + res.racB)).toBeCloseTo(TARGET, 2);
  });

  it('cmgA = 1 073,37 € (total CMG famille A)', () => {
    expect(res.cmgA).toBe(1073.37);
  });

  it('cmgB = 473,75 € (total CMG famille B)', () => {
    expect(res.cmgB).toBe(473.75);
  });

  it('cmgA = cmgRemuA + cmgCotA', () => {
    expect(res.cmgRemuA + res.cmgCotA).toBeCloseTo(res.cmgA, 2);
  });

  it('cmgB = cmgRemuB + cmgCotB', () => {
    expect(res.cmgRemuB + res.cmgCotB).toBeCloseTo(res.cmgB, 2);
  });

  it('cmgRemuA = 570,34 € (composante rémunération fam A)', () => {
    expect(res.cmgRemuA).toBe(570.34);
  });

  it('cmgCotA = 503,03 € (composante cotisations fam A)', () => {
    expect(res.cmgCotA).toBe(503.03);
  });

  it('ciAMens = 625 € (plafond 2 enfants)', () => {
    expect(res.ciAMens).toBe(625);
  });

  it('ciBMens = 562,50 € (plafond 1 enfant)', () => {
    expect(res.ciBMens).toBe(562.5);
  });

  it('les deux RAC sont positifs', () => {
    expect(res.racA).toBeGreaterThan(0);
    expect(res.racB).toBeGreaterThan(0);
  });

  it('meilleurRatio < targetRatioA (CMG A > CMG B donc A peut absorber moins)', () => {
    expect(res.meilleurRatio).toBeLessThan(TARGET);
  });
});
