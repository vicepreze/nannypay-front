import { describe, it, expect } from 'vitest';
import {
  K_SAL, K_PAT, K_TOTAL,
  calcBModeRepartition,
  calcEquitableRatioA,
  calcHeuresSemaineFromPlanning,
  calculerMois,
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
