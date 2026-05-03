'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  calcBModeRepartition,
  calcEquitableRatioIteratif,
  estimerCMG2025,
  ciPlafondMensuel,
  calcHeuresSemaineFromPlanning,
  K_TOTAL,
} from '@/lib/calcul';

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

  const [taux,      setTaux]      = useState(11);
  const [navigo,    setNavigo]    = useState(90.80);
  const [indemKm,   setIndemKm]   = useState(0);
  const [entretien, setEntretien] = useState(6.0);

  const [repartA,     setRepartA]     = useState(0.5);
  const [racOption,   setRacOption]   = useState(false);
  const [modeExpert,  setModeExpert]  = useState(false);
  const [revFiscauxA, setRevFiscauxA] = useState(80_000);
  const [revFiscauxB, setRevFiscauxB] = useState(80_000);

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

      if (saved) {
        if (typeof saved.repartitionA   === 'number')  setRepartA(saved.repartitionA);
        else setRepartA(calcBModeRepartition(joursStr, enf));
        if (typeof saved.racOptionActive === 'boolean') setRacOption(saved.racOptionActive);
        if (typeof saved.taux           === 'number')  setTaux(saved.taux);
        if (typeof saved.navigo         === 'number')  setNavigo(saved.navigo);
        if (typeof saved.indemKm        === 'number')  setIndemKm(saved.indemKm);
        if (typeof saved.indemEntretien === 'number')  setEntretien(saved.indemEntretien);
      } else {
        setRepartA(calcBModeRepartition(joursStr, enf));
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  const pProportionnel = useMemo(
    () => calcBModeRepartition(joursJson, enfants),
    [joursJson, enfants]
  );

  const planningHours = useMemo(
    () => calcHeuresSemaineFromPlanning(joursJson),
    [joursJson]
  );

  const nbEnfantsA = useMemo(() => Math.max(1, enfants.filter(e => e.fam === 'A').length), [enfants]);
  const nbEnfantsB = useMemo(() => Math.max(1, enfants.filter(e => e.fam === 'B').length), [enfants]);

  const salNetTotalMens = useMemo(() => {
    const base  = planningHours.hNormalesSemaine * 52/12 * taux;
    const sup25 = planningHours.hSup25Semaine    * 52/12 * taux * 1.25;
    const sup50 = planningHours.hSup50Semaine    * 52/12 * taux * 1.50;
    return Math.round((base + sup25 + sup50) * 100) / 100;
  }, [planningHours, taux]);

  const racOptimal = useMemo(() => {
    if (!racOption || salNetTotalMens <= 0) return null;
    return calcEquitableRatioIteratif(
      salNetTotalMens,
      { nbEnfants: nbEnfantsA, revenusFiscaux: revFiscauxA, autresAidesMens: 0 },
      { nbEnfants: nbEnfantsB, revenusFiscaux: revFiscauxB, autresAidesMens: 0 },
      pProportionnel,
    );
  }, [racOption, salNetTotalMens, nbEnfantsA, nbEnfantsB, revFiscauxA, revFiscauxB, pProportionnel]);

  const preview = useMemo(() => {
    const salNetA = Math.round(repartA * salNetTotalMens * 100) / 100;
    const salNetB = Math.round((1 - repartA) * salNetTotalMens * 100) / 100;
    return { salNetA, salNetB };
  }, [repartA, salNetTotalMens]);

  const liveRac = useMemo(() => {
    if (!racOption) return { racA: 0, racB: 0, totalRac: 0 };
    const salA = preview.salNetA;
    const salB = preview.salNetB;
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
  }, [racOption, preview.salNetA, preview.salNetB, revFiscauxA, revFiscauxB, nbEnfantsA, nbEnfantsB]);

  function handleRacToggle(on: boolean) {
    setRacOption(on);
    setModeExpert(false);
    setRevFiscauxA(80_000);
    setRevFiscauxB(80_000);
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

  async function creerGarde() {
    setError('');
    if (!taux || taux <= 0) { setError('Taux horaire requis.'); return; }

    const acteurs  = JSON.parse(sessionStorage.getItem('ng_acteurs')  || 'null');
    const planning = JSON.parse(sessionStorage.getItem('ng_planning') || 'null');
    if (!acteurs)  { setError('Volet Acteurs incomplet. Recommencez.'); return; }
    if (!planning) { setError('Volet Planning incomplet. Recommencez.'); return; }

    sessionStorage.setItem('ng_paie', JSON.stringify({
      repartitionA: repartA, racOptionActive: racOption,
      taux, navigo, indemKm, indemEntretien: entretien,
    }));

    setLoading(true);
    try {
      const res = await fetch('/api/gardes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acteurs, planning,
          paie: {
            repartitionA: repartA, racOptionActive: racOption,
            taux, navigo, indemKm, indemEntretien: entretien,
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
              racOption={racOption}
            />
            <FamPreview
              label={nomB} percent={1 - repartA} color="blue"
              salNet={preview.salNetB}
              rac={liveRac.racB} totalRac={liveRac.totalRac}
              racOption={racOption}
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
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--sage)] text-white text-xs font-bold">B</span>
            Reste à charge par famille
          </div>
          <Toggle checked={racOption} onChange={handleRacToggle} />
        </div>

        {racOption && (
          <div className="p-5 space-y-4">
            {!modeExpert ? (
              <p className="text-xs text-[var(--dust)]">
                Calcul automatique — revenus fiscaux : <strong>80 000 €</strong> (Tranche 3 CAF, aides minimales).
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <FN label={`Revenus fiscaux ${nomA} (€/an)`} value={revFiscauxA} onChange={setRevFiscauxA} />
                <FN label={`Revenus fiscaux ${nomB} (€/an)`} value={revFiscauxB} onChange={setRevFiscauxB} />
              </div>
            )}
            <div>
              {!modeExpert ? (
                <button
                  onClick={() => setModeExpert(true)}
                  className="text-xs text-[var(--dust)] hover:text-[var(--ink)] underline decoration-dotted transition-colors"
                >
                  ⚙️ Passer en mode expert
                </button>
              ) : (
                <button
                  onClick={() => { setModeExpert(false); setRevFiscauxA(80_000); setRevFiscauxB(80_000); }}
                  className="text-xs text-[var(--dust)] hover:text-[var(--ink)] underline decoration-dotted transition-colors"
                >
                  ↩ Revenir au mode automatique
                </button>
              )}
            </div>
          </div>
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

function FamPreview({ label, percent, color, salNet, rac, totalRac, racOption }: {
  label: string; percent: number; color: 'sage' | 'blue';
  salNet: number; rac: number; totalRac: number;
  racOption: boolean;
}) {
  const bg   = color === 'sage' ? 'bg-[var(--sage-light)]' : 'bg-blue-50';
  const text = color === 'sage' ? 'text-[var(--sage)]'     : 'text-blue-700';
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
