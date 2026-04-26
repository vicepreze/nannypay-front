'use client';

import { useMemo, useState } from 'react';
import { K_SAL, K_PAT, K_TOTAL } from '@/lib/calcul';

// ── Types exportés ────────────────────────────────────────────────────

export type Aides = {
  cmgCotisations:    number;
  cmgRemuneration:   number;
  abattementCharges: number;
  aideVille:         number;
  creditImpot:       number;
};

export function totalAidesMens(a: Aides): number {
  return Math.round(
    (a.cmgCotisations + a.cmgRemuneration + a.abattementCharges + a.aideVille + a.creditImpot / 12) * 100
  ) / 100;
}

// ── Composant principal ───────────────────────────────────────────────

type Props = {
  nomA: string; nomB: string;
  navigo: number; setNavigo: (v: number) => void;
  km: number; setKm: (v: number) => void;
  entretien: number; setEntretien: (v: number) => void;
  salNetTotalMens: number;
  pProportionnel: number;
  pEquitable: number;
  aidesAMens: number;
  aidesBMens: number;
  repartA: number; setRepartA: (v: number) => void;
  racOption: boolean; setRacOption: (v: boolean) => void;
  aA: Aides; setAA: (v: Aides) => void;
  aB: Aides; setAB: (v: Aides) => void;
};

const SLIDER_MIN = 20;
const SLIDER_MAX = 80;
const pct = (p: number) => ((p * 100 - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

export function PaieFormCore({
  nomA, nomB,
  navigo, setNavigo, km, setKm, entretien, setEntretien,
  salNetTotalMens, pProportionnel, pEquitable, aidesAMens, aidesBMens,
  repartA, setRepartA, racOption, setRacOption, aA, setAA, aB, setAB,
}: Props) {
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

  return (
    <>
      {/* 2 — Indemnités */}
      <Card title="2 — Indemnités">
        <div className="grid grid-cols-3 gap-3">
          <FN label="Navigo (€/mois)"   value={navigo}    onChange={setNavigo} />
          <FN label="Frais km (€/mois)" value={km}        onChange={setKm} />
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
          <div className="grid grid-cols-2 divide-x divide-[var(--line)]">
            <AidesColumn label={nomA} a={aA} setA={setAA} total={aidesAMens} />
            <AidesColumn label={nomB} a={aB} setA={setAB} total={aidesBMens} />
          </div>
        )}
      </div>

      {racOption && salNetTotalMens > 0 && (
        <CalcDetaille
          nomA={nomA} nomB={nomB}
          salNetTotalMens={salNetTotalMens}
          pProportionnel={pProportionnel}
          pEquitable={pEquitable}
          aidesA={aidesAMens}
          aidesB={aidesBMens}
        />
      )}
    </>
  );
}

// ── Sous-composants privés ────────────────────────────────────────────

function SliderRow({ value, onChange, min, max, markers }: {
  value: number; onChange: (v: number) => void;
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
            <span key={i}
              className={`absolute text-[10px] -translate-x-1/2 whitespace-nowrap ${m.highlight ? 'text-[var(--sage)] font-semibold' : 'text-[var(--dust)]'}`}
              style={{ left: `${p}%` }}>
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
            <span key={i}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${m.highlight ? 'bg-[var(--sage)]' : 'bg-[var(--dust)]'}`}
              style={{ left: `${p}%` }}
            />
          );
        })}
        <input
          type="range" min={min} max={max} step={0.1}
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
          -webkit-appearance: none; appearance: none;
          width: 20px; height: 20px; border-radius: 50%;
          background: white; border: 2px solid var(--sage);
          cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .slider-thumb::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 50%;
          background: white; border: 2px solid var(--sage);
          cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
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
          <Line l="Charges salariales (21,88 % du brut)" v={`${chSal.toFixed(2)} €`} />
          <Line l="Charges patronales (44,70 % du brut)" v={`${chPat.toFixed(2)} €`} />
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
      <FN label="Abattement charges patronales"  value={a.abattementCharges} onChange={upd('abattementCharges')} />
      <FN label="CMG cotisations sociales CAF"   value={a.cmgCotisations}    onChange={upd('cmgCotisations')} />
      <FN label="CMG rémunération CAF"           value={a.cmgRemuneration}   onChange={upd('cmgRemuneration')} />
      <FN label="Aide ville (ex : St-Ouen)"      value={a.aideVille}         onChange={upd('aideVille')} />
      <FN label="Crédit d'impôt (annuel)"        value={a.creditImpot}       onChange={upd('creditImpot')} />
      <div className="flex justify-between pt-3 border-t border-[var(--line)] text-xs font-semibold">
        <span>Total aides / mois</span>
        <span className="font-mono text-[var(--sage)]">− {total.toFixed(2)} €</span>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} aria-pressed={checked}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[var(--sage)]' : 'bg-[var(--line)]'}`}>
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
        type="text" inputMode="decimal" value={raw} placeholder="0"
        onChange={e => { const s = e.target.value; setRaw(s); const n = parseFloat(s.replace(',', '.')); onChange(isNaN(n) ? 0 : n); }}
        onBlur={() => { const n = parseFloat(raw.replace(',', '.')); setRaw(!isNaN(n) && n !== 0 ? String(n) : ''); onChange(isNaN(n) ? 0 : n); }}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-white border border-[var(--line)] focus:border-[var(--sage)]"
      />
    </div>
  );
}

