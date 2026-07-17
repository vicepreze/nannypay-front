'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PaieForm, aidesZero, type PaieFormValue, type Enfant,
} from '@/components/nouvelle-garde/PaieForm';
import { calcBModeRepartition } from '@/lib/calcul';

export default function PaiePage() {
  const router = useRouter();

  const [enfants,   setEnfants]   = useState<Enfant[]>([]);
  const [nomA,      setNomA]      = useState('Famille A');
  const [nomB,      setNomB]      = useState('Famille B');
  const [joursJson, setJoursJson] = useState('{}');

  const [value, setValue] = useState<PaieFormValue>({
    taux: 11, navigo: 90.80, indemKm: 0, entretien: 6.0, repartIndemA: 0.5,
    repartA: 0.5, racOption: false, modeExpert: false,
    aA: aidesZero(), aB: aidesZero(),
  });

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const acteurs  = JSON.parse(sessionStorage.getItem('ng_acteurs')  || 'null');
      const planning = JSON.parse(sessionStorage.getItem('ng_planning') || 'null');
      const saved    = JSON.parse(sessionStorage.getItem('ng_paie')     || 'null');

      if (!acteurs)  { router.replace('/nouvelle-garde/acteurs');  return; }
      if (!planning) { router.replace('/nouvelle-garde/planning'); return; }

      const enf: Enfant[] = acteurs?.enfants ?? [];
      setEnfants(enf);
      if (acteurs?.famANom) setNomA(acteurs.famANom);
      if (acteurs?.famBNom) setNomB(acteurs.famBNom);

      const planningData = planning?.planning ?? planning ?? {};
      setJoursJson(JSON.stringify(planningData));

      const defaultRepartA = calcBModeRepartition(JSON.stringify(planningData), enf);
      setValue(v => ({ ...v, repartA: defaultRepartA }));

      if (saved) {
        setValue(v => ({
          ...v,
          repartA:      typeof saved.repartitionA      === 'number'  ? saved.repartitionA      : v.repartA,
          racOption:    typeof saved.racOptionActive   === 'boolean' ? saved.racOptionActive   : v.racOption,
          taux:         typeof saved.taux              === 'number' && saved.taux > 0 ? saved.taux : v.taux,
          navigo:       typeof saved.navigo            === 'number'  ? saved.navigo            : v.navigo,
          indemKm:      typeof saved.indemKm           === 'number'  ? saved.indemKm           : v.indemKm,
          entretien:    typeof saved.indemEntretien    === 'number'  ? saved.indemEntretien     : v.entretien,
          repartIndemA: typeof saved.repartitionIndemA === 'number'  ? saved.repartitionIndemA  : v.repartIndemA,
          aA: saved.aidesA ?? v.aA,
          aB: saved.aidesB ?? v.aB,
        }));
      }
    } catch { /* ignore */ }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function creerGarde() {
    setError('');
    if (!value.taux || value.taux <= 0) { setError('Taux horaire requis.'); return; }

    const acteurs  = JSON.parse(sessionStorage.getItem('ng_acteurs')  || 'null');
    const planning = JSON.parse(sessionStorage.getItem('ng_planning') || 'null');
    if (!acteurs)  { setError('Volet Acteurs incomplet. Recommencez.'); return; }
    if (!planning) { setError('Volet Planning incomplet. Recommencez.'); return; }

    const paiePayload = {
      repartitionA:      value.repartA,
      racOptionActive:   value.racOption,
      taux:              value.taux,
      navigo:            value.navigo,
      indemKm:           value.indemKm,
      indemEntretien:    value.entretien,
      repartitionIndemA: value.repartIndemA,
      aidesA: value.modeExpert ? value.aA : aidesZero(),
      aidesB: value.modeExpert ? value.aB : aidesZero(),
    };
    sessionStorage.setItem('ng_paie', JSON.stringify(paiePayload));

    setLoading(true);
    try {
      const res = await fetch('/api/gardes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acteurs, planning, paie: paiePayload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      sessionStorage.removeItem('ng_acteurs');
      sessionStorage.removeItem('ng_planning');
      sessionStorage.removeItem('ng_paie');
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      setLoading(false);
    }
  }

  if (!hydrated) return null;

  return (
    <div className="flex flex-col gap-5 pb-4">
      <PaieForm
        value={value}
        onChange={setValue}
        nomA={nomA}
        nomB={nomB}
        joursJson={joursJson}
        enfants={enfants}
      />

      {error && <p className="text-sm text-[var(--red,#b91c1c)] bg-red-50 rounded-lg px-4 py-2">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button onClick={() => router.back()} disabled={loading} className={btnSecondary}>← Retour</button>
        <button onClick={creerGarde} disabled={loading} className={`flex-1 ${btnPrimary}`}>
          {loading ? 'Création…' : 'Créer la garde →'}
        </button>
      </div>
    </div>
  );
}

const btnPrimary   = 'px-6 py-2.5 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--sage-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnSecondary = 'px-6 py-2.5 border-[1.5px] border-[var(--line)] text-[var(--ink)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] transition-colors bg-white disabled:opacity-50';
