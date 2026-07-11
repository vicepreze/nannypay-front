'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  calcBModeRepartition,
  calcRatioBonnePratique,
  calculerSalaireEtCotisations,
  memeHorairesTousEnfants,
  ciPlafondMensuel,
  K_TOTAL,
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

  const pProportionnel = useMemo(
    () => calcBModeRepartition(joursJson, enfants),
    [joursJson, enfants]
  );

  const planningHours = useMemo(() => calcHeuresSemaineFromPlanning(joursJson), [joursJson]);
  const nbEnfantsA = useMemo(() => Math.max(1, enfants.filter(e => e.fam === 'A').length), [enfants]);
  const nbEnfantsB = useMemo(() => Math.max(1, enfants.filter(e => e.fam === 'B').length), [enfants]);

  // Le ratio "bonne pratique" (60/40 selon le nombre d'enfants) n'est proposé que pour une garde
  // à 3 enfants au total, avec des horaires identiques pour tous les enfants : dans les autres cas
  // la répartition aux heures réelles est plus pertinente et l'utilisateur ajuste le curseur lui-même.
  const bonnePratiqueEligible = useMemo(() => {
    const rawNbA = enfants.filter(e => e.fam === 'A').length;
    const rawNbB = enfants.filter(e => e.fam === 'B').length;
    if (rawNbA === 0 || rawNbB === 0 || rawNbA + rawNbB !== 3) return false;
    return memeHorairesTousEnfants(joursJson, enfants);
  }, [enfants, joursJson]);

  const bonnePratiqueRatio = useMemo(
    () => calcRatioBonnePratique(nbEnfantsA, nbEnfantsB),
    [nbEnfantsA, nbEnfantsB]
  );

  // Applique le ratio bonne pratique au slider uniquement en mode bonne pratique (pas en Mode Expert)
  useEffect(() => {
    if (racOption && !modeExpert && bonnePratiqueEligible && repartA !== bonnePratiqueRatio) {
      set({ repartA: bonnePratiqueRatio });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [racOption, modeExpert, bonnePratiqueEligible, bonnePratiqueRatio]);

  // Aperçu réel par famille : heures arrondies à l'entier le plus proche (seul incrément accepté par
  // Pajemploi), salaire net + exonération HS + cotisations détaillées Urssaf — ce sont ces montants
  // qui s'afficheront partout (carte principale, calcul détaillé).
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

  // Le Reste à Charge n'est calculé qu'en Mode Expert, à partir des aides réellement saisies par
  // l'utilisateur — le mode bonne pratique ne génère aucune estimation de RAC (pas de revenu collecté).
  const liveRac = useMemo(() => {
    if (!racOption || !modeExpert) return { racA: 0, racB: 0, totalRac: 0 };
    const aidesA = totalAidesMens(aA);
    const aidesB = totalAidesMens(aB);
    const racA = Math.round((apercuA.salNet * K_TOTAL - aidesA) * 100) / 100;
    const racB = Math.round((apercuB.salNet * K_TOTAL - aidesB) * 100) / 100;
    return { racA, racB, totalRac: racA + racB };
  }, [racOption, modeExpert, apercuA.salNet, apercuB.salNet, aA, aB]);

  // Crédit d'impôt (Mode Expert) : formule connue (plafond par enfant + 50 % du coût restant) qui ne
  // dépend pas du revenu — calculée automatiquement, contrairement aux autres aides (CMG, abattement)
  // qui nécessiteraient un revenu que l'app ne collecte pas pour des raisons de confidentialité.
  const ciAutoAnnuelA = useMemo(() => {
    const coutA = apercuA.salNet * K_TOTAL;
    const eligA = Math.max(0, coutA - aA.cmgCotisations - aA.cmgRemuneration - aA.abattementCharges - aA.aideVille);
    const ciMens = Math.min(Math.round(eligA * 0.5 * 100) / 100, ciPlafondMensuel(nbEnfantsA));
    return Math.round(ciMens * 12 * 100) / 100;
  }, [apercuA.salNet, aA.cmgCotisations, aA.cmgRemuneration, aA.abattementCharges, aA.aideVille, nbEnfantsA]);

  const ciAutoAnnuelB = useMemo(() => {
    const coutB = apercuB.salNet * K_TOTAL;
    const eligB = Math.max(0, coutB - aB.cmgCotisations - aB.cmgRemuneration - aB.abattementCharges - aB.aideVille);
    const ciMens = Math.min(Math.round(eligB * 0.5 * 100) / 100, ciPlafondMensuel(nbEnfantsB));
    return Math.round(ciMens * 12 * 100) / 100;
  }, [apercuB.salNet, aB.cmgCotisations, aB.cmgRemuneration, aB.abattementCharges, aB.aideVille, nbEnfantsB]);

  useEffect(() => {
    if (!modeExpert) return;
    if (aA.creditImpot === ciAutoAnnuelA && aB.creditImpot === ciAutoAnnuelB) return;
    set({ aA: { ...aA, creditImpot: ciAutoAnnuelA }, aB: { ...aB, creditImpot: ciAutoAnnuelB } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeExpert, ciAutoAnnuelA, ciAutoAnnuelB]);

  const isBonnePratiqueMode = racOption && !modeExpert;

  const detailData = useMemo(() => {
    const joursActifsMens = (planningHours.joursActifsParSemaine || 5) * 52 / 12;

    const buildFam = (indemRatio: number, apercu: typeof apercuA, rac: number, isA: boolean): FamCalcData => {
      const transportFam = Math.round(navigo    * indemRatio * 100) / 100;
      const entretienFam = Math.round(entretien * joursActifsMens * indemRatio * 100) / 100;
      const kmFam         = Math.round(indemKm  * indemRatio * 100) / 100;

      let cmgCot = 0, cmgRemu = 0, creditImpotMens = 0;
      if (racOption && modeExpert) {
        const aides = isA ? aA : aB;
        cmgCot = aides.cmgCotisations;
        cmgRemu = aides.cmgRemuneration;
        creditImpotMens = aides.creditImpot / 12;
      }

      // Formule exacte du bulletin Pajemploi (hors entretien, versé hors volet social)
      const netAPayerAvantIR = Math.round((apercu.salNet + transportFam + kmFam + apercu.exonerationHS) * 100) / 100;
      const totalVerseReel   = Math.round((netAPayerAvantIR + entretienFam) * 100) / 100;

      return {
        nom: isA ? nomA : nomB,
        nbEnfants: isA ? nbEnfantsA : nbEnfantsB,
        hNorm: apercu.hNorm, hSup25: apercu.hSup25, hSup50: apercu.hSup50,
        salNet: apercu.salNet, exonerationHS: apercu.exonerationHS,
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
      transport: Math.round(navigo * 100) / 100,
      entretien: Math.round(entretien * joursActifsMens * 100) / 100,
      km: Math.round(indemKm * 100) / 100,
      netAPayerAvantIR: Math.round((famAData.netAPayerAvantIR + famBData.netAPayerAvantIR) * 100) / 100,
      totalVerseReel:   Math.round((famAData.totalVerseReel   + famBData.totalVerseReel)   * 100) / 100,
    };

    return { famA: famAData, famB: famBData, nounou };
  }, [
    planningHours, apercuA, apercuB, repartIndemA, navigo, entretien, indemKm,
    racOption, modeExpert, aA, aB, liveRac, nomA, nomB, nbEnfantsA, nbEnfantsB,
  ]);

  function handleRacToggle(on: boolean) {
    if (on && bonnePratiqueEligible) {
      set({ racOption: on, modeExpert: false, repartA: bonnePratiqueRatio });
    } else {
      set({ racOption: on, modeExpert: false });
    }
  }

  function handleOpenExpert() {
    set({ modeExpert: true });
  }

  function handleResetAides() {
    set({ aA: aidesZero(), aB: aidesZero() });
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
              {modeExpert ? 'Reste à charge' : 'Bonne pratique'}
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
                ...(racOption && bonnePratiqueEligible ? [{ value: bonnePratiqueRatio, label: 'Bonne pratique', highlight: true }] : []),
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
              racOption={racOption} bonnePratique={isBonnePratiqueMode}
            />
            <FamPreview
              label={nomB} percent={1 - repartA} color="blue"
              salNet={apercuB.salNet} rac={liveRac.racB} totalRac={liveRac.totalRac}
              racOption={racOption} bonnePratique={isBonnePratiqueMode}
            />
          </div>

          {isBonnePratiqueMode && bonnePratiqueEligible && (
            <div className="flex items-start gap-2 text-xs text-[var(--dust)] bg-[var(--paper)] rounded-lg px-3 py-2.5 border border-[var(--line)]">
              <span className="mt-0.5">✨</span>
              <span>
                Mode bonne pratique actif — le curseur est positionné à {(bonnePratiqueRatio * 100).toFixed(0)}/{(100 - bonnePratiqueRatio * 100).toFixed(0)}.
                Le crédit d&apos;impôt (comme le CMG) est plafonné par enfant sans doubler : la famille avec le plus d&apos;enfants
                reçoit proportionnellement moins d&apos;aide par enfant. C&apos;est ce qu&apos;on observe dans la majorité des
                familles pour équilibrer le reste à charge réel — aucun montant n&apos;est estimé automatiquement.
              </span>
            </div>
          )}

          {racOption && modeExpert && (
            <div className="rounded-[var(--radius)] border border-[var(--line)] overflow-hidden -mx-5">
              <div className="grid grid-cols-2 divide-x divide-[var(--line)]">
                <AidesColumn label={nomA} a={aA} setA={v => set({ aA: v })} total={totalAidesMens(aA)} />
                <AidesColumn label={nomB} a={aB} setA={v => set({ aB: v })} total={totalAidesMens(aB)} />
              </div>
              <p className="px-5 py-2 text-[11px] text-[var(--dust)] bg-[var(--paper)] border-t border-[var(--line)]">
                Abattement, CMG cotisations, CMG rémunération et aide locale sont laissés à 0 par défaut — leur estimation
                automatique sera améliorée dans une prochaine version. Le crédit d&apos;impôt est déjà calculé pour vous.
              </p>
              <div className="px-5 py-3 border-t border-[var(--line)] flex items-center gap-5 bg-[var(--paper)]">
                <button
                  onClick={handleResetAides}
                  className="text-xs text-[var(--dust)] hover:text-[var(--ink)] underline decoration-dotted transition-colors"
                >
                  ↺ Réinitialiser les aides saisies
                </button>
                <button
                  onClick={() => set({ modeExpert: false })}
                  className="text-xs text-[var(--dust)] hover:text-[var(--ink)] underline decoration-dotted transition-colors"
                >
                  ← Mode bonne pratique
                </button>
              </div>
            </div>
          )}

          {(bonnePratiqueEligible || racOption) && (
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-[var(--line)]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--ink)]">Mode bonne pratique</span>
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-[var(--sage-light,#eef4ec)] text-[var(--sage)]">Recommandé</span>
                </div>
                <p className="text-xs text-[var(--dust)] mt-0.5">
                  Ce qu&apos;on observe dans la majorité des familles pour équilibrer le reste à charge (60/40 quand le nombre d&apos;enfants diffère)
                </p>
                {racOption && !modeExpert && (
                  <button
                    onClick={handleOpenExpert}
                    className="mt-1.5 text-xs text-[var(--dust)] hover:text-[var(--ink)] underline decoration-dotted transition-colors"
                  >
                    ⚙️ Ajuster mes aides manuellement (Mode Expert)
                  </button>
                )}
              </div>
              <Toggle checked={racOption} onChange={handleRacToggle} />
            </div>
          )}

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
                    racOptionActive={racOption && modeExpert}
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

function FamPreview({ label, percent, color, salNet, rac, totalRac, racOption, bonnePratique }: {
  label: string; percent: number; color: 'sage' | 'blue';
  salNet: number; rac: number; totalRac: number;
  racOption: boolean; bonnePratique?: boolean;
}) {
  const bg   = color === 'sage' ? 'bg-[var(--sage-light)]' : 'bg-blue-50';
  const text = color === 'sage' ? 'text-[var(--sage)]'     : 'text-blue-700';

  if (bonnePratique && racOption) {
    return (
      <div className={`rounded-[var(--radius)] p-4 ${bg}`}>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-sm font-semibold ${text}`}>{label}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded bg-white ${text}`}>{(percent * 100).toFixed(1)} %</span>
        </div>
        <div className="text-[11px] text-[var(--dust)] mb-0.5">Net à déclarer sur Pajemploi</div>
        <div className={`text-xl font-bold ${text}`}>{salNet.toFixed(2)} €</div>
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
      <div>
        <label className="block text-xs font-medium mb-1 text-[var(--dust)]">Crédit d&apos;impôt (annuel, calculé)</label>
        <div className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]">
          {a.creditImpot.toFixed(2)} €
        </div>
      </div>
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
