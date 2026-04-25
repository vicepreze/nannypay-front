'use client';

import { useCallback } from 'react';
import { type Evt, type CalcResult, calculerMois } from '@/lib/calcul';
import { CongesCard } from '@/components/CongesCard';

const MOIS_COURTS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

function dateStr(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
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
  gardeId, evtsSaveCount = 0,
  locked: lockedProp, jaValide, saving, monLabel,
  onOpenModal, onRemoveEvt, onValider,
}: CalendrierMoisViewProps) {
  const locked = lockedProp ?? (statut === 'valide_ab');

  const renderCalendar = useCallback(() => {
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
        const ds = dateStr(cur);
        const clickable = isCur && !locked && !readonly;
        const chips = evts.filter(e => e.debut <= ds && e.fin >= ds).map((e, i) => (
          <div key={i} className={'text-[9px] px-1 py-0.5 rounded mb-0.5 truncate ' + (e.type === 'conge_paye' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700')}>
            {e.type === 'conge_paye' ? 'CP' : 'Mal.'}
          </div>
        ));
        cells.push(
          <div
            key={ds}
            onClick={() => clickable && onOpenModal?.(ds)}
            className={'border-r border-b border-[var(--line)] min-h-[64px] p-1.5 ' + (clickable ? 'cursor-pointer hover:bg-[var(--sage-light)]' : 'cursor-default') + (!isCur ? ' bg-[var(--paper)] opacity-30' : '')}
          >
            <div className={isToday ? 'w-5 h-5 rounded-full bg-[var(--sage)] text-white text-[10px] flex items-center justify-center mb-1 font-medium' : 'text-[11px] font-medium text-[var(--dust)] mb-1'}>
              {cur.getDate()}
            </div>
            {chips}
          </div>
        );
      }
      cur.setDate(cur.getDate() + 1);
    }
    return cells;
  }, [annee, mois, evts, locked, readonly, onOpenModal]);

  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 320px' }}>

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

        {/* Résumé */}
        {result && (
          <div className="mt-3 bg-white border border-[var(--line)] rounded-[var(--radius)] p-4 flex flex-wrap gap-6 text-sm">
            <div><span className="text-[var(--dust)]">Jours ouvrables</span> <strong className="ml-2">{result.joursOuv}</strong></div>
            {result.joursAbsMaladie > 0 && <div><span className="text-[var(--dust)]">Maladie</span> <strong className="ml-2 text-red-500">−{result.joursAbsMaladie}</strong></div>}
            {result.joursAbsCP > 0 && <div><span className="text-[var(--dust)]">Congés payés</span> <strong className="ml-2 text-blue-600">−{result.joursAbsCP}</strong></div>}
            <div><span className="text-[var(--dust)]">Jours travaillés</span> <strong className="ml-2">{result.joursTrav}</strong></div>
            <div><span className="text-[var(--dust)]">Ratio salaire</span> <strong className="ml-2">{(result.ratio * 100).toFixed(0)} %</strong></div>
          </div>
        )}

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

        {/* Validation — privé seulement */}
        {!readonly && (
          <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] p-4">
            <div className="text-xs font-medium text-[var(--dust)] uppercase tracking-wide mb-3">Validation</div>
            <div className="space-y-2 mb-4 text-sm">
              <ValidLine label={nomFamA ?? 'Famille A'} done={statut === 'valide_a' || statut === 'valide_ab'} />
              <ValidLine label={nomFamB ?? 'Famille B'} done={statut === 'valide_b' || statut === 'valide_ab'} />
            </div>
            {!locked && !jaValide && (
              <button
                onClick={onValider}
                disabled={saving}
                className="w-full py-2.5 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors disabled:opacity-50"
              >
                {saving ? 'Validation…' : `Valider pour ${monLabel === 'A' ? (nomFamA ?? 'Fam. A') : (nomFamB ?? 'Fam. B')}`}
              </button>
            )}
            {!locked && jaValide && (
              <p className="text-xs text-center text-[var(--sage)]">Vous avez validé ce mois — en attente de l&apos;autre famille.</p>
            )}
            {locked && (
              <p className="text-xs text-center text-[var(--sage)] font-medium">✓ Mois validé par les deux familles</p>
            )}
          </div>
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
      {racOptionActive && (
        <>
          <div className="flex justify-between px-4 py-1.5 border-b border-[var(--line)] text-xs text-[var(--dust)]">
            <span>Charges salariales (21,88 %)</span>
            <span className="font-medium font-mono">{r.chargesSalariales.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between px-4 py-1.5 border-b border-[var(--line)] text-xs text-[var(--dust)]">
            <span>Charges patronales (44,70 %)</span>
            <span className="font-medium font-mono">{r.chargesPatronales.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between px-4 py-1.5 border-b border-[var(--line)] text-xs text-[var(--dust)]">
            <span>Aides CAF (mensuel)</span>
            <span className="font-medium font-mono">− {r.aidesTotal.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 bg-[var(--sage-light)] font-semibold text-sm text-[var(--sage)]">
            <span>Reste à charge estimé</span>
            <span>{r.resteCharge.toFixed(2)} €</span>
          </div>
        </>
      )}
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
