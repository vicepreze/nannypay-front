'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Prénoms par défaut — l'utilisateur peut les modifier dans les Settings
const PRENOMS_DEFAUT = ['Simone', 'Giselle', 'Suzanne'];

const STORAGE_KEY = 'ng_acteurs';

// Conserve les prénoms déjà personnalisés (édités à l'étape 2) slot par slot dans chaque
// famille ; ne pioche un prénom par défaut que pour les nouveaux enfants.
function genEnfants(nbA: number, nbB: number, prev: { prenom: string; fam: string }[] = []) {
  const prevA = prev.filter(e => e.fam === 'A').map(e => e.prenom);
  const prevB = prev.filter(e => e.fam === 'B').map(e => e.prenom);
  const used  = new Set([...prevA, ...prevB]);
  const dispo = PRENOMS_DEFAUT.filter(p => !used.has(p));
  let di = 0;
  const nextDefaut = () => dispo[di++] ?? PRENOMS_DEFAUT[0];

  const result: { prenom: string; fam: 'A' | 'B' }[] = [];
  for (let i = 0; i < nbA; i++) result.push({ prenom: prevA[i] ?? nextDefaut(), fam: 'A' });
  for (let i = 0; i < nbB; i++) result.push({ prenom: prevB[i] ?? nextDefaut(), fam: 'B' });
  return result;
}

export default function ActeursPage() {
  const router = useRouter();

  const [nbA, setNbA] = useState(1);
  const [nbB, setNbB] = useState(2);

  // Restore from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const d = JSON.parse(saved);
    if (typeof d.nbEnfantsA === 'number') setNbA(d.nbEnfantsA);
    if (typeof d.nbEnfantsB === 'number') setNbB(d.nbEnfantsB);
  }, []);

  const total = nbA + nbB;
  const canAddA = nbA < 2 && total < 3;
  const canAddB = nbB < 2 && total < 3;

  function suivant() {
    let prevEnfants: { prenom: string; fam: string }[] = [];
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) prevEnfants = JSON.parse(raw)?.enfants ?? [];
    } catch { /* ignore */ }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      nbEnfantsA: nbA,
      nbEnfantsB: nbB,
      enfants: genEnfants(nbA, nbB, prevEnfants),
    }));
    router.push('/nouvelle-garde/planning');
  }

  return (
    <div className="space-y-3">

      {/* Question */}
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--dust)] mb-1">
        Étape 1 sur 3
      </p>
      <h2 className="font-serif text-2xl text-[var(--ink)] mb-6">
        Combien d&apos;enfants par famille&nbsp;?
      </h2>

      {/* Famille A */}
      <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">Votre famille</p>
          <p className="text-xs text-[var(--dust)] mt-0.5">Famille A — vous</p>
        </div>
        <Counter
          value={nbA}
          onDec={() => setNbA(v => Math.max(1, v - 1))}
          onInc={() => setNbA(v => Math.min(2, v + 1))}
          canDec={nbA > 1}
          canInc={canAddA}
        />
      </div>

      {/* Famille B */}
      <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">L&apos;autre famille</p>
          <p className="text-xs text-[var(--dust)] mt-0.5">Famille B — votre co-famille</p>
        </div>
        <Counter
          value={nbB}
          onDec={() => setNbB(v => Math.max(1, v - 1))}
          onInc={() => setNbB(v => Math.min(2, v + 1))}
          canDec={nbB > 1}
          canInc={canAddB}
        />
      </div>

      {/* Total */}
      <div className="bg-[var(--paper)] border border-[var(--line)] rounded-[var(--radius)] px-5 py-3 flex items-center justify-between">
        <p className="text-sm text-[var(--dust)]">Total enfants gardés simultanément</p>
        <p className="text-sm font-semibold text-[var(--ink)]">{total} enfant{total > 1 ? 's' : ''}</p>
      </div>

      {/* Bouton */}
      <div className="flex justify-end pt-4">
        <button onClick={suivant} className={btnPrimary}>
          Suivant : le planning →
        </button>
      </div>

    </div>
  );
}

/* ── Counter ──────────────────────────────────────────────────── */
function Counter({
  value, onDec, onInc, canDec, canInc,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  canDec: boolean;
  canInc: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onDec}
        disabled={!canDec}
        className="w-9 h-9 rounded-[var(--radius)] border border-[var(--line)] text-lg font-medium text-[var(--ink)] bg-white hover:bg-[var(--paper)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
      >
        −
      </button>
      <span className="w-5 text-center text-base font-semibold text-[var(--ink)] tabular-nums">
        {value}
      </span>
      <button
        onClick={onInc}
        disabled={!canInc}
        className="w-9 h-9 rounded-[var(--radius)] border border-[var(--line)] text-lg font-medium text-[var(--ink)] bg-white hover:bg-[var(--paper)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
      >
        +
      </button>
    </div>
  );
}

const btnPrimary = 'px-6 py-2.5 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--sage-dark)] transition-colors';
