import React, { useState } from 'react';

export interface FamCalcData {
  nom: string;
  nbEnfants?: number;
  hNorm: number;
  hSup25: number;
  hSup50: number;
  salNet: number;
  exonerationHS: number;
  transport: number;
  entretien: number;
  km: number;
  netAPayerAvantIR: number;
  totalVerseReel: number;
  chargesSalariales: number;
  chargesPatronales: number;
  abattementCharges: number; // calculé automatiquement (formule Pajemploi)
  creditImpotMens: number;   // calculé automatiquement (plafond CAF + 50 % du coût restant)
  resteCharge: number;       // = totalVerseReel + chargesSalariales + chargesPatronales − totalAides
}

export interface NounouCalcData {
  hNorm: number;
  hSup25: number;
  hSup50: number;
  salNet: number;
  exonerationHS: number;
  transport: number;
  entretien: number;
  km: number;
  netAPayerAvantIR: number;
  totalVerseReel: number;
}

/** Champs "aides" que l'utilisateur peut saisir lui-même (pas d'estimation automatique possible sans revenu). */
export interface AidesEditable {
  cmgCotisations:  number;
  cmgRemuneration: number;
  aideVille:       number;
}

interface Props {
  famA: FamCalcData;
  famB: FamCalcData;
  nounou: NounouCalcData;
  aidesA: AidesEditable;
  aidesB: AidesEditable;
  onChangeAidesA: (a: AidesEditable) => void;
  onChangeAidesB: (a: AidesEditable) => void;
  totalAidesA: number;
  totalAidesB: number;
}

const eur = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const hrs = (n: number) =>
  (n % 1 === 0 ? n.toString() : n.toFixed(1)) + ' h';

function MainSectionHeader({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={4} className="px-4 pt-5 pb-1.5 text-sm font-bold text-[var(--ink)]">
        {label}
      </td>
    </tr>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="bg-[var(--paper)] border-y border-[var(--line)]">
      <td colSpan={4} className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--dust)]">
        {label}
      </td>
    </tr>
  );
}

function Row({
  label, a, b, n, indent = false, bold = false, green = false,
}: {
  label: string; a: string; b: string; n: string;
  indent?: boolean; bold?: boolean; green?: boolean;
}) {
  const textCls = green ? 'text-[var(--sage)]' : bold ? 'text-[var(--ink)]' : 'text-[var(--ink)]';
  const weightCls = bold ? 'font-semibold' : '';
  return (
    <tr className="border-b border-[var(--line)] last:border-b-0">
      <td className={`px-4 py-2 text-xs ${textCls} ${weightCls} ${indent ? 'pl-7 text-[var(--dust)]' : ''}`}>
        {label}
      </td>
      <td className={`px-4 py-2 text-xs text-right tabular-nums ${textCls} ${weightCls}`}>{a}</td>
      <td className={`px-4 py-2 text-xs text-right tabular-nums ${textCls} ${weightCls}`}>{b}</td>
      <td className={`px-4 py-2 text-xs text-right tabular-nums ${textCls} ${weightCls}`}>{n}</td>
    </tr>
  );
}

function EditableCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
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
    <input
      type="text"
      inputMode="decimal"
      value={raw}
      placeholder="0"
      onChange={handleChange}
      onBlur={handleBlur}
      className="w-24 text-right px-2 py-1 rounded border border-[var(--line)] text-xs tabular-nums bg-white focus:border-[var(--sage)] outline-none"
    />
  );
}

function EditableRow({
  label, valueA, valueB, onChangeA, onChangeB,
}: {
  label: string; valueA: number; valueB: number;
  onChangeA: (v: number) => void; onChangeB: (v: number) => void;
}) {
  return (
    <tr className="border-b border-[var(--line)] last:border-b-0">
      <td className="px-4 py-2 text-xs text-[var(--ink)]">
        {label}
        <span className="ml-1.5 text-[9px] font-medium uppercase tracking-wide text-[var(--dust)]">Champ libre</span>
      </td>
      <td className="px-4 py-1.5 text-right"><EditableCell value={valueA} onChange={onChangeA} /></td>
      <td className="px-4 py-1.5 text-right"><EditableCell value={valueB} onChange={onChangeB} /></td>
      <td className="px-4 py-2 text-xs text-right text-[var(--dust)]">—</td>
    </tr>
  );
}

