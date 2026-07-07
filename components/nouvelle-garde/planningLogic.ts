import { calcHeuresSemaineFromPlanning } from '@/lib/calcul';

export const JOURS = [
  { num: 1, label: 'Lundi',    court: 'Lun' },
  { num: 2, label: 'Mardi',    court: 'Mar' },
  { num: 3, label: 'Mercredi', court: 'Mer' },
  { num: 4, label: 'Jeudi',    court: 'Jeu' },
  { num: 5, label: 'Vendredi', court: 'Ven' },
];

export type Slot     = { actif: boolean; debut: string; fin: string };
export type PerDay   = Record<string, Slot>;
export type Planning = Record<string, PerDay>;
export type Enfant   = { prenom: string; fam: string; id?: string };

export function hhmm(t: string) {
  const [h, m] = (t || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
export function diffH(debut: string, fin: string) {
  const d = hhmm(fin) - hhmm(debut);
  return d > 0 ? d / 60 : 0;
}

export function defaultSlots(): PerDay {
  return Object.fromEntries(
    JOURS.map(j => [String(j.num), { actif: j.num !== 3, debut: '08:30', fin: '18:30' }])
  );
}

export function buildPlanning(enfants: Enfant[], saved: Planning | null): Planning {
  const result: Planning = {};
  for (const e of enfants) {
    result[e.prenom] = saved?.[e.prenom] ?? defaultSlots();
  }
  return result;
}

export function planningSummary(planning: Planning) {
  const { hNormalesSemaine, hSup25Semaine, hSup50Semaine, joursActifsParSemaine } =
    calcHeuresSemaineFromPlanning(JSON.stringify(planning));
  const hTotal   = Math.round((hNormalesSemaine + hSup25Semaine + hSup50Semaine) * 10) / 10;
  const hMensuel = Math.round(hTotal * 52 / 12 * 10) / 10;
  const hasAnyActive = Object.values(planning).some(days => Object.values(days).some(s => s.actif));
  return { hNormalesSemaine, hSup25Semaine, hSup50Semaine, joursActifsParSemaine, hTotal, hMensuel, hasAnyActive };
}

export function validatePlanning(planning: Planning): string {
  const { hasAnyActive } = planningSummary(planning);
  if (!hasAnyActive) return 'Activez au moins un jour pour un enfant.';
  for (const [child, days] of Object.entries(planning)) {
    for (const [jour, slot] of Object.entries(days)) {
      if (slot.actif) {
        if (!slot.debut || !slot.fin || hhmm(slot.fin) <= hhmm(slot.debut)) {
          const j = JOURS.find(x => String(x.num) === jour);
          return `Horaires invalides pour ${child} – ${j?.label ?? jour}.`;
        }
      }
    }
  }
  return '';
}
