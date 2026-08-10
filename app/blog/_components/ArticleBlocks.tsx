import Link from 'next/link';

export function SectionNum({ n, error = false }: { n: string; error?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-white text-xs font-bold mr-2 align-middle relative -top-0.5 flex-shrink-0 ${
        error ? 'bg-red-600' : 'bg-[var(--sage)]'
      }`}
    >
      {n}
    </span>
  );
}

export function Note({ type, children }: { type: 'info' | 'warn'; children: React.ReactNode }) {
  return (
    <div
      className={`flex gap-3 items-start rounded-[var(--radius)] px-4 py-3.5 my-5 text-sm leading-relaxed ${
        type === 'info'
          ? 'bg-[var(--sage-light)] border-l-[3px] border-[var(--sage)] text-[var(--ink)]'
          : 'bg-[#fdf8ee] border-l-[3px] border-[#c8a96e] text-[#5a4a20]'
      }`}
    >
      {children}
    </div>
  );
}

export function FormulaBox({ label, formula }: { label: string; formula: React.ReactNode }) {
  return (
    <div className="bg-[var(--night)] rounded-[var(--radius)] px-6 py-5 my-5">
      <div className="text-[10px] font-semibold tracking-widest uppercase text-[var(--sage-dark)] mb-2.5 flex items-center gap-2">
        <span className="inline-block w-3.5 h-px bg-[var(--sage)]" />
        {label}
      </div>
      <code className="block font-sans text-sm font-medium text-[var(--ink)] leading-loose not-italic">
        {formula}
      </code>
    </div>
  );
}

export function CalcCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden my-5 shadow-sm">
      <div className="bg-[#1a2318] px-5 py-3.5 flex items-center gap-3">
        <span className="w-8 h-8 bg-[var(--sage)]/20 rounded-lg flex items-center justify-center text-base flex-shrink-0">
          {icon}
        </span>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <table className="w-full border-collapse">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function CalcRow({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <tr className="border-b border-[var(--line)]">
      <td className="px-5 py-2.5 text-sm text-[var(--dust)]">{label}</td>
      <td className="px-5 py-2.5 text-sm text-right font-semibold text-[var(--ink)] whitespace-nowrap">{value}</td>
    </tr>
  );
}

export function CalcSubtotalRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="bg-[var(--sage-light)]">
      <td className="px-5 py-2.5 text-sm font-bold text-[var(--sage)]">{label}</td>
      <td className="px-5 py-2.5 text-sm text-right font-bold text-[var(--sage)] whitespace-nowrap">{value}</td>
    </tr>
  );
}

export function CalcTotalRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="bg-[var(--night)]">
      <td className="px-5 py-3 text-sm font-bold text-[var(--ink)]">{label}</td>
      <td className="px-5 py-3 text-sm text-right font-bold text-[var(--ink)] whitespace-nowrap">{value}</td>
    </tr>
  );
}

export function CalcNoteRow({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={2} className="px-5 py-2 text-xs text-[var(--dust)] italic leading-relaxed">
        {children}
      </td>
    </tr>
  );
}

export function Tag({ color, children }: { color: 'green' | 'gold' | 'red'; children: React.ReactNode }) {
  const cls = {
    green: 'bg-[var(--sage-light)] text-[var(--sage)]',
    gold: 'bg-[#fdf3e0] text-[#8a6020]',
    red: 'bg-red-50 text-red-600',
  }[color];
  return (
    <span className={`inline-block text-[11px] font-semibold px-1.5 py-0.5 rounded ml-1 ${cls}`}>
      {children}
    </span>
  );
}

export function Step({
  num, title, children, error = false,
}: { num: string; title: string; children: React.ReactNode; error?: boolean }) {
  return (
    <div className="flex gap-3 items-start">
      <span
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white mt-0.5 ${
          error ? 'bg-red-600' : 'bg-[var(--sage)]'
        }`}
      >
        {num}
      </span>
      <div className="text-sm text-[var(--dust)] leading-relaxed">
        <strong className="block text-[var(--ink)] font-semibold mb-0.5">{title}</strong>
        {children}
      </div>
    </div>
  );
}

