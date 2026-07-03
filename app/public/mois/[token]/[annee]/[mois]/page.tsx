'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { calculerMois, calcHeuresSemaineFromPlanning, joursOuvrablesIntersect, type Evt, type CalcResult, type SoldeCompte } from '@/lib/calcul';
import { CalendrierMoisView, SickNoteBlock, buildPrevuReel, type SickInfo } from '@/components/CalendrierMoisView';

const MOIS_LONGS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

type Famille = { label: string; nomAffiche: string | null };
type Modele = {
  tauxHoraireNet: number; hNormalesSemaine: number; hSup25Semaine: number;
  hSup50Semaine: number; repartitionA: number; repartitionIndemA: number; navigoMontant: number;
  indemEntretien: number; indemKm: number; joursJson: string;
};
type GardeData = {
  nom: string | null;
  nounou: { prenom: string } | null;
  familles: Famille[];
  modele: Modele | null;
};
type MoisRec = { annee: number; mois: number; statut: string; evenementsJson: string };
type CongesData = { cp: SoldeCompte | null; repos: SoldeCompte | null };

export default function PublicMoisPage() {
  const { token, annee: anneeStr, mois: moisStr } = useParams<{ token: string; annee: string; mois: string }>();
  const annee = parseInt(anneeStr);
  const mois  = parseInt(moisStr);

  const [garde,   setGarde]   = useState<GardeData | null>(null);
  const [moisRec, setMoisRec] = useState<MoisRec | null>(null);
  const [evts,    setEvts]    = useState<Evt[]>([]);
  const [result,  setResult]  = useState<CalcResult | null>(null);
  const [conges,  setConges]  = useState<CongesData | null>(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/mois/${token}/${annee}/${mois}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setGarde(d.garde);
        setConges(d.conges ?? null);
        if (d.moisRec) {
          setMoisRec(d.moisRec);
          setEvts(JSON.parse(d.moisRec.evenementsJson || '[]'));
        }
      })
      .finally(() => setLoading(false));
  }, [token, annee, mois]);

  useEffect(() => {
    if (!garde?.modele) return;
    const m = garde.modele;
    const { joursActifsParSemaine } = calcHeuresSemaineFromPlanning(m.joursJson || '{}');
    setResult(calculerMois({
      annee, mois,
      taux:                  m.tauxHoraireNet,
      hNormalesSemaine:      m.hNormalesSemaine,
      hSup25Semaine:         m.hSup25Semaine,
      hSup50Semaine:         m.hSup50Semaine,
      repartitionA:          m.repartitionA,
      racOptionActive:       false,
      navigo:                m.navigoMontant,
      indemEntretien:        m.indemEntretien,
      indemKm:               m.indemKm,
      joursActifsParSemaine: joursActifsParSemaine || 5,
      evenements:            evts,
    }));
  }, [garde, evts, annee, mois]);

  const prevuReel = (garde?.modele && result)
    ? buildPrevuReel({ annee, mois, evts, result, modele: garde.modele })
    : null;

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

  if (loading) return <Screen><p className="text-[var(--dust)]">Chargement…</p></Screen>;
  if (error)   return <Screen><div className="text-center"><div className="text-4xl mb-4">⚠️</div><p className="font-medium">{error}</p></div></Screen>;
  if (!garde)  return null;

  const famA = garde.familles.find(f => f.label === 'A');
  const famB = garde.familles.find(f => f.label === 'B');
  const statut = moisRec?.statut ?? 'ouvert';
  const statutMap: Record<string, string> = {
    ouvert:    'En cours',
    valide_a:  `Validé ${famA?.nomAffiche ?? 'Fam. A'}`,
    valide_b:  `Validé ${famB?.nomAffiche ?? 'Fam. B'}`,
    valide_ab: 'Validé ✓',
  };

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center px-6 z-50 gap-4">
        <a href="/" className="font-serif text-[19px] tracking-tight text-[var(--ink)] no-underline">
          nounoulink<em className="text-[var(--sage)] not-italic">.</em>
        </a>
        <span className="text-[var(--line)]">|</span>
        <span className="text-sm text-[var(--dust)]">
          {garde.nom ?? ''} · {MOIS_LONGS[mois - 1]} {annee}
        </span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium bg-[var(--paper)] text-[var(--dust)]">
          {statutMap[statut] ?? statut}
        </span>
      </header>

      <div className="pt-14 max-w-[1280px] mx-auto px-4 pb-16">
        <div className="pt-6 mb-5 flex items-center justify-between">
          <h1 className="font-serif text-2xl text-[var(--ink)]">{MOIS_LONGS[mois - 1]} {annee}</h1>
          {!moisRec && (
            <span className="text-xs text-[var(--dust)]">Aucun relevé pour ce mois</span>
          )}
        </div>

        <CalendrierMoisView
          annee={annee} mois={mois} evts={evts} result={result} statut={statut}
          nomFamA={famA?.nomAffiche} nomFamB={famB?.nomAffiche}
          readonly={true}
          prevuReel={prevuReel}
        />

        {conges && (conges.cp || conges.repos) && <CongesReadCard conges={conges} />}

        {sickInfo && <SickNoteBlock {...sickInfo} variant="nounou" />}
      </div>
    </div>
  );
}

function CongesReadCard({ conges }: { conges: CongesData }) {
  const totalFinMois = Math.round(((conges.cp?.soldeEstime ?? 0) + (conges.repos?.soldeEstime ?? 0)) * 10) / 10;
  return (
    <div className="mt-3 bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--line)] bg-[var(--paper)] text-[10px] font-medium text-[var(--dust)] uppercase tracking-wide">
        🏖 Congés &amp; repos
      </div>
      <div className="px-4 py-3">
        <div className="text-xs mb-2.5">
          <span className="font-semibold text-[var(--sage)]">{totalFinMois} j</span>
          <span className="text-[var(--dust)] ml-1">disponibles à la fin de ce mois</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[9px] text-[var(--dust)] uppercase tracking-wide">
              <th className="text-left font-medium pb-1.5">Compte</th>
              <th className="text-right font-medium pb-1.5">Solde initial</th>
              <th className="text-right font-medium pb-1.5">Jours posés</th>
              <th className="text-right font-medium pb-1.5">Jours à Acquérir</th>
              <th className="text-right font-medium pb-1.5">Solde estimé</th>
            </tr>
          </thead>
          <tbody>
            {conges.cp    && <CongesRow label="🏖 Congés payés" solde={conges.cp} />}
            {conges.repos && <CongesRow label="😌 Jours de repos" solde={conges.repos} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CongesRow({ label, solde }: { label: string; solde: SoldeCompte }) {
  return (
    <tr className="border-t border-[var(--line)]">
      <td className="py-1.5 text-[var(--ink)] whitespace-nowrap">{label}</td>
      <td className="text-right font-mono font-medium">{solde.soldeInitial}</td>
      <td className="text-right font-mono text-[var(--dust)]">{solde.joursPoses}</td>
      <td className="text-right font-mono text-[var(--dust)]">{solde.aAcquerir}</td>
      <td className="text-right font-mono font-semibold text-[var(--sage)]">{solde.soldeEstime}</td>
    </tr>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center p-6">
      <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] p-8 max-w-sm w-full text-center">
        {children}
      </div>
    </div>
  );
}
