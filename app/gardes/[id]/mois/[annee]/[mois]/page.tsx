'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  calculerMois, calcHeuresSemaineFromPlanning, joursOuvrablesIntersect,
  type Evt, type CalcResult,
} from '@/lib/calcul';
import {
  CalendrierMoisView, buildPrevuReel,
  type SickInfo, SickNoteBlock,
} from '@/components/CalendrierMoisView';

const MOIS_LONGS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

type Famille = {
  label: string; nomAffiche: string | null;
  utilisateurId: string | null; statutAcces: string;
  cmgCotisations: number; cmgRemuneration: number;
  abattementCharges: number; aideVille: number; creditImpot: number;
};
type GardeInfo = {
  id: string; nom: string | null;
  proprietaireId: string;
  publicTokenNounou: string | null;
  familles: Famille[];
  nounou: { prenom: string } | null;
  modele: {
    tauxHoraireNet: number; hNormalesSemaine: number; hSup25Semaine: number;
    hSup50Semaine: number; repartitionA: number; racOptionActive: boolean;
    navigoMontant: number; indemEntretien: number; indemKm: number; joursJson: string;
    repartitionIndemA: number;
  } | null;
};
type MoisRec = { statut: string; evenementsJson: string };

function dateStr(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function isAbsenceType(type: string): boolean {
  return type === 'absence_famille_a' || type === 'absence_famille_b';
}

export default function MoisPage() {
  const params  = useParams();
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
  const [sharing,      setSharing]      = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');

  // Modal event
  const [modalOpen,  setModalOpen]  = useState(false);
  const [evtType,    setEvtType]    = useState<string | null>(null);
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
      repartitionIndemA:     m.repartitionIndemA,
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

  function addEvt() {
    setModalError('');
    if (!evtType) { setModalError('Choisissez un type.'); return; }
    if (!evtDebut || !evtFin) { setModalError('Les deux dates sont requises.'); return; }
    if (evtFin < evtDebut) { setModalError('La fin doit être après le début.'); return; }
    // Les absences famille A/B sont cumulables avec n'importe quel autre événement.
    // Maladie et congé payé restent mutuellement exclusifs entre eux.
    if (!isAbsenceType(evtType) && evts.some(e => !isAbsenceType(e.type) && e.debut <= evtFin && e.fin >= evtDebut)) {
      setModalError('Cet intervalle chevauche un événement existant.'); return;
    }
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

  async function partagerMois() {
    if (!garde) return;
    setSharing(true);
    setShareFeedback('');
    let token = garde.publicTokenNounou;
    if (!token) {
      const res  = await fetch(`/api/gardes/${gardeId}/public-token`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setShareFeedback('Réservé au créateur de la garde');
        setSharing(false);
        setTimeout(() => setShareFeedback(''), 2500);
        return;
      }
      token = data.token;
      setGarde({ ...garde, publicTokenNounou: token });
    }
    const url = `${window.location.origin}/public/mois/${token}/${annee}/${mois}`;
    await navigator.clipboard.writeText(url);
    setShareFeedback('Lien copié !');
    setSharing(false);
    setTimeout(() => setShareFeedback(''), 2500);
  }

  const heuresParJour = (() => {
    if (!garde?.modele) return null;
    const m = garde.modele;
    const { joursActifsParSemaine } = calcHeuresSemaineFromPlanning(m.joursJson || '{}');
    const jours = joursActifsParSemaine || 5;
    return (m.hNormalesSemaine + m.hSup25Semaine + m.hSup50Semaine) / jours;
  })();
  const hasOvertime = garde?.modele ? (garde.modele.hSup25Semaine + garde.modele.hSup50Semaine) > 0 : false;
  const statut  = moisRec?.statut ?? 'ouvert';
  const locked  = statut === 'valide_ab';
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

  // ── Prévu → Réel ─────────────────────────────────────────────────
  const prevuReel = (garde?.modele && result)
    ? buildPrevuReel({ annee, mois, evts, result, modele: garde.modele })
    : null;

  // ── Note maladie ─────────────────────────────────────────────────
  const sickInfo: SickInfo | null = (() => {
    if (!result || result.joursAbsMaladie === 0) return null;
    const sickEvts = evts.filter(e => e.type === 'maladie_nounou');
    let maxConsecutive = 0;
    for (const e of sickEvts) {
      const days = joursOuvrablesIntersect(e.debut, e.fin, annee, mois);
      if (days > maxConsecutive) maxConsecutive = days;
    }
    return { sickDaysCount: result.joursAbsMaladie, sickDaysConsecutive: maxConsecutive };
  })();

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
          <Link href="/dashboard" className="text-xs text-[var(--dust)] hover:text-[var(--ink)] no-underline">Dashboard</Link>
          <Link href="/demo" className="text-xs text-[var(--dust)] hover:text-[var(--ink)] no-underline">Démo</Link>
          {saving && <span className="text-xs text-[var(--dust)]">Sauvegarde…</span>}
        </div>
      </header>

      <div className="pt-14 max-w-[1280px] mx-auto px-4 pb-16">
        <div className="pt-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Link
                href={`/gardes/${gardeId}/mois/${prevMois[0]}/${prevMois[1]}`}
                aria-label="Mois précédent"
                className="flex items-center justify-center w-9 h-9 rounded-full border-[1.5px] border-[var(--line)] text-[var(--ink)] text-lg font-bold hover:border-[var(--sage)] hover:text-[var(--sage)] hover:bg-[var(--sage-light)] transition-colors no-underline"
              >
                ←
              </Link>
              <h1 className="font-serif text-2xl text-[var(--ink)]">{MOIS_LONGS[mois - 1]} {annee}</h1>
              <Link
                href={`/gardes/${gardeId}/mois/${nextMois[0]}/${nextMois[1]}`}
                aria-label="Mois suivant"
                className="flex items-center justify-center w-9 h-9 rounded-full border-[1.5px] border-[var(--line)] text-[var(--ink)] text-lg font-bold hover:border-[var(--sage)] hover:text-[var(--sage)] hover:bg-[var(--sage-light)] transition-colors no-underline"
              >
                →
              </Link>
            </div>
            <div className="flex items-center gap-2">
              {shareFeedback && <span className="text-xs text-[var(--sage)] font-medium">{shareFeedback}</span>}
              <button
                onClick={partagerMois}
                disabled={sharing}
                title="Copier un lien de suivi (lecture seule) à envoyer à la nounou ou l'autre famille"
                className="text-xs px-3 py-1.5 rounded-full font-medium border-[1.5px] border-[var(--line)] text-[var(--dust)] hover:border-[var(--sage)] hover:text-[var(--sage)] transition-colors bg-white disabled:opacity-50"
              >
                🔗 Partager ce mois
              </button>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${locked ? 'bg-[var(--sage-light)] text-[var(--sage)]' : 'bg-[var(--paper)] text-[var(--dust)]'}`}>
                {statutLabel[statut] ?? statut}
              </span>
            </div>
          </div>

          <CalendrierMoisView
            annee={annee} mois={mois} evts={evts} result={result} statut={statut}
            nomFamA={famA?.nomAffiche} nomFamB={famB?.nomAffiche}
            readonly={false}
            heuresParJour={heuresParJour} hasOvertime={hasOvertime}
            prevuReel={prevuReel}
            gardeId={gardeId} evtsSaveCount={evtsSaveCount}
            locked={locked}
            onOpenModal={openModal} onRemoveEvt={removeEvt}
          />

          {sickInfo && <SickNoteBlock {...sickInfo} variant="families" />}
        </div>
      </div>

      {/* Modal événement */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/35 z-[150] flex items-center justify-center" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 w-[min(380px,90vw)] shadow-2xl">
            <h3 className="text-base font-medium mb-4">Ajouter un événement</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {([
                ['conge_paye',        '🏖 Congé payé'],
                ['jour_repos',        '😌 Jour de repos'],
                ['maladie_nounou',    '🤒 Maladie nounou'],
                ['absence_famille_a', '👶 Absent Famille A'],
                ['absence_famille_b', '👶 Absent Famille B'],
              ] as [string, string][]).map(([t, label]) => (
                <button key={t} onClick={() => setEvtType(t)}
                  className={'py-2.5 rounded-lg border-[1.5px] text-sm transition-all text-left px-3 ' + (evtType === t ? 'border-[var(--sage)] bg-[var(--sage-light)] text-[var(--sage)] font-medium' : 'border-[var(--line)]')}>
                  {label}
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