export function Steps({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 my-5">{children}</div>;
}

export function CtaMid({ title, desc, ctaText, ctaHref }: {
  title: string; desc: string; ctaText: string; ctaHref: string;
}) {
  return (
    <div className="bg-[var(--night)] rounded-2xl px-8 py-9 my-10 text-center relative overflow-hidden">
      <h3 className="font-serif text-xl font-bold text-[var(--ink)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--ink)]/70 mb-6 max-w-sm mx-auto leading-relaxed">{desc}</p>
      <Link
        href={ctaHref}
        className="inline-block bg-[var(--sage)] text-white font-semibold text-sm px-8 py-3 rounded-lg hover:bg-[var(--sage-dark)] transition-colors no-underline"
      >
        {ctaText}
      </Link>
    </div>
  );
}

export function SummaryBox({ title, items }: { title: string; items: React.ReactNode[] }) {
  return (
    <div className="bg-[var(--night)] rounded-2xl px-6 py-7 mb-10">
      <div className="text-[10px] font-semibold tracking-widest uppercase text-[var(--sage-dark)] mb-3 flex items-center gap-2">
        <span className="inline-block w-[18px] h-px bg-[var(--sage)]" />
        Résumé · 1 minute
      </div>
      <h2 className="font-serif text-[18px] font-bold text-[var(--ink)] mb-4">{title}</h2>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-[var(--ink)]/80 leading-snug list-none">
            <span className="text-[var(--sage-dark)] flex-shrink-0 mt-0.5">→</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HSupVisual({
  title = 'Barème légal des majorations — Convention collective IDCC 3239',
  segments = [
    { flex: 40, cls: 'bg-[var(--sage)]', label: '0 → 40h\ntaux normal', legend: <>0 à 40h — taux contractuel normal</> },
    { flex: 8, cls: 'bg-[#c8a96e]', label: '41e → 48e h\n+ 25 %', legend: <>41e à 48e heure — majoration <strong>+ 25 %</strong></> },
    { flex: 4, cls: 'bg-red-600', label: '> 48h\n+ 50 %', legend: <>Au-delà de 48h — majoration <strong>+ 50 %</strong></> },
  ],
}: {
  title?: string;
  segments?: { flex: number; cls: string; label: string; legend: React.ReactNode }[];
}) {
  return (
    <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden my-5">
      <div className="bg-[#1a2318] px-5 py-3.5 flex items-center gap-3">
        <span className="w-8 h-8 bg-[var(--sage)]/20 rounded-lg flex items-center justify-center text-base flex-shrink-0">📊</span>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <div className="px-5 py-5">
        <div className="flex h-12 rounded-lg overflow-hidden mb-4">
          {segments.map((s, i) => (
            <div
              key={i}
              className={`flex items-center justify-center text-white text-[11px] font-bold text-center leading-snug px-1 ${s.cls}`}
              style={{ flex: s.flex }}
            >
              {s.label.split('\n').map((line, j) => (
                <span key={j}>
                  {j > 0 && <br />}
                  {line}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-5">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-[var(--dust)]">
              <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${s.cls}`} />
              {s.legend}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type FlowSegment = { value: number; label: string };
type CeilingBar = { amount: string; heightPx: number; label: string; ghost?: boolean };

export function EquityFlow({
  icon = '🔗',
  headerLabel,
  topNode,
  familyA,
  familyB,
  prorata,
  prorataNote,
  ceilingLabel,
  ceilingBars,
  ceilingNote,
  before,
  beforeNote,
  fixLabel,
  after,
  afterNote,
}: {
  icon?: string;
  headerLabel: string;
  topNode: string;
  familyA: { title: string; sub: string };
  familyB: { title: string; sub: string };
  prorata: [FlowSegment, FlowSegment];
  prorataNote: React.ReactNode;
  ceilingLabel: string;
  ceilingBars: CeilingBar[];
  ceilingNote: React.ReactNode;
  before: [FlowSegment, FlowSegment];
  beforeNote: React.ReactNode;
  fixLabel: string;
  after: [FlowSegment, FlowSegment];
  afterNote: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden my-8">
      <div className="bg-[#1a2318] px-5 py-3.5 flex items-center gap-3">
        <span className="w-8 h-8 bg-[var(--sage)]/20 rounded-lg flex items-center justify-center text-base flex-shrink-0">
          {icon}
        </span>
        <span className="text-sm font-semibold text-white">{headerLabel}</span>
      </div>

      <div className="px-6 py-7">
        <div className="text-center">
          <span className="inline-block bg-[var(--sage-light)] text-[var(--sage-dark)] font-bold text-[13px] px-4 py-2 rounded-[10px]">
            {topNode}
          </span>
        </div>

        <svg width="100%" height="34" viewBox="0 0 400 34" className="block mx-auto">
          <path d="M200,0 L200,10 M200,10 L90,10 L90,34 M200,10 L310,10 L310,34" fill="none" stroke="var(--sage-mid)" strokeWidth="2" />
        </svg>

        <div className="flex gap-4">
          <div className="flex-1 bg-[var(--sage-light)] border border-[var(--sage-mid)] rounded-xl px-3.5 py-3 text-center">
            <div className="text-xs font-bold text-[var(--sage-dark)]">{familyA.title}</div>
            <div className="text-[11px] text-[var(--dust)] mt-0.5">{familyA.sub}</div>
          </div>
          <div className="flex-1 bg-[var(--sage-light)] border border-[var(--sage-mid)] rounded-xl px-3.5 py-3 text-center">
            <div className="text-xs font-bold text-[var(--sage-dark)]">{familyB.title}</div>
            <div className="text-[11px] text-[var(--dust)] mt-0.5">{familyB.sub}</div>
          </div>
        </div>

        <svg width="100%" height="28" viewBox="0 0 400 28" className="block mx-auto">
          <path d="M90,0 L90,14 L310,14 M310,0 L310,14 M200,14 L200,28" fill="none" stroke="var(--sage-mid)" strokeWidth="2" />
        </svg>

        <div className="text-center text-[10px] font-bold tracking-widest text-[var(--dust)] uppercase mb-2">
          Répartition du salaire — prorata heures
        </div>
        <div className="flex h-[34px] rounded-lg overflow-hidden">
          <div className="flex items-center justify-center text-white text-xs font-bold bg-[var(--sage)]" style={{ flex: prorata[0].value }}>
            {prorata[0].label}
          </div>
          <div className="flex items-center justify-center text-[var(--sage-dark)] text-xs font-bold bg-[var(--sage-mid)]" style={{ flex: prorata[1].value }}>
            {prorata[1].label}
          </div>
        </div>
        <div className="text-center text-[11px] text-[var(--dust)] italic mt-2">{prorataNote}</div>

        <div className="flex items-center gap-2.5 my-4">
          <div className="flex-1 h-px bg-[var(--line)]" />
          <span className="bg-[#fdf3e0] text-[#8a6020] text-[10px] font-extrabold tracking-widest px-2.5 py-1 rounded-full">MAIS</span>
          <div className="flex-1 h-px bg-[var(--line)]" />
        </div>

        <div className="text-center text-[10px] font-bold tracking-widest text-[#8a6020] uppercase mb-4">
          {ceilingLabel}
        </div>
        <div className="flex items-end gap-4 justify-center px-2">
          {ceilingBars.map((bar, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`text-[11px] font-bold mb-1 ${bar.ghost ? 'text-[#8a6020]' : 'text-[var(--ink)]'}`}>
                {bar.amount}
              </div>
              <div
                className={
                  bar.ghost
                    ? 'w-[46px] rounded-t-md border-[1.5px] border-dashed border-[#c8a96e]'
                    : `w-[46px] rounded-t-md ${i === 0 ? 'bg-[var(--sage-mid)]' : 'bg-[var(--sage-dark)]'}`
                }
                style={{
                  height: `${bar.heightPx}px`,
                  backgroundImage: bar.ghost
                    ? 'repeating-linear-gradient(45deg, #fdf3e0, #fdf3e0 4px, #fff 4px, #fff 8px)'
                    : undefined,
                }}
              />
              <div className="text-[10px] text-[var(--dust)] mt-1 text-center leading-snug">
                {bar.label.split('\n').map((line, j) => (
                  <span key={j}>
                    {j > 0 && <br />}
                    {line}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="text-center text-[11px] text-[var(--dust)] italic mt-2.5">{ceilingNote}</div>

        <svg width="100%" height="24" viewBox="0 0 400 24" className="block mx-auto mt-1.5">
          <path d="M200,0 L200,18 M192,18 L200,24 L208,18" fill="none" stroke="#dc2626" strokeWidth="2" />
        </svg>

        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 mt-1.5">
          <div className="text-[10px] font-extrabold tracking-widest text-red-600 uppercase mb-2">Résultat sans ajustement</div>
          <div className="flex h-7 rounded-md overflow-hidden mb-2">
            <div className="flex items-center justify-center text-white text-[11px] font-bold bg-red-600" style={{ flex: before[0].value }}>
              {before[0].label}
            </div>
            <div className="flex items-center justify-center text-red-900 text-[11px] font-bold bg-red-200" style={{ flex: before[1].value }}>
              {before[1].label}
            </div>
          </div>
          <div className="text-[11px] text-red-900">{beforeNote}</div>
        </div>

        <div className="flex items-center justify-center gap-2 my-4">
          <span className="text-base">⚖️</span>
          <span className="text-xs font-bold text-[var(--sage-dark)]">{fixLabel}</span>
        </div>

        <div className="bg-[var(--sage-light)] border border-[var(--sage-mid)] rounded-xl px-4 py-3.5">
          <div className="text-[10px] font-extrabold tracking-widest text-[var(--sage-dark)] uppercase mb-2">✓ Résultat après ajustement 60/40</div>
          <div className="flex h-7 rounded-md overflow-hidden mb-2">
            <div className="flex items-center justify-center text-white text-[11px] font-bold bg-[var(--sage)]" style={{ flex: after[0].value }}>
              {after[0].label}
            </div>
            <div className="flex items-center justify-center text-[var(--sage-dark)] text-[11px] font-bold bg-[var(--sage-mid)]" style={{ flex: after[1].value }}>
              {after[1].label}
            </div>
          </div>
          <div className="text-[11px] text-[var(--sage-dark)]">{afterNote}</div>
        </div>
      </div>
    </div>
  );
}

type RangeRow = { label: string; value: string; left?: number; right?: number; width?: number };

export function RangeChart({
  icon = '📊',
  title,
  rows,
  scale,
}: {
  icon?: string;
  title: string;
  rows: RangeRow[];
  scale?: string[];
}) {
  return (
    <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden my-5">
      <div className="bg-[#1a2318] px-5 py-3.5 flex items-center gap-3">
        <span className="w-8 h-8 bg-[var(--sage)]/20 rounded-lg flex items-center justify-center text-base flex-shrink-0">
          {icon}
        </span>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <div className="px-5 py-5">
        {rows.map((r, i) => (
          <div key={i} className={i < rows.length - 1 ? 'mb-5' : ''}>
            <div className="flex justify-between text-sm font-semibold text-[var(--ink)] mb-1.5">
              <span>{r.label}</span>
              <span className="text-[var(--sage-dark)] font-bold">{r.value}</span>
            </div>
            <div className="relative h-2.5 bg-[var(--sage-light)] rounded-full">
              <div
                className="absolute top-0 bottom-0 bg-[var(--sage)] rounded-full"
                style={{
                  left: r.left !== undefined ? `${r.left}%` : 0,
                  right: r.right !== undefined ? `${r.right}%` : undefined,
                  width: r.width !== undefined ? `${r.width}%` : undefined,
                }}
              />
            </div>
          </div>
        ))}
        {scale && (
          <div className="flex justify-between text-[11px] text-[var(--dust)] mt-4 pt-2.5 border-t border-dashed border-[var(--line)]">
            {scale.map((s, i) => (
              <span key={i}>{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type CompareColumn = { label: string; sub?: string };
type CompareRow = { label: React.ReactNode; values: React.ReactNode[]; total?: boolean };

export function CompareTable({ columns, rows }: { columns: CompareColumn[]; rows: CompareRow[] }) {
  return (
    <div className="overflow-x-auto my-5">
      <table className="w-full border-collapse bg-white border border-[var(--line)] rounded-2xl overflow-hidden text-sm">
        <thead>
          <tr>
            <th className="bg-[var(--ink)] text-white text-left px-4 py-3 text-[13px] font-semibold" />
            {columns.map((c, i) => (
              <th key={i} className="bg-[var(--sage)] text-white text-left px-4 py-3 text-[13px] font-semibold">
                {c.label}
                {c.sub && <span className="block font-normal text-[11px] opacity-85 mt-0.5">{c.sub}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={r.total ? 'bg-[var(--sage-light)]' : 'border-b border-[var(--line)]'}>
              <td
                className={`px-4 py-2.5 ${r.total ? 'font-bold text-[var(--sage-dark)]' : 'font-medium text-[var(--ink)]'}`}
              >
                {r.label}
              </td>
              {r.values.map((v, j) => (
                <td
                  key={j}
                  className={`px-4 py-2.5 whitespace-nowrap ${r.total ? 'font-bold text-[var(--sage-dark)]' : 'text-[var(--dust)]'}`}
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FieldBlock({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3 border border-[var(--line)] rounded-xl px-4 py-3 my-3 bg-white">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--dust)] mb-1">{label}</div>
        <div className="text-sm font-semibold text-[var(--ink)]">{value}</div>
        {hint && <div className="text-xs text-[var(--dust)] mt-1 leading-relaxed">{hint}</div>}
      </div>
    </div>
  );
}

export function SourcesSection({
  sources,
}: {
  sources: { href: string; label: string; suffix?: string }[];
}) {
  return (
    <div className="border-t border-[var(--line)] mt-10 pt-6">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--dust)] mb-3">
        Sources officielles
      </p>
      <ul className="space-y-1.5">
        {sources.map(({ href, label, suffix }) => (
          <li key={href} className="text-sm text-[var(--dust)] list-none">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--sage)] hover:underline no-underline"
            >
              {label}
            </a>
            {suffix && ` ${suffix}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
