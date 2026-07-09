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
  exonerationHS:     number;  // réduction cotisations salariales HS (Art. L241-17 CSS) — en plus de salNet/total
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
  joursAbsRepos:   number;
  joursAbs:        number;
  joursOffert:     number;
  joursFeries:     number;
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
  repartitionIndemA?:    number;  // part famille A sur les indemnités (0–1, défaut 0.5)
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

export const TAUX_EXONERATION_HS = 0.1131; // Réduction salariale HS (Art. L241-17 CSS), taux stable depuis 2019 — vérifier BOSS avant de modifier

/**
 * Réduction de cotisations salariales sur heures supplémentaires (11,31 %), en plus du
 * salaire net habituel — porte sur la rémunération des heures sup (majoration comprise).
 * `hSup25`/`hSup50` sont des heures mensualisées (déjà pondérées par la part famille le cas
 * échéant) ; `ratioPresence` doit être appliqué au même niveau que pour le reste du salaire
 * (voir `salNet` dans `calcFam`), pour éviter une double proratisation.
 */
export function calculerExonerationHS(
  hSup25:        number,
  hSup50:        number,
  taux:          number,
  ratioPresence: number = 1,
): number {
  const remuHS = hSup25 * taux * 1.25 + hSup50 * taux * 1.50;
  return Math.round(remuHS * TAUX_EXONERATION_HS * ratioPresence * 100) / 100;
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

/** Jours ouvrés de l'intervalle [debut,fin] clippés à la fenêtre de dates [rangeDebut,rangeFin] (bornes incluses, en "YYYY-MM-DD"). */
export function joursOuvrablesEntreDates(debut: string, fin: string, rangeDebut: string, rangeFin: string): number {
  const start = debut > rangeDebut ? debut : rangeDebut;
  const end   = fin   < rangeFin   ? fin   : rangeFin;
  if (start > end) return 0;
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  const cur  = new Date(y1, m1 - 1, d1);
  const last = new Date(y2, m2 - 1, d2);
  let nb = 0;
  while (cur <= last) {
    const d = cur.getDay();
    if (d >= 1 && d <= 5) nb++;
    cur.setDate(cur.getDate() + 1);
  }
  return nb;
}

export function joursOuvrablesIntersect(debut: string, fin: string, annee: number, mois: number): number {
  const rangeDebut = `${annee}-${String(mois).padStart(2, '0')}-01`;
  const rangeFin   = dateISO(new Date(annee, mois, 0));
  return joursOuvrablesEntreDates(debut, fin, rangeDebut, rangeFin);
}

function dateISO(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function joursOuvrablesDatesMois(annee: number, mois: number): string[] {
  const dates: string[] = [];
  const cur = new Date(annee, mois - 1, 1);
  const fin = new Date(annee, mois, 0);
  while (cur <= fin) {
    const d = cur.getDay();
    if (d >= 1 && d <= 5) dates.push(dateISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function joursCouvertsParType(evenements: Evt[], type: string, joursOuvMois: string[]): Set<string> {
  const set = new Set<string>();
  for (const e of evenements) {
    if (e.type !== type) continue;
    for (const d of joursOuvMois) {
      if (d >= e.debut && d <= e.fin) set.add(d);
    }
  }
  return set;
}

/**
 * Jours ouvrables où la famille A ET la famille B sont absentes le même jour (« jour offert »).
 * Exclut les jours déjà couverts par une maladie nounou, un congé payé ou un jour de repos (entretien déjà exclu ailleurs).
 */
export function joursOffertsMois(evenements: Evt[], annee: number, mois: number): string[] {
  const joursOuvMois = joursOuvrablesDatesMois(annee, mois);
  const maladieSet = joursCouvertsParType(evenements, 'maladie_nounou',    joursOuvMois);
  const cpSet      = joursCouvertsParType(evenements, 'conge_paye',        joursOuvMois);
  const reposSet   = joursCouvertsParType(evenements, 'jour_repos',        joursOuvMois);
  const famASet    = joursCouvertsParType(evenements, 'absence_famille_a', joursOuvMois);
  const famBSet    = joursCouvertsParType(evenements, 'absence_famille_b', joursOuvMois);
  return joursOuvMois.filter(d => famASet.has(d) && famBSet.has(d) && !maladieSet.has(d) && !cpSet.has(d) && !reposSet.has(d));
}

// ── Jours fériés français ──────────────────────────────────────────

function easterDate(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function frenchHolidays(year: number): Set<string> {
  const pad = (n: number) => String(n).padStart(2, '0');
  const ds  = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const add = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
  const p   = year;
  const easter = easterDate(year);
  return new Set([
    `${p}-01-01`,
    ds(add(easter, 1)),
    `${p}-05-01`,
    `${p}-05-08`,
    ds(add(easter, 39)),
    ds(add(easter, 50)),
    `${p}-07-14`,
    `${p}-08-15`,
    `${p}-11-01`,
    `${p}-11-11`,
    `${p}-12-25`,
  ]);
}

/**
 * Jours fériés tombant un jour ouvré du mois, hors ceux déjà couverts par une maladie nounou, un congé payé,
 * un jour de repos ou un jour offert (entretien déjà exclu ailleurs — pas de double déduction).
 */
export function joursFeriesMois(evenements: Evt[], annee: number, mois: number): string[] {
  const joursOuvMois = joursOuvrablesDatesMois(annee, mois);
  const holidays   = frenchHolidays(annee);
  const maladieSet = joursCouvertsParType(evenements, 'maladie_nounou', joursOuvMois);
  const cpSet      = joursCouvertsParType(evenements, 'conge_paye',     joursOuvMois);
  const reposSet   = joursCouvertsParType(evenements, 'jour_repos',     joursOuvMois);
  const offertSet  = new Set(joursOffertsMois(evenements, annee, mois));
  return joursOuvMois.filter(d =>
    holidays.has(d) && !maladieSet.has(d) && !cpSet.has(d) && !reposSet.has(d) && !offertSet.has(d)
  );
}

// ── Calcul principal ──────────────────────────────────────────────

export function calculerMois(input: CalcInput): CalcResult {
  const {
    annee, mois, taux,
    hNormalesSemaine, hSup25Semaine, hSup50Semaine,
    repartitionA, repartitionIndemA = 0.5, navigo, indemEntretien, indemKm,
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

  const joursAbsRepos = evenements
    .filter(e => e.type === 'jour_repos')
    .reduce((acc, e) => acc + joursOuvrablesIntersect(e.debut, e.fin, annee, mois), 0);

  const joursAbs    = joursAbsMaladie + joursAbsCP + joursAbsRepos;
  const joursOffert = joursOffertsMois(evenements, annee, mois).length;
  const joursFeries = joursFeriesMois(evenements, annee, mois).length;
  const joursTrav   = Math.max(0, joursOuv - joursAbsMaladie);
  const ratio       = joursOuv > 0 ? joursTrav / joursOuv : 1;

  const tauxPresenceJour   = joursActifsParSemaine > 0 ? joursActifsParSemaine / 5 : 1;
  const joursEntretienBase = Math.max(0, joursOuv - joursAbsMaladie - joursAbsCP - joursAbsRepos - joursOffert - joursFeries);

  function calcFam(qp: number, indemRatio: number, aides: AidesInput | undefined): FamResult {
    const hNorm  = Math.round(H_NORM_MENS  * qp * ratio);
    const hSup25 = Math.round(H_SUP25_MENS * qp * ratio);
    const hSup50 = Math.round(H_SUP50_MENS * qp * ratio);

    const baseNet  = Math.round(H_NORM_MENS  * qp * taux        * ratio * 100) / 100;
    const sup25Net = Math.round(H_SUP25_MENS * qp * taux * 1.25 * ratio * 100) / 100;
    const sup50Net = Math.round(H_SUP50_MENS * qp * taux * 1.50 * ratio * 100) / 100;
    const salNet   = Math.round((baseNet + sup25Net + sup50Net) * 100) / 100;
    const exonerationHS = calculerExonerationHS(H_SUP25_MENS * qp, H_SUP50_MENS * qp, taux, ratio);

    const transport = Math.round(navigo   * indemRatio * 100) / 100;
    // L'indemnité d'entretien est due par enfant et par jour de présence — pondérée par la répartition des indemnités
    const entretien = Math.round(joursEntretienBase * tauxPresenceJour * indemEntretien * indemRatio * 100) / 100;
    const km        = Math.round(indemKm  * indemRatio * 100) / 100;
    const total     = Math.round((salNet + transport + entretien + km) * 100) / 100;

    const chargesSalariales = Math.round(salNet * K_SAL * 100) / 100;
    const chargesPatronales = Math.round(salNet * K_PAT * 100) / 100;
    const aidesTotal        = aides ? monthlyAides(aides) : 0;
    const resteCharge       = Math.round((total + chargesSalariales + chargesPatronales - aidesTotal) * 100) / 100;

    return { qp, hNorm, hSup25, hSup50, salNet, transport, entretien, km, total, exonerationHS, chargesSalariales, chargesPatronales, aidesTotal, resteCharge };
  }

  const famA = calcFam(repartitionA,     repartitionIndemA,       racOptionActive ? aidesA : undefined);
  const famB = calcFam(1 - repartitionA, 1 - repartitionIndemA,   racOptionActive ? aidesB : undefined);

  const totalNounou   = Math.round((famA.total + famB.total) * 100) / 100;
  const hTotalSemaine = Math.round((hNormalesSemaine + hSup25Semaine + hSup50Semaine) * 10) / 10;

  return { annee, mois, joursOuv, joursAbsMaladie, joursAbsCP, joursAbsRepos, joursAbs, joursOffert, joursFeries, joursTrav, ratio, hTotalSemaine, famA, famB, totalNounou, racOptionActive };
}

// ── Soldes de congés (CP + Jours de repos) ─────────────────────────

export type CompteCP = {
  regle:        'semaines' | 'jours_par_mois';
  nbSemaines?:  number;    // regle=semaines, défaut 5
  cycleDebut?:  string;    // regle=semaines, "YYYY-MM-DD" début du cycle CP
  joursParMois?: number;   // regle=jours_par_mois, défaut 2.5
  debutSuivi?:  string;    // regle=jours_par_mois, "YYYY-MM-DD" début du suivi
  decompteDepart: { annee: number; mois: number; jousConso: number };
};

export type CompteRepos = {
  totalAnnuel: number;   // jours accordés à chaque cycle, remis à zéro au renouvellement
  cycleDebut:  string;    // "YYYY-MM-DD" date de renouvellement annuel
  decompteDepart: { annee: number; mois: number; jousConso: number };
};

export type CongesJson = { cp: CompteCP; repos: CompteRepos };

export type SoldeCompte = { soldeInitial: number; joursPoses: number; aAcquerir: number; soldeEstime: number };

/** Lit congesJson en gérant l'ancien format plat (CompteCP au top-level, sans compte repos). */
export function parseCongesJson(raw: string | null): { cp: CompteCP | null; repos: CompteRepos | null } {
  if (!raw) return { cp: null, repos: null };
  const parsed = JSON.parse(raw);
  if (parsed && typeof parsed === 'object' && 'cp' in parsed) {
    return { cp: parsed.cp ?? null, repos: parsed.repos ?? null };
  }
  return { cp: parsed as CompteCP, repos: null };
}

type MoisEvtRecord = { annee: number; mois: number; evenementsJson: string };

function monthN(y: number, m: number): number { return y * 12 + m; }

function round1(n: number): number { return Math.round(n * 10) / 10; }

/** Dernier jour ISO du mois de référence d'un décompte de départ (ex: {2026,4} → "2026-04-30"). */
function finMoisISO(annee: number, mois: number): string {
  return `${annee}-${String(mois).padStart(2, '0')}-${String(new Date(annee, mois, 0).getDate()).padStart(2, '0')}`;
}

/** Premier jour ISO du mois de référence d'un décompte de départ (ex: {2026,4} → "2026-04-01"). */
function debutMoisISO(annee: number, mois: number): string {
  return `${annee}-${String(mois).padStart(2, '0')}-01`;
}

/** Jours d'un type d'événement donné, ouvrés, entre deux dates ISO (bornes incluses), tous mois confondus. */
function joursTypeEntreDates(moisRecords: MoisEvtRecord[], type: string, rangeDebut: string, rangeFin: string): number {
  let nb = 0;
  for (const rec of moisRecords) {
    const evts: Evt[] = JSON.parse(rec.evenementsJson || '[]');
    for (const e of evts) {
      if (e.type !== type) continue;
      nb += joursOuvrablesEntreDates(e.debut, e.fin, rangeDebut, rangeFin);
    }
  }
  return nb;
}

/**
 * Calcule les 4 colonnes façon Lucca (initial / posés / à acquérir / estimé).
 *
 * `soldeInitial` est le total brut accordé (sans déduire la consommation) : `joursPoses` porte TOUTE la
 * consommation connue jusqu'à la cible (décompte de départ inclus + événements réels), pour que le décompte de
 * départ reste visible dans le tableau dès l'initialisation, au lieu d'être absorbé silencieusement.
 * `aAcquerir` est dérivé à partir des 3 autres valeurs *déjà arrondies* (pas des valeurs brutes) : ça garantit que
 * l'équation affichée `soldeEstime = soldeInitial − joursPoses + aAcquerir` est exacte, sans écart d'arrondi.
 */
function soldeCompte(
  acquisA: (refISO: string) => number,
  consommeJusqua: (refISO: string) => number,
  todayISO: string, targetFinISO: string,
): SoldeCompte {
  const soldeInitial = round1(acquisA(todayISO));
  const joursPoses    = round1(consommeJusqua(targetFinISO));
  const soldeEstime   = round1(acquisA(targetFinISO) - consommeJusqua(targetFinISO));
  const aAcquerir     = round1(soldeEstime - soldeInitial + joursPoses);
  return { soldeInitial, joursPoses, aAcquerir, soldeEstime };
}

type CycleGrantConfig = { total: number; cycleDebut: string; decompteDepart: { annee: number; mois: number; jousConso: number } };

/**
 * Moteur commun aux comptes "octroyés en une fois par cycle annuel, remis à zéro au renouvellement"
 * (CP en règle "semaines par an" et Jours de repos) : `total` jours disponibles dès le début du cycle,
 * pas de montée progressive mensuelle — c'est la remise à zéro à date fixe qui fait la "progression" d'une année
 * sur l'autre, pas un prorata.
 */
function calculSoldeCycle(config: CycleGrantConfig, moisRecords: MoisEvtRecord[], evtType: string, todayISO: string, targetFinISO: string): SoldeCompte {
  const [cy, cm, cd] = config.cycleDebut.split('-').map(Number);
  const anchorDay = cd || 1;

  /** Début (ISO) du cycle annuel contenant refISO — gère aussi refISO antérieur à l'ancre configurée. */
  const cycleStartFor = (refISO: string): string => {
    const [y, m] = refISO.split('-').map(Number);
    const n = Math.floor((monthN(y, m) - monthN(cy, cm)) / 12);
    return dateISO(new Date(cy + n, cm - 1, anchorDay));
  };

  const acquisA = (): number => config.total;

  const dep = config.decompteDepart;
  const depFinMois   = finMoisISO(dep.annee, dep.mois);
  const depDebutMois = debutMoisISO(dep.annee, dep.mois);
  const consommeJusqua = (refISO: string): number => {
    const cycleStart = cycleStartFor(refISO);
    // Le décompte de départ ne compte que s'il tombe dans le même cycle que refISO — sinon il a été remis à zéro.
    const depDansCycle = depFinMois >= cycleStart;
    const baseline  = depDansCycle ? dep.jousConso : 0;
    // On ne recompte que les événements réels des mois STRICTEMENT avant le mois de référence : ceux du mois de
    // référence lui-même doivent rester comptés normalement (ex: un congé posé plus tard dans ce même mois).
    const fromDate  = depDansCycle ? depDebutMois : cycleStart;
    return baseline + joursTypeEntreDates(moisRecords, evtType, fromDate, refISO);
  };

  return soldeCompte(acquisA, consommeJusqua, todayISO, targetFinISO);
}

export function calculSoldeCP(config: CompteCP, moisRecords: MoisEvtRecord[], todayISO: string, targetFinISO: string): SoldeCompte {
  if (config.regle === 'semaines' && config.cycleDebut) {
    const total = (config.nbSemaines ?? 5) * 5;
    return calculSoldeCycle({ total, cycleDebut: config.cycleDebut, decompteDepart: config.decompteDepart }, moisRecords, 'conge_paye', todayISO, targetFinISO);
  }

  // regle="jours_par_mois" : acquisition progressive ouverte, sans cycle ni remise à zéro.
  const acquisA = (refISO: string): number => {
    if (config.regle === 'jours_par_mois' && config.debutSuivi) {
      const [refY, refM] = refISO.split('-').map(Number);
      const [sy, sm] = config.debutSuivi.split('-').map(Number);
      const elapsed = Math.max(0, monthN(refY, refM) - monthN(sy, sm) + 1);
      return elapsed * (config.joursParMois ?? 2.5);
    }
    return 0;
  };

  const dep = config.decompteDepart;
  const depDebutMois = debutMoisISO(dep.annee, dep.mois);
  const consommeJusqua = (refISO: string): number => {
    if (refISO < depDebutMois) return dep.jousConso;
    // On ne recompte que les événements réels des mois STRICTEMENT avant le mois de référence : ceux du mois de
    // référence lui-même doivent rester comptés normalement (ex: un congé posé plus tard dans ce même mois).
    return dep.jousConso + joursTypeEntreDates(moisRecords, 'conge_paye', depDebutMois, refISO);
  };

  return soldeCompte(acquisA, consommeJusqua, todayISO, targetFinISO);
}

export function calculSoldeRepos(config: CompteRepos, moisRecords: MoisEvtRecord[], todayISO: string, targetFinISO: string): SoldeCompte {
  return calculSoldeCycle(
    { total: config.totalAnnuel, cycleDebut: config.cycleDebut, decompteDepart: config.decompteDepart },
    moisRecords, 'jour_repos', todayISO, targetFinISO,
  );
}
