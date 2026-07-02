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

export function frenchHolidays(year: number): Set<string> {
  const pad = (n: number) => String(n).padStart(2, '0');
  const ds  = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const add = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
  const p   = year;
  const easter = easterDate(year);
  return new Set([
    `${p}-01-01`,
    ds(add(easter, 1)),
    `${p}-05-01`,
    `${p}-05-08`,
    ds(add(easter, 39)),
    ds(add(easter, 50)),
    `${p}-07-14`,
    `${p}-08-15`,
    `${p}-11-01`,
    `${p}-11-11`,
    `${p}-12-25`,
  ]);
}

// ── Types exportés ─────────────────────────────────────────────────
export type MonthEvtType = 'maladie_nounou' | 'conge_paye' | 'jour_repos' | 'absence_famille_a' | 'absence_famille_b' | 'holiday' | 'jour_offert';

export interface MonthEvt {
  type: MonthEvtType;
  debut: string;
  fin: string;
  workingDays: number;
  salImpactA: number;
  salImpactB: number;
  indemImpactA: number;
  indemImpactB: number;
}

export interface PrevuReelData {
  theoSalA: number;   realSalA: number;
  theoSalB: number;   realSalB: number;
  theoIndemA: number; realIndemA: number;
  theoIndemB: number; realIndemB: number;
  monthEvts: MonthEvt[];
}

export interface SickInfo {
  sickDaysCount: number;
  sickDaysConsecutive: number;
}

// ── Grammaire couleur ──────────────────────────────────────────────
type DayType = 'worked' | 'cp' | 'repos' | 'sick' | 'holiday' | 'off';

const CELL_STYLE: Record<DayType, React.CSSProperties> = {
  worked:  { background: '#EAF3DE', border: '0.5px solid #C0DD97' },
  cp:      { background: '#FCE8F3', border: '0.5px solid #F4C0D1' },
  repos:   { background: '#EAE7FB', border: '0.5px solid #C7C2F0' },
  sick:    { background: '#FCEBEB', border: '0.5px solid #F09595' },
  holiday: { background: '#F1EFE8', border: '0.5px solid #D3D1C7' },
  off:     { background: 'var(--paper)', border: '0.5px solid var(--line)', opacity: 0.35 },
};

const DAY_NUM_COLOR: Record<DayType, string> = {
  worked:  '#27500A',
  cp:      '#72243E',
  repos:   '#3D3579',
  sick:    '#791F1F',
  holiday: '#444441',
  off:     'var(--dust)',
};

const TAG_BASE: React.CSSProperties = {
  fontSize: 9, fontWeight: 500, padding: '2px 6px', borderRadius: 4, width: 'fit-content', lineHeight: '1.4',
};

type TagDef = { label: string; extra: React.CSSProperties };

