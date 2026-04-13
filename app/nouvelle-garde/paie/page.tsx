'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TAUX_CHARGES = 0.2188;

type Repartition = 'PAR_ENFANT' | 'PAR_HEURE';
type Equite      = 'SIMPLE'     | 'EQUITABLE';

const MODE_LABEL: Record<string, string> = {
  'A.1': 'Par enfant · sans rééquilibrage',
  'B.1': 'Par heure · sans rééquilibrage',
  'A.2': 'Par enfant · reste à charge équitable',
  'B.2': 'Par heure · reste à charge équitable',
};

function toModeCalcul(r: Repartition, e: Equite): string {
  if (r === 'PAR_ENFANT' && e === 'SIMPLE')    return 'A.1';
  if (r === 'PAR_HEURE'  && e === 'SIMPLE')    return 'B.1';
  if (r === 'PAR_ENFANT' && e === 'EQUITABLE') return 'A.2';
  return 'B.2';
}

type Aides = {
  cmgCotisations:    number;
  cmgRemuneration:   number;
  abattementCharges: number;
  aideVille:         number;
  creditImpot:       number;
};

function aidesZero(): Aides {
  return { cmgCotisations: 0, cmgRemuneration: 0, abattementCharges: 0, aideVille: 0, creditImpot: 0 };
}

