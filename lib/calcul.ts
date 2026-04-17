// ── Moteur de calcul mensuel nounoulink ───────────────────────────
// Formule Cour de cassation : retenue = salaire × (joursAbsMaladie / joursOuv)
// Congés payés : maintien salaire, mais entretien non dû ces jours-là
// Heures sup légales : 40-48h = +25%, >48h = +50%, plafond 50h/sem

export type Evt = { type: string; debut: string; fin: string };

export interface AidesInput {
  cmgCotisations:    number;
  cmgRemuneration:   number;
  abattementCharges: number;
  aideVille:         number;
  creditImpot:       number; // €/an → divisé par 12 en interne
}

export interface FamResult {
  qp:               number;
  hNorm:            number;
  hSup25:           number;
  hSup50:           number;
  salNet:           number;
  transport:        number;
  entretien:        number;
  km:               number;
  total:            number;  // total à verser à la nounou (toujours proportionnel, identique .1 et .2)
  aidesTotal:       number;  // aides mensuelles CAF
  ajustementEquite: number;  // transfert inter-familles pour équilibrer le RAC (0 en mode .1)
  resteCharge:      number;  // RAC final = (total - aidesTotal) + ajustementEquite
}

export interface CalcResult {
  annee:           number;
  mois:            number;
  joursOuv:        number;
  joursAbsMaladie: number;
  joursAbsCP:      number;
  joursAbs:        number;
  joursTrav:       number;
  ratio:           number;
  hTotalSemaine:   number;
  famA:            FamResult;
  famB:            FamResult;
  totalNounou:     number;
  isEquitable:     boolean;
}

export interface CalcInput {
  annee:                number;
  mois:                 number;
  taux:                 number;
  hNormalesSemaine:     number;
  hSup25Semaine:        number;
  hSup50Semaine:        number;
  repartitionA:         number;
  navigo:               number;
  indemEntretien:       number;
  indemKm:              number;
  joursActifsParSemaine: number;
  evenements:           Evt[];
  modeCalcul?:          string;       // 'A.1'|'B.1'|'C.1'|'A.2'|'B.2'|'C.2'
  aidesA?:              AidesInput;
  aidesB?:              AidesInput;
}

// ── Helpers planning ─────────────────────────────────────────────

type SlotJour = { actif: boolean; debut?: string; fin?: string };
type PerChild = Record<string, Record<string, SlotJour>>;

export function calcHeuresSemaineFromPlanning(joursJson: string): {
  hNormalesSemaine:      number;
  hSup25Semaine:         number;
  hSup50Semaine:         number;
  joursActifsParSemaine: number;
} {
  let planning: unknown;
  try { planning = JSON.parse(joursJson || '{}'); } catch { planning = {}; }

  const keys = Object.keys(planning as object);
  const isPerChild = keys.length > 0 && !keys.every(k => ['1','2','3','4','5'].includes(k));

  let totalMin = 0;
  const joursActifsSet = new Set<string>();

  if (isPerChild) {
    const perChild = planning as PerChild;
    for (const jour of ['1','2','3','4','5']) {
      const intervals: { s: number; e: number }[] = [];
      for (const childSlots of Object.values(perChild)) {
        const slot = childSlots[jour];
        if (slot?.actif && slot.debut && slot.fin) {
          const s = hhmm(slot.debut), e = hhmm(slot.fin);
          if (e > s) { intervals.push({ s, e }); joursActifsSet.add(jour); }
        }
      }
      totalMin += unionMin(intervals);
    }
  } else {
    const perDay = planning as Record<string, { actif: boolean; hDebut?: string; hFin?: string; plages?: { debut: string; fin: string }[] }>;
    for (const [jour, v] of Object.entries(perDay)) {
      if (!v.actif) continue;
      joursActifsSet.add(jour);
      if (v.plages?.length) {
        const intervals = v.plages.map(p => ({ s: hhmm(p.debut), e: hhmm(p.fin) })).filter(i => i.e > i.s);
        totalMin += unionMin(intervals);
      } else if (v.hDebut && v.hFin) {
        const s = hhmm(v.hDebut), e = hhmm(v.hFin);
        if (e > s) totalMin += e - s;
      }
    }
  }

  const totalH = Math.min(totalMin / 60, 50);
  const hNorm  = Math.min(totalH, 40);
  const hSup   = Math.max(0, totalH - 40);
  const hSup25 = Math.min(hSup, 8);
  const hSup50 = Math.max(0, hSup - 8);

  return {
    hNormalesSemaine:      Math.round(hNorm  * 10) / 10,
    hSup25Semaine:         Math.round(hSup25 * 10) / 10,
    hSup50Semaine:         Math.round(hSup50 * 10) / 10,
    joursActifsParSemaine: joursActifsSet.size,
  };
}

