'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { calcBModeRepartition, calcEquitableRatioA } from '@/lib/calcul';
import { PaieFormCore, Aides, totalAidesMens } from '@/components/PaieFormCore';

const aidesZero = (): Aides => ({
  cmgCotisations: 0, cmgRemuneration: 0, abattementCharges: 0, aideVille: 0, creditImpot: 0,
});

type Enfant = { prenom: string; fam: string };

export default function PaiePage() {
  const router = useRouter();

  const [enfants,   setEnfants]   = useState<Enfant[]>([]);
  const [nomA,      setNomA]      = useState('Famille A');
  const [nomB,      setNomB]      = useState('Famille B');
  const [joursJson, setJoursJson] = useState('{}');
  const [hNorm,     setHNorm]     = useState(40);
  const [hSup25,    setHSup25]    = useState(0);
  const [hSup50,    setHSup50]    = useState(0);

  const [taux,      setTaux]      = useState(11);
  const [navigo,    setNavigo]    = useState(90.80);
  const [km,        setKm]        = useState(0);
  const [entretien, setEntretien] = useState(6.0);

  const [repartA,   setRepartA]   = useState(0.5);
  const [racOption, setRacOption] = useState(false);

  const [aA, setAA] = useState<Aides>(aidesZero());
  const [aB, setAB] = useState<Aides>(aidesZero());

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const acteurs  = JSON.parse(sessionStorage.getItem('ng_acteurs')  || 'null');
      const planning = JSON.parse(sessionStorage.getItem('ng_planning') || 'null');
      const saved    = JSON.parse(sessionStorage.getItem('ng_paie')     || 'null');

      const enf: Enfant[] = acteurs?.enfants ?? [];
      setEnfants(enf);
      if (acteurs?.famANom) setNomA(acteurs.famANom);
      if (acteurs?.famBNom) setNomB(acteurs.famBNom);

      const planningData = planning?.planning ?? planning ?? {};
      setJoursJson(JSON.stringify(planningData));
      if (typeof planning?.hNormalesSemaine === 'number') setHNorm(planning.hNormalesSemaine);
      if (typeof planning?.hSup25Semaine    === 'number') setHSup25(planning.hSup25Semaine);
      if (typeof planning?.hSup50Semaine    === 'number') setHSup50(planning.hSup50Semaine);

      if (saved) {
        if (typeof saved.repartitionA    === 'number')  setRepartA(saved.repartitionA);
        if (typeof saved.racOptionActive === 'boolean') setRacOption(saved.racOptionActive);
        if (typeof saved.taux            === 'number')  setTaux(saved.taux);
        if (typeof saved.navigo          === 'number')  setNavigo(saved.navigo);
        if (typeof saved.indemKm         === 'number')  setKm(saved.indemKm);
        if (typeof saved.indemEntretien  === 'number')  setEntretien(saved.indemEntretien);
        if (saved.aidesA) setAA(saved.aidesA);
        if (saved.aidesB) setAB(saved.aidesB);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  const pProportionnel = useMemo(
    () => calcBModeRepartition(joursJson, enfants),
    [joursJson, enfants]
  );

  const salNetTotalMens = useMemo(() => {
    const baseNet  = hNorm  * 52/12 * taux;
    const sup25Net = hSup25 * 52/12 * taux * 1.25;
    const sup50Net = hSup50 * 52/12 * taux * 1.50;
    return Math.round((baseNet + sup25Net + sup50Net) * 100) / 100;
  }, [hNorm, hSup25, hSup50, taux]);

  const aidesAMens = useMemo(() => totalAidesMens(aA), [aA]);
  const aidesBMens = useMemo(() => totalAidesMens(aB), [aB]);

  const pEquitable = useMemo(
    () => calcEquitableRatioA(pProportionnel, salNetTotalMens, aidesAMens, aidesBMens),
    [pProportionnel, salNetTotalMens, aidesAMens, aidesBMens]
  );

  async function creerGarde() {
    setError('');
    if (!taux || taux <= 0) { setError('Taux horaire requis.'); return; }

    const acteurs  = JSON.parse(sessionStorage.getItem('ng_acteurs')  || 'null');
    const planning = JSON.parse(sessionStorage.getItem('ng_planning') || 'null');
    if (!acteurs)  { setError('Volet Acteurs incomplet. Recommencez.'); return; }
    if (!planning) { setError('Volet Planning incomplet. Recommencez.'); return; }

    sessionStorage.setItem('ng_paie', JSON.stringify({
      repartitionA: repartA, racOptionActive: racOption,
      taux, navigo, indemKm: km, indemEntretien: entretien, aidesA: aA, aidesB: aB,
    }));

    setLoading(true);
    try {
      const res = await fetch('/api/gardes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acteurs, planning,
          paie: { repartitionA: repartA, racOptionActive: racOption, taux, navigo, indemKm: km, indemEntretien: entretien, aidesA: aA, aidesB: aB },
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

  if (!hydrated) return null;

  return (
    <div className="space-y-5">

      {/* 1 — Rémunération */}
      <Card title="1 — Rémunération">
        <FN label="Taux horaire net (€/h)" value={taux} onChange={setTaux} />
        <p className="text-xs text-[var(--dust)] -mt-1">
          Taux brut correspondant : <strong>{(taux / 0.7812).toFixed(2)} €/h</strong> (charges salariales 21,88 %)
        </p>
      </Card>

      <PaieFormCore
        nomA={nomA} nomB={nomB}
        navigo={navigo}       setNavigo={setNavigo}
        km={km}               setKm={setKm}
        entretien={entretien} setEntretien={setEntretien}
        salNetTotalMens={salNetTotalMens}
        pProportionnel={pProportionnel}
        pEquitable={pEquitable}
        aidesAMens={aidesAMens} aidesBMens={aidesBMens}
        repartA={repartA}     setRepartA={setRepartA}
        racOption={racOption} setRacOption={setRacOption}
        aA={aA} setAA={setAA}
        aB={aB} setAB={setAB}
      />

      {error && <p className="text-sm text-[var(--red,#b91c1c)] bg-red-50 rounded-lg px-4 py-2">{error}</p>}

      <div className="flex justify-between pt-2">
        <button onClick={() => router.back()} disabled={loading} className={btnSecondary}>← Retour</button>
        <button onClick={creerGarde} disabled={loading} className={btnPrimary}>
          {loading ? 'Création…' : 'Créer la garde →'}
        </button>
      </div>
    </div>
  );
}

// ── Sous-composants locaux (section 1 uniquement) ─────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] overflow-hidden bg-white border border-[var(--line)]">
      <div className="px-5 py-3 text-sm font-semibold border-b border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]">{title}</div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

function FN({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [raw, setRaw] = useState(() => value !== 0 ? String(value) : '');
  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-[var(--dust)]">{label}</label>
      <input
        type="text" inputMode="decimal" value={raw} placeholder="0"
        onChange={e => { const s = e.target.value; setRaw(s); const n = parseFloat(s.replace(',', '.')); onChange(isNaN(n) ? 0 : n); }}
        onBlur={() => { const n = parseFloat(raw.replace(',', '.')); setRaw(!isNaN(n) && n !== 0 ? String(n) : ''); onChange(isNaN(n) ? 0 : n); }}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-white border border-[var(--line)] focus:border-[var(--sage)]"
      />
    </div>
  );
}

const btnPrimary   = 'px-6 py-2.5 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnSecondary = 'px-6 py-2.5 border-[1.5px] border-[var(--line)] text-[var(--ink)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] transition-colors bg-white disabled:opacity-50';
