'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlanningForm, PlanningSummaryCard, buildPlanning, validatePlanning, planningSummary,
  type Planning, type Enfant,
} from '@/components/nouvelle-garde/PlanningForm';

const STORAGE_KEY = 'ng_planning';

export default function PlanningPage() {
  const router = useRouter();
  const [planning, setPlanning] = useState<Planning>({});
  const [enfants,  setEnfants]  = useState<Enfant[]>([]);
  const [error,    setError]    = useState('');

  useEffect(() => {
    const acteurs = sessionStorage.getItem('ng_acteurs');
    if (acteurs) {
      const d    = JSON.parse(acteurs);
      const enfs = ((d.enfants ?? []) as Enfant[]).filter(e => e.prenom);
      setEnfants(enfs);
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedData = JSON.parse(saved) as { planning?: Planning } | Planning;
        const p = (savedData as { planning?: Planning }).planning ?? (savedData as Planning);
        setPlanning(buildPlanning(enfs, p));
      } else {
        setPlanning(buildPlanning(enfs, null));
      }
    }
  }, []);

  function suivant() {
    setError('');
    const msg = validatePlanning(planning);
    if (msg) { setError(msg); return; }
    const { hNormalesSemaine, hSup25Semaine, hSup50Semaine } = planningSummary(planning);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ planning, hNormalesSemaine, hSup25Semaine, hSup50Semaine }));
    router.push('/nouvelle-garde/paie');
  }

  if (enfants.length === 0) {
    return (
      <div className="space-y-5">
        <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] p-6 text-sm text-[var(--dust)] text-center">
          Aucun enfant défini. Retournez à l&apos;étape précédente pour ajouter des enfants.
        </div>
        <div className="flex justify-between pt-2">
          <button onClick={() => router.back()} className={btnSec}>← Retour</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--dust)]">
        Définissez les horaires habituels de la nounou pour chaque enfant. Les heures de la nounou sont calculées en prenant l&apos;union de toutes les plages.
      </p>

      <PlanningForm enfants={enfants} planning={planning} onChange={setPlanning} />
      <PlanningSummaryCard planning={planning} />

      {error && <p className="text-sm text-[var(--red)] bg-[var(--red-light)] rounded-lg px-4 py-2">{error}</p>}

      <div className="flex justify-between pt-2">
        <button onClick={() => router.back()} className={btnSec}>← Retour</button>
        <button onClick={suivant} className={btnPri}>Suivant : La paie →</button>
      </div>
    </div>
  );
}

const btnPri = 'px-6 py-2.5 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--sage-dark)] transition-colors';
const btnSec = 'px-6 py-2.5 border-[1.5px] border-[var(--line)] text-[var(--ink)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] transition-colors bg-white';
