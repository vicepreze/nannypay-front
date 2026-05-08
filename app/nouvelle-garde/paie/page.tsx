'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  calcBModeRepartition,
  calcEquitableRatioIteratif,
  estimerCMG2025,
  ciPlafondMensuel,
  K_TOTAL,
} from '@/lib/calcul';

type Aides = {
  cmgCotisations:    number;
  cmgRemuneration:   number;
  abattementCharges: number;
  aideVille:         number;
  creditImpot:       number;
};

const aidesZero = (): Aides => ({
  cmgCotisations: 0, cmgRemuneration: 0, abattementCharges: 0, aideVille: 0, creditImpot: 0,
});

function totalAidesMens(a: Aides): number {
  return Math.round(
    (a.cmgCotisations + a.cmgRemuneration + a.abattementCharges + a.aideVille + a.creditImpot / 12) * 100
  ) / 100;
}

type Enfant = { prenom: string; fam: string };

const SLIDER_MIN = 20;
const SLIDER_MAX = 80;
const pct = (p: number) => ((p * 100 - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

export default function PaiePage() {
  const router = useRouter();

  const [enfants,   setEnfants]   = useState<Enfant[]>([]);
  const [nomA,      setNomA]      = useState('Famille A');
  const [nomB,      setNomB]      = useState('Famille B');
  const [joursJson, setJoursJson] = useState('{}');
  const [hNorm,     setHNorm]     = useState(40);
  const [hSup25,    setHSup25]    = useState(0);
  const [hSup50,    setHSup50]    = useState(0);

  const [taux,      setTaux]      = useState(11);
  const [navigo,    setNavigo]    = useState(90.80);
  const [indemKm,   setIndemKm]   = useState(0);
  const [entretien, setEntretien] = useState(6.0);

  const [repartA,    setRepartA]    = useState(0.5);
  const [racOption,  setRacOption]  = useState(false);
  const [modeExpert, setModeExpert] = useState(false);

  // Revenus fiscaux internes — 80 000 € par défaut, non exposés en UI Mode Magique
  const [revFiscauxA] = useState(80_000);
  const [revFiscauxB] = useState(80_000);

  // Aides manuelles pour le Mode Expert
  const [aA, setAA] = useState<Aides>(aidesZero());
  const [aB, setAB] = useState<Aides>(aidesZero());

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const acteurs  = JSON.parse(sessionStorage.getItem('ng_acteurs')  || 'null');
      const planning = JSON.parse(sessionStorage.getItem('ng_planning') || 'null');
      const saved    = JSON.parse(sessionStorage.getItem('ng_paie')     || 'null');

      const enf: Enfant[] = acteurs?.enfants ?? [];
      setEnfants(enf);
      if (acteurs?.famANom) setNomA(acteurs.famANom);
      if (acteurs?.famBNom) setNomB(acteurs.famBNom);

      const planningData = planning?.planning ?? planning ?? {};
      const joursStr = JSON.stringify(planningData);
      setJoursJson(joursStr);
      if (typeof planning?.hNormalesSemaine === 'number') setHNorm(planning.hNormalesSemaine);
      if (typeof planning?.hSup25Semaine    === 'number') setHSup25(planning.hSup25Semaine);
      if (typeof planning?.hSup50Semaine    === 'number') setHSup50(planning.hSup50Semaine);

      if (saved) {
        if (typeof saved.repartitionA   === 'number')  setRepartA(saved.repartitionA);
        if (typeof saved.racOptionActive === 'boolean') setRacOption(saved.racOptionActive);
        if (typeof saved.taux           === 'number')  setTaux(saved.taux);
        if (typeof saved.navigo         === 'number')  setNavigo(saved.navigo);
        if (typeof saved.indemKm        === 'number')  setIndemKm(saved.indemKm);
        if (typeof saved.indemEntretien === 'number')  setEntretien(saved.indemEntretien);
        if (saved.aidesA) setAA(saved.aidesA);
        if (saved.aidesB) setAB(saved.aidesB);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  const pProportionnel = useMemo(
    () => calcBModeRepartition(joursJson, enfants),
    [joursJson, enfants]
  );

  const nbEnfantsA = useMemo(() => Math.max(1, enfants.filter(e => e.fam === 'A').length), [enfants]);
  const nbEnfantsB = useMemo(() => Math.max(1, enfants.filter(e => e.fam === 'B').length), [enfants]);

  const salNetTotalMens = useMemo(() => {
    const base  = hNorm  * 52/12 * taux;
    const sup25 = hSup25 * 52/12 * taux * 1.25;
    const sup50 = hSup50 * 52/12 * taux * 1.50;
    return Math.round((base + sup25 + sup50) * 100) / 100;
  }, [hNorm, hSup25, hSup50, taux]);

  // Résultat du moteur itératif (actif quand racOption est on)
  const racOptimal = useMemo(() => {
    if (!racOption || salNetTotalMens <= 0) return null;
    return calcEquitableRatioIteratif(
      salNetTotalMens,
      { nbEnfants: nbEnfantsA, revenusFiscaux: revFiscauxA, autresAidesMens: 0 },
      { nbEnfants: nbEnfantsB, revenusFiscaux: revFiscauxB, autresAidesMens: 0 },
      pProportionnel,
    );
  }, [racOption, salNetTotalMens, nbEnfantsA, nbEnfantsB, revFiscauxA, revFiscauxB, pProportionnel]);

  // Applique le ratio optimal au slider uniquement en Mode Magique
  useEffect(() => {
    if (racOptimal && !modeExpert) setRepartA(racOptimal.meilleurRatio);
  }, [racOptimal, modeExpert]);

  const preview = useMemo(() => {
    const salNetA = Math.round(repartA * salNetTotalMens * 100) / 100;
    const salNetB = Math.round((1 - repartA) * salNetTotalMens * 100) / 100;
    return { salNetA, salNetB };
  }, [repartA, salNetTotalMens]);

  // RAC live — Mode Magique : moteur CMG/CI ; Mode Expert : aides manuelles
  const liveRac = useMemo(() => {
    if (!racOption) return { racA: 0, racB: 0, totalRac: 0 };
    const salA = preview.salNetA;
    const salB = preview.salNetB;
    if (modeExpert) {
      const aidesA = totalAidesMens(aA);
      const aidesB = totalAidesMens(aB);
      const racA = Math.round((salA * K_TOTAL - aidesA) * 100) / 100;
      const racB = Math.round((salB * K_TOTAL - aidesB) * 100) / 100;
      return { racA, racB, totalRac: racA + racB };
    }
    const coutA = salA * K_TOTAL;
    const coutB = salB * K_TOTAL;
    const cmgA = estimerCMG2025(revFiscauxA, nbEnfantsA, salA, coutA - salA);
    const cmgB = estimerCMG2025(revFiscauxB, nbEnfantsB, salB, coutB - salB);
    const eligA = Math.max(0, coutA - cmgA);
    const eligB = Math.max(0, coutB - cmgB);
    const ciA = Math.min(Math.round(eligA * 0.5 * 100) / 100, ciPlafondMensuel(nbEnfantsA));
    const ciB = Math.min(Math.round(eligB * 0.5 * 100) / 100, ciPlafondMensuel(nbEnfantsB));
    const racA = Math.round((coutA - cmgA - ciA) * 100) / 100;
    const racB = Math.round((coutB - cmgB - ciB) * 100) / 100;
    return { racA, racB, totalRac: racA + racB };
  }, [racOption, modeExpert, preview.salNetA, preview.salNetB, revFiscauxA, revFiscauxB, nbEnfantsA, nbEnfantsB, aA, aB]);

  const racPctA = useMemo(() => {
    const cout = preview.salNetA * K_TOTAL;
    return cout > 0 ? Math.round((liveRac.racA / cout) * 100) : 0;
  }, [preview.salNetA, liveRac.racA]);

  const racPctB = useMemo(() => {
    const cout = preview.salNetB * K_TOTAL;
    return cout > 0 ? Math.round((liveRac.racB / cout) * 100) : 0;
  }, [preview.salNetB, liveRac.racB]);

  function handleRacToggle(on: boolean) {
    setRacOption(on);
    setModeExpert(false);
    if (on && salNetTotalMens > 0) {
      const res = calcEquitableRatioIteratif(
        salNetTotalMens,
        { nbEnfants: nbEnfantsA, revenusFiscaux: 80_000, autresAidesMens: 0 },
        { nbEnfants: nbEnfantsB, revenusFiscaux: 80_000, autresAidesMens: 0 },
        pProportionnel,
      );
      setRepartA(res.meilleurRatio);
    }
  }

  function handleOpenExpert() {
    if (racOptimal) {
      setAA({ cmgCotisations: racOptimal.cmgA, cmgRemuneration: 0, abattementCharges: 0, aideVille: 0, creditImpot: Math.round(racOptimal.ciAMens * 12) });
      setAB({ cmgCotisations: racOptimal.cmgB, cmgRemuneration: 0, abattementCharges: 0, aideVille: 0, creditImpot: Math.round(racOptimal.ciBMens * 12) });
    }
    setModeExpert(true);
  }

  function handleResetToMagic() {
    if (racOptimal) {
      setAA({ cmgCotisations: racOptimal.cmgA, cmgRemuneration: 0, abattementCharges: 0, aideVille: 0, creditImpot: Math.round(racOptimal.ciAMens * 12) });
      setAB({ cmgCotisations: racOptimal.cmgB, cmgRemuneration: 0, abattementCharges: 0, aideVille: 0, creditImpot: Math.round(racOptimal.ciBMens * 12) });
    }
  }

  async function creerGarde() {
    setError('');
    if (!taux || taux <= 0) { setError('Taux horaire requis.'); return; }

    const acteurs  = JSON.parse(sessionStorage.getItem('ng_acteurs')  || 'null');
    const planning = JSON.parse(sessionStorage.getItem('ng_planning') || 'null');
    if (!acteurs)  { setError('Volet Acteurs incomplet. Recommencez.'); return; }
    if (!planning) { setError('Volet Planning incomplet. Recommencez.'); return; }

    sessionStorage.setItem('ng_paie', JSON.stringify({
      repartitionA: repartA,
      racOptionActive: racOption,
      taux, navigo, indemKm, indemEntretien: entretien,
      aidesA: modeExpert ? aA : aidesZero(),
      aidesB: modeExpert ? aB : aidesZero(),
    }));

    setLoading(true);
    try {
      const res = await fetch('/api/gardes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acteurs, planning,
          paie: {
            repartitionA:    repartA,
            racOptionActive: racOption,
            taux,
            navigo,
            indemKm,
            indemEntretien: entretien,
            aidesA: modeExpert ? aA : aidesZero(),
            aidesB: modeExpert ? aB : aidesZero(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      sessionStorage.removeItem('ng_acteurs');
      sessionStorage.removeItem('ng_planning');
      sessionStorage.removeItem('ng_paie');
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      setLoading(false);
    }
  }

  if (!hydrated) return null;

  const isMagicMode = racOption && !modeExpert;

  return (
    <div className="space-y-5">

      {/* 1 — Rémunération */}
      <Card title="1 — Rémunération">
        <FN label="Taux horaire net (€/h)" value={taux} onChange={setTaux} />
        <p className="text-xs text-[var(--dust)] -mt-1">
          Taux brut correspondant : <strong>{(taux / 0.7812).toFixed(2)} €/h</strong> (charges salariales 21,88 %)
        </p>
      </Card>

      {/* 2 — Indemnités */}
      <Card title="2 — Indemnités">
        <div className="grid grid-cols-3 gap-3">
          <FN label="Navigo (€/mois)"   value={navigo}    onChange={setNavigo} />
          <FN label="Frais km (€/mois)" value={indemKm}   onChange={setIndemKm} />
          <FN label="Entretien (€/j)"   value={entretien} onChange={setEntretien} />
        </div>
      </Card>

      {/* A — Slider répartition */}
      <div className="rounded-[var(--radius)] overflow-hidden bg-white border border-[var(--line)]">
        <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--sage)] text-white text-xs font-bold">A</span>
            Répartition du salaire en fonction des heures par enfant
          </div>
          <p className="text-xs text-[var(--dust)] mt-1 ml-7">Position calculée selon le nombre d&apos;enfants et les heures. Ajustez si besoin.</p>
        </div>
        <div className="p-5">
          <SliderRow
            value={repartA}
            onChange={setRepartA}
            min={SLIDER_MIN} max={SLIDER_MAX}
            markers={[
              { value: 0.5, label: '50/50' },
              ...(racOption && racOptimal ? [{ value: racOptimal.meilleurRatio, label: 'Équitable RAC', highlight: true }] : []),
            ]}
          />

          <div className="grid grid-cols-2 gap-3 mt-5">
            <FamPreview
              label={nomA} percent={repartA} color="sage"
              salNet={preview.salNetA}
              rac={liveRac.racA} totalRac={liveRac.totalRac}
              racOption={racOption} magicMode={isMagicMode} racPct={racPctA}
            />
            <FamPreview
              label={nomB} percent={1 - repartA} color="blue"
              salNet={preview.salNetB}
              rac={liveRac.racB} totalRac={liveRac.totalRac}
              racOption={racOption} magicMode={isMagicMode} racPct={racPctB}
            />
          </div>

          <button
            onClick={() => setRepartA(pProportionnel)}
            className="text-xs text-[var(--dust)] hover:text-[var(--ink)] mt-4 underline decoration-dotted"
          >
            ↩ Revenir au calcul automatique ({(pProportionnel * 100).toFixed(1)} %)
          </button>
        </div>
      </div>

      {/* B — Option RAC */}
      <div className="rounded-[var(--radius)] overflow-hidden bg-white border border-[var(--line)]">
        <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--sage)] text-white text-xs font-bold">B</span>
              🪄 Calculer selon le Reste à Charge <span className="text-[var(--dust)] font-normal">(Recommandé)</span>
            </div>
            <p className="text-xs text-[var(--dust)] mt-1 ml-7">
              {racOption
                ? modeExpert
                  ? 'Mode Expert — ajustez vos aides pour affiner le point d\'équilibre.'
                  : 'Mode Magique — point d\'équilibre calculé selon le barème CAF 2025.'
                : 'Activez pour calculer le point d\'équilibre RAC selon vos aides CAF.'}
            </p>
          </div>
          <Toggle checked={racOption} onChange={handleRacToggle} />
        </div>

        {racOption && (
          <>
            {!modeExpert ? (
              /* ── Mode Magique ── */
              <div className="px-5 py-4">
                {salNetTotalMens <= 0 ? (
                  <p className="text-xs text-[var(--dust)]">
                    Configurez le taux horaire et les heures dans la section Rémunération pour activer le calcul.
                  </p>
                ) : (
                  <p className="text-xs text-[var(--dust)]">
                    Ratio optimal calculé automatiquement — aides CAF (CMG + CI) intégrées selon le barème 2025.
                  </p>
                )}
                <button
                  onClick={handleOpenExpert}
                  disabled={!racOptimal}
                  className="mt-3 text-xs text-[var(--dust)] hover:text-[var(--ink)] underline decoration-dotted transition-colors disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                >
                  ⚙️ Ajuster mes aides manuellement (Mode Expert)
                </button>
              </div>
            ) : (
              /* ── Mode Expert ── */
              <>
                <div className="grid grid-cols-2 divide-x divide-[var(--line)]">
                  <AidesColumn label={nomA} a={aA} setA={setAA} total={totalAidesMens(aA)} />
                  <AidesColumn label={nomB} a={aB} setA={setAB} total={totalAidesMens(aB)} />
                </div>

                <div className="px-5 pb-4 flex items-center gap-5">
                  <button
                    onClick={handleResetToMagic}
                    disabled={!racOptimal}
                    className="text-xs text-[var(--dust)] hover:text-[var(--ink)] underline decoration-dotted transition-colors disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                  >
                    ↺ Rétablir l&apos;estimation magique
                  </button>
                  <button
                    onClick={() => setModeExpert(false)}
                    className="text-xs text-[var(--dust)] hover:text-[var(--ink)] underline decoration-dotted transition-colors"
                  >
                    ← Mode Magique
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {error && <p className="text-sm text-[var(--red,#b91c1c)] bg-red-50 rounded-lg px-4 py-2">{error}</p>}

      <div className="flex justify-between pt-2">
        <button onClick={() => router.back()} disabled={loading} className={btnSecondary}>← Retour</button>
        <button onClick={creerGarde} disabled={loading} className={btnPrimary}>
          {loading ? 'Création…' : 'Créer la garde →'}
        </button>
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
        <div className="text-[11px] text-[var(--dust)] mb-0.5">Salaire net à verser</div>
        <div className={`text-xl font-bold ${text} mb-3`}>{salNet.toFixed(2)} €</div>
        <div className="pt-3 border-t border-white/70">
          <div className="text-[11px] text-[var(--dust)] mb-0.5">Reste à charge estimé</div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-xl font-bold ${text}`}>{rac.toFixed(0)} €</span>
            {racPct !== undefined && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/80 ${text}`}>{racPct} % du coût</span>
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
      <div className="text-[11px] text-[var(--dust)]">Salaire net à verser</div>
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] overflow-hidden bg-white border border-[var(--line)]">
      <div className="px-5 py-3 text-sm font-semibold border-b border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]">{title}</div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

function FN({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [raw, setRaw] = useState(() => value !== 0 ? String(value) : '');
  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-[var(--dust)]">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        placeholder="0"
        onChange={e => { const s = e.target.value; setRaw(s); const n = parseFloat(s.replace(',', '.')); onChange(isNaN(n) ? 0 : n); }}
        onBlur={() => { const n = parseFloat(raw.replace(',', '.')); setRaw(!isNaN(n) && n !== 0 ? String(n) : ''); onChange(isNaN(n) ? 0 : n); }}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-white border border-[var(--line)] focus:border-[var(--sage)]"
      />
    </div>
  );
}

const btnPrimary   = 'px-6 py-2.5 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnSecondary = 'px-6 py-2.5 border-[1.5px] border-[var(--line)] text-[var(--ink)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] transition-colors bg-white disabled:opacity-50';