/**
 * Calcule repartitionA (0–1) en mode B (PAR_HEURE) à partir du planning per-child.
 * Fallback sur nbEnfantsA / nbTotal si le planning n'est pas au format per-child.
 */
export function calcBModeRepartition(
  joursJson: string,
  enfants: { prenom: string; fam: string }[],
): number {
  let planning: unknown;
  try { planning = JSON.parse(joursJson || '{}'); } catch { planning = {}; }

  const keys = Object.keys(planning as object);
  const isPerChild = keys.length > 0 && !keys.every(k => ['1','2','3','4','5'].includes(k));

  if (!isPerChild) {
    const nbA = enfants.filter(e => e.fam === 'A').length;
    const nbTotal = enfants.length || 2;
    return nbA / nbTotal;
  }

  const perChild = planning as PerChild;
  let hoursA = 0, hoursB = 0;

  for (const [childName, daySlots] of Object.entries(perChild)) {
    const enfant = enfants.find(e => e.prenom === childName);
    if (!enfant) continue;
    let childMins = 0;
    for (const slot of Object.values(daySlots)) {
      if (slot.actif && slot.debut && slot.fin) {
        const mins = hhmm(slot.fin) - hhmm(slot.debut);
        if (mins > 0) childMins += mins;
      }
    }
    if (enfant.fam === 'A') hoursA += childMins;
    else                     hoursB += childMins;
  }

  const total = hoursA + hoursB;
  if (total === 0) {
    const nbA = enfants.filter(e => e.fam === 'A').length;
    return nbA / (enfants.length || 2);
  }
  return hoursA / total;
}

function unionMin(intervals: { s: number; e: number }[]): number {
  if (!intervals.length) return 0;
  const sorted = [...intervals].sort((a, b) => a.s - b.s);
  let total = 0, cur = -1;
  for (const { s, e } of sorted) {
    if (s > cur)      { total += e - s; cur = e; }
    else if (e > cur) { total += e - cur; cur = e; }
  }
  return total;
}

