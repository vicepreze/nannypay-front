'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { calculerMois, calcHeuresSemaineFromPlanning, type Evt, type CalcResult } from '@/lib/calcul';
import { CalendrierMoisView } from '@/components/CalendrierMoisView';

const MOIS_LONGS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

type Famille = { label: string; nomAffiche: string | null };
type Modele = {
  tauxHoraireNet: number; hNormalesSemaine: number; hSup25Semaine: number;
  hSup50Semaine: number; repartitionA: number; navigoMontant: number;
  indemEntretien: number; indemKm: number; joursJson: string;
};
type GardeData = {
  nom: string | null;
  nounou: { prenom: string } | null;
  familles: Famille[];
  modele: Modele | null;
};
type MoisRec = { annee: number; mois: number; statut: string; evenementsJson: string };

export default function PublicMoisPage() {
  const { token, annee: anneeStr, mois: moisStr } = useParams<{ token: string; annee: string; mois: string }>();
  const annee = parseInt(anneeStr);
  const mois  = parseInt(moisStr);

  const [garde,   setGarde]   = useState<GardeData | null>(null);
  const [moisRec, setMoisRec] = useState<MoisRec | null>(null);
  const [evts,    setEvts]    = useState<Evt[]>([]);
  const [result,  setResult]  = useState<CalcResult | null>(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/mois/${token}/${annee}/${mois}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setGarde(d.garde);
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
        />
      </div>
    </div>
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
