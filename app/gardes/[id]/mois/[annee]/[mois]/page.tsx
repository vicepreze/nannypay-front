'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { calculerMois, calcHeuresSemaineFromPlanning, type Evt, type CalcResult } from '@/lib/calcul';
import { useSession } from 'next-auth/react';

const MOIS_LONGS  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MOIS_COURTS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

type Famille = {
  label: string; nomAffiche: string | null;
  utilisateurId: string | null; statutAcces: string;
  cmgCotisations: number; cmgRemuneration: number;
  abattementCharges: number; aideVille: number; creditImpot: number;
};
type GardeInfo = {
  id: string; nom: string | null;
  proprietaireId: string;
  invitationTokenB: string | null;
  publicTokenNounou: string | null;
  familles: Famille[];
  nounou: { prenom: string } | null;
  modele: {
    tauxHoraireNet: number; hNormalesSemaine: number; hSup25Semaine: number;
    hSup50Semaine: number; repartitionA: number; racOptionActive: boolean;
    navigoMontant: number; indemEntretien: number; indemKm: number; joursJson: string;
  } | null;
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

  // Panneau gauche — invitation + lien public
  const [invToken,   setInvToken]   = useState<string | null>(null);
  const [copiedInv,  setCopiedInv]  = useState(false);
  const [copiedPub,  setCopiedPub]  = useState(false);

  // Modal event
  const [modalOpen,  setModalOpen]  = useState(false);
  const [evtType,    setEvtType]    = useState<Evt['type'] | null>(null);
  const [evtDebut,   setEvtDebut]   = useState('');
  const [evtFin,     setEvtFin]     = useState('');
  const [modalError, setModalError] = useState('');

  // Bornes du mois courant pour les date pickers
  const minDate = `${annee}-${String(mois).padStart(2, '0')}-01`;
  const maxDate = dateStr(new Date(annee, mois, 0));

  // Chargement
  useEffect(() => {
    fetch(`/api/gardes/${gardeId}/mois/${annee}/${mois}`)
      .then(r => r.json())
      .then(d => {
        setGarde(d.garde);
        setInvToken(d.garde.invitationTokenB ?? null);
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
    const { joursActifsParSemaine } = calcHeuresSemaineFromPlanning(m.joursJson || '{}');
    const toAides = (f?: Famille) => ({
      cmgCotisations:    f?.cmgCotisations    ?? 0,
      cmgRemuneration:   f?.cmgRemuneration   ?? 0,
      abattementCharges: f?.abattementCharges ?? 0,
      aideVille:         f?.aideVille         ?? 0,
      creditImpot:       f?.creditImpot       ?? 0,
    });
    setResult(calculerMois({
      annee, mois,
      taux:                  m.tauxHoraireNet,
      hNormalesSemaine:      m.hNormalesSemaine,
      hSup25Semaine:         m.hSup25Semaine,
      hSup50Semaine:         m.hSup50Semaine,
      repartitionA:          m.repartitionA,
      racOptionActive:       m.racOptionActive,
      navigo:                m.navigoMontant,
      indemEntretien:        m.indemEntretien,
      indemKm:               m.indemKm,
      joursActifsParSemaine: joursActifsParSemaine || 5,
      evenements:            evts,
      aidesA: toAides(garde.familles.find(f => f.label === 'A')),
      aidesB: toAides(garde.familles.find(f => f.label === 'B')),
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
    setModalError('');
    if (!evtType) { setModalError('Choisissez un type.'); return; }
    if (!evtDebut || !evtFin) { setModalError('Les deux dates sont requises.'); return; }
    if (evtFin < evtDebut) { setModalError('La fin doit être après le début.'); return; }
    const conflict = evts.some(e => e.debut <= evtFin && e.fin >= evtDebut);
    if (conflict) { setModalError('Cet intervalle chevauche un événement existant.'); return; }
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

  // Panneau gauche — fonctions invitation + lien public
  async function genererInvitation() {
    const res = await fetch(`/api/gardes/${gardeId}/invitation`, { method: 'POST' });
    if (res.ok) { const d = await res.json(); setInvToken(d.token); }
  }
  async function revoquerInvitation() {
    if (!confirm('Révoquer le lien d\'invitation ?')) return;
    await fetch(`/api/gardes/${gardeId}/invitation`, { method: 'DELETE' });
    setInvToken(null);
  }
  function copierInvitation() {
    if (!invToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/rejoindre?token=${invToken}`);
    setCopiedInv(true); setTimeout(() => setCopiedInv(false), 2000);
  }
  function copierLienPublic() {
    if (!garde?.publicTokenNounou) return;
    navigator.clipboard.writeText(`${window.location.origin}/public/nounou/${garde.publicTokenNounou}`);
    setCopiedPub(true); setTimeout(() => setCopiedPub(false), 2000);
  }
  async function archiverGarde() {
    if (!confirm('Archiver cette garde ?')) return;
    await fetch(`/api/gardes/${gardeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'archivé' }),
    });
    window.location.href = '/dashboard';
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
    setModalError('');
    setModalOpen(true);
  }

  // Statut validation + rôle
  const estProprietaire = garde ? session?.user?.id === garde.proprietaireId : false;
  const famBActif = garde?.familles.find(f => f.label === 'B')?.statutAcces === 'invite_actif';
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
        <div className="flex items-center gap-2 text-sm">
          <Link href="/" className="font-serif text-base text-[var(--ink)] no-underline">nounoulink<em className="text-[var(--sage)] not-italic">.</em></Link>
          <span className="text-[var(--line)]">/</span>
          <span className="text-[var(--dust)]">{garde?.nom ?? '…'}</span>
          <span className="text-[var(--line)]">/</span>
          <span className="font-medium text-[var(--ink)]">{MOIS_LONGS[mois - 1]} {annee}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/gardes/${gardeId}/mois/${prevMois[0]}/${prevMois[1]}`} className="text-[var(--dust)] hover:text-[var(--ink)] no-underline text-sm">←</Link>
          <Link href={`/gardes/${gardeId}/mois/${nextMois[0]}/${nextMois[1]}`} className="text-[var(--dust)] hover:text-[var(--ink)] no-underline text-sm">→</Link>
          <Link href="/dashboard" className="text-xs text-[var(--dust)] hover:text-[var(--ink)] no-underline">Dashboard</Link>
          <Link href="/demo" className="text-xs text-[var(--dust)] hover:text-[var(--ink)] no-underline">Démo</Link>
          {saving && <span className="text-xs text-[var(--dust)]">Sauvegarde…</span>}
        </div>
      </header>

      <div className="pt-14 max-w-[1280px] mx-auto px-4 pb-16">
        <div className="flex gap-5 pt-6 items-start">

        {/* ── PANNEAU GAUCHE ─────────────────────────────────── */}
        <aside className="w-52 shrink-0 sticky top-20 flex flex-col gap-3">

          {/* Garde info */}
          <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-[var(--line)] bg-[var(--paper)] text-[10px] font-medium uppercase tracking-wide text-[var(--dust)]">
              {garde?.nom ?? '…'}
            </div>
            <div className="px-3.5 py-2.5 space-y-1 text-xs text-[var(--dust)]">
              {famA && <div><span className="text-[var(--blue)] font-medium">A</span> · {famA.nomAffiche ?? '—'}</div>}
              {famB && <div><span className={famBActif ? 'text-[var(--sage)] font-medium' : 'font-medium'} style={{ color: famBActif ? 'var(--sage)' : undefined }}>B</span> · {famB.nomAffiche ?? '—'}{!famBActif && <span className="opacity-50"> · en attente</span>}</div>}
              {garde?.nounou && <div>👩 {garde.nounou.prenom}</div>}
            </div>
          </div>

          {/* Navigation mois */}
          <div className="flex gap-1">
            <Link href={`/gardes/${gardeId}/mois/${prevMois[0]}/${prevMois[1]}`}
              className="flex-1 py-1.5 text-center text-xs border border-[var(--line)] rounded-[var(--radius)] bg-white text-[var(--dust)] hover:border-[var(--ink)] no-underline">
              ← {MOIS_COURTS[prevMois[1] - 1]}
            </Link>
            {!isFuture && (
              <Link href={`/gardes/${gardeId}/mois/${nextMois[0]}/${nextMois[1]}`}
                className="flex-1 py-1.5 text-center text-xs border border-[var(--line)] rounded-[var(--radius)] bg-white text-[var(--dust)] hover:border-[var(--ink)] no-underline">
                {MOIS_COURTS[nextMois[1] - 1]} →
              </Link>
            )}
          </div>

          {/* Invitation Famille B */}
          {estProprietaire && !famBActif && (
            <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
              <div className="px-3.5 py-2 border-b border-[var(--line)] bg-[var(--paper)] text-[10px] font-medium uppercase tracking-wide text-[var(--dust)]">Invitation Fam. B</div>
              <div className="p-3 space-y-2">
                {invToken ? (
                  <>
                    <button onClick={copierInvitation} className="w-full py-1.5 text-xs rounded-lg border border-[var(--line)] bg-white hover:border-[var(--sage)] transition-colors">
                      {copiedInv ? '✓ Copié !' : 'Copier le lien'}
                    </button>
                    <button onClick={revoquerInvitation} className="w-full py-1.5 text-[10px] text-[var(--dust)] hover:text-[var(--red)] transition-colors">
                      Révoquer
                    </button>
                  </>
                ) : (
                  <button onClick={genererInvitation} className="w-full py-1.5 text-xs rounded-lg bg-[var(--sage)] text-white hover:bg-[#3a5431] transition-colors">
                    Générer le lien
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lien public nounou */}
          {garde?.publicTokenNounou && (
            <button onClick={copierLienPublic} className="w-full py-2 text-xs border border-[var(--line)] rounded-[var(--radius)] bg-white text-[var(--dust)] hover:border-[var(--sage)] transition-colors">
              {copiedPub ? '✓ Lien copié !' : '🔗 Lien nounou'}
            </button>
          )}

          {/* Paramètres + Archiver */}
          <Link href={`/gardes/${gardeId}/settings`}
            className="w-full py-2 text-xs text-center border border-[var(--line)] rounded-[var(--radius)] bg-white text-[var(--ink)] hover:border-[var(--ink)] no-underline block">
            ⚙ Paramètres
          </Link>
          {estProprietaire && (
            <button onClick={archiverGarde} className="w-full py-1.5 text-[10px] text-[var(--dust)] hover:text-[var(--red)] transition-colors">
              Archiver la garde
            </button>
          )}
        </aside>

        {/* ── CONTENU PRINCIPAL ──────────────────────────────── */}
        <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-serif text-2xl text-[var(--ink)]">{MOIS_LONGS[mois - 1]} {annee}</h1>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${locked ? 'bg-[var(--sage-light)] text-[var(--sage)]' : 'bg-[var(--paper)] text-[var(--dust)]'}`}>
            {statutLabel[statut] ?? statut}
          </span>
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

                <ResultCard label="A" nom={famA?.nomAffiche ?? 'Famille A'} r={result.famA} racOptionActive={result.racOptionActive} />
                <ResultCard label="B" nom={famB?.nomAffiche ?? 'Famille B'} r={result.famB} racOptionActive={result.racOptionActive} />
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
        </div>{/* fin contenu principal */}
        </div>{/* fin flex gap-5 */}
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
              {([['Début', evtDebut, setEvtDebut], ['Fin', evtFin, setEvtFin]] as [string, string, (v: string) => void][]).map(([lbl, val, fn]) => (
                <div key={lbl}>
                  <label className="text-xs text-[var(--dust)] block mb-1">{lbl}</label>
                  <input
                    type="date"
                    value={val}
                    min={minDate}
                    max={maxDate}
                    onChange={e => { fn(e.target.value); setModalError(''); }}
                    className="w-full px-3 py-2 border-[1.5px] border-[var(--line)] rounded-lg text-sm outline-none focus:border-[var(--sage)] bg-white"
                  />
                </div>
              ))}
            </div>
            {modalError && <p className="text-xs text-red-600 mt-2 mb-1">{modalError}</p>}
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 border-[1.5px] border-[var(--line)] rounded-lg text-sm bg-white hover:border-[var(--ink)] transition-colors">Annuler</button>
              <button onClick={addEvt} className="px-4 py-2 bg-[var(--sage)] text-white rounded-lg text-sm font-medium hover:bg-[#3a5431] transition-colors">Ajouter</button>
            </div>
          </div>
        </div>
      )}
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
