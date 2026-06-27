import { describe, it, expect } from 'vitest';
import { defaultSlots, buildPlanning, planningSummary, validatePlanning, type Planning } from './planningLogic';

describe('defaultSlots', () => {
  it('active Lundi-Vendredi sauf Mercredi, 08:30-18:30', () => {
    const slots = defaultSlots();
    expect(slots['1'].actif).toBe(true);  // Lundi
    expect(slots['2'].actif).toBe(true);  // Mardi
    expect(slots['3'].actif).toBe(false); // Mercredi
    expect(slots['4'].actif).toBe(true);  // Jeudi
    expect(slots['5'].actif).toBe(true);  // Vendredi
    expect(slots['1'].debut).toBe('08:30');
    expect(slots['1'].fin).toBe('18:30');
  });
});

describe('buildPlanning', () => {
  const enfants = [{ prenom: 'Simone', fam: 'A' }, { prenom: 'Giselle', fam: 'B' }];

  it('génère les créneaux par défaut quand saved est null', () => {
    const p = buildPlanning(enfants, null);
    expect(Object.keys(p)).toEqual(['Simone', 'Giselle']);
    expect(p.Simone['1'].actif).toBe(true);
  });

  it('réutilise les données sauvegardées par prénom', () => {
    const saved: Planning = {
      Simone: { '1': { actif: false, debut: '09:00', fin: '17:00' } },
    };
    const p = buildPlanning(enfants, saved);
    expect(p.Simone['1']).toEqual({ actif: false, debut: '09:00', fin: '17:00' });
    // Giselle n'a pas de données sauvegardées → défaut
    expect(p.Giselle['1'].actif).toBe(true);
  });
});

describe('planningSummary', () => {
  it('hasAnyActive est false si aucun jour actif', () => {
    const planning: Planning = { Simone: { '1': { actif: false, debut: '08:30', fin: '18:30' } } };
    const s = planningSummary(planning);
    expect(s.hasAnyActive).toBe(false);
  });

  it('calcule les heures normales pour un planning simple (1 enfant, 5j x 8h = 40h/sem)', () => {
    const days: Record<string, { actif: boolean; debut: string; fin: string }> = {};
    for (const j of ['1', '2', '3', '4', '5']) days[j] = { actif: true, debut: '09:00', fin: '17:00' };
    const planning: Planning = { Simone: days };
    const s = planningSummary(planning);
    expect(s.hasAnyActive).toBe(true);
    expect(s.hNormalesSemaine).toBe(40);
    expect(s.hSup25Semaine).toBe(0);
    expect(s.hSup50Semaine).toBe(0);
    expect(s.joursActifsParSemaine).toBe(5);
  });

  it('bascule en heures sup au-delà de 40h (union de plusieurs enfants)', () => {
    const days: Record<string, { actif: boolean; debut: string; fin: string }> = {};
    for (const j of ['1', '2', '3', '4', '5']) days[j] = { actif: true, debut: '08:00', fin: '18:00' }; // 10h/j = 50h/sem
    const planning: Planning = { Simone: days };
    const s = planningSummary(planning);
    expect(s.hNormalesSemaine).toBe(40);
    expect(s.hSup25Semaine).toBe(8);
    expect(s.hSup50Semaine).toBe(2);
  });
});

describe('validatePlanning', () => {
  it("refuse un planning sans aucun jour actif", () => {
    const planning: Planning = { Simone: { '1': { actif: false, debut: '08:30', fin: '18:30' } } };
    expect(validatePlanning(planning)).toMatch(/activez au moins un jour/i);
  });

  it('refuse un créneau actif avec fin <= début', () => {
    const planning: Planning = { Simone: { '1': { actif: true, debut: '18:00', fin: '09:00' } } };
    expect(validatePlanning(planning)).toMatch(/horaires invalides/i);
  });

  it("refuse un créneau actif sans horaires renseignés", () => {
    const planning: Planning = { Simone: { '1': { actif: true, debut: '', fin: '' } } };
    expect(validatePlanning(planning)).toMatch(/horaires invalides/i);
  });

  it('accepte un planning valide', () => {
    const planning: Planning = { Simone: { '1': { actif: true, debut: '08:30', fin: '18:30' } } };
    expect(validatePlanning(planning)).toBe('');
  });
});
