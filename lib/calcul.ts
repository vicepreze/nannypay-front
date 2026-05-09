// ── Moteur de calcul mensuel nounoulink ───────────────────────────
// Formule Cour de cassation : retenue = salaire × (joursAbsMaladie / joursOuv)
// Congés payés : maintien salaire, mais entretien non dû ces jours-là
// Heures sup légales : 40-48h = +25%, >48h = +50%, plafond 50h/sem
// Charges : salariales 21,88 % du brut, patronales 44,70 % du brut
//           brut = net / (1 − 0,2188) = net / 0,7812

export const K_SAL   = 0.2188 / 0.7812;         // ≈ 0,2801  charges salariales / salNet
export const K_PAT   = 0.4470 / 0.7812;         // ≈ 0,5722  charges patronales / salNet
export const K_TOTAL = 1 + K_SAL + K_PAT;       // ≈ 1,8523  coût employeur / salNet

export type Evt = { type: string; debut: string; fin: string };

export interface AidesInput {
  cmgCotisations:    number;
  cmgRemuneration:   number;
  abattementCharges: number;
  aideVille:         number;
  creditImpot:       number; // €/an → divisé par 12 en interne
}

export interface FamResult {
  qp:                number;
  hNorm:             number;
  hSup25:            number;
  hSup50:            number;
  salNet:            number;
  transport:         number;
  entretien:         number;
  km:                number;
  total:             number;  // salNet + transport + entretien + km (versé à la nounou)
  chargesSalariales: number;  // salNet × K_SAL
  chargesPatronales: number;  // salNet × K_PAT
  aidesTotal:        number;  // total aides mensuelles CAF
  resteCharge:       number;  // (total + chargesSal + chargesPat) − aidesTotal
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
  racOptionActive: boolean;
}

