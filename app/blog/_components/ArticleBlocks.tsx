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