function TotalRow({
  label, a, b, n, green = false,
}: {
  label: string; a: string; b: string; n: string; green?: boolean;
}) {
  const textCls = green ? 'text-[var(--sage)]' : 'text-[var(--ink)]';
  return (
    <tr className="bg-[var(--paper)] border-y border-[var(--line)]">
      <td className={`px-4 py-2.5 text-xs font-semibold ${textCls}`}>{label}</td>
      <td className={`px-4 py-2.5 text-xs font-semibold text-right tabular-nums ${textCls}`}>{a}</td>
      <td className={`px-4 py-2.5 text-xs font-semibold text-right tabular-nums ${textCls}`}>{b}</td>
      <td className={`px-4 py-2.5 text-xs font-semibold text-right tabular-nums ${textCls}`}>{n}</td>
    </tr>
  );
}

function FinalRow({ label, a, b, n }: { label: string; a: string; b: string; n: string }) {
  return (
    <tr className="border-b border-[var(--line)] bg-[var(--sage-light,#eef4ec)]">
      <td className="px-4 py-3 text-sm font-bold text-[var(--sage)]">{label}</td>
      <td className="px-4 py-3 text-sm font-bold text-right tabular-nums text-[var(--sage)]">{a}</td>
      <td className="px-4 py-3 text-sm font-bold text-right tabular-nums text-[var(--sage)]">{b}</td>
      <td className="px-4 py-3 text-sm font-bold text-right tabular-nums text-[var(--sage)]">{n}</td>
    </tr>
  );
}

function RACRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr className="border-b border-[var(--line)]">
      <td className="px-4 py-3 text-sm font-bold text-[var(--ink)]">{label}</td>
      <td className="px-4 py-3 text-sm font-bold text-right tabular-nums text-[var(--ink)]">{a}</td>
      <td className="px-4 py-3 text-sm font-bold text-right tabular-nums text-[var(--ink)]">{b}</td>
      <td className="px-4 py-3 text-sm text-right text-[var(--dust)]">—</td>
    </tr>
  );
}

