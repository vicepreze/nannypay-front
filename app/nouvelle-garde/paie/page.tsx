'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const MODES = {
  'A.1': { nom: 'Moitié-moitié',    desc: 'Mensualisation · répartition 50/50 par défaut' },
  'B.1': { nom: 'Partage au temps', desc: 'Mensualisation · proportionnel aux heures par enfant' },
  'A.2': { nom: 'Partage au coût',  desc: 'Mensualisation · équilibrage sur reste à charge' },
  'B.2': { nom: '100% personnalisé',desc: 'Réel · répartition manuelle avec CMG' },
} as const;
type ModeKey = keyof typeof MODES;

const TAUX_CHARGES = 0.2188;

export default function PaiePage() {
  const router  = useRouter();

  const [mode,           setMode]           = useState<ModeKey>('A.1');
  const [taux,           setTaux]           = useState(11);
  const [navigo,         setNavigo]         = useState(90.80);
  const [indemKm,        setIndemKm]        = useState(0);
  const [indemEntretien, setIndemEntretien] = useState(6.0);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('ng_paie');
    if (!saved) return;
    const d = JSON.parse(saved);
    setMode(d.mode ?? 'A.1');
    setTaux(d.taux ?? 11);
    setNavigo(d.navigo ?? 90.80);
    setIndemKm(d.indemKm ?? 0);
    setIndemEntretien(d.indemEntretien ?? 6.0);
  }, []);

  const tauxBrut = (taux / (1 - TAUX_CHARGES)).toFixed(2);

  async function creerGarde() {
    setError('');
    if (!taux || taux <= 0) { setError('Taux horaire requis.'); return; }

    const acteurs  = JSON.parse(sessionStorage.getItem('ng_acteurs')  || 'null');
    const planning = JSON.parse(sessionStorage.getItem('ng_planning') || 'null');
    if (!acteurs)  { setError('Volet Acteurs incomplet. Recommencez.'); return; }
    if (!planning) { setError('Volet Planning incomplet. Recommencez.'); return; }

    sessionStorage.setItem('ng_paie', JSON.stringify({ mode, taux, navigo, indemKm, indemEntretien }));

    setLoading(true);
    try {
      const res = await fetch('/api/gardes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acteurs, planning, paie: { mode, taux, navigo, indemKm, indemEntretien } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');

      // Nettoyer sessionStorage
      sessionStorage.removeItem('ng_acteurs');
      sessionStorage.removeItem('ng_planning');
      sessionStorage.removeItem('ng_paie');

      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Mode de calcul */}
      <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-sm font-medium">
          Mode de calcul
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          {(Object.entries(MODES) as [ModeKey, typeof MODES[ModeKey]][]).map(([key, m]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={[
                'text-left p-3.5 rounded-lg border-[1.5px] transition-all',
                mode === key
                  ? 'border-[var(--sage)] bg-[var(--sage-light)]'
                  : 'border-[var(--line)] bg-white hover:border-[var(--sage-mid)]',
              ].join(' ')}
            >
              <div className={`text-xs font-bold tracking-wide mb-1 ${mode === key ? 'text-[var(--sage)]' : 'text-[var(--dust)]'}`}>
                {key}
              </div>
              <div className="text-sm font-medium text-[var(--ink)]">{m.nom}</div>
              <div className="text-xs text-[var(--dust)] mt-0.5 leading-tight">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Taux horaire */}
      <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-sm font-medium">
          Taux horaire net
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.01"
              min="5"
              max="50"
              value={taux}
              onChange={e => setTaux(parseFloat(e.target.value) || 0)}
              className="w-28 px-3 py-2 text-lg font-semibold border-[1.5px] border-[var(--line)] rounded-[var(--radius)] outline-none focus:border-[var(--sage)] focus:ring-2 focus:ring-[var(--sage-light)] text-center"
            />
            <span className="text-[var(--dust)] text-sm">€ / heure net</span>
          </div>
          <p className="text-xs text-[var(--dust)] mt-2">
            Taux brut correspondant : <strong>{tauxBrut} €/h</strong> (charges salariales 21,88%)
          </p>
        </div>
      </div>

      {/* Indemnités */}
      <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-sm font-medium">
          Indemnités mensuelles
        </div>
        <div className="divide-y divide-[var(--line)]">
          <IndemRow
            label="Transport (Navigo)"
            hint="50% du pass mensuel — obligatoire"
            unit="€/mois"
            value={navigo}
            onChange={setNavigo}
          />
          <IndemRow
            label="Frais kilométriques"
            hint="Si la nounou utilise son véhicule"
            unit="€/mois"
            value={indemKm}
            onChange={setIndemKm}
          />
          <IndemRow
            label="Entretien"
            hint="Minimum 3,52 €/j — repas en sus"
            unit="€/jour"
            value={indemEntretien}
            onChange={setIndemEntretien}
          />
        </div>
      </div>

      {error && <p className="text-sm text-[var(--red)] bg-[var(--red-light)] rounded-lg px-4 py-2">{error}</p>}

      <div className="flex justify-between pt-2">
        <button onClick={() => router.back()} className={btnSecondary} disabled={loading}>
          ← Retour
        </button>
        <button onClick={creerGarde} className={btnPrimary} disabled={loading}>
          {loading ? 'Création…' : 'Créer la garde →'}
        </button>
      </div>
    </div>
  );
}

function IndemRow({ label, hint, unit, value, onChange }: {
  label: string; hint: string; unit: string;
  value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-[var(--dust)]">{hint}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-24 px-3 py-1.5 border-[1.5px] border-[var(--line)] rounded-lg text-sm text-center outline-none focus:border-[var(--sage)] bg-white"
        />
        <span className="text-xs text-[var(--dust)] w-12">{unit}</span>
      </div>
    </div>
  );
}

const btnPrimary   = 'px-6 py-2.5 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnSecondary = 'px-6 py-2.5 border-[1.5px] border-[var(--line)] text-[var(--ink)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] transition-colors bg-white disabled:opacity-50';