function hhmm(t: string): number {
  const [h, m] = (t || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function monthlyAides(a: AidesInput): number {
  return Math.round(
    (a.cmgCotisations + a.cmgRemuneration + a.abattementCharges + a.aideVille + a.creditImpot / 12) * 100
  ) / 100;
}

// ── Helpers date ──────────────────────────────────────────────────

function joursOuvrablesMois(annee: number, mois: number): number {
  let nb = 0;
  const cur = new Date(annee, mois - 1, 1);
  const fin = new Date(annee, mois, 0);
  while (cur <= fin) {
    const d = cur.getDay();
    if (d >= 1 && d <= 5) nb++;
    cur.setDate(cur.getDate() + 1);
  }
  return nb;
}

function joursOuvrablesIntersect(debut: string, fin: string, annee: number, mois: number): number {
  const [y1, m1, d1] = debut.split('-').map(Number);
  const [y2, m2, d2] = fin.split('-').map(Number);
  const dD = new Date(y1, m1 - 1, d1);
  const dF = new Date(y2, m2 - 1, d2);
  const mD = new Date(annee, mois - 1, 1);
  const mF = new Date(annee, mois, 0);
  const start = dD > mD ? dD : mD;
  const end   = dF < mF ? dF : mF;
  let nb = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const d = cur.getDay();
    if (d >= 1 && d <= 5) nb++;
    cur.setDate(cur.getDate() + 1);
  }
  return nb;
}

// ── Calcul principal ──────────────────────────────────────────────

export function calculerMois(input: CalcInput): CalcResult {
  const {
    annee, mois, taux,
    hNormalesSemaine, hSup25Semaine, hSup50Semaine,
    repartitionA, navigo, indemEntretien, indemKm,
    joursActifsParSemaine, evenements,
    modeCalcul = 'A.1',
    aidesA, aidesB,
  } = input;

  const isEquitable = modeCalcul.endsWith('.2');

  const H_NORM_MENS  = Math.round(hNormalesSemaine * 52 / 12 * 10) / 10;
  const H_SUP25_MENS = Math.round(hSup25Semaine    * 52 / 12 * 10) / 10;
  const H_SUP50_MENS = Math.round(hSup50Semaine    * 52 / 12 * 10) / 10;

  const joursOuv = joursOuvrablesMois(annee, mois);

  const joursAbsMaladie = evenements
    .filter(e => e.type === 'maladie_nounou')
    .reduce((acc, e) => acc + joursOuvrablesIntersect(e.debut, e.fin, annee, mois), 0);

  const joursAbsCP = evenements
    .filter(e => e.type === 'conge_paye')
    .reduce((acc, e) => acc + joursOuvrablesIntersect(e.debut, e.fin, annee, mois), 0);

  const joursAbs  = joursAbsMaladie + joursAbsCP;
  const joursTrav = Math.max(0, joursOuv - joursAbsMaladie);
  const ratio     = joursOuv > 0 ? joursTrav / joursOuv : 1;

  const tauxPresenceJour   = joursActifsParSemaine > 0 ? joursActifsParSemaine / 5 : 1;
  const joursEntretienBase = Math.max(0, joursOuv - joursAbsMaladie - joursAbsCP);

  function calcFam(qp: number): Omit<FamResult, 'aidesTotal' | 'resteCharge'> {
    const hNorm  = Math.round(H_NORM_MENS  * qp * ratio);
    const hSup25 = Math.round(H_SUP25_MENS * qp * ratio);
    const hSup50 = Math.round(H_SUP50_MENS * qp * ratio);

    const baseNet  = Math.round(H_NORM_MENS  * qp * taux        * ratio * 100) / 100;
    const sup25Net = Math.round(H_SUP25_MENS * qp * taux * 1.25 * ratio * 100) / 100;
    const sup50Net = Math.round(H_SUP50_MENS * qp * taux * 1.50 * ratio * 100) / 100;
    const salNet   = Math.round((baseNet + sup25Net + sup50Net) * 100) / 100;

    const transport = Math.round(navigo / 2 * 100) / 100;
    const entretien = Math.round(qp * joursEntretienBase * tauxPresenceJour * indemEntretien * 100) / 100;
    const km        = Math.round(indemKm / 2 * 100) / 100;
    const total     = Math.round((salNet + transport + entretien + km) * 100) / 100;

    return { qp, hNorm, hSup25, hSup50, salNet, transport, entretien, km, total };
  }

  const baseA = calcFam(repartitionA);
  const baseB = calcFam(1 - repartitionA);

  let famA: FamResult;
  let famB: FamResult;

  const aidesAMens = aidesA ? monthlyAides(aidesA) : 0;
  const aidesBMens = aidesB ? monthlyAides(aidesB) : 0;

  if (isEquitable) {
    // total à verser à la nounou = inchangé (proportionnel), identique au mode .1
    // L'équilibrage porte sur le reste à charge via un transfert inter-familles :
    //   RAC brut A = baseA.total - aidesA
    //   RAC brut B = baseB.total - aidesB
    //   totalRac   = RAC brut A + RAC brut B
    //   RAC cible A = repartitionA × totalRac  (chaque famille paie sa quote-part du RAC global)
    //   Ajustement = RAC cible - RAC brut (< 0 : reçoit, > 0 : verse à l'autre famille)
    const racBrutA  = Math.round((baseA.total - aidesAMens) * 100) / 100;
    const racBrutB  = Math.round((baseB.total - aidesBMens) * 100) / 100;
    const totalRac  = Math.round((racBrutA + racBrutB) * 100) / 100;
    const racCibleA = Math.round(repartitionA       * totalRac * 100) / 100;
    const racCibleB = Math.round((1 - repartitionA) * totalRac * 100) / 100;
    const ajustA    = Math.round((racCibleA - racBrutA) * 100) / 100;
    const ajustB    = Math.round((racCibleB - racBrutB) * 100) / 100;

    famA = { ...baseA, aidesTotal: aidesAMens, ajustementEquite: ajustA, resteCharge: racCibleA };
    famB = { ...baseB, aidesTotal: aidesBMens, ajustementEquite: ajustB, resteCharge: racCibleB };
  } else {
    famA = { ...baseA, aidesTotal: aidesAMens, ajustementEquite: 0, resteCharge: Math.round((baseA.total - aidesAMens) * 100) / 100 };
    famB = { ...baseB, aidesTotal: aidesBMens, ajustementEquite: 0, resteCharge: Math.round((baseB.total - aidesBMens) * 100) / 100 };
  }

  const totalNounou   = Math.round((famA.total + famB.total) * 100) / 100;
  const hTotalSemaine = Math.round((hNormalesSemaine + hSup25Semaine + hSup50Semaine) * 10) / 10;

  return { annee, mois, joursOuv, joursAbsMaladie, joursAbsCP, joursAbs, joursTrav, ratio, hTotalSemaine, famA, famB, totalNounou, isEquitable };
}