export function DetailedCalcTable({
  famA, famB, nounou, aidesA, aidesB, onChangeAidesA, onChangeAidesB, totalAidesA, totalAidesB,
}: Props) {
  const hasSup25 = famA.hSup25 + famB.hSup25 + nounou.hSup25 > 0;
  const hasSup50 = famA.hSup50 + famB.hSup50 + nounou.hSup50 > 0;
  const hasExonerationHS = famA.exonerationHS + famB.exonerationHS + nounou.exonerationHS > 0;
  const hasKm = famA.km + famB.km + nounou.km > 0;
  const hasTransport = famA.transport + famB.transport + nounou.transport > 0;
  const hasEntretien = famA.entretien + famB.entretien + nounou.entretien > 0;

  const totalHeuresA = famA.hNorm + famA.hSup25 + famA.hSup50;
  const totalHeuresB = famB.hNorm + famB.hSup25 + famB.hSup50;
  const totalHeuresNounou = nounou.hNorm + nounou.hSup25 + nounou.hSup50;

  const totalChargesA = famA.chargesSalariales + famA.chargesPatronales;
  const totalChargesB = famB.chargesSalariales + famB.chargesPatronales;

  const dash = '—';

  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--line)] bg-white">
      <table className="w-full">
        <thead>
          <tr className="bg-[var(--paper)] border-b border-[var(--line)]">
            <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--dust)] w-[40%]" />
            <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--dust)]">
              {famA.nom}
              {famA.nbEnfants !== undefined && <span className="ml-1 normal-case text-[9px] opacity-60">({famA.nbEnfants} enf.)</span>}
            </th>
            <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--dust)]">
              {famB.nom}
              {famB.nbEnfants !== undefined && <span className="ml-1 normal-case text-[9px] opacity-60">({famB.nbEnfants} enf.)</span>}
            </th>
            <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--dust)]">
              Nounou
            </th>
          </tr>
        </thead>
        <tbody>
          <MainSectionHeader label="1 — Déclaration" />

          <SectionHeader label="Heures déclarées / mois" />
          <Row label="Normales" a={hrs(famA.hNorm)} b={hrs(famB.hNorm)} n={hrs(nounou.hNorm)} />
          {hasSup25 && <Row label="Sup. +25 %" a={hrs(famA.hSup25)} b={hrs(famB.hSup25)} n={hrs(nounou.hSup25)} />}
          {hasSup50 && <Row label="Sup. +50 %" a={hrs(famA.hSup50)} b={hrs(famB.hSup50)} n={hrs(nounou.hSup50)} />}
          <Row label="Nombre total d'heures" a={hrs(totalHeuresA)} b={hrs(totalHeuresB)} n={hrs(totalHeuresNounou)} />

          <SectionHeader label="Salaire déclaré" />
          <Row label="Salaire net déclaré" a={eur(famA.salNet)} b={eur(famB.salNet)} n={eur(nounou.salNet)} />
          {hasKm        && <Row label="Indemnités kilométriques" a={eur(famA.km)}        b={eur(famB.km)}        n={eur(nounou.km)} />}
          {hasTransport && <Row label="Frais de transport"       a={eur(famA.transport)} b={eur(famB.transport)} n={eur(nounou.transport)} />}
          {hasExonerationHS && (
            <Row
              label="Exonération heures sup (11,31 %)"
              a={eur(famA.exonerationHS)} b={eur(famB.exonerationHS)} n={eur(nounou.exonerationHS)}
              green
            />
          )}
          <TotalRow label="Net à payer avant l'impôt sur le revenu" a={eur(famA.netAPayerAvantIR)} b={eur(famB.netAPayerAvantIR)} n={eur(nounou.netAPayerAvantIR)} />
          {hasEntretien && (
            <Row label="+ Entretien (versé hors Pajemploi)" a={eur(famA.entretien)} b={eur(famB.entretien)} n={eur(nounou.entretien)} indent />
          )}
          <FinalRow label="Total réellement versé à la nounou" a={eur(famA.totalVerseReel)} b={eur(famB.totalVerseReel)} n={eur(nounou.totalVerseReel)} />

          <MainSectionHeader label="2 — Charges" />
          <Row label="Charges salariales"  a={eur(famA.chargesSalariales)}  b={eur(famB.chargesSalariales)}  n={dash} />
          <Row label="Charges patronales"  a={eur(famA.chargesPatronales)}  b={eur(famB.chargesPatronales)}  n={dash} />
          <TotalRow label="Total charges mensuelles" a={eur(totalChargesA)} b={eur(totalChargesB)} n={dash} />

          <MainSectionHeader label="3 — Aides" />
          <Row
            label="Abattement charges patronales"
            a={`− ${eur(famA.abattementCharges)}`} b={`− ${eur(famB.abattementCharges)}`} n={dash}
            green
          />
          <EditableRow
            label="Prise en charge des cotisations sociales (CMG de la CAF)"
            valueA={aidesA.cmgCotisations} valueB={aidesB.cmgCotisations}
            onChangeA={v => onChangeAidesA({ ...aidesA, cmgCotisations: v })}
            onChangeB={v => onChangeAidesB({ ...aidesB, cmgCotisations: v })}
          />
          <EditableRow
            label="Prise en charge partielle de la rémunération (CMG de la CAF)"
            valueA={aidesA.cmgRemuneration} valueB={aidesB.cmgRemuneration}
            onChangeA={v => onChangeAidesA({ ...aidesA, cmgRemuneration: v })}
            onChangeB={v => onChangeAidesB({ ...aidesB, cmgRemuneration: v })}
          />
          <EditableRow
            label="Aide locale (ex : Ville de St Ouen)"
            valueA={aidesA.aideVille} valueB={aidesB.aideVille}
            onChangeA={v => onChangeAidesA({ ...aidesA, aideVille: v })}
            onChangeB={v => onChangeAidesB({ ...aidesB, aideVille: v })}
          />
          <Row
            label="Crédit d'impôt / mois"
            a={`− ${eur(famA.creditImpotMens)}`} b={`− ${eur(famB.creditImpotMens)}`} n={dash}
            green
          />
          <TotalRow label="Total aides mensuelles" a={`− ${eur(totalAidesA)}`} b={`− ${eur(totalAidesB)}`} n={dash} green />

          <MainSectionHeader label="4 — Reste à charge (1 + 2 − 3)" />
          <RACRow label="Reste à charge mensuel par famille (estimé)" a={eur(famA.resteCharge)} b={eur(famB.resteCharge)} />
        </tbody>
      </table>
      <p className="px-4 py-2.5 text-[10px] text-[var(--dust)] bg-[var(--paper)] border-t border-[var(--line)]">
        « Champ libre » : nounoulink ne peut pas calculer ce montant automatiquement (donnée dépendant de votre revenu, non collectée), mais l&apos;intègre dans le reste à charge si vous le renseignez.
      </p>
    </div>
  );
}
