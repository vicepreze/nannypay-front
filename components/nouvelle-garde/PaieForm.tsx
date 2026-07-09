'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  calcBModeRepartition,
  calcEquitableRatioIteratif,
  calculerSalaireEtCotisations,
  estimerCMG2025,
  ciPlafondMensuel,
  K_TOTAL,
  K_PAT,
  calcHeuresSemaineFromPlanning,
} from '@/lib/calcul';
import { DetailedCalcTable, type FamCalcData, type NounouCalcData } from '@/components/DetailedCalcTable';

export type Aides = {
  cmgCotisations:    number;
  cmgRemuneration:   number;
  abattementCharges: number;
  aideVille:         number;
  creditImpot:       number;
};

export type PaieFormValue = {
  taux:         number;
  navigo:       number;
  indemKm:      number;
  entretien:    number;
  repartIndemA: number;
  repartA:      number;
  racOption:    boolean;
  modeExpert:   boolean;
  aA: Aides;
  aB: Aides;
};

export type Enfant = { prenom: string; fam: string };

export const aidesZero = (): Aides => ({
  cmgCotisations: 0, cmgRemuneration: 0, abattementCharges: 0, aideVille: 0, creditImpot: 0,
});

export function totalAidesMens(a: Aides): number {
  return Math.round(
    (a.cmgCotisations + a.cmgRemuneration + a.abattementCharges + a.aideVille + a.creditImpot / 12) * 100
  ) / 100;
}

