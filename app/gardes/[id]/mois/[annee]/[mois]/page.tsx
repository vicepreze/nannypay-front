'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { calculerMois, type Evt, type CalcResult } from '@/lib/calcul';
import { useSession } from 'next-auth/react';

const MOIS_LONGS  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MOIS_COURTS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

type Famille = { label: string; nomAffiche: string | null; utilisateurId: string | null; statutAcces: string };
type GardeInfo = {
  id: string; nom: string | null;
  familles: Famille[];
  modele: { tauxHoraireNet: number; hNormalesSemaine: number; hSup25Semaine: number; hSup50Semaine: number; repartitionA: number; navigoMontant: number; indemEntretien: number; indemKm: number; joursJson: string } | null;
};
type MoisRec = { statut: string; evenementsJson: string };

function dateStr(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export default function MoisPage() {
  const params  = useParams();
  const { data: session } = useSession();

  const gardeId = params.id as string;
  const annee   = parseInt(params.annee as string);
  const mois    = parseInt(params.mois  as string);

  const [garde,   setGarde]   = useState<GardeInfo | null>(null);
  const [moisRec, setMoisRec] = useState<MoisRec | null>(null);
  const [evts,    setEvts]    = useState<Evt[]>([]);
  const [result,  setResult]  = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  // Modal event
  const [modalOpen, setModalOpen] = useState(false);
  const [evtType,   setEvtType]   = useState<Evt['type'] | null>(null);
  const [evtDebut,  setEvtDebut]  = useState('');
  const [evtFin,    setEvtFin]    = useState('');

  // Chargement
  useEffect(() => {
    fetch(`/api/gardes/${gardeId}/mois/${annee}/${mois}`)
      .then(r => r.json())
      .then(d => {
        setGarde(d.garde);
        setMoisRec(d.mois);
        const e = JSON.parse(d.mois.evenementsJson || '[]');
        setEvts(e);
        setLoading(false);
      });
  }, [gardeId, annee, mois]);

  // Recalcul dès que evts ou garde changent
  useEffect(() => {
    if (!garde?.modele) return;
    const m = garde.modele;
    const jours = JSON.parse(m.joursJson || '{}') as Record<string, { actif: boolean; plages?: unknown[] }>;
    const joursActifs = Object.values(jours).filter(j => j.actif).length;
    setResult(calculerMois({
      annee, mois,
      taux:                 m.tauxHoraireNet,
      hNormalesSemaine:     m.hNormalesSemaine,
      hSup25Semaine:        m.hSup25Semaine,
      hSup50Semaine:        m.hSup50Semaine,
      repartitionA:         m.repartitionA,
      navigo:               m.navigoMontant,
      indemEntretien:       m.indemEntretien,
      indemKm:              m.indemKm,
      joursActifsParSemaine: joursActifs || 5,
      evenements:           evts,
    }));
  }, [garde, evts, annee, mois]);

  async function sauvegarderEvts(newEvts: Evt[]) {
    setSaving(true);
    const res = await fetch(`/api/gardes/${gardeId}/mois/${annee}/${mois}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evenements: newEvts }),
    });
    const data = await res.json();
    if (res.ok) setMoisRec(data.mois);
    setSaving(false);
  }

  async function valider() {
    setSaving(true);
    const res = await fetch(`/api/gardes/${gardeId}/mois/${annee}/${mois}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valider: true }),
    });
    const data = await res.json();
    if (res.ok) setMoisRec(data.mois);
    setSaving(false);
  }

  function addEvt() {
    if (!evtType) { alert('Choisissez un type.'); return; }
    if (!evtDebut || !evtFin) { alert('Dates requises.'); return; }
    if (evtFin < evtDebut) { alert('La fin doit être après le début.'); return; }
    const newEvts = [...evts, { type: evtType, debut: evtDebut, fin: evtFin }];
    setEvts(newEvts);
    sauvegarderEvts(newEvts);
    setModalOpen(false);
  }

  function removeEvt(i: number) {
    const newEvts = evts.filter((_, idx) => idx !== i);
    setEvts(newEvts);
    sauvegarderEvts(newEvts);
  }

  // Calendrier
  const renderCalendar = useCallback(() => {
    const premier  = new Date(annee, mois - 1, 1);
    const offset   = premier.getDay() === 0 ? 6 : premier.getDay() - 1;
    const lundi    = new Date(annee, mois - 1, 1 - offset);
    const dernier  = new Date(annee, mois, 0);
    const dow      = dernier.getDay();
    const vend     = new Date(dernier);
    if (dow >= 1 && dow <= 4) vend.setDate(dernier.getDate() + (5 - dow));
    else if (dow === 6) vend.setDate(dernier.getDate() - 1);
    else if (dow === 0) vend.setDate(dernier.getDate() - 2);

    const today = new Date();
    const cells: React.ReactNode[] = [];
    const cur = new Date(lundi);
    const locked = moisRec?.statut === 'valide_ab';

    while (cur <= vend) {
      if (cur.getDay() >= 1 && cur.getDay() <= 5) {
        const isCur   = cur.getMonth() === mois - 1;
        const isToday = cur.toDateString() === today.toDateString();
        const ds = dateStr(cur);
        const chips = evts.filter(e => e.debut <= ds && e.fin >= ds).map((e, i) => (
          <div key={i} className={'text-[9px] px-1 py-0.5 rounded mb-0.5 truncate ' + (e.type === 'conge_paye' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700')}>
            {e.type === 'conge_paye' ? 'CP' : 'Mal.'}
          </div>
        ));
        cells.push(
          <div
            key={ds}
            onClick={() => isCur && !locked && openModal(ds)}
            className={'border-r border-b border-[var(--line)] min-h-[64px] p-1.5 ' + (isCur && !locked ? 'cursor-pointer hover:bg-[var(--sage-light)]' : 'cursor-default') + (!isCur ? ' bg-[var(--paper)] opacity-30' : '')}
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
  }, [annee, mois, evts, moisRec]);

  function openModal(ds?: string) {
    setEvtType(null);
    setEvtDebut(ds ?? '');
    setEvtFin(ds ?? '');
    setModalOpen(true);
  }

  // Statut validation
  const monLabel   = garde?.familles.find(f => f.utilisateurId === session?.user?.id)?.label ?? 'A';
  const statut     = moisRec?.statut ?? 'ouvert';
  const jaValide   = statut === `valide_${monLabel.toLowerCase()}` || statut === 'valide_ab';
  const locked     = statut === 'valide_ab';
  const famA       = garde?.familles.find(f => f.label === 'A');
  const famB       = garde?.familles.find(f => f.label === 'B');
  const statutLabel: Record<string, string> = {
    'ouvert':    'En cours',
    'valide_a':  `Validé par ${famA?.nomAffiche ?? 'Fam. A'}`,
    'valide_b':  `Validé par ${famB?.nomAffiche ?? 'Fam. B'}`,
    'valide_ab': 'Validé par les deux familles ✓',
  };

  // Navigation mois prev/next
  const prevMois  = mois === 1 ? [annee - 1, 12] : [annee, mois - 1];
  const nextMois  = mois === 12 ? [annee + 1, 1] : [annee, mois + 1];
  const isFuture  = new Date(annee, mois - 1, 1) > new Date();

  if (loading) return <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center text-[var(--dust)]">Chargement…</div>;

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <Link href={`/gardes/${gardeId}`} className="text-[var(--dust)] hover:text-[var(--ink)] text-sm no-underline">← {garde?.nom ?? 'Garde'}</Link>
          <span className="text-[var(--line)]">/</span>
          <span className="text-sm font-medium">{MOIS_LONGS[mois - 1]} {annee}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${locked ? 'bg-[var(--sage-light)] text-[var(--sage)]' : 'bg-[var(--paper)] text-[var(--dust)]'}`}>
            {statutLabel[statut] ?? statut}
          </span>
          {saving && <span className="text-xs text-[var(--dust)]">Sauvegarde…</span>}
        </div>
      </header>

      <div className="pt-14 max-w-5xl mx-auto px-6 pb-16">
        {/* Nav mois */}
        <div className="flex items-center justify-between pt-8 mb-6">
          <Link href={`/gardes/${gardeId}/mois/${prevMois[0]}/${prevMois[1]}`} className="flex items-center gap-1.5 text-sm text-[var(--dust)] hover:text-[var(--ink)] no-underline">
            ← {MOIS_COURTS[prevMois[1] - 1]} {prevMois[0]}
          </Link>
          <h1 className="font-serif text-2xl">{MOIS_LONGS[mois - 1]} {annee}</h1>
          {!isFuture ? (
            <Link href={`/gardes/${gardeId}/mois/${nextMois[0]}/${nextMois[1]}`} className="flex items-center gap-1.5 text-sm text-[var(--dust)] hover:text-[var(--ink)] no-underline">
              {MOIS_COURTS[nextMois[1] - 1]} {nextMois[0]} →
            </Link>
          ) : <span className="w-20" />}
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 320px' }}>

          {/* ── CALENDRIER ─────────────────────────────────────── */}
          <div>
            <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--line)]">
                <span className="text-sm font-medium">Planning du mois</span>
                {!locked && (
                  <button onClick={() => openModal()} className="px-3 py-1.5 border-[1.5px] border-[var(--line)] rounded-lg text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)] bg-white transition-colors">
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

            {/* Résumé calendrier */}
            {result && (
              <div className="mt-3 bg-white border border-[var(--line)] rounded-[var(--radius)] p-4 flex gap-6 text-sm">
                <div><span className="text-[var(--dust)]">Jours ouvrables</span> <strong className="ml-2">{result.joursOuv}</strong></div>
                {result.joursAbs > 0 && <div><span className="text-[var(--dust)]">Absences</span> <strong className="ml-2 text-[var(--red)]">- {result.joursAbs}</strong></div>}
                <div><span className="text-[var(--dust)]">Jours travaillés</span> <strong className="ml-2">{result.joursTrav}</strong></div>
                <div><span className="text-[var(--dust)]">Ratio</span> <strong className="ml-2">{(result.ratio * 100).toFixed(0)} %</strong></div>
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
                      {!locked && <button onClick={() => removeEvt(i)} className="text-[var(--dust)] hover:text-[var(--red)] text-base leading-none">×</button>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RÉSULTATS ──────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {result && (
              <>
                {/* Total */}
                <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[var(--line)] text-[10px] font-medium text-[var(--dust)] uppercase tracking-wide bg-[var(--paper)]">
                    Salaire total nounou
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-[var(--paper)]">
                    <span className="text-sm text-[var(--dust)]">Famille A + B</span>
                    <strong className="text-[17px]">{result.totalNounou.toFixed(2)} €</strong>
                  </div>
                </div>

                {/* Famille A */}
                <ResultCard label="A" nom={famA?.nomAffiche ?? 'Famille A'} r={result.famA} />
                {/* Famille B */}
                <ResultCard label="B" nom={famB?.nomAffiche ?? 'Famille B'} r={result.famB} />
              </>
            )}

            {/* Validation */}
            <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] p-4">
              <div className="text-xs font-medium text-[var(--dust)] uppercase tracking-wide mb-3">Validation</div>
              <div className="space-y-2 mb-4 text-sm">
                <ValidLine label={famA?.nomAffiche ?? 'Famille A'} done={statut === 'valide_a' || statut === 'valide_ab'} />
                <ValidLine label={famB?.nomAffiche ?? 'Famille B'} done={statut === 'valide_b' || statut === 'valide_ab'} />
              </div>
              {!locked && !jaValide && (
                <button
                  onClick={valider}
                  disabled={saving}
                  className="w-full py-2.5 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Validation…' : `Valider pour ${monLabel === 'A' ? (famA?.nomAffiche ?? 'Fam. A') : (famB?.nomAffiche ?? 'Fam. B')}`}
                </button>
              )}
              {!locked && jaValide && (
                <p className="text-xs text-center text-[var(--sage)]">Vous avez validé ce mois — en attente de l&apos;autre famille.</p>
              )}
              {locked && (
                <p className="text-xs text-center text-[var(--sage)] font-medium">✓ Mois validé par les deux familles</p>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Modal événement */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/35 z-[150] flex items-center justify-center" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 w-[min(360px,90vw)] shadow-2xl">
            <h3 className="text-base font-medium mb-4">Ajouter un événement</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(['conge_paye', 'maladie_nounou'] as const).map(t => (
                <button key={t} onClick={() => setEvtType(t)}
                  className={'py-2.5 rounded-lg border-[1.5px] text-sm transition-all ' + (evtType === t ? 'border-[var(--sage)] bg-[var(--sage-light)] text-[var(--sage)] font-medium' : 'border-[var(--line)]')}>
                  {t === 'conge_paye' ? '🏖 Congé payé' : '🤒 Maladie'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-1">
              {[['Début', evtDebut, setEvtDebut], ['Fin', evtFin, setEvtFin]].map(([lbl, val, fn]) => (
                <div key={String(lbl)}>
                  <label className="text-xs text-[var(--dust)] block mb-1">{String(lbl)}</label>
                  <input type="date" value={String(val)} onChange={e => (fn as (v: string) => void)(e.target.value)}
                    className="w-full px-3 py-2 border-[1.5px] border-[var(--line)] rounded-lg text-sm outline-none focus:border-[var(--sage)] bg-white" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 border-[1.5px] border-[var(--line)] rounded-lg text-sm bg-white hover:border-[var(--ink)] transition-colors">Annuler</button>
              <button onClick={addEvt} className="px-4 py-2 bg-[var(--sage)] text-white rounded-lg text-sm font-medium hover:bg-[#3a5431] transition-colors">Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({ label, nom, r }: { label: string; nom: string; r: ReturnType<typeof calculerMois>['famA'] }) {
  const color = label === 'A' ? 'text-[var(--blue)]' : 'text-[var(--sage)]';
  return (
    <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <div className={`px-4 py-2.5 border-b border-[var(--line)] text-[10px] font-medium uppercase tracking-wide bg-[var(--paper)] ${color}`}>
        {nom} — Pajemploi
      </div>
      {[
        ['Heures normales',  r.hNorm  + ' h',              false],
        ['Heures sup +25%',  r.hSup25 + ' h',              r.hSup25 === 0],
        ['Heures sup +50%',  r.hSup50 + ' h',              r.hSup50 === 0],
        ['Salaire net',      r.salNet.toFixed(2)  + ' €',  false],
        ['Transport',        r.transport.toFixed(2) + ' €', false],
        ['Entretien',        r.entretien.toFixed(2) + ' €', false],
        ['Frais km',         r.km.toFixed(2) + ' €',       r.km === 0],
      ].map(([l, v, dim]) => (
        <div key={String(l)} className={'flex justify-between px-4 py-1.5 border-b border-[var(--line)] last:border-0 text-xs ' + (dim ? 'opacity-40' : '')}>
          <span className="text-[var(--dust)]">{l}</span>
          <span className="font-medium font-mono">{v}</span>
        </div>
      ))}
      <div className="flex justify-between px-4 py-2.5 bg-[var(--paper)] font-semibold text-sm">
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