export interface CalcInput {
  annee:                 number;
  mois:                  number;
  taux:                  number;
  hNormalesSemaine:      number;
  hSup25Semaine:         number;
  hSup50Semaine:         number;
  repartitionA:          number;
  navigo:                number;
  indemEntretien:        number;
  indemKm:               number;
  joursActifsParSemaine: number;
  evenements:            Evt[];
  racOptionActive?:      boolean;
  modeCalcul?:           string;  // legacy — ignoré si racOptionActive fourni
  aidesA?:               AidesInput;
  aidesB?:               AidesInput;
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
  const firstVal = keys.length > 0 ? (planning as Record<string, unknown>)[keys[0]] : null;
  const isPerChild = firstVal !== null && typeof firstVal === 'object' && !('actif' in (firstVal as object));

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
 * Calcule repartitionA (0–1) proportionnellement aux heures par famille.
 * Utilise le planning per-child si disponible ; sinon fallback sur nbEnfants.
 */
export function calcBModeRepartition(
  joursJson: string,
  enfants: { prenom: string; fam: string }[],
): number {
  let planning: unknown;
  try { planning = JSON.parse(joursJson || '{}'); } catch { planning = {}; }

  const keys = Object.keys(planning as object);
  const firstVal2 = keys.length > 0 ? (planning as Record<string, unknown>)[keys[0]] : null;
  const isPerChild = firstVal2 !== null && typeof firstVal2 === 'object' && !('actif' in (firstVal2 as object));

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

/**
 * Calcule le ratio A cible (0–1) pour que le RAC de chaque famille soit
 * proportionnel à ratioA / ratioB, compte tenu de leurs aides CAF.
 *
 * Formule :
 *   pEquitable = ratioA + (aidesA × ratioB − aidesB × ratioA) / (salNetTotal × K_TOTAL)
 *
 * Résultat clampé entre 0 et 1.
 */
export function calcEquitableRatioA(
  ratioA:       number,   // répartition proportionnelle aux heures (0–1)
  salNetTotal:  number,   // salaire net mensuel total nounou (hors indemnités)
  aidesAMens:   number,   // total aides mensuelles famille A
  aidesBMens:   number,   // total aides mensuelles famille B
): number {
  if (salNetTotal <= 0) return ratioA;
  const ratioB = 1 - ratioA;
  const p = ratioA + (aidesAMens * ratioB - aidesBMens * ratioA) / (salNetTotal * K_TOTAL);
  return Math.min(1, Math.max(0, Math.round(p * 10000) / 10000));
}

/**
 * Plafond mensuel de Crédit d'Impôt (50 % des dépenses nettes après CMG).
 * Plafond légal : 6 750 €/an pour 1 enfant, 7 500 €/an pour 2+ enfants.
 */
export function ciPlafondMensuel(nbEnfants: number): number {
  return (nbEnfants >= 2 ? 7_500 : 6_750) / 12;
  // 1 enfant → 562,50 €/mois   2+ enfants → 625,00 €/mois
}

// ── CMG Emploi direct 2025 ────────────────────────────────────────
// Formule linéaire 2025 (CNAF) — 2 composantes :
//   rémunération : nbH × tarifActif × (1 − ressources × te / tarifRef)
//   cotisations  : 50 % des charges patronales, plafond 524 €/mois
// Sources : CNAF SFHS2607952J / SDSF 2025

const CMG_TARIF_REF_2025  = 10.38;   // €/h — tarif de référence GAD 2025
const CMG_TARIF_PLAF_2025 = 15.00;   // €/h — tarif plafond GAD 2025
const CMG_RESSOURCES_MIN  =    815;  // €/mois — plancher ressources
const CMG_RESSOURCES_MAX  =  8_500;  // €/mois — plafond pratique
const CMG_COT_PLAFOND     =    524;  // €/mois — plafond CMG cotisations
const CMG_TAUX_EFFORT_GAD: Record<number, number> = { 1: 0.001238, 2: 0.001032 };

function cmgDetail(
  revenusFiscaux:    number,
  nbEnfants:         number,
  tauxHoraire:       number,
  nbHeuresMois:      number,
  chargesPatronales: number,
): { remu: number; cot: number } {
  const ressources = Math.max(CMG_RESSOURCES_MIN, Math.min(CMG_RESSOURCES_MAX, revenusFiscaux / 12));
  const te         = CMG_TAUX_EFFORT_GAD[Math.min(nbEnfants, 2)] ?? CMG_TAUX_EFFORT_GAD[2];
  const tarifActif = Math.min(tauxHoraire, CMG_TARIF_PLAF_2025);
  const remu       = Math.max(0, nbHeuresMois * tarifActif * (1 - ressources * te / CMG_TARIF_REF_2025));
  const cot        = Math.min(chargesPatronales * 0.5, CMG_COT_PLAFOND);
  return { remu: Math.round(remu * 100) / 100, cot: Math.round(cot * 100) / 100 };
}

/**
 * Estime le montant mensuel total de CMG Emploi direct 2025 (rémunération + cotisations).
 *
 * @param revenusFiscaux    Revenus fiscaux annuels de la famille
 * @param nbEnfants         Nombre d'enfants de la famille (1 ou 2 max en garde partagée)
 * @param tauxHoraire       Tarif horaire net (€/h) de la nounou
 * @param nbHeuresMois      Heures mensuelles imputées à cette famille
 * @param chargesPatronales Charges patronales mensuelles (salNet × K_PAT)
 */
export function estimerCMG2025(
  revenusFiscaux:    number,
  nbEnfants:         number,
  tauxHoraire:       number,
  nbHeuresMois:      number,
  chargesPatronales: number,
): number {
  const { remu, cot } = cmgDetail(revenusFiscaux, nbEnfants, tauxHoraire, nbHeuresMois, chargesPatronales);
  return Math.round((remu + cot) * 100) / 100;
}

// ── Moteur itératif RAC équitable ────────────────────────────────

export interface FamilleRACConfig {
  nbEnfants:       number;
  revenusFiscaux:  number;
  autresAidesMens: number;
}

export interface EquitableRACResult {
  meilleurRatio: number;
  racA:          number;
  racB:          number;
  cmgA:          number;  // total CMG famille A (remu + cot)
  cmgB:          number;
  cmgRemuA:      number;  // composante rémunération (pour pré-remplissage Mode Expert)
  cmgRemuB:      number;
  cmgCotA:       number;  // composante cotisations (pour pré-remplissage Mode Expert)
  cmgCotB:       number;
  ciAMens:       number;
  ciBMens:       number;
}

/**
 * Trouve par balayage (1 %→99 %, pas 0,1 %) la répartition salariale
 * qui minimise |racA/(racA+racB) − targetRatioA|.
 *
 * CMG calculé via la formule linéaire 2025 ; CI = 50 % des dépenses
 * nettes restantes (après CMG et autresAidesMens).
 *
 * @param tauxHoraire     Tarif horaire net de la nounou (€/h)
 * @param totalHeuresMens Heures physiques totales mensuelles de la nounou
 */
export function calcEquitableRatioIteratif(
  salNetTotal:     number,
  configA:         FamilleRACConfig,
  configB:         FamilleRACConfig,
  targetRatioA:    number,
  tauxHoraire:     number,
  totalHeuresMens: number,
): EquitableRACResult {
  let meilleurRatio = targetRatioA;
  let meilleurEcart = Infinity;
  let bestRacA = 0, bestRacB = 0;
  let bestCmgA = 0, bestCmgB = 0;
  let bestCmgRemuA = 0, bestCmgRemuB = 0;
  let bestCmgCotA  = 0, bestCmgCotB  = 0;
  let bestCiA  = 0, bestCiB  = 0;

  const ciPlafA = ciPlafondMensuel(configA.nbEnfants);
  const ciPlafB = ciPlafondMensuel(configB.nbEnfants);

  for (let i = 10; i <= 990; i++) {
    const ratioA  = i / 1000;
    const salA    = salNetTotal * ratioA;
    const salB    = salNetTotal * (1 - ratioA);
    const coutA   = salA * K_TOTAL;
    const coutB   = salB * K_TOTAL;
    const heuresA = totalHeuresMens * ratioA;
    const heuresB = totalHeuresMens * (1 - ratioA);
    const dA = cmgDetail(configA.revenusFiscaux, configA.nbEnfants, tauxHoraire, heuresA, salA * K_PAT);
    const dB = cmgDetail(configB.revenusFiscaux, configB.nbEnfants, tauxHoraire, heuresB, salB * K_PAT);
    const cmgA = Math.round((dA.remu + dA.cot) * 100) / 100;
    const cmgB = Math.round((dB.remu + dB.cot) * 100) / 100;
    const eligA = Math.max(0, coutA - cmgA - configA.autresAidesMens);
    const eligB = Math.max(0, coutB - cmgB - configB.autresAidesMens);
    const ciA   = Math.min(Math.round(eligA * 0.5 * 100) / 100, ciPlafA);
    const ciB   = Math.min(Math.round(eligB * 0.5 * 100) / 100, ciPlafB);
    const racA  = Math.round((coutA - cmgA - ciA - configA.autresAidesMens) * 100) / 100;
    const racB  = Math.round((coutB - cmgB - ciB - configB.autresAidesMens) * 100) / 100;
    if (racA <= 0 || racB <= 0) continue;
    const ecart = Math.abs(racA / (racA + racB) - targetRatioA);
    if (ecart < meilleurEcart) {
      meilleurEcart    = ecart;
      meilleurRatio    = ratioA;
      bestRacA = racA;  bestRacB = racB;
      bestCmgA = cmgA;  bestCmgB = cmgB;
      bestCmgRemuA = dA.remu; bestCmgRemuB = dB.remu;
      bestCmgCotA  = dA.cot;  bestCmgCotB  = dB.cot;
      bestCiA  = ciA;   bestCiB  = ciB;
    }
  }

  return {
    meilleurRatio,
    racA: bestRacA, racB: bestRacB,
    cmgA: bestCmgA, cmgB: bestCmgB,
    cmgRemuA: bestCmgRemuA, cmgRemuB: bestCmgRemuB,
    cmgCotA:  bestCmgCotA,  cmgCotB:  bestCmgCotB,
    ciAMens: bestCiA, ciBMens: bestCiB,
  };
}

/**
 * Salaire net mensuel total (pour la nounou complète), sans arrondi intermédiaire
 * sur les heures mensualisées. Correspond à `salNetTotalMens` affiché dans l'interface.
 * À diviser par la répartition (qp) pour obtenir la part par famille.
 */
export function calcSalNetMensuel(
  hNorm:  number,
  hSup25: number,
  hSup50: number,
  taux:   number,
): number {
  const base  = hNorm  * (52 / 12) * taux;
  const sup25 = hSup25 * (52 / 12) * taux * 1.25;
  const sup50 = hSup50 * (52 / 12) * taux * 1.50;
  return Math.round((base + sup25 + sup50) * 100) / 100;
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
    racOptionActive: racOpt,
    modeCalcul = 'A.1',
    aidesA, aidesB,
  } = input;

  // racOptionActive prend le dessus sur le champ legacy modeCalcul
  const racOptionActive = racOpt ?? modeCalcul.endsWith('.2');

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

  function calcFam(qp: number, aides: AidesInput | undefined): FamResult {
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

    const chargesSalariales = Math.round(salNet * K_SAL * 100) / 100;
    const chargesPatronales = Math.round(salNet * K_PAT * 100) / 100;
    const aidesTotal        = aides ? monthlyAides(aides) : 0;
    const resteCharge       = Math.round((total + chargesSalariales + chargesPatronales - aidesTotal) * 100) / 100;

    return { qp, hNorm, hSup25, hSup50, salNet, transport, entretien, km, total, chargesSalariales, chargesPatronales, aidesTotal, resteCharge };
  }

  const famA = calcFam(repartitionA,       racOptionActive ? aidesA : undefined);
  const famB = calcFam(1 - repartitionA,   racOptionActive ? aidesB : undefined);

  const totalNounou   = Math.round((famA.total + famB.total) * 100) / 100;
  const hTotalSemaine = Math.round((hNormalesSemaine + hSup25Semaine + hSup50Semaine) * 10) / 10;

  return { annee, mois, joursOuv, joursAbsMaladie, joursAbsCP, joursAbs, joursTrav, ratio, hTotalSemaine, famA, famB, totalNounou, racOptionActive };
}