const SLIDER_MIN = 20;
const SLIDER_MAX = 80;
const pct = (p: number) => ((p * 100 - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

export function PaieForm({
  value, onChange, nomA, nomB, joursJson, enfants, showDetailedCalc = true,
}: {
  value: PaieFormValue;
  onChange: (v: PaieFormValue) => void;
  nomA: string;
  nomB: string;
  joursJson: string;
  enfants: Enfant[];
  showDetailedCalc?: boolean;
}) {
  const { taux, navigo, indemKm, entretien, repartIndemA, repartA, racOption, modeExpert, aA, aB } = value;
  const set = (patch: Partial<PaieFormValue>) => onChange({ ...value, ...patch });

  const [showDetail, setShowDetail] = useState(false);

  // Revenus fiscaux internes — 80 000 € par défaut, non exposés en UI Mode Magique
  const revFiscauxA = 80_000;
  const revFiscauxB = 80_000;

  const pProportionnel = useMemo(
    () => calcBModeRepartition(joursJson, enfants),
    [joursJson, enfants]
  );

  const planningHours = useMemo(() => calcHeuresSemaineFromPlanning(joursJson), [joursJson]);
  const nbEnfantsA = useMemo(() => Math.max(1, enfants.filter(e => e.fam === 'A').length), [enfants]);
  const nbEnfantsB = useMemo(() => Math.max(1, enfants.filter(e => e.fam === 'B').length), [enfants]);

  // Base non arrondie (heures mensualisées exactes) — sert uniquement de repère continu à la
  // recherche itérative du ratio équitable (racOptimal, ci-dessous) ; les montants réellement
  // affichés (aperçuA/aperçuB) utilisent les heures arrondies au 0,5 sup. comme Pajemploi.
  const salNetTotalMens = useMemo(() => {
    const base  = planningHours.hNormalesSemaine * 52/12 * taux;
    const sup25 = planningHours.hSup25Semaine    * 52/12 * taux * 1.25;
    const sup50 = planningHours.hSup50Semaine    * 52/12 * taux * 1.50;
    return Math.round((base + sup25 + sup50) * 100) / 100;
  }, [planningHours, taux]);

  const totalHeuresMensPhys = useMemo(() => {
    return (planningHours.hNormalesSemaine + planningHours.hSup25Semaine + planningHours.hSup50Semaine) * 52/12;
  }, [planningHours]);

  const racOptimal = useMemo(() => {
    if (!racOption || salNetTotalMens <= 0) return null;
    return calcEquitableRatioIteratif(
      salNetTotalMens,
      { nbEnfants: nbEnfantsA, revenusFiscaux: revFiscauxA, autresAidesMens: 0 },
      { nbEnfants: nbEnfantsB, revenusFiscaux: revFiscauxB, autresAidesMens: 0 },
      pProportionnel,
      taux,
      totalHeuresMensPhys,
    );
  }, [racOption, salNetTotalMens, nbEnfantsA, nbEnfantsB, pProportionnel, taux, totalHeuresMensPhys]);

  // Applique le ratio optimal au slider uniquement en Mode Magique
  useEffect(() => {
    if (racOptimal && !modeExpert && repartA !== racOptimal.meilleurRatio) {
      set({ repartA: racOptimal.meilleurRatio });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [racOptimal, modeExpert]);

  // Aperçu réel par famille : heures arrondies au 0,5 sup. (seul incrément accepté par Pajemploi),
  // salaire net + exonération HS + cotisations détaillées Urssaf — ce sont ces montants qui
  // s'afficheront partout (carte principale, calcul détaillé). Le Reste à Charge (Mode Magique)
  // continue de chercher son ratio optimal sur la base continue salNetTotalMens ci-dessus, pour
  // ne pas casser la recherche itérative — seul le résultat final (liveRac) reprend ces montants réels.
  const apercuA = useMemo(
    () => calculerSalaireEtCotisations(
      planningHours.hNormalesSemaine * 52/12 * repartA,
      planningHours.hSup25Semaine    * 52/12 * repartA,
      planningHours.hSup50Semaine    * 52/12 * repartA,
      taux,
    ),
    [planningHours, repartA, taux]
  );
  const apercuB = useMemo(
    () => calculerSalaireEtCotisations(
      planningHours.hNormalesSemaine * 52/12 * (1 - repartA),
      planningHours.hSup25Semaine    * 52/12 * (1 - repartA),
      planningHours.hSup50Semaine    * 52/12 * (1 - repartA),
      taux,
    ),
    [planningHours, repartA, taux]
  );

  const liveRac = useMemo(() => {
    if (!racOption) return { racA: 0, racB: 0, totalRac: 0 };
    const salA = apercuA.salNet;
    const salB = apercuB.salNet;
    if (modeExpert) {
      const aidesA = totalAidesMens(aA);
      const aidesB = totalAidesMens(aB);
      const racA = Math.round((salA * K_TOTAL - aidesA) * 100) / 100;
      const racB = Math.round((salB * K_TOTAL - aidesB) * 100) / 100;
      return { racA, racB, totalRac: racA + racB };
    }
    const coutA   = salA * K_TOTAL;
    const coutB   = salB * K_TOTAL;
    const cmgA    = estimerCMG2025(revFiscauxA, nbEnfantsA, taux, totalHeuresMensPhys * repartA, salA * K_PAT);
    const cmgB    = estimerCMG2025(revFiscauxB, nbEnfantsB, taux, totalHeuresMensPhys * (1 - repartA), salB * K_PAT);
    const eligA   = Math.max(0, coutA - cmgA);
    const eligB   = Math.max(0, coutB - cmgB);
    const ciA     = Math.min(Math.round(eligA * 0.5 * 100) / 100, ciPlafondMensuel(nbEnfantsA));
    const ciB     = Math.min(Math.round(eligB * 0.5 * 100) / 100, ciPlafondMensuel(nbEnfantsB));
    const racA    = Math.round((coutA - cmgA - ciA) * 100) / 100;
    const racB    = Math.round((coutB - cmgB - ciB) * 100) / 100;
    return { racA, racB, totalRac: racA + racB };
  }, [racOption, modeExpert, apercuA.salNet, apercuB.salNet, repartA, nbEnfantsA, nbEnfantsB, taux, totalHeuresMensPhys, aA, aB]);

  const racPctA = liveRac.totalRac > 0 ? Math.round((liveRac.racA / liveRac.totalRac) * 100) : 0;
  const racPctB = liveRac.totalRac > 0 ? Math.round((liveRac.racB / liveRac.totalRac) * 100) : 0;
  const isMagicMode = racOption && !modeExpert;

  const detailData = useMemo(() => {
    const joursActifsMens = (planningHours.joursActifsParSemaine || 5) * 52 / 12;

    const buildFam = (indemRatio: number, apercu: typeof apercuA, rac: number, isA: boolean): FamCalcData => {
      const transportFam = Math.round(navigo    * indemRatio * 100) / 100;
      const entretienFam = Math.round(entretien * joursActifsMens * indemRatio * 100) / 100;
      const kmFam         = Math.round(indemKm  * indemRatio * 100) / 100;

      let cmgCot = 0, cmgRemu = 0, creditImpotMens = 0;
      if (racOption) {
        if (modeExpert) {
          const aides = isA ? aA : aB;
          cmgCot = aides.cmgCotisations;
          cmgRemu = aides.cmgRemuneration;
          creditImpotMens = aides.creditImpot / 12;
        } else if (racOptimal) {
          cmgCot = isA ? racOptimal.cmgCotA : racOptimal.cmgCotB;
          cmgRemu = isA ? racOptimal.cmgRemuA : racOptimal.cmgRemuB;
          creditImpotMens = isA ? racOptimal.ciAMens : racOptimal.ciBMens;
        }
      }

      // Formule exacte du bulletin Pajemploi (hors entretien, versé hors volet social)
      const netAPayerAvantIR = Math.round((apercu.salNet + transportFam + kmFam + apercu.exonerationHS) * 100) / 100;
      const totalVerseReel   = Math.round((netAPayerAvantIR + entretienFam) * 100) / 100;

      return {
        nom: isA ? nomA : nomB,
        nbEnfants: isA ? nbEnfantsA : nbEnfantsB,
        hNorm: apercu.hNorm, hSup25: apercu.hSup25, hSup50: apercu.hSup50,
        salNet: apercu.salNet, exonerationHS: apercu.exonerationHS,
        brut: apercu.brut, cotisations: apercu.cotisations,
        transport: transportFam, entretien: entretienFam, km: kmFam,
        netAPayerAvantIR, totalVerseReel,
        cmgCotisations: cmgCot, cmgRemuneration: cmgRemu,
        abattementCharges: 0, aideVille: 0, creditImpotMens,
        resteCharge: rac,
      };
    };

    const famAData = buildFam(repartIndemA, apercuA, liveRac.racA, true);
    const famBData = buildFam(1 - repartIndemA, apercuB, liveRac.racB, false);

    const nounou: NounouCalcData = {
      hNorm:  Math.round((apercuA.hNorm  + apercuB.hNorm)  * 10) / 10,
      hSup25: Math.round((apercuA.hSup25 + apercuB.hSup25) * 10) / 10,
      hSup50: Math.round((apercuA.hSup50 + apercuB.hSup50) * 10) / 10,
      salNet:        Math.round((apercuA.salNet        + apercuB.salNet)        * 100) / 100,
      exonerationHS: Math.round((apercuA.exonerationHS + apercuB.exonerationHS) * 100) / 100,
      brut:          Math.round((apercuA.brut          + apercuB.brut)          * 100) / 100,
      transport: Math.round(navigo * 100) / 100,
      entretien: Math.round(entretien * joursActifsMens * 100) / 100,
      km: Math.round(indemKm * 100) / 100,
      netAPayerAvantIR: Math.round((famAData.netAPayerAvantIR + famBData.netAPayerAvantIR) * 100) / 100,
      totalVerseReel:   Math.round((famAData.totalVerseReel   + famBData.totalVerseReel)   * 100) / 100,
    };

    return { famA: famAData, famB: famBData, nounou };
  }, [
    planningHours, apercuA, apercuB, repartIndemA, navigo, entretien, indemKm,
    racOption, modeExpert, racOptimal, aA, aB, liveRac, nomA, nomB, nbEnfantsA, nbEnfantsB,
  ]);

  function handleRacToggle(on: boolean) {
    set({ racOption: on, modeExpert: false });
    if (on && salNetTotalMens > 0) {
      const res = calcEquitableRatioIteratif(
        salNetTotalMens,
        { nbEnfants: nbEnfantsA, revenusFiscaux: 80_000, autresAidesMens: 0 },
        { nbEnfants: nbEnfantsB, revenusFiscaux: 80_000, autresAidesMens: 0 },
        pProportionnel, taux, totalHeuresMensPhys,
      );
      set({ racOption: on, modeExpert: false, repartA: res.meilleurRatio });
    }
  }

  function handleOpenExpert() {
    if (racOptimal) {
      set({
        modeExpert: true,
        aA: { cmgCotisations: racOptimal.cmgCotA, cmgRemuneration: racOptimal.cmgRemuA, abattementCharges: 0, aideVille: 0, creditImpot: Math.round(racOptimal.ciAMens * 12) },
        aB: { cmgCotisations: racOptimal.cmgCotB, cmgRemuneration: racOptimal.cmgRemuB, abattementCharges: 0, aideVille: 0, creditImpot: Math.round(racOptimal.ciBMens * 12) },
      });
    } else {
      set({ modeExpert: true });
    }
  }

  function handleResetToMagic() {
    if (racOptimal) {
      set({
        aA: { cmgCotisations: racOptimal.cmgCotA, cmgRemuneration: racOptimal.cmgRemuA, abattementCharges: 0, aideVille: 0, creditImpot: Math.round(racOptimal.ciAMens * 12) },
        aB: { cmgCotisations: racOptimal.cmgCotB, cmgRemuneration: racOptimal.cmgRemuB, abattementCharges: 0, aideVille: 0, creditImpot: Math.round(racOptimal.ciBMens * 12) },
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="1 — Rémunération">
        <FN label="Taux horaire net (€/h)" value={taux} onChange={v => set({ taux: v })} />
        <p className="text-xs text-[var(--dust)] -mt-1">
          = {(taux / 0.7812).toFixed(2)} € brut · charges salariales 21,88 %
        </p>
      </Card>

      <Card
        title="2 — Indemnités"
        headerRight={<PartFamilleACta value={repartIndemA} onChange={v => set({ repartIndemA: v })} />}
      >
        <div className="grid grid-cols-3 gap-3">
          <FN label="Navigo (€/mois)"   value={navigo}    onChange={v => set({ navigo: v })} />
          <FN label="Frais km (€/mois)" value={indemKm}   onChange={v => set({ indemKm: v })} />
          <FN label="Entretien (€/j)"   value={entretien} onChange={v => set({ entretien: v })} />
        </div>
      </Card>

      <div className="rounded-[var(--radius)] overflow-hidden bg-white border border-[var(--line)]">
        <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--ink)]">3 — Répartition entre familles</span>
          {racOption && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--sage-light,#eef4ec)] text-[var(--sage)]">
              Reste à charge
            </span>
          )}
        </div>

        <div className="p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="text-[var(--dust)]">{nomA}</span>
              <span className="font-semibold text-[var(--ink)] tabular-nums">
                {(repartA * 100).toFixed(0)} % — {((1 - repartA) * 100).toFixed(0)} %
              </span>
              <span className="text-[var(--dust)]">{nomB}</span>
            </div>
            <SliderRow
              value={repartA}
              onChange={v => set({ repartA: v })}
              min={SLIDER_MIN} max={SLIDER_MAX}
              markers={[
                { value: 0.5, label: '50/50' },
                ...(racOption && racOptimal ? [{ value: racOptimal.meilleurRatio, label: 'Équitable RAC', highlight: true }] : []),
              ]}
            />
            <button
              onClick={() => set({ repartA: pProportionnel })}
              className="text-[11px] text-[var(--dust)] hover:text-[var(--ink)] mt-3 underline decoration-dotted transition-colors"
            >
              ↩ Revenir au calcul automatique ({(pProportionnel * 100).toFixed(1)} %)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FamPreview
              label={nomA} percent={repartA} color="sage"
              salNet={apercuA.salNet} rac={liveRac.racA} totalRac={liveRac.totalRac}
              racOption={racOption} magicMode={isMagicMode} racPct={racPctA}
            />
            <FamPreview
              label={nomB} percent={1 - repartA} color="blue"
              salNet={apercuB.salNet} rac={liveRac.racB} totalRac={liveRac.totalRac}
              racOption={racOption} magicMode={isMagicMode} racPct={racPctB}
            />
          </div>

          {isMagicMode && (
            <div className="flex items-start gap-2 text-xs text-[var(--dust)] bg-[var(--paper)] rounded-lg px-3 py-2.5 border border-[var(--line)]">
              <span className="mt-0.5">✨</span>
              <span>Mode magique actif — le curseur est positionné au point d&apos;équilibre équitable selon le barème CAF 2025.</span>
            </div>
          )}

          {racOption && modeExpert && (
            <div className="rounded-[var(--radius)] border border-[var(--line)] overflow-hidden -mx-5">
              <div className="grid grid-cols-2 divide-x divide-[var(--line)]">
                <AidesColumn label={nomA} a={aA} setA={v => set({ aA: v })} total={totalAidesMens(aA)} />
                <AidesColumn label={nomB} a={aB} setA={v => set({ aB: v })} total={totalAidesMens(aB)} />
              </div>
              <div className="px-5 py-3 border-t border-[var(--line)] flex items-center gap-5 bg-[var(--paper)]">
                <button
                  onClick={handleResetToMagic}
                  disabled={!racOptimal}
                  className="text-xs text-[var(--dust)] hover:text-[var(--ink)] underline decoration-dotted transition-colors disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                >
                  ↺ Rétablir l&apos;estimation magique
                </button>
                <button
                  onClick={() => set({ modeExpert: false })}
                  className="text-xs text-[var(--dust)] hover:text-[var(--ink)] underline decoration-dotted transition-colors"
                >
                  ← Mode Magique
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-1 border-t border-[var(--line)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--ink)]">Calculer selon le Reste à Charge</span>
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-[var(--sage-light,#eef4ec)] text-[var(--sage)]">Recommandé</span>
              </div>
              <p className="text-xs text-[var(--dust)] mt-0.5">Point d&apos;équilibre calculé selon le barème CAF 2025</p>
              {racOption && !modeExpert && (
                <button
                  onClick={handleOpenExpert}
                  disabled={!racOptimal}
                  className="mt-1.5 text-xs text-[var(--dust)] hover:text-[var(--ink)] underline decoration-dotted transition-colors disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                >
                  ⚙️ Ajuster mes aides manuellement (Mode Expert)
                </button>
              )}
            </div>
            <Toggle checked={racOption} onChange={handleRacToggle} />
          </div>

          {showDetailedCalc && (
            <div>
              <button
                onClick={() => setShowDetail(v => !v)}
                className="flex items-center gap-1.5 text-xs text-[var(--dust)] hover:text-[var(--ink)] transition-colors"
              >
                <span className="text-[10px]">{showDetail ? '▾' : '▸'}</span>
                Voir le calcul détaillé
              </button>
              {showDetail && (
                <div className="mt-3">
                  <DetailedCalcTable
                    famA={detailData.famA}
                    famB={detailData.famB}
                    nounou={detailData.nounou}
                    racOptionActive={racOption}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function SliderRow({ value, onChange, min, max, markers }: {
  value: number;
  onChange: (v: number) => void;
  min: number; max: number;
  markers: { value: number; label: string; highlight?: boolean }[];
}) {
  return (
    <div>
      <div className="relative h-5 mb-1">
        {markers.map((m, i) => {
          const p = pct(m.value);
          if (p < -5 || p > 105) return null;
          return (
            <span
              key={i}
              className={`absolute text-[10px] -translate-x-1/2 whitespace-nowrap ${m.highlight ? 'text-[var(--sage)] font-semibold' : 'text-[var(--dust)]'}`}
              style={{ left: `${p}%` }}
            >
              {m.label}
            </span>
          );
        })}
      </div>

      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[var(--line)]" />
        {markers.map((m, i) => {
          const p = pct(m.value);
          if (p < 0 || p > 100) return null;
          return (
            <span
              key={i}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${m.highlight ? 'bg-[var(--sage)]' : 'bg-[var(--dust)]'}`}
              style={{ left: `${p}%` }}
            />
          );
        })}
        <input
          type="range"
          min={min} max={max} step={0.1}
          value={value * 100}
          onChange={e => onChange(parseFloat(e.target.value) / 100)}
          className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer slider-thumb"
          style={{ WebkitAppearance: 'none' }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-[var(--dust)] mt-1">
        <span>{min} %</span>
        <span>{max} %</span>
      </div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid var(--sage);
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid var(--sage);
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
}

function FamPreview({ label, percent, color, salNet, rac, totalRac, racOption, magicMode, racPct }: {
  label: string; percent: number; color: 'sage' | 'blue';
  salNet: number; rac: number; totalRac: number;
  racOption: boolean; magicMode?: boolean; racPct?: number;
}) {
  const bg   = color === 'sage' ? 'bg-[var(--sage-light)]' : 'bg-blue-50';
  const text = color === 'sage' ? 'text-[var(--sage)]'     : 'text-blue-700';

  if (magicMode && racOption) {
    return (
      <div className={`rounded-[var(--radius)] p-4 ${bg}`}>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-sm font-semibold ${text}`}>{label}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded bg-white ${text}`}>{(percent * 100).toFixed(1)} %</span>
        </div>
        <div className="text-[11px] text-[var(--dust)] mb-0.5">Net à déclarer sur Pajemploi</div>
        <div className={`text-xl font-bold ${text} mb-3`}>{salNet.toFixed(2)} €</div>
        <div className="pt-3 border-t border-white/70">
          <div className="text-[11px] text-[var(--dust)] mb-0.5">Reste à charge estimé</div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-xl font-bold ${text}`}>{rac.toFixed(0)} €</span>
            {racPct !== undefined && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/80 ${text}`}>{racPct} % du RAC total</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const pctRac = totalRac > 0 ? rac / totalRac : percent;
  return (
    <div className={`rounded-[var(--radius)] p-4 ${bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${text}`}>{label}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded bg-white ${text}`}>{(percent * 100).toFixed(1)} %</span>
      </div>
      <div className="text-[11px] text-[var(--dust)]">Net à déclarer sur Pajemploi</div>
      <div className={`text-xl font-bold ${text}`}>{salNet.toFixed(2)} €</div>

      {racOption && (
        <div className="mt-3 pt-3 border-t border-white/70">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] text-[var(--dust)]">Reste à charge</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded bg-white ${text}`}>{(pctRac * 100).toFixed(1)} %</span>
          </div>
          <div className={`text-lg font-bold ${text}`}>{rac.toFixed(2)} €</div>
        </div>
      )}
    </div>
  );
}

function AidesColumn({ label, a, setA, total }: {
  label: string; a: Aides; setA: (v: Aides) => void; total: number;
}) {
  const upd = (k: keyof Aides) => (v: number) => setA({ ...a, [k]: v });
  return (
    <div className="p-5 space-y-3">
      <div className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wide">{label}</div>
      <FN label="Abattement charges patronales"       value={a.abattementCharges} onChange={upd('abattementCharges')} />
      <FN label="CMG cotisations sociales (CAF)"      value={a.cmgCotisations}    onChange={upd('cmgCotisations')} />
      <FN label="CMG rémunération (CAF)"              value={a.cmgRemuneration}   onChange={upd('cmgRemuneration')} />
      <FN label="Aide locale (ex : Ville de St Ouen)" value={a.aideVille}         onChange={upd('aideVille')} />
      <FN label="Crédit d'impôt (annuel)"             value={a.creditImpot}       onChange={upd('creditImpot')} />
      <div className="flex justify-between pt-3 border-t border-[var(--line)] text-xs font-semibold">
        <span>Total aides / mois</span>
        <span className="font-mono text-[var(--sage)]">− {total.toFixed(2)} €</span>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[var(--sage)]' : 'bg-[var(--line)]'}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

function PartFamilleACta({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [raw,     setRaw]     = useState(() => String(Math.round(value * 100)));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setRaw(String(Math.round(value * 100)));
  }, [value, focused]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const s = e.target.value;
    setRaw(s);
    const n = parseFloat(s);
    if (!isNaN(n)) onChange(Math.min(1, Math.max(0, n / 100)));
  }

  function handleBlur() {
    setFocused(false);
    const n = parseFloat(raw);
    const clamped = isNaN(n) ? 50 : Math.min(100, Math.max(0, Math.round(n)));
    setRaw(String(clamped));
    onChange(clamped / 100);
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] text-[var(--dust)]">Part famille A</span>
        <input
          type="number"
          min={0}
          max={100}
          value={raw}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          className="w-[58px] text-center font-bold text-white bg-[var(--sage)] rounded-md px-1 py-0.5 text-[13px] border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-[12px] text-[var(--dust)]">%</span>
      </div>
      <p className="text-[11px] text-[var(--dust)]">↙ s&apos;applique aux champs ci-dessous</p>
    </div>
  );
}

function Card({ title, headerRight, children }: { title: string; headerRight?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] overflow-hidden bg-white border border-[var(--line)]">
      <div className="px-5 py-2.5 border-b border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-[var(--ink)]">{title}</span>
        {headerRight}
      </div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

function FN({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [raw, setRaw] = useState(() => (value !== 0 ? String(value) : ''));

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const s = e.target.value;
    setRaw(s);
    const n = parseFloat(s.replace(',', '.'));
    onChange(isNaN(n) ? 0 : n);
  }

  function handleBlur() {
    const n = parseFloat(raw.replace(',', '.'));
    setRaw(!isNaN(n) && n !== 0 ? String(n) : '');
    onChange(isNaN(n) ? 0 : n);
  }

  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-[var(--dust)]">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        placeholder="0"
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-white border border-[var(--line)] focus:border-[var(--sage)]"
      />
    </div>
  );
}
