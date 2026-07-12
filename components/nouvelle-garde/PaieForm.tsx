'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  calcBModeRepartition,
  calcRatioBonnePratique,
  calculerAbattementChargesPatronales,
  calculerSalaireEtCotisations,
  memeHorairesTousEnfants,
  ciPlafondMensuel,
  calcHeuresSemaineFromPlanning,
} from '@/lib/calcul';
import { DetailedCalcTable, type AidesEditable, type FamCalcData, type NounouCalcData } from '@/components/DetailedCalcTable';

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
const frPct = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

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

  const joursActifsMens = useMemo(
    () => (planningHours.joursActifsParSemaine || 5) * 52 / 12,
    [planningHours.joursActifsParSemaine]
  );

  // Valeurs dérivées par famille (indemnités, total réellement versé, charges sociales réelles,
  // abattement patronal) — servent à l'aperçu principal, au reste à charge et au tableau détaillé.
  // L'abattement (formule Pajemploi L241-10 CSS) ne dépend pas du revenu : calculable automatiquement,
  // contrairement au CMG qui nécessiterait un revenu que l'app ne collecte pas.
  const derivedA = useMemo(() => {
    const transport = Math.round(navigo * repartIndemA * 100) / 100;
    const entretienFam = Math.round(entretien * joursActifsMens * repartIndemA * 100) / 100;
    const km = Math.round(indemKm * repartIndemA * 100) / 100;
    const netAPayerAvantIR = Math.round((apercuA.salNet + transport + km + apercuA.exonerationHS) * 100) / 100;
    const totalVerseReel = Math.round((netAPayerAvantIR + entretienFam) * 100) / 100;
    return {
      transport, entretien: entretienFam, km, netAPayerAvantIR, totalVerseReel,
      chargesSalariales: apercuA.cotisations.totalSalarie,
      chargesPatronales: apercuA.cotisations.totalEmployeur,
      abattementCharges: calculerAbattementChargesPatronales(apercuA.hNorm, apercuA.hSup25 + apercuA.hSup50),
    };
  }, [apercuA, repartIndemA, navigo, entretien, indemKm, joursActifsMens]);

  const derivedB = useMemo(() => {
    const transport = Math.round(navigo * (1 - repartIndemA) * 100) / 100;
    const entretienFam = Math.round(entretien * joursActifsMens * (1 - repartIndemA) * 100) / 100;
    const km = Math.round(indemKm * (1 - repartIndemA) * 100) / 100;
    const netAPayerAvantIR = Math.round((apercuB.salNet + transport + km + apercuB.exonerationHS) * 100) / 100;
    const totalVerseReel = Math.round((netAPayerAvantIR + entretienFam) * 100) / 100;
    return {
      transport, entretien: entretienFam, km, netAPayerAvantIR, totalVerseReel,
      chargesSalariales: apercuB.cotisations.totalSalarie,
      chargesPatronales: apercuB.cotisations.totalEmployeur,
      abattementCharges: calculerAbattementChargesPatronales(apercuB.hNorm, apercuB.hSup25 + apercuB.hSup50),
    };
  }, [apercuB, repartIndemA, navigo, entretien, indemKm, joursActifsMens]);

  const totalAidesA = useMemo(() => totalAidesMens(aA), [aA]);
  const totalAidesB = useMemo(() => totalAidesMens(aB), [aB]);

  // Reste à charge = coût total réel (net + transport + entretien + charges) − aides. Toujours
  // calculé (indépendant du mode de répartition) : seuls le CMG et l'aide locale restent à saisir,
  // l'abattement et le crédit d'impôt sont automatiques.
  const racA = Math.round((derivedA.totalVerseReel + derivedA.chargesSalariales + derivedA.chargesPatronales - totalAidesA) * 100) / 100;
  const racB = Math.round((derivedB.totalVerseReel + derivedB.chargesSalariales + derivedB.chargesPatronales - totalAidesB) * 100) / 100;

  // Crédit d'impôt : formule connue (plafond par enfant + 50 % du coût restant) qui ne dépend pas
  // du revenu — calculée automatiquement, contrairement aux autres aides (CMG, aide locale) qui
  // nécessiteraient un revenu que l'app ne collecte pas pour des raisons de confidentialité.
  const ciAutoAnnuelA = useMemo(() => {
    const coutA = derivedA.totalVerseReel + derivedA.chargesSalariales + derivedA.chargesPatronales;
    const eligA = Math.max(0, coutA - aA.cmgCotisations - aA.cmgRemuneration - derivedA.abattementCharges - aA.aideVille);
    const ciMens = Math.min(Math.round(eligA * 0.5 * 100) / 100, ciPlafondMensuel(nbEnfantsA));
    return Math.round(ciMens * 12 * 100) / 100;
  }, [derivedA, aA.cmgCotisations, aA.cmgRemuneration, aA.aideVille, nbEnfantsA]);

  const ciAutoAnnuelB = useMemo(() => {
    const coutB = derivedB.totalVerseReel + derivedB.chargesSalariales + derivedB.chargesPatronales;
    const eligB = Math.max(0, coutB - aB.cmgCotisations - aB.cmgRemuneration - derivedB.abattementCharges - aB.aideVille);
    const ciMens = Math.min(Math.round(eligB * 0.5 * 100) / 100, ciPlafondMensuel(nbEnfantsB));
    return Math.round(ciMens * 12 * 100) / 100;
  }, [derivedB, aB.cmgCotisations, aB.cmgRemuneration, aB.aideVille, nbEnfantsB]);

  useEffect(() => {
    if (
      aA.abattementCharges === derivedA.abattementCharges && aA.creditImpot === ciAutoAnnuelA &&
      aB.abattementCharges === derivedB.abattementCharges && aB.creditImpot === ciAutoAnnuelB
    ) return;
    set({
      aA: { ...aA, abattementCharges: derivedA.abattementCharges, creditImpot: ciAutoAnnuelA },
      aB: { ...aB, abattementCharges: derivedB.abattementCharges, creditImpot: ciAutoAnnuelB },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    aA.abattementCharges, aA.creditImpot, aB.abattementCharges, aB.creditImpot,
    derivedA.abattementCharges, derivedB.abattementCharges, ciAutoAnnuelA, ciAutoAnnuelB,
  ]);

  const detailData = useMemo(() => {
    const buildFam = (apercu: typeof apercuA, derived: typeof derivedA, rac: number, isA: boolean): FamCalcData => ({
      nom: isA ? nomA : nomB,
      nbEnfants: isA ? nbEnfantsA : nbEnfantsB,
      hNorm: apercu.hNorm, hSup25: apercu.hSup25, hSup50: apercu.hSup50,
      salNet: apercu.salNet, exonerationHS: apercu.exonerationHS,
      transport: derived.transport, entretien: derived.entretien, km: derived.km,
      netAPayerAvantIR: derived.netAPayerAvantIR, totalVerseReel: derived.totalVerseReel,
      chargesSalariales: derived.chargesSalariales, chargesPatronales: derived.chargesPatronales,
      abattementCharges: derived.abattementCharges,
      creditImpotMens: (isA ? aA.creditImpot : aB.creditImpot) / 12,
      resteCharge: rac,
    });

    const famAData = buildFam(apercuA, derivedA, racA, true);
    const famBData = buildFam(apercuB, derivedB, racB, false);

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
    apercuA, apercuB, derivedA, derivedB, racA, racB, aA.creditImpot, aB.creditImpot,
    navigo, entretien, indemKm, joursActifsMens, nomA, nomB, nbEnfantsA, nbEnfantsB,
  ]);

  const [resetKey, setResetKey] = useState(0);

  function handleToggleDetail() {
    if (!modeExpert) set({ modeExpert: true });
    setShowDetail(v => !v);
  }

  function handleResetAides() {
    setResetKey(k => k + 1);
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
              Bonne pratique
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
                { value: pProportionnel, label: '' },
              ]}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              <RatioPill
                active={!racOption}
                label={`Calcul automatique · ${frPct(pProportionnel * 100)} %`}
                onClick={() => set({ racOption: false, modeExpert: false, repartA: pProportionnel })}
              />
              {bonnePratiqueEligible && (
                <RatioPill
                  active={racOption && !modeExpert}
                  label={`Bonne pratique · ${(bonnePratiqueRatio * 100).toFixed(0)}/${(100 - bonnePratiqueRatio * 100).toFixed(0)}`}
                  onClick={() => set({ racOption: true, modeExpert: false, repartA: bonnePratiqueRatio })}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FamPreview label={nomA} percent={repartA}     color="sage" salNet={apercuA.salNet} />
            <FamPreview label={nomB} percent={1 - repartA} color="blue" salNet={apercuB.salNet} />
          </div>

          {racOption && bonnePratiqueEligible && (
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

          {showDetailedCalc && (
            <>
              <AdvancedCard
                icon="🧾" color="sage" active={showDetail}
                title="Simuler mon relevé Pajemploi"
                description="Heures, charges, aides CAF et reste à charge estimé — avec vos propres montants de CMG."
                onClick={handleToggleDetail}
              />

              {showDetail && (
                <div className="space-y-2">
                  <DetailedCalcTable
                    key={resetKey}
                    famA={detailData.famA}
                    famB={detailData.famB}
                    nounou={detailData.nounou}
                    aidesA={{ cmgCotisations: aA.cmgCotisations, cmgRemuneration: aA.cmgRemuneration, aideVille: aA.aideVille }}
                    aidesB={{ cmgCotisations: aB.cmgCotisations, cmgRemuneration: aB.cmgRemuneration, aideVille: aB.aideVille }}
                    onChangeAidesA={(patch: AidesEditable) => set({ aA: { ...aA, ...patch } })}
                    onChangeAidesB={(patch: AidesEditable) => set({ aB: { ...aB, ...patch } })}
                    totalAidesA={totalAidesA}
                    totalAidesB={totalAidesB}
                  />
                  <button
                    onClick={handleResetAides}
                    className="text-[11px] text-[var(--dust)] hover:text-[var(--ink)] underline decoration-dotted transition-colors"
                  >
                    ↺ Réinitialiser les aides saisies
                  </button>
                </div>
              )}
            </>
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

function FamPreview({ label, percent, color, salNet }: {
  label: string; percent: number; color: 'sage' | 'blue'; salNet: number;
}) {
  const bg   = color === 'sage' ? 'bg-[var(--sage-light)]' : 'bg-blue-50';
  const text = color === 'sage' ? 'text-[var(--sage)]'     : 'text-blue-700';

  return (
    <div className={`rounded-[var(--radius)] p-4 ${bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${text}`}>{label}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded bg-white ${text}`}>{(percent * 100).toFixed(1)} %</span>
      </div>
      <div className="text-[11px] text-[var(--dust)]">Net à déclarer sur Pajemploi</div>
      <div className={`text-xl font-bold ${text}`}>{salNet.toFixed(2)} €</div>
    </div>
  );
}

function RatioPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-[var(--sage)] bg-[var(--sage-light,#eef4ec)] text-[var(--sage)]'
          : 'border-[var(--line)] text-[var(--dust)] hover:text-[var(--ink)]'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[var(--sage)]' : 'bg-[var(--line)]'}`} />
      {label}
    </button>
  );
}

function AdvancedCard({ icon, title, description, color, active, onClick }: {
  icon: string; title: string; description: string;
  color: 'sage' | 'blue'; active?: boolean; onClick: () => void;
}) {
  const border = color === 'sage' ? 'border-[var(--sage)]' : 'border-blue-700';
  const text   = color === 'sage' ? 'text-[var(--sage)]'   : 'text-blue-700';
  const bg     = active ? (color === 'sage' ? 'bg-[var(--sage-light,#eef4ec)]' : 'bg-blue-50') : 'bg-white';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-[var(--radius)] border ${border} ${bg} p-4 transition-colors`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${border} ${text}`}>
          Avancé
        </span>
      </div>
      <div className="text-sm font-semibold text-[var(--ink)] mb-1">{title}</div>
      <p className="text-xs text-[var(--dust)]">{description}</p>
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
