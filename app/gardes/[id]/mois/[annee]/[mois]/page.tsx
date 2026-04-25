'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { calculerMois, calcHeuresSemaineFromPlanning, type Evt, type CalcResult } from '@/lib/calcul';
import { useSession } from 'next-auth/react';
import { CalendrierMoisView } from '@/components/CalendrierMoisView';

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

  const [garde,        setGarde]        = useState<GardeInfo | null>(null);
  const [moisRec,      setMoisRec]      = useState<MoisRec | null>(null);
  const [evts,         setEvts]         = useState<Evt[]>([]);
  const [result,       setResult]       = useState<CalcResult | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [evtsSaveCount, setEvtsSaveCount] = useState(0);

  // Panneau gauche
  const [invToken,    setInvToken]    = useState<string | null>(null);
  const [copiedInv,   setCopiedInv]   = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [sharingPub,  setSharingPub]  = useState(false);

  // Modal event
  const [modalOpen,  setModalOpen]  = useState(false);
  const [evtType,    setEvtType]    = useState<Evt['type'] | null>(null);
  const [evtDebut,   setEvtDebut]   = useState('');
  const [evtFin,     setEvtFin]     = useState('');
  const [modalError, setModalError] = useState('');

  const minDate = `${annee}-${String(mois).padStart(2, '0')}-01`;
  const maxDate = dateStr(new Date(annee, mois, 0));

  useEffect(() => {
    fetch(`/api/gardes/${gardeId}/mois/${annee}/${mois}`)
      .then(r => r.json())
      .then(d => {
        setGarde(d.garde);
        setInvToken(d.garde.invitationTokenB ?? null);
        setMoisRec(d.mois);
        setEvts(JSON.parse(d.mois.evenementsJson || '[]'));
        setLoading(false);
      });
  }, [gardeId, annee, mois]);

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
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evenements: newEvts }),
    });
    const data = await res.json();
    if (res.ok) { setMoisRec(data.mois); setEvtsSaveCount(c => c + 1); }
    setSaving(false);
  }

  async function valider() {
    setSaving(true);
    const res = await fetch(`/api/gardes/${gardeId}/mois/${annee}/${mois}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
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
    if (evts.some(e => e.debut <= evtFin && e.fin >= evtDebut)) { setModalError('Cet intervalle chevauche un événement existant.'); return; }
    const newEvts = [...evts, { type: evtType, debut: evtDebut, fin: evtFin }];
    setEvts(newEvts);
    sauvegarderEvts(newEvts);
    setModalOpen(false);
  }

  function openModal(ds?: string) {
    setEvtType(null); setEvtDebut(ds ?? ''); setEvtFin(ds ?? ''); setModalError('');
    setModalOpen(true);
  }

  function removeEvt(i: number) {
    const newEvts = evts.filter((_, idx) => idx !== i);
    setEvts(newEvts); sauvegarderEvts(newEvts);
  }

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
  async function partagerMois() {
    setSharingPub(true);
    let token = garde?.publicTokenNounou;
    if (!token) {
      const res = await fetch(`/api/gardes/${gardeId}/public-token`, { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        token = d.token;
        setGarde(g => g ? { ...g, publicTokenNounou: token! } : g);
      }
    }
    if (token) {
      navigator.clipboard.writeText(`${window.location.origin}/public/mois/${token}/${annee}/${mois}`);
      setCopiedShare(true); setTimeout(() => setCopiedShare(false), 2000);
    }
    setSharingPub(false);
  }
  async function archiverGarde() {
    if (!confirm('Archiver cette garde ?')) return;
    await fetch(`/api/gardes/${gardeId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'archivé' }),
    });
    window.location.href = '/dashboard';
  }

  const estProprietaire = garde ? session?.user?.id === garde.proprietaireId : false;
  const famBActif = garde?.familles.find(f => f.label === 'B')?.statutAcces === 'invite_actif';
  const monLabel  = garde?.familles.find(f => f.utilisateurId === session?.user?.id)?.label ?? 'A';
  const statut    = moisRec?.statut ?? 'ouvert';
  const jaValide  = statut === `valide_${monLabel.toLowerCase()}` || statut === 'valide_ab';
  const locked    = statut === 'valide_ab';
  const famA      = garde?.familles.find(f => f.label === 'A');
  const famB      = garde?.familles.find(f => f.label === 'B');
  const statutLabel: Record<string, string> = {
    'ouvert':    'En cours',
    'valide_a':  `Validé par ${famA?.nomAffiche ?? 'Fam. A'}`,
    'valide_b':  `Validé par ${famB?.nomAffiche ?? 'Fam. B'}`,
    'valide_ab': 'Validé par les deux familles ✓',
  };

  const prevMois = mois === 1  ? [annee - 1, 12] : [annee, mois - 1];
  const nextMois = mois === 12 ? [annee + 1, 1]  : [annee, mois + 1];
  const isFuture = new Date(annee, mois - 1, 1) > new Date();

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

          <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-[var(--line)] bg-[var(--paper)] text-[10px] font-medium uppercase tracking-wide text-[var(--dust)]">
              {garde?.nom ?? '…'}
            </div>
            <div className="px-3.5 py-2.5 space-y-1 text-xs text-[var(--dust)]">
              {famA && <div><span className="text-[var(--blue)] font-medium">A</span> · {famA.nomAffiche ?? '—'}</div>}
              {famB && <div><span style={{ color: famBActif ? 'var(--sage)' : undefined }} className="font-medium">B</span> · {famB.nomAffiche ?? '—'}{!famBActif && <span className="opacity-50"> · en attente</span>}</div>}
              {garde?.nounou && <div>👩 {garde.nounou.prenom}</div>}
            </div>
          </div>

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

          <button
            onClick={partagerMois}
            disabled={sharingPub}
            className="w-full py-2 text-xs border border-[var(--line)] rounded-[var(--radius)] bg-white text-[var(--dust)] hover:border-[var(--sage)] transition-colors disabled:opacity-50"
          >
            {copiedShare ? '✓ Lien copié !' : sharingPub ? '…' : '↗ Partager ce mois'}
          </button>

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

          <CalendrierMoisView
            annee={annee} mois={mois} evts={evts} result={result} statut={statut}
            nomFamA={famA?.nomAffiche} nomFamB={famB?.nomAffiche}
            readonly={false}
            gardeId={gardeId} evtsSaveCount={evtsSaveCount}
            locked={locked} jaValide={jaValide} saving={saving} monLabel={monLabel}
            onOpenModal={openModal} onRemoveEvt={removeEvt} onValider={valider}
          />
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
              {([['Début', evtDebut, setEvtDebut], ['Fin', evtFin, setEvtFin]] as [string, string, (v: string) => void][]).map(([lbl, val, fn]) => (
                <div key={lbl}>
                  <label className="text-xs text-[var(--dust)] block mb-1">{lbl}</label>
                  <input type="date" value={val} min={minDate} max={maxDate}
                    onChange={e => { fn(e.target.value); setModalError(''); }}
                    className="w-full px-3 py-2 border-[1.5px] border-[var(--line)] rounded-lg text-sm outline-none focus:border-[var(--sage)] bg-white" />
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