function tagsForDay(dt: DayType, famAAbsent = false, famBAbsent = false): TagDef[] {
  const tags: TagDef[] = [];
  switch (dt) {
    case 'worked':  tags.push({ label: 'travaillé',  extra: { background: 'transparent', color: '#3B6D11', border: '0.5px solid #3B6D11' } }); break;
    case 'cp':      tags.push({ label: 'congé payé', extra: { background: '#F4C0D1', color: '#72243E' } }); break;
    case 'repos':   tags.push({ label: 'jour de repos', extra: { background: '#C7C2F0', color: '#3D3579' } }); break;
    case 'sick':    tags.push({ label: 'maladie',    extra: { background: '#FAEEDA', color: '#633806' } }); break;
    case 'holiday': tags.push({ label: 'férié',      extra: { background: '#D3D1C7', color: '#444441' } }); break;
    case 'off':     return [];
  }
  // Absences famille A+B le même jour travaillé → jour offert (entretien non dû), tag combiné.
  if (dt === 'worked' && famAAbsent && famBAbsent) {
    tags.push({ label: 'jour offert', extra: { background: '#EDD99A', color: '#633806' } });
    return tags;
  }
  // Sinon, cumulables : affichées en plus, quel que soit le type de jour.
  if (famAAbsent) tags.push({ label: 'absence A', extra: { background: '#185FA5', color: '#fff' } });
  if (famBAbsent) tags.push({ label: 'absence B', extra: { background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #85B7EB' } });
  return tags;
}

// ── Props ──────────────────────────────────────────────────────────
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
  prevuReel?: PrevuReelData | null;
  // Private-only:
  gardeId?: string;
  evtsSaveCount?: number;
  locked?: boolean;
  onOpenModal?: (ds?: string) => void;
  onRemoveEvt?: (i: number) => void;
}

export function CalendrierMoisView({
  annee, mois, evts, result, statut,
  nomFamA, nomFamB,
  readonly,
  heuresParJour, hasOvertime,
  prevuReel,
  gardeId, evtsSaveCount = 0,
  locked: lockedProp,
  onOpenModal, onRemoveEvt,
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
        let famAAbsent = false;
        let famBAbsent = false;

        if (isCur) {
          const absEvts = evts.filter(e => e.debut <= ds && e.fin >= ds);
          famAAbsent = absEvts.some(e => e.type === 'absence_famille_a');
          famBAbsent = absEvts.some(e => e.type === 'absence_famille_b');

          if (holidays.has(ds))                                    dayType = 'holiday';
          else if (absEvts.some(e => e.type === 'conge_paye'))     dayType = 'cp';
          else if (absEvts.some(e => e.type === 'jour_repos'))     dayType = 'repos';
          else if (absEvts.some(e => e.type === 'maladie_nounou')) dayType = 'sick';
          else                                                      dayType = 'worked';
        }

        const tags = tagsForDay(dayType, famAAbsent, famBAbsent);

        cells.push(
          <div
            key={ds}
            onClick={() => clickable && onOpenModal?.(ds)}
            style={CELL_STYLE[dayType]}
            className={'min-h-[64px] p-1.5 ' + (clickable ? 'cursor-pointer hover:brightness-95 transition-[filter]' : 'cursor-default')}
          >
            {isToday ? (
              <div className="w-5 h-5 rounded-full bg-[var(--sage)] text-white text-[10px] flex items-center justify-center mb-1 font-medium">
                {cur.getDate()}
              </div>
            ) : (
              <div style={{ color: DAY_NUM_COLOR[dayType], fontWeight: 500, fontSize: 11, marginBottom: 3 }}>
                {cur.getDate()}
              </div>
            )}

            {dayType === 'worked' && heuresParJour != null && (
              <div style={{ color: '#4a7c59', fontSize: 11, marginBottom: 3 }}>
                {heuresParJour % 1 === 0 ? heuresParJour : heuresParJour.toFixed(1)}h
                {hasOvertime && (
                  <span style={{ background: '#fdf3e0', color: '#8a6020', fontSize: 10, borderRadius: 3, padding: '0 3px', marginLeft: 3 }}>+</span>
                )}
              </div>
            )}

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
              const evtLabel: Record<string, string> = {
                conge_paye:        '🏖 Congé payé',
                jour_repos:        '😌 Jour de repos',
                maladie_nounou:    '🤒 Maladie',
                absence_famille_a: '👶 Absent Fam. A',
                absence_famille_b: '👶 Absent Fam. B',
              };
              const evtColor: Record<string, string> = {
                conge_paye:        'bg-blue-100 text-blue-700',
                jour_repos:        'bg-[#EAE7FB] text-[#3D3579]',
                maladie_nounou:    'bg-red-100 text-red-700',
                absence_famille_a: 'bg-[#E6F1FB] text-[#0C447C]',
                absence_famille_b: 'bg-[#E6F1FB] text-[#0C447C]',
              };
              return (
                <div key={i} className="flex items-center px-4 py-2.5 border-b border-[var(--line)] last:border-0 text-sm gap-3">
                  <span className={'px-2 py-0.5 rounded text-xs ' + (evtColor[e.type] ?? 'bg-gray-100 text-gray-700')}>
                    {evtLabel[e.type] ?? e.type}
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
            <CongesCard gardeId={gardeId} annee={annee} mois={mois} refreshKey={evtsSaveCount} />
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

            <ResultCard label="A" nom={nomFamA ?? 'Famille A'} r={result.famA} />
            <ResultCard label="B" nom={nomFamB ?? 'Famille B'} r={result.famB} />

            {prevuReel && <PrevuReelCard data={prevuReel} nomFamA={nomFamA} nomFamB={nomFamB} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── ResultCard ─────────────────────────────────────────────────────
function ResultCard({ label, nom, r }: {
  label: string; nom: string;
  r: ReturnType<typeof calculerMois>['famA'];
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

// ── PrevuReelCard ──────────────────────────────────────────────────
const EVT_DOT: Record<MonthEvtType, string> = {
  maladie_nounou:    '#F09595',
  conge_paye:        '#F4C0D1',
  jour_repos:        '#C7C2F0',
  absence_famille_a: '#185FA5',
  absence_famille_b: '#85B7EB',
  holiday:           '#D3D1C7',
  jour_offert:       '#EDD99A',
};

const EVT_LABEL: Record<MonthEvtType, string> = {
  maladie_nounou:    '🤒 Maladie',
  conge_paye:        '🏖 Congé payé',
  jour_repos:        '😌 Jour de repos',
  absence_famille_a: '👶 Absent Fam. A',
  absence_famille_b: '👶 Absent Fam. B',
  holiday:           '📅 Jour férié',
  jour_offert:       '🎁 Jour offert',
};

function fmtRange(debut: string, fin: string): string {
  const [,m1,d1] = debut.split('-').map(Number);
  const [,m2,d2] = fin.split('-').map(Number);
  if (d1 === d2 && m1 === m2) return `${d1} ${MOIS_COURTS[m1 - 1]}`;
  return `${d1} ${MOIS_COURTS[m1 - 1]} → ${d2} ${MOIS_COURTS[m2 - 1]}`;
}

function Chip({ label, style }: { label: string; style: React.CSSProperties }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 500, padding: '2px 5px', borderRadius: 3,
      whiteSpace: 'nowrap', lineHeight: '1.4', ...style,
    }}>{label}</span>
  );
}

function FamRow({
  nom, color, theoSal, realSal, theoInd, realInd,
}: {
  nom: string; color: string;
  theoSal: number; realSal: number;
  theoInd: number; realInd: number;
}) {
  const salDiff = Math.round((theoSal - realSal) * 100) / 100;
  const indDiff = Math.round((theoInd - realInd) * 100) / 100;

  return (
    <div>
      <div className="text-[10px] font-medium mb-1.5" style={{ color }}>{nom}</div>
      <div className="grid grid-cols-2 gap-1.5">
        {/* Salaire */}
        <div className="rounded-lg p-2" style={{ background: 'var(--paper)' }}>
          <div className="text-[9px] text-[var(--dust)] mb-1">Salaire net</div>
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-[11px] text-[var(--dust)]">{theoSal.toFixed(0)} €</span>
            <span className="text-[9px] text-[var(--dust)]">→</span>
            <span className="text-[12px] font-semibold" style={{ color: salDiff > 0.01 ? '#A32D2D' : 'var(--ink)' }}>
              {realSal.toFixed(0)} €
            </span>
          </div>
          {salDiff > 0.01 ? (
            <div className="text-[9px] mt-0.5" style={{ color: '#A32D2D' }}>−{salDiff.toFixed(0)} € · maladie</div>
          ) : (
            <div className="text-[9px] mt-0.5 text-[var(--dust)]">Mensualisation garantie</div>
          )}
        </div>
        {/* Indemnités */}
        <div className="rounded-lg p-2" style={{ background: '#FDF8EE', border: '0.5px solid #EDD99A' }}>
          <div className="text-[9px] text-[var(--dust)] mb-1">Entretien</div>
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-[11px] text-[var(--dust)]">{theoInd.toFixed(0)} €</span>
            <span className="text-[9px] text-[var(--dust)]">→</span>
            <span className="text-[12px] font-semibold" style={{ color: indDiff > 0.01 ? '#A32D2D' : 'var(--ink)' }}>
              {realInd.toFixed(0)} €
            </span>
          </div>
          {indDiff > 0.01 && (
            <div className="text-[9px] mt-0.5" style={{ color: '#633806' }}>−{indDiff.toFixed(0)} € · absences</div>
          )}
        </div>
      </div>
    </div>
  );
}

function PrevuReelCard({ data, nomFamA, nomFamB }: {
  data: PrevuReelData;
  nomFamA?: string | null;
  nomFamB?: string | null;
}) {
  const hasEcartA = data.theoSalA - data.realSalA > 0.01 || data.theoIndemA - data.realIndemA > 0.01;
  const hasEcartB = data.theoSalB - data.realSalB > 0.01 || data.theoIndemB - data.realIndemB > 0.01;

  return (
    <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--line)] text-[10px] font-medium text-[var(--dust)] uppercase tracking-wide bg-[var(--paper)]">
        Prévu → Réel
      </div>

      <div className="px-4 py-3 flex flex-col gap-3">
        {hasEcartA && (
          <FamRow
            nom={nomFamA ?? 'Famille A'}
            color="var(--blue)"
            theoSal={data.theoSalA} realSal={data.realSalA}
            theoInd={data.theoIndemA} realInd={data.realIndemA}
          />
        )}
        {hasEcartB && (
          <FamRow
            nom={nomFamB ?? 'Famille B'}
            color="var(--sage)"
            theoSal={data.theoSalB} realSal={data.realSalB}
            theoInd={data.theoIndemB} realInd={data.realIndemB}
          />
        )}
      </div>

      {/* Waterfall */}
      {data.monthEvts.length > 0 && (
        <div className="border-t border-[var(--line)]">
          <div className="px-4 py-1.5 text-[9px] font-medium text-[var(--dust)] uppercase tracking-wide bg-[var(--paper)]">
            Détail
          </div>
          <div className="divide-y divide-[var(--line)]">
            {data.monthEvts.map((e, i) => (
              <WaterfallRow key={i} evt={e} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WaterfallRow({ evt }: { evt: MonthEvt }) {
  const chips: React.ReactNode[] = [];

  if (evt.type === 'maladie_nounou') {
    chips.push(<Chip key="sal" label={`salaire −${(evt.salImpactA + evt.salImpactB).toFixed(0)} €`} style={{ background: '#FCEBEB', color: '#A32D2D' }} />);
    chips.push(<Chip key="ind" label={`entretien −${(evt.indemImpactA + evt.indemImpactB).toFixed(0)} €`} style={{ background: '#FDF3E0', color: '#633806' }} />);
    chips.push(<Chip key="ijss" label="→ IJSS sécu" style={{ background: '#E6F1FB', color: '#0C447C' }} />);
  } else if (evt.type === 'conge_paye' || evt.type === 'jour_repos') {
    chips.push(<Chip key="sal" label="🔒 salaire intact" style={{ background: 'var(--paper)', color: 'var(--dust)', border: '0.5px solid var(--line)' }} />);
    chips.push(<Chip key="ind" label={`entretien −${(evt.indemImpactA + evt.indemImpactB).toFixed(0)} €`} style={{ background: '#FDF3E0', color: '#633806' }} />);
  } else if (evt.type === 'absence_famille_a' || evt.type === 'absence_famille_b') {
    chips.push(<Chip key="sal" label="🔒 salaire intact" style={{ background: 'var(--paper)', color: 'var(--dust)', border: '0.5px solid var(--line)' }} />);
    chips.push(<Chip key="ind" label="🔒 entretien intact" style={{ background: 'var(--paper)', color: 'var(--dust)', border: '0.5px solid var(--line)' }} />);
  } else if (evt.type === 'jour_offert') {
    chips.push(<Chip key="sal" label="🔒 salaire intact" style={{ background: 'var(--paper)', color: 'var(--dust)', border: '0.5px solid var(--line)' }} />);
    chips.push(<Chip key="ind" label={`entretien −${(evt.indemImpactA + evt.indemImpactB).toFixed(0)} €`} style={{ background: '#FDF3E0', color: '#633806' }} />);
  } else if (evt.type === 'holiday') {
    chips.push(<Chip key="sal" label="🔒 salaire intact" style={{ background: 'var(--paper)', color: 'var(--dust)', border: '0.5px solid var(--line)' }} />);
    chips.push(<Chip key="ind" label={`entretien −${(evt.indemImpactA + evt.indemImpactB).toFixed(0)} €`} style={{ background: '#FDF3E0', color: '#633806' }} />);
  }

  return (
    <div className="px-4 py-2 flex items-start gap-2">
      <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: EVT_DOT[evt.type] }} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium text-[var(--ink)]">{EVT_LABEL[evt.type]}</div>
        <div className="text-[9px] text-[var(--dust)]">{fmtRange(evt.debut, evt.fin)} · {evt.workingDays}j ouvrés</div>
        <div className="flex flex-wrap gap-1 mt-1">{chips}</div>
      </div>
    </div>
  );
}

// ── SickNoteBlock (exported — used in page files) ──────────────────
export function SickNoteBlock({ sickDaysCount, sickDaysConsecutive, variant }: SickInfo & { variant: 'families' | 'nounou' }) {
  if (sickDaysCount === 0) return null;

  if (variant === 'nounou') {
    return (
      <div className="mt-4 rounded-[10px] p-4" style={{ background: '#E6F1FB', border: '0.5px solid #85B7EB' }}>
        <div className="flex items-start gap-2">
          <span className="text-base">ℹ️</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#85B7EB', color: '#0C447C' }}>Arrêt maladie ce mois</span>
            </div>
            <p className="text-xs font-semibold text-[var(--ink)] mb-2">Vos indemnités Sécurité Sociale</p>
            <ol className="text-xs text-[var(--ink)] space-y-1 list-decimal list-inside">
              <li>Transmettez le volet 3 de votre arrêt à chacune de vos familles employeuses dans les 48h.</li>
              <li>Envoyez votre arrêt à votre CPAM (en ligne sur ameli.fr ou par courrier).</li>
              <li>Préparez vos 3 derniers bulletins de salaire (disponibles sur pajemploi.urssaf.fr) — la CPAM peut vous les demander.</li>
            </ol>
            <a href="https://www.ameli.fr" target="_blank" rel="noreferrer" className="text-[10px] text-[#0C447C] underline mt-2 inline-block">
              ameli.fr → déclarer un arrêt de travail ↗
            </a>
            <p className="text-[9px] text-[var(--dust)] mt-2">
              Si vous avez plus de 6 mois d&apos;ancienneté dans la branche, vous pouvez aussi bénéficier d&apos;un complément IRCEM — la CPAM transmet automatiquement, aucune démarche de votre part.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // variant === 'families'
  const longArret = sickDaysConsecutive >= 4;

  return (
    <div
      className="mt-4 rounded-[10px] p-4"
      style={{
        background: '#FDF8EE',
        border: '0.5px solid #EDD99A',
        opacity: longArret ? 1 : 0.6,
      }}
    >
      {longArret ? (
        <div className="flex items-start gap-2">
          <span className="text-base">⚠️</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#EDD99A', color: '#7A5C00' }}>Si l&apos;arrêt dure 4 jours ou plus</span>
            </div>
            <p className="text-xs font-semibold text-[var(--ink)] mb-2">Démarche employeur à faire — chaque famille séparément</p>
            <ol className="text-xs text-[var(--ink)] space-y-1 list-decimal list-inside">
              <li>Récupérez le volet 3 de l&apos;arrêt transmis par votre assistante parentale.</li>
              <li>Remplissez l&apos;attestation de salaire Cerfa S3201 avec votre numéro Pajemploi et les salaires bruts des 3 derniers mois.</li>
              <li>Transmettez-la à la CPAM — sans ça, votre assistante parentale ne peut pas être indemnisée.</li>
            </ol>
            <a href="https://www.ameli.fr" target="_blank" rel="noreferrer" className="text-[10px] text-[#7A5C00] underline mt-2 inline-block">
              ameli.fr → Cerfa S3201 ↗
            </a>
            <p className="text-[9px] text-[var(--dust)] mt-2">
              En garde partagée : chaque famille remplit sa propre attestation séparément. La CPAM consolidera les deux.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <span className="text-base">✓</span>
          <p className="text-xs text-[var(--ink)]">
            Aucune démarche employeur requise. Arrêt ≤ 3 jours : ajustez simplement les heures déclarées sur Pajemploi ce mois.
          </p>
        </div>
      )}
    </div>
  );
}
