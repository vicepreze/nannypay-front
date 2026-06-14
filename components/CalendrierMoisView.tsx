'use client';

import { useCallback } from 'react';
import { type Evt, type CalcResult, calculerMois } from '@/lib/calcul';
import { CongesCard } from '@/components/CongesCard';

const MOIS_COURTS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

function dateStr(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ── Jours fériés français ──────────────────────────────────────────
function easterDate(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function frenchHolidays(year: number): Set<string> {
  const pad = (n: number) => String(n).padStart(2, '0');
  const ds  = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const add = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
  const p   = year;
  const easter = easterDate(year);
  return new Set([
    `${p}-01-01`,
    ds(add(easter, 1)),   // Lundi de Pâques
    `${p}-05-01`,
    `${p}-05-08`,
    ds(add(easter, 39)),  // Ascension
    ds(add(easter, 50)),  // Lundi de Pentecôte
    `${p}-07-14`,
    `${p}-08-15`,
    `${p}-11-01`,
    `${p}-11-11`,
    `${p}-12-25`,
  ]);
}

// ── Grammaire couleur ──────────────────────────────────────────────
type DayType = 'worked' | 'cp' | 'sick' | 'holiday' | 'off';

const CELL_STYLE: Record<DayType, React.CSSProperties> = {
  worked:  { background: '#EAF3DE', border: '0.5px solid #C0DD97' },
  cp:      { background: '#FCE8F3', border: '0.5px solid #F4C0D1' },
  sick:    { background: '#FCEBEB', border: '0.5px solid #F09595' },
  holiday: { background: '#F1EFE8', border: '0.5px solid #D3D1C7' },
  off:     { background: 'var(--paper)', border: '0.5px solid var(--line)', opacity: 0.35 },
};

const DAY_NUM_COLOR: Record<DayType, string> = {
  worked:  '#27500A',
  cp:      '#72243E',
  sick:    '#791F1F',
  holiday: '#444441',
  off:     'var(--dust)',
};

const TAG_BASE: React.CSSProperties = {
  fontSize: 9, fontWeight: 500, padding: '2px 6px', borderRadius: 4, width: 'fit-content', lineHeight: '1.4',
};

type TagDef = { label: string; extra: React.CSSProperties };

function tagsForDay(dt: DayType): TagDef[] {
  switch (dt) {
    case 'worked':  return [{ label: 'travaillé',  extra: { background: 'transparent', color: '#3B6D11', border: '0.5px solid #3B6D11' } }];
    case 'cp':      return [{ label: 'congé payé', extra: { background: '#F4C0D1', color: '#72243E' } }];
    case 'sick':    return [{ label: 'maladie',    extra: { background: '#FAEEDA', color: '#633806' } }];
    case 'holiday': return [{ label: 'férié',      extra: { background: '#D3D1C7', color: '#444441' } }];
    case 'off':     return [];
  }
}

export interface CalendrierMoisViewProps {
  annee: number;
  mois: number;
  evts: Evt[];
  result: CalcResult | null;
  statut: string;
  nomFamA?: string | null;
  nomFamB?: string | null;
  readonly: boolean;
  heuresParJour?: number | null;
  hasOvertime?: boolean;
  // Private-only:
  gardeId?: string;
  evtsSaveCount?: number;
  locked?: boolean;
  jaValide?: boolean;
  saving?: boolean;
  monLabel?: string;
  onOpenModal?: (ds?: string) => void;
  onRemoveEvt?: (i: number) => void;
  onValider?: () => void;
}

export function CalendrierMoisView({
  annee, mois, evts, result, statut,
  nomFamA, nomFamB,
  readonly,
  heuresParJour, hasOvertime,
  gardeId, evtsSaveCount = 0,
  locked: lockedProp, jaValide, saving, monLabel,
  onOpenModal, onRemoveEvt, onValider,
}: CalendrierMoisViewProps) {
  const locked = lockedProp ?? (statut === 'valide_ab');

  const renderCalendar = useCallback(() => {
    const holidays = frenchHolidays(annee);

    const premier = new Date(annee, mois - 1, 1);
    const offset  = premier.getDay() === 0 ? 6 : premier.getDay() - 1;
    const lundi   = new Date(annee, mois - 1, 1 - offset);
    const dernier = new Date(annee, mois, 0);
    const dow     = dernier.getDay();
    const vend    = new Date(dernier);
    if (dow >= 1 && dow <= 4) vend.setDate(dernier.getDate() + (5 - dow));
    else if (dow === 6) vend.setDate(dernier.getDate() - 1);
    else if (dow === 0) vend.setDate(dernier.getDate() - 2);

    const today = new Date();
    const cells: React.ReactNode[] = [];
    const cur = new Date(lundi);

    while (cur <= vend) {
      if (cur.getDay() >= 1 && cur.getDay() <= 5) {
        const isCur   = cur.getMonth() === mois - 1;
        const isToday = cur.toDateString() === today.toDateString();
        const ds      = dateStr(cur);
        const clickable = isCur && !locked && !readonly;

        // ── dayType ──────────────────────────────────────────────
        let dayType: DayType = 'off';
        if (isCur) {
          const absEvts = evts.filter(e => e.debut <= ds && e.fin >= ds);
          if (holidays.has(ds))                                  dayType = 'holiday';
          else if (absEvts.some(e => e.type === 'conge_paye'))   dayType = 'cp';
          else if (absEvts.some(e => e.type === 'maladie_nounou')) dayType = 'sick';
          else                                                    dayType = 'worked';
        }

        const tags = tagsForDay(dayType);

        cells.push(
          <div
            key={ds}
            onClick={() => clickable && onOpenModal?.(ds)}
            style={CELL_STYLE[dayType]}
            className={'min-h-[64px] p-1.5 ' + (clickable ? 'cursor-pointer hover:brightness-95 transition-[filter]' : 'cursor-default')}
          >
            {/* Numéro du jour */}
            {isToday ? (
              <div className="w-5 h-5 rounded-full bg-[var(--sage)] text-white text-[10px] flex items-center justify-center mb-1 font-medium">
                {cur.getDate()}
              </div>
            ) : (
              <div style={{ color: DAY_NUM_COLOR[dayType], fontWeight: 500, fontSize: 11, marginBottom: 3 }}>
                {cur.getDate()}
              </div>
            )}

            {/* Heures/jour sur les jours travaillés */}
            {dayType === 'worked' && heuresParJour != null && (
              <div style={{ color: '#4a7c59', fontSize: 11, marginBottom: 3 }}>
                {heuresParJour % 1 === 0 ? heuresParJour : heuresParJour.toFixed(1)}h
                {hasOvertime && (
                  <span style={{ background: '#fdf3e0', color: '#8a6020', fontSize: 10, borderRadius: 3, padding: '0 3px', marginLeft: 3 }}>+</span>
                )}
              </div>
            )}

            {/* Tags */}
            <div className="flex flex-col gap-0.5">
              {tags.map(t => (
                <div key={t.label} style={{ ...TAG_BASE, ...t.extra }}>{t.label}</div>
              ))}
            </div>
          </div>
        );
      }
      cur.setDate(cur.getDate() + 1);
    }
    return cells;
  }, [annee, mois, evts, locked, readonly, heuresParJour, hasOvertime, onOpenModal]);

  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 280px' }}>

      {/* ── CALENDRIER ─────────────────────────────────────── */}
      <div>
        <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--line)]">
            <span className="text-sm font-medium">Planning du mois</span>
            {!readonly && !locked && (
              <button onClick={() => onOpenModal?.()} className="px-3 py-1.5 border-[1.5px] border-[var(--line)] rounded-lg text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)] bg-white transition-colors">
                + Événement
              </button>
            )}
          </div>
          <div className="grid grid-cols-5">
            {['Lun','Mar','Mer','Jeu','Ven'].map(j => (
              <div key={j} className="py-2 text-center text-[10px] font-medium text-[var(--dust)] uppercase tracking-wide border-b border-r border-[var(--line)] last:border-r-0 bg-[var(--paper)]">{j}</div>
            ))}
            {renderCalendar()}
          </div>
        </div>


        {/* Événements */}
        {evts.length > 0 && (
          <div className="mt-3 bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
            <div className="px-4 py-2 border-b border-[var(--line)] text-[10px] font-medium text-[var(--dust)] uppercase tracking-wide">Événements</div>
            {evts.map((e, i) => {
              const [, mo1, d1] = e.debut.split('-').map(Number);
              const [, mo2, d2] = e.fin.split('-').map(Number);
              const label = (d1 === d2 && mo1 === mo2)
                ? `${d1} ${MOIS_COURTS[mo1-1]}`
                : `${d1} ${MOIS_COURTS[mo1-1]} → ${d2} ${MOIS_COURTS[mo2-1]}`;
              return (
                <div key={i} className="flex items-center px-4 py-2.5 border-b border-[var(--line)] last:border-0 text-sm gap-3">
                  <span className={'px-2 py-0.5 rounded text-xs ' + (e.type === 'conge_paye' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700')}>
                    {e.type === 'conge_paye' ? '🏖 Congé payé' : '🤒 Maladie'}
                  </span>
                  <span className="flex-1 text-[var(--dust)]">{label}</span>
                  {!readonly && !locked && (
                    <button onClick={() => onRemoveEvt?.(i)} className="text-[var(--dust)] hover:text-[var(--red)] text-base leading-none">×</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* CongesCard — privé seulement */}
        {!readonly && gardeId && (
          <div className="mt-3">
            <CongesCard gardeId={gardeId} annee={annee} mois={mois} cpThisMonth={result?.joursAbsCP ?? 0} refreshKey={evtsSaveCount} />
          </div>
        )}
      </div>

      {/* ── RÉSULTATS ──────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {result && (
          <>
            <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[var(--line)] text-[10px] font-medium text-[var(--dust)] uppercase tracking-wide bg-[var(--paper)]">
                Salaire total nounou
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-[var(--paper)]">
                <span className="text-sm text-[var(--dust)]">Famille A + B</span>
                <strong className="text-[17px]">{result.totalNounou.toFixed(2)} €</strong>
              </div>
            </div>

            <ResultCard label="A" nom={nomFamA ?? 'Famille A'} r={result.famA} racOptionActive={readonly ? false : result.racOptionActive} />
            <ResultCard label="B" nom={nomFamB ?? 'Famille B'} r={result.famB} racOptionActive={readonly ? false : result.racOptionActive} />
          </>
        )}

      </div>
    </div>
  );
}

function ResultCard({ label, nom, r, racOptionActive }: {
  label: string; nom: string;
  r: ReturnType<typeof calculerMois>['famA'];
  racOptionActive: boolean;
}) {
  const color = label === 'A' ? 'text-[var(--blue)]' : 'text-[var(--sage)]';
  return (
    <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <div className={`px-4 py-2.5 border-b border-[var(--line)] text-[10px] font-medium uppercase tracking-wide bg-[var(--paper)] ${color} flex justify-between items-center`}>
        <span>{nom} — Pajemploi</span>
        <span className="font-mono">{(r.qp * 100).toFixed(1)} %</span>
      </div>
      {[
        ['Heures normales', r.hNorm  + ' h',               false],
        ['Heures sup +25%', r.hSup25 + ' h',               r.hSup25 === 0],
        ['Heures sup +50%', r.hSup50 + ' h',               r.hSup50 === 0],
        ['Salaire net',     r.salNet.toFixed(2)    + ' €',  false],
        ['Transport',       r.transport.toFixed(2) + ' €',  false],
        ['Entretien',       r.entretien.toFixed(2) + ' €',  false],
        ['Frais km',        r.km.toFixed(2)        + ' €',  r.km === 0],
      ].map(([l, v, dim]) => (
        <div key={String(l)} className={'flex justify-between px-4 py-1.5 border-b border-[var(--line)] text-xs ' + (dim ? 'opacity-40' : '')}>
          <span className="text-[var(--dust)]">{l}</span>
          <span className="font-medium font-mono">{v}</span>
        </div>
      ))}
      <div className="flex justify-between px-4 py-2.5 border-b border-[var(--line)] bg-[var(--paper)] font-semibold text-sm">
        <span>Total à verser</span>
        <span>{r.total.toFixed(2)} €</span>
      </div>
    </div>
  );
}

function ValidLine({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${done ? 'bg-[var(--sage)] text-white' : 'border-2 border-[var(--line)]'}`}>
        {done ? '✓' : ''}
      </span>
      <span className={done ? 'text-[var(--sage)] font-medium' : 'text-[var(--dust)]'}>{label}</span>
    </div>
  );
}