function CalcDetaille({ nomA, nomB, salNetTotalMens, pProportionnel, pEquitable, aidesA, aidesB }: {
  nomA: string; nomB: string;
  salNetTotalMens: number;
  pProportionnel: number; pEquitable: number;
  aidesA: number; aidesB: number;
}) {
  const RAC_MIN = 0.15;

  const salNetA_prop = Math.round(pProportionnel * salNetTotalMens);
  const salNetB_prop = Math.round((1 - pProportionnel) * salNetTotalMens);
  const brutA        = Math.round(salNetA_prop / 0.7812);
  const brutB        = Math.round(salNetB_prop / 0.7812);
  const cotisA       = Math.round(salNetA_prop * (K_SAL + K_PAT));
  const cotisB       = Math.round(salNetB_prop * (K_SAL + K_PAT));
  const coutA_prop   = salNetA_prop * K_TOTAL;
  const coutB_prop   = salNetB_prop * K_TOTAL;
  const racA_prop    = Math.round(Math.max(coutA_prop - aidesA, RAC_MIN * coutA_prop));
  const racB_prop    = Math.round(Math.max(coutB_prop - aidesB, RAC_MIN * coutB_prop));

  const salNetA_eq = Math.round(pEquitable * salNetTotalMens);
  const salNetB_eq = Math.round((1 - pEquitable) * salNetTotalMens);
  const coutA_eq   = salNetA_eq * K_TOTAL;
  const coutB_eq   = salNetB_eq * K_TOTAL;
  const racA_eq    = Math.round(Math.max(coutA_eq - aidesA, RAC_MIN * coutA_eq));
  const racB_eq    = Math.round(Math.max(coutB_eq - aidesB, RAC_MIN * coutB_eq));

  const aidesAr = Math.round(aidesA);
  const aidesBr = Math.round(aidesB);

  return (
    <div className="rounded-[var(--radius)] overflow-hidden bg-white border border-[var(--line)]">
      <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-sm font-semibold text-[var(--ink)]">
        Détail du calcul — Avant / Après optimisation RAC
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--paper)]">
              <th className="px-4 py-2.5 text-left font-medium text-[var(--dust)]">Intitulé</th>
              <th className="px-4 py-2.5 text-right font-semibold text-[var(--sage)] w-28">{nomA}</th>
              <th className="px-4 py-2.5 text-right font-semibold text-blue-600 w-28">{nomB}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--line)]">
              <td className="px-4 py-2.5 text-[var(--ink)]">Salaire net classique (au réel/prorata)</td>
              <td className="px-4 py-2.5 text-right font-mono text-[var(--sage)]">{salNetA_prop} €</td>
              <td className="px-4 py-2.5 text-right font-mono text-blue-600">{salNetB_prop} €</td>
            </tr>
            <tr className="border-b border-[var(--line)] bg-[var(--paper)]">
              <td className="px-4 py-2.5 text-[var(--ink)]">Salaire brut équivalent</td>
              <td className="px-4 py-2.5 text-right font-mono text-[var(--sage)]">{brutA} €</td>
              <td className="px-4 py-2.5 text-right font-mono text-blue-600">{brutB} €</td>
            </tr>
            <tr className="border-b border-[var(--line)]">
              <td className="px-4 py-2.5 text-[var(--ink)]">Cotisations Urssaf (Patronales &amp; Salariales)</td>
              <td className="px-4 py-2.5 text-right font-mono text-[var(--sage)]">{cotisA} €</td>
              <td className="px-4 py-2.5 text-right font-mono text-blue-600">{cotisB} €</td>
            </tr>
            <tr className="border-b border-[var(--line)] bg-[var(--paper)]">
              <td className="px-4 py-2.5 text-[var(--ink)]">Aides déduites (CMG CAF + Mairie)</td>
              <td className="px-4 py-2.5 text-right font-mono text-[var(--sage)]">− {aidesAr} €</td>
              <td className="px-4 py-2.5 text-right font-mono text-blue-600">− {aidesBr} €</td>
            </tr>
            <tr className="border-b-2 border-[var(--line)]">
              <td className="px-4 py-2.5 font-semibold text-[var(--ink)]">Reste à charge classique (Avant optimisation)</td>
              <td className="px-4 py-2.5 text-right font-mono font-semibold text-[var(--sage)]">{racA_prop} €</td>
              <td className="px-4 py-2.5 text-right font-mono font-semibold text-blue-600">{racB_prop} €</td>
            </tr>
            <tr className="border-b border-[var(--line)] bg-[var(--paper)]">
              <td colSpan={3} className="px-4 py-2 text-[10px] text-[var(--dust)] tracking-wide uppercase">
                Après optimisation équitable
              </td>
            </tr>
            <tr className="border-b border-[var(--line)] bg-[var(--sage-light)]">
              <td className="px-4 py-3 text-[var(--ink)]">✨ Nouveau salaire net à verser</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-[var(--sage)]">{salNetA_eq} €</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">{salNetB_eq} €</td>
            </tr>
            <tr className="border-b border-[var(--line)] bg-[var(--sage-light)]">
              <td className="px-4 py-3 text-[var(--ink)]">Nouvelle répartition du salaire</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-[var(--sage)]">{Math.round(pEquitable * 100)} %</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">{Math.round((1 - pEquitable) * 100)} %</td>
            </tr>
            <tr className="bg-[var(--sage-light)]">
              <td className="px-4 py-3 font-bold text-[var(--ink)]">🎯 Nouveau Reste à charge équitable</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-[var(--sage)] text-sm">{racA_eq} €</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-blue-600 text-sm">{racB_eq} €</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