export default function PaiePage() {
  const router = useRouter();

  const [repartition,    setRepartition]    = useState<Repartition>('PAR_ENFANT');
  const [equite,         setEquite]         = useState<Equite>('SIMPLE');
  const [taux,           setTaux]           = useState(11);
  const [navigo,         setNavigo]         = useState(90.80);
  const [indemKm,        setIndemKm]        = useState(0);
  const [indemEntretien, setIndemEntretien] = useState(6.0);
  const [aidesA,         setAidesA]         = useState<Aides>(aidesZero());
  const [aidesB,         setAidesB]         = useState<Aides>(aidesZero());
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('ng_paie');
    if (!saved) return;
    try {
      const d = JSON.parse(saved);
      // Restore repartition / equite (or parse old mode key)
      if (d.repartition) {
        setRepartition(d.repartition);
      } else if (d.mode) {
        setRepartition((d.mode as string).startsWith('A') ? 'PAR_ENFANT' : 'PAR_HEURE');
        setEquite((d.mode as string).endsWith('.2') ? 'EQUITABLE' : 'SIMPLE');
      }
      if (d.equite) setEquite(d.equite);
      if (typeof d.taux           === 'number') setTaux(d.taux);
      if (typeof d.navigo         === 'number') setNavigo(d.navigo);
      if (typeof d.indemKm        === 'number') setIndemKm(d.indemKm);
      if (typeof d.indemEntretien === 'number') setIndemEntretien(d.indemEntretien);
      if (d.aidesA) setAidesA(d.aidesA);
      if (d.aidesB) setAidesB(d.aidesB);
    } catch { /* ignore */ }
  }, []);

  const mode     = toModeCalcul(repartition, equite);
  const tauxBrut = (taux / (1 - TAUX_CHARGES)).toFixed(2);

  async function creerGarde() {
    setError('');
    if (!taux || taux <= 0) { setError('Taux horaire requis.'); return; }

    const acteurs  = JSON.parse(sessionStorage.getItem('ng_acteurs')  || 'null');
    const planning = JSON.parse(sessionStorage.getItem('ng_planning') || 'null');
    if (!acteurs)  { setError('Volet Acteurs incomplet. Recommencez.'); return; }
    if (!planning) { setError('Volet Planning incomplet. Recommencez.'); return; }

    sessionStorage.setItem('ng_paie', JSON.stringify({
      repartition, equite, taux, navigo, indemKm, indemEntretien, aidesA, aidesB,
    }));

    setLoading(true);
    try {
      const res = await fetch('/api/gardes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acteurs, planning,
          paie: { mode, taux, navigo, indemKm, indemEntretien, aidesA, aidesB },
        }),
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

  return (
    <div className="space-y-6">
      {/* Question 1 : répartition */}
      <Card title="Comment répartir le coût de la nounou ?">
        <div className="grid grid-cols-2 gap-3">
          <ChoiceCard
            selected={repartition === 'PAR_ENFANT'}
            onClick={() => setRepartition('PAR_ENFANT')}
            title="Par enfant"
            desc="La part de chaque famille est proportionnelle au nombre d'enfants qu'elle inscrit dans la garde"
          />
          <ChoiceCard
            selected={repartition === 'PAR_HEURE'}
            onClick={() => setRepartition('PAR_HEURE')}
            title="Par heure"
            desc="La part de chaque famille est proportionnelle aux heures de garde effectivement utilisées"
          />
        </div>
      </Card>

      {/* Question 2 : équité */}
      <Card title="Souhaitez-vous équilibrer le reste à charge ?">
        <div className="grid grid-cols-2 gap-3">
          <ChoiceCard
            selected={equite === 'SIMPLE'}
            onClick={() => setEquite('SIMPLE')}
            title="Non — répartition brute"
            desc="Chaque famille paie sa part calculée sans ajustement sur les aides reçues"
          />
          <ChoiceCard
            selected={equite === 'EQUITABLE'}
            onClick={() => setEquite('EQUITABLE')}
            title="Oui — équitable"
            desc="On déduit les aides de chaque famille pour égaliser le reste à charge net"
          />
        </div>
      </Card>

      {/* Mode résultant */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--sage-light)] rounded-lg border border-[var(--line)] text-sm">
        <span className="font-semibold text-[var(--sage)]">{mode}</span>
        <span className="text-[var(--dust)]">—</span>
        <span className="text-[var(--ink)]">{MODE_LABEL[mode]}</span>
      </div>

      {/* Aides CAF — visible uniquement si EQUITABLE */}
      {equite === 'EQUITABLE' && (
        <div className="space-y-3" style={{ animation: 'fadeSlideIn 0.25s ease' }}>
          <style>{`@keyframes fadeSlideIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
          <AidesBlock label="Aides Famille A" aides={aidesA} onChange={setAidesA} />
          <AidesBlock label="Aides Famille B" aides={aidesB} onChange={setAidesB} />
        </div>
      )}

      {/* Taux horaire */}
      <Card title="Taux horaire net">
        <div className="flex items-center gap-3">
          <input
            type="number" step="0.01" min="5" max="50"
            value={taux}
            onChange={e => setTaux(parseFloat(e.target.value) || 0)}
            className="w-28 px-3 py-2 text-lg font-semibold border-[1.5px] border-[var(--line)] rounded-[var(--radius)] outline-none focus:border-[var(--sage)] focus:ring-2 focus:ring-[var(--sage-light)] text-center bg-white"
          />
          <span className="text-[var(--dust)] text-sm">€ / heure net</span>
        </div>
        <p className="text-xs text-[var(--dust)] mt-2">
          Taux brut correspondant : <strong>{tauxBrut} €/h</strong> (charges salariales 21,88 %)
        </p>
      </Card>

      {/* Indemnités */}
      <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-sm font-medium">
          Indemnités mensuelles
        </div>
        <div className="divide-y divide-[var(--line)]">
          <IndemRow label="Transport (Navigo)"   hint="50 % du pass mensuel — obligatoire"     unit="€/mois" value={navigo}         onChange={setNavigo} />
          <IndemRow label="Frais kilométriques"  hint="Si la nounou utilise son véhicule"       unit="€/mois" value={indemKm}        onChange={setIndemKm} />
          <IndemRow label="Entretien"            hint="Minimum 3,52 €/j — repas en sus"        unit="€/jour" value={indemEntretien} onChange={setIndemEntretien} />
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--red)] bg-[var(--red-light,#fef2f2)] rounded-lg px-4 py-2">{error}</p>
      )}

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

/* ── Sub-components ── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-sm font-medium">
        {title}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ChoiceCard({ selected, onClick, title, desc }: {
  selected: boolean; onClick: () => void; title: string; desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'text-left p-4 rounded-lg border-[1.5px] transition-all',
        selected
          ? 'border-[var(--sage)] bg-[var(--sage-light)]'
          : 'border-[var(--line)] bg-white hover:border-[var(--sage)]',
      ].join(' ')}
    >
      <div className={`text-sm font-semibold mb-1 ${selected ? 'text-[var(--sage)]' : 'text-[var(--ink)]'}`}>
        {title}
      </div>
      <div className="text-xs text-[var(--dust)] leading-snug">{desc}</div>
    </button>
  );
}

function AidesBlock({ label, aides, onChange }: {
  label: string;
  aides: Aides;
  onChange: (a: Aides) => void;
}) {
  function set(key: keyof Aides, val: number) {
    onChange({ ...aides, [key]: val });
  }
  return (
    <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-sm font-semibold text-[var(--ink)]">
        {label}
      </div>
      <div className="p-5 space-y-3">
        <p className="text-xs text-[var(--dust)] -mt-1">Tous les champs sont facultatifs. Laissez à 0 si non applicable.</p>
        <div className="grid grid-cols-2 gap-3">
          <AideField label="CMG cotisations sociales" unit="€/mois" value={aides.cmgCotisations}    onChange={v => set('cmgCotisations',    v)} />
          <AideField label="CMG rémunération"         unit="€/mois" value={aides.cmgRemuneration}   onChange={v => set('cmgRemuneration',   v)} />
          <AideField label="Abattement charges"       unit="€/mois" value={aides.abattementCharges} onChange={v => set('abattementCharges', v)} />
          <AideField label="Aide de la ville / mairie" unit="€/mois" value={aides.aideVille}        onChange={v => set('aideVille',         v)} />
        </div>
        <AideField label="Crédit d'impôt (estimation annuelle)" unit="€/an" value={aides.creditImpot} onChange={v => set('creditImpot', v)} />
      </div>
    </div>
  );
}

function AideField({ label, unit, value, onChange }: {
  label: string; unit: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-[var(--dust)]">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number" step="0.01" min="0"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-1.5 border-[1.5px] border-[var(--line)] rounded-lg text-sm text-right outline-none focus:border-[var(--sage)] bg-white"
        />
        <span className="text-xs text-[var(--dust)] whitespace-nowrap">{unit}</span>
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
          type="number" step="0.01" min="0"
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
