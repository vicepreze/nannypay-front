// ── Moteur de calcul mensuel nounoulink ───────────────────────────
// Formule Cour de cassation : retenue = salaire × (joursAbs / joursOuv)

export type Evt = { type: string; debut: string; fin: string };

export interface FamResult {
  qp:         number;
  hNorm:      number;
  hSup25:     number;
  salNet:     number;   // hNorm + hSup25 uniquement
  transport:  number;
  entretien:  number;
  km:         number;
  total:      number;   // salNet + transport + entretien + km
}

export interface CalcResult {
  annee:       number;
  mois:        number;
  joursOuv:    number;
  joursAbs:    number;
  joursTrav:   number;
  ratio:       number;
  famA:        FamResult;
  famB:        FamResult;
  totalNounou: number;
}

export interface CalcInput {
  annee:               number;
  mois:                number;
  taux:                number;
  hNormalesSemaine:    number;
  hSupSemaine:         number;
  repartitionA:        number;   // ex: 0.5 pour 50/50
  navigo:              number;   // montant mensuel total (partagé 50/50)
  indemEntretien:      number;   // €/jour
  indemKm:             number;   // €/mois total
  joursActifsParSemaine: number; // pour entretien mensuel
  evenements:          Evt[];
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
    annee, mois, taux, hNormalesSemaine, hSupSemaine,
    repartitionA, navigo, indemEntretien, indemKm,
    joursActifsParSemaine, evenements,
  } = input;

  // Mensualisation
  const H_NORM_MENS = Math.round(hNormalesSemaine * 52 / 12 * 10) / 10;
  const H_SUP_MENS  = Math.round(hSupSemaine       * 52 / 12 * 10) / 10;

  // Jours ouvrables
  const joursOuv = joursOuvrablesMois(annee, mois);
  const joursAbs = evenements.reduce(
    (acc, e) => acc + joursOuvrablesIntersect(e.debut, e.fin, annee, mois),
    0,
  );
  const joursTrav = Math.max(0, joursOuv - joursAbs);
  const ratio     = joursOuv > 0 ? joursTrav / joursOuv : 1;

  // Entretien mensuel = €/j × jours actifs mensuels × ratio
  const joursActifsMensuel = Math.round(joursActifsParSemaine * 52 / 12 * 10) / 10;
  const entretienMensuel   = Math.round(indemEntretien * joursActifsMensuel * ratio * 100) / 100;

  function calcFam(qp: number): FamResult {
    const hNorm  = Math.round(H_NORM_MENS * qp * ratio);
    const hSup25 = Math.round(H_SUP_MENS  * qp * ratio);

    const baseNet = Math.round(H_NORM_MENS * qp * taux        * ratio * 100) / 100;
    const supNet  = Math.round(H_SUP_MENS  * qp * taux * 1.25 * ratio * 100) / 100;
    const salNet  = Math.round((baseNet + supNet) * 100) / 100;

    const transport = Math.round(navigo / 2 * 100) / 100;
    const entretien = Math.round(entretienMensuel / 2 * 100) / 100;
    const km        = Math.round(indemKm / 2 * 100) / 100;
    const total     = Math.round((salNet + transport + entretien + km) * 100) / 100;

    return { qp, hNorm, hSup25, salNet, transport, entretien, km, total };
  }

  const famA = calcFam(repartitionA);
  const famB = calcFam(1 - repartitionA);
  const totalNounou = Math.round((famA.total + famB.total) * 100) / 100;

  return { annee, mois, joursOuv, joursAbs, joursTrav, ratio, famA, famB, totalNounou };
}
