import React from 'react';

export interface FamCalcData {
  nom: string;
  nbEnfants?: number;
  hNorm: number;
  hSup25: number;
  hSup50: number;
  salNet: number;
  exonerationHS: number;
  chargesSalariales: number;
  chargesPatronales: number;
  navigo: number;
  entretien: number;
  km: number;
  cmgCotisations: number;
  cmgRemuneration: number;
  abattementCharges: number;
  aideVille: number;
  creditImpotMens: number;
  resteCharge: number;
}

export interface NounouCalcData {
  hNorm: number;
  hSup25: number;
  hSup50: number;
  salBrut: number;
  chargesSalariales: number;
  salNet: number;
  exonerationHS: number;
  navigo: number;
  entretien: number;
  km: number;
}

interface Props {
  famA: FamCalcData;
  famB: FamCalcData;
  nounou: NounouCalcData;
  racOptionActive: boolean;
}

const eur = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const hrs = (n: number) =>
  (n % 1 === 0 ? n.toString() : n.toFixed(1)) + ' h';

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

export function DetailedCalcTable({ famA, famB, nounou, racOptionActive }: Props) {
  const hasSup25 = famA.hSup25 + famB.hSup25 + nounou.hSup25 > 0;
  const hasSup50 = famA.hSup50 + famB.hSup50 + nounou.hSup50 > 0;
  const hasExonerationHS = famA.exonerationHS + famB.exonerationHS + nounou.exonerationHS > 0;
  const hasNavigo = famA.navigo + famB.navigo + nounou.navigo > 0;
  const hasEntretien = famA.entretien + famB.entretien + nounou.entretien > 0;
  const hasKm = famA.km + famB.km + nounou.km > 0;
  const hasIndemnites = hasNavigo || hasEntretien || hasKm;

  const coutEmplA = famA.salNet + famA.chargesSalariales + famA.chargesPatronales;
  const coutEmplB = famB.salNet + famB.chargesSalariales + famB.chargesPatronales;
  const totalCoutA = coutEmplA + famA.navigo + famA.entretien + famA.km;
  const totalCoutB = coutEmplB + famB.navigo + famB.entretien + famB.km;
  const totalNounouRecu = nounou.salNet + nounou.navigo + nounou.entretien + nounou.km;

  const totalAidesA = famA.cmgCotisations + famA.cmgRemuneration + famA.abattementCharges + famA.aideVille + famA.creditImpotMens;
  const totalAidesB = famB.cmgCotisations + famB.cmgRemuneration + famB.abattementCharges + famB.aideVille + famB.creditImpotMens;

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
          {/* Heures */}
          <SectionHeader label="Heures / mois" />
          <Row label="Normales" a={hrs(famA.hNorm)} b={hrs(famB.hNorm)} n={hrs(nounou.hNorm)} />
          {hasSup25 && <Row label="Sup. +25 %" a={hrs(famA.hSup25)} b={hrs(famB.hSup25)} n={hrs(nounou.hSup25)} />}
          {hasSup50 && <Row label="Sup. +50 %" a={hrs(famA.hSup50)} b={hrs(famB.hSup50)} n={hrs(nounou.hSup50)} />}

          {/* Salaire */}
          <SectionHeader label="Salaire" />
          <Row label="Salaire brut" a={dash} b={dash} n={eur(nounou.salBrut)} />
          <Row
            label="Cotisations salariales"
            a={`(${eur(famA.chargesSalariales)})`}
            b={`(${eur(famB.chargesSalariales)})`}
            n={`− ${eur(nounou.chargesSalariales)}`}
            indent
          />
          <Row label="Salaire net" a={eur(famA.salNet)} b={eur(famB.salNet)} n={eur(nounou.salNet)} bold />
          {hasExonerationHS && (
            <Row
              label="dont exonération HS (11,31 %)"
              a={`+ ${eur(famA.exonerationHS)}`} b={`+ ${eur(famB.exonerationHS)}`} n={`+ ${eur(nounou.exonerationHS)}`}
              indent green
            />
          )}
          <Row label="Cotisations patronales" a={eur(famA.chargesPatronales)} b={eur(famB.chargesPatronales)} n={dash} indent />

          {/* Indemnités */}
          {hasIndemnites && <SectionHeader label="Indemnités" />}
          {hasNavigo    && <Row label="Pass Navigo"    a={eur(famA.navigo)}    b={eur(famB.navigo)}    n={eur(nounou.navigo)}    />}
          {hasEntretien && <Row label="Entretien"      a={eur(famA.entretien)} b={eur(famB.entretien)} n={eur(nounou.entretien)} />}
          {hasKm        && <Row label="Indemnités km"  a={eur(famA.km)}        b={eur(famB.km)}        n={eur(nounou.km)}        />}

          {/* Totaux */}
          <TotalRow label="Coût total employeur" a={eur(totalCoutA)} b={eur(totalCoutB)} n={dash} />
          <TotalRow label="Total net reçu"        a={dash}            b={dash}            n={eur(totalNounouRecu)} />

          {/* Aides + RAC */}
          {racOptionActive && (
            <>
              <SectionHeader label="Aides" />
              {(famA.cmgCotisations + famB.cmgCotisations > 0) && (
                <Row label="CMG cotisations (CAF)"  a={`− ${eur(famA.cmgCotisations)}`}  b={`− ${eur(famB.cmgCotisations)}`}  n={dash} green />
              )}
              {(famA.cmgRemuneration + famB.cmgRemuneration > 0) && (
                <Row label="CMG rémunération (CAF)" a={`− ${eur(famA.cmgRemuneration)}`} b={`− ${eur(famB.cmgRemuneration)}`} n={dash} green />
              )}
              {(famA.abattementCharges + famB.abattementCharges > 0) && (
                <Row label="Abattement charges"     a={`− ${eur(famA.abattementCharges)}`} b={`− ${eur(famB.abattementCharges)}`} n={dash} green />
              )}
              {(famA.aideVille + famB.aideVille > 0) && (
                <Row label="Aide ville"              a={`− ${eur(famA.aideVille)}`}         b={`− ${eur(famB.aideVille)}`}         n={dash} green />
              )}
              {(famA.creditImpotMens + famB.creditImpotMens > 0) && (
                <Row label="Crédit d'impôt / mois"  a={`− ${eur(famA.creditImpotMens)}`}   b={`− ${eur(famB.creditImpotMens)}`}   n={dash} green />
              )}
              <TotalRow
                label="Total aides"
                a={`− ${eur(totalAidesA)}`}
                b={`− ${eur(totalAidesB)}`}
                n={dash}
                green
              />
              <RACRow label="Reste à charge" a={eur(famA.resteCharge)} b={eur(famB.resteCharge)} />
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
