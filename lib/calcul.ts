// ── Moteur de calcul mensuel nounoulink ───────────────────────────
// Formule Cour de cassation : retenue = salaire × (joursAbs / joursOuv)
// Heures sup légales : 40-48h = +25%, >48h = +50%, plafond 50h/sem

export type Evt = { type: string; debut: string; fin: string };

export interface FamResult {
  qp:         number;
  hNorm:      number;
  hSup25:     number;
  hSup50:     number;
  salNet:     number;   // hNorm + hSup25 + hSup50
  transport:  number;
  entretien:  number;
  km:         number;
  total:      number;   // salNet + transport + entretien + km
}

export interface CalcResult {
  annee:        number;
  mois:         number;
  joursOuv:     number;
  joursAbs:     number;
  joursTrav:    number;
  ratio:        number;
  hTotalSemaine: number;  // hNormales + hSup25 + hSup50 (vue nounou)
  famA:         FamResult;
  famB:         FamResult;
  totalNounou:  number;
}

export interface CalcInput {
  annee:               number;
  mois:                number;
  taux:                number;
  hNormalesSemaine:    number;  // heures ≤ 40h/sem
  hSup25Semaine:       number;  // heures 40-48h/sem (+25%)
  hSup50Semaine:       number;  // heures >48h/sem (+50%)
  repartitionA:        number;  // ex: 0.5 pour 50/50
  navigo:              number;  // montant mensuel total (partagé 50/50)
  indemEntretien:      number;  // €/jour
  indemKm:             number;  // €/mois total
  joursActifsParSemaine: number;
  evenements:          Evt[];
}

// ── Helpers planning ─────────────────────────────────────────────
export function calcHeuresSemaineFromPlanning(joursJson: string): {
  hNormalesSemaine: number;
  hSup25Semaine:    number;
  hSup50Semaine:    number;
} {
  type Plage = { debut: string; fin: string };
  type Jour  = { actif: boolean; plages: Plage[] };
  const planning: Record<string, Jour> = JSON.parse(joursJson || '{}');

  let totalMin = 0;
  for (const jour of Object.values(planning)) {
    if (!jour.actif || !jour.plages?.length) continue;
    // Union des plages du jour
    const intervals = jour.plages
      .map(p => ({ s: hhmm(p.debut), e: hhmm(p.fin) }))
      .filter(i => i.e > i.s)
      .sort((a, b) => a.s - b.s);
    let dayMin = 0;
    let cur = -1;
    for (const { s, e } of intervals) {
      if (s > cur) { dayMin += e - s; cur = e; }
      else if (e > cur) { dayMin += e - cur; cur = e; }
    }
    totalMin += dayMin;
  }

  const totalH = totalMin / 60;
  const capped  = Math.min(totalH, 50);               // plafond légal
  const hNorm   = Math.min(capped, 40);
  const hSup    = Math.max(0, capped - 40);
  const hSup25  = Math.min(hSup, 8);
  const hSup50  = Math.max(0, hSup - 8);

  return {
    hNormalesSemaine: Math.round(hNorm  * 10) / 10,
    hSup25Semaine:    Math.round(hSup25 * 10) / 10,
    hSup50Semaine:    Math.round(hSup50 * 10) / 10,
  };
}

function hhmm(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
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
  } = input;

  // Mensualisation (52/12)
  const H_NORM_MENS  = Math.round(hNormalesSemaine * 52 / 12 * 10) / 10;
  const H_SUP25_MENS = Math.round(hSup25Semaine    * 52 / 12 * 10) / 10;
  const H_SUP50_MENS = Math.round(hSup50Semaine    * 52 / 12 * 10) / 10;

  // Jours ouvrables
  const joursOuv = joursOuvrablesMois(annee, mois);
  const joursAbs = evenements.reduce(
    (acc, e) => acc + joursOuvrablesIntersect(e.debut, e.fin, annee, mois),
    0,
  );
  const joursTrav = Math.max(0, joursOuv - joursAbs);
  const ratio     = joursOuv > 0 ? joursTrav / joursOuv : 1;

  // Entretien mensuel
  const joursActifsMensuel = Math.round(joursActifsParSemaine * 52 / 12 * 10) / 10;
  const entretienMensuel   = Math.round(indemEntretien * joursActifsMensuel * ratio * 100) / 100;

  function calcFam(qp: number): FamResult {
    const hNorm  = Math.round(H_NORM_MENS  * qp * ratio);
    const hSup25 = Math.round(H_SUP25_MENS * qp * ratio);
    const hSup50 = Math.round(H_SUP50_MENS * qp * ratio);

    const baseNet  = Math.round(H_NORM_MENS  * qp * taux        * ratio * 100) / 100;
    const sup25Net = Math.round(H_SUP25_MENS * qp * taux * 1.25 * ratio * 100) / 100;
    const sup50Net = Math.round(H_SUP50_MENS * qp * taux * 1.50 * ratio * 100) / 100;
    const salNet   = Math.round((baseNet + sup25Net + sup50Net) * 100) / 100;

    const transport = Math.round(navigo / 2 * 100) / 100;
    const entretien = Math.round(entretienMensuel / 2 * 100) / 100;
    const km        = Math.round(indemKm / 2 * 100) / 100;
    const total     = Math.round((salNet + transport + entretien + km) * 100) / 100;

    return { qp, hNorm, hSup25, hSup50, salNet, transport, entretien, km, total };
  }

  const famA = calcFam(repartitionA);
  const famB = calcFam(1 - repartitionA);
  const totalNounou    = Math.round((famA.total + famB.total) * 100) / 100;
  const hTotalSemaine  = Math.round((hNormalesSemaine + hSup25Semaine + hSup50Semaine) * 10) / 10;

  return { annee, mois, joursOuv, joursAbs, joursTrav, ratio, hTotalSemaine, famA, famB, totalNounou };
}
