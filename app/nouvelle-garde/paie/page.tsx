'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { calcBModeRepartition, calcEquitableRatioA, K_SAL, K_PAT } from '@/lib/calcul';

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

type Enfant = { prenom: string; fam: string };

function totalAidesMens(a: Aides): number {
  return Math.round(
    (a.cmgCotisations + a.cmgRemuneration + a.abattementCharges + a.aideVille + a.creditImpot / 12) * 100
  ) / 100;
}

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

  const [repartA,   setRepartA]   = useState(0.5);   // 50 % par défaut
  const [racOption, setRacOption] = useState(false);

  const [aA, setAA] = useState<Aides>(aidesZero());
  const [aB, setAB] = useState<Aides>(aidesZero());

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
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

  const salNetTotalMens = useMemo(() => {
    const baseNet  = hNorm  * 52/12 * taux;
    const sup25Net = hSup25 * 52/12 * taux * 1.25;
    const sup50Net = hSup50 * 52/12 * taux * 1.50;
    return Math.round((baseNet + sup25Net + sup50Net) * 100) / 100;
  }, [hNorm, hSup25, hSup50, taux]);

  const aidesAMens = useMemo(() => totalAidesMens(aA), [aA]);
  const aidesBMens = useMemo(() => totalAidesMens(aB), [aB]);

  const pEquitable = useMemo(
    () => calcEquitableRatioA(pProportionnel, salNetTotalMens, aidesAMens, aidesBMens),
    [pProportionnel, salNetTotalMens, aidesAMens, aidesBMens]
  );

  const preview = useMemo(() => {
    const salNetA = Math.round(repartA * salNetTotalMens * 100) / 100;
    const salNetB = Math.round((1 - repartA) * salNetTotalMens * 100) / 100;
    const chSalA  = Math.round(salNetA * K_SAL * 100) / 100;
    const chPatA  = Math.round(salNetA * K_PAT * 100) / 100;
    const chSalB  = Math.round(salNetB * K_SAL * 100) / 100;
    const chPatB  = Math.round(salNetB * K_PAT * 100) / 100;
    const racA    = Math.round((salNetA + chSalA + chPatA - aidesAMens) * 100) / 100;
    const racB    = Math.round((salNetB + chSalB + chPatB - aidesBMens) * 100) / 100;
    return { salNetA, salNetB, chSalA, chPatA, chSalB, chPatB, racA, racB };
  }, [repartA, salNetTotalMens, aidesAMens, aidesBMens]);

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
      taux, navigo, indemKm, indemEntretien: entretien, aidesA: aA, aidesB: aB,
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
            aidesA: aA,
            aidesB: aB,
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
              ...(racOption ? [{ value: pEquitable, label: 'Équitable RAC', highlight: true }] : []),
            ]}
          />

          <div className="grid grid-cols-2 gap-3 mt-5">
            <FamPreview
              label={nomA} percent={repartA} color="sage"
              salNet={preview.salNetA}
              chSal={preview.chSalA} chPat={preview.chPatA}
              aides={aidesAMens} rac={preview.racA}
              racOption={racOption}
            />
            <FamPreview
              label={nomB} percent={1 - repartA} color="blue"
              salNet={preview.salNetB}
              chSal={preview.chSalB} chPat={preview.chPatB}
              aides={aidesBMens} rac={preview.racB}
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
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--sage)] text-white text-xs font-bold">B</span>
              Répartition du salaire en fonction du reste à charge par famille
            </div>
            <p className="text-xs text-[var(--dust)] mt-1 ml-7">Renseignez les aides CAF par famille pour affiner la répartition.</p>
          </div>
          <Toggle checked={racOption} onChange={setRacOption} />
        </div>

        {racOption && (
          <>
            <div className="grid grid-cols-2 divide-x divide-[var(--line)]">
              <AidesColumn label={nomA} a={aA} setA={setAA} total={aidesAMens} />
              <AidesColumn label={nomB} a={aB} setA={setAB} total={aidesBMens} />
            </div>

            {salNetTotalMens > 0 && (aidesAMens > 0 || aidesBMens > 0) && (
              <div className="m-5 p-4 rounded-[var(--radius)] bg-[var(--sage-light)] text-xs text-[var(--ink)] leading-relaxed">
                💡 <strong>Suggestion :</strong> Pour que le RAC de chaque famille soit proportionnel à sa part d&apos;heures ({(pProportionnel * 100).toFixed(1)} % / {((1-pProportionnel) * 100).toFixed(1)} %), placez le slider sur <strong>{(pEquitable * 100).toFixed(1)} %</strong> (marqueur <em>Équitable RAC</em>).
              </div>
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

// ── Sub-components (alignés avec SettingsClient) ──────────────────────

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

function FamPreview({ label, percent, color, salNet, chSal, chPat, aides, rac, racOption }: {
  label: string; percent: number; color: 'sage' | 'blue';
  salNet: number; chSal: number; chPat: number; aides: number; rac: number;
  racOption: boolean;
}) {
  const bg   = color === 'sage' ? 'bg-[var(--sage-light)]' : 'bg-blue-50';
  const text = color === 'sage' ? 'text-[var(--sage)]'     : 'text-blue-700';
  return (
    <div className={`rounded-[var(--radius)] p-4 ${bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${text}`}>{label}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded bg-white ${text}`}>{(percent * 100).toFixed(1)} %</span>
      </div>
      <div className="text-[11px] text-[var(--dust)]">Salaire net à verser</div>
      <div className={`text-xl font-bold ${text}`}>{salNet.toFixed(2)} €</div>

      {racOption && (
        <div className="mt-3 pt-3 border-t border-white/70 text-xs space-y-1">
          <Line l="Charges salariales (21,88 %)" v={`${chSal.toFixed(2)} €`} />
          <Line l="Charges patronales (44,70 %)" v={`${chPat.toFixed(2)} €`} />
          <Line l="Total aides CAF" v={`− ${aides.toFixed(2)} €`} bold />
          <div className="flex justify-between pt-1 border-t border-white/70 font-semibold">
            <span>Reste à charge estimé</span>
            <span>{rac.toFixed(2)} €</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Line({ l, v, bold }: { l: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--dust)]">{l}</span>
      <span className={`font-mono ${bold ? 'font-semibold' : ''}`}>{v}</span>
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
      <FN label="Abattement charges patronales"     value={a.abattementCharges} onChange={upd('abattementCharges')} />
      <FN label="CMG cotisations sociales CAF"      value={a.cmgCotisations}    onChange={upd('cmgCotisations')} />
      <FN label="CMG rémunération CAF"              value={a.cmgRemuneration}   onChange={upd('cmgRemuneration')} />
      <FN label="Aide ville (ex : St-Ouen)"         value={a.aideVille}         onChange={upd('aideVille')} />
      <FN label="Crédit d'impôt (annuel)"           value={a.creditImpot}       onChange={upd('creditImpot')} />
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
