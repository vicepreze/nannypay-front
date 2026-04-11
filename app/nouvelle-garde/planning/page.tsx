'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const JOURS = [
  { num: 1, label: 'Lundi' },
  { num: 2, label: 'Mardi' },
  { num: 3, label: 'Mercredi' },
  { num: 4, label: 'Jeudi' },
  { num: 5, label: 'Vendredi' },
];

type JourPlanning = { actif: boolean; hDebut: string; hFin: string };
type Planning = Record<number, JourPlanning>;

const STORAGE_KEY = 'ng_planning';
const DEFAULT_PLANNING: Planning = Object.fromEntries(
  JOURS.map(j => [j.num, { actif: j.num !== 3, hDebut: '08:30', hFin: '18:30' }])
);

export default function PlanningPage() {
  const router = useRouter();
  const [planning, setPlanning] = useState<Planning>(DEFAULT_PLANNING);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) setPlanning(JSON.parse(saved));
  }, []);

  function toggleJour(num: number) {
    setPlanning(prev => ({
      ...prev,
      [num]: { ...prev[num], actif: !prev[num].actif },
    }));
  }
  function setHeure(num: number, field: 'hDebut' | 'hFin', val: string) {
    setPlanning(prev => ({ ...prev, [num]: { ...prev[num], [field]: val } }));
  }

  // Calcul résumé
  const joursActifs = JOURS.filter(j => planning[j.num].actif);
  const heuresParSemaine = joursActifs.reduce((acc, j) => {
    const p = planning[j.num];
    if (!p.hDebut || !p.hFin) return acc;
    const [h1, m1] = p.hDebut.split(':').map(Number);
    const [h2, m2] = p.hFin.split(':').map(Number);
    return acc + (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
  }, 0);
  const hSup = Math.max(0, heuresParSemaine - 40);
  const hMensuel = Math.round(heuresParSemaine * 52 / 12 * 10) / 10;

  function suivant() {
    setError('');
    if (joursActifs.length === 0) { setError('Sélectionnez au moins un jour de travail.'); return; }
    const invalid = joursActifs.find(j => !planning[j.num].hDebut || !planning[j.num].hFin);
    if (invalid) { setError('Renseignez les horaires pour tous les jours actifs.'); return; }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(planning));
    router.push('/nouvelle-garde/paie');
  }

  return (
    <div className="space-y-6">

      <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-sm font-medium">
          Jours et horaires habituels
        </div>
        <div className="divide-y divide-[var(--line)]">
          {JOURS.map(j => {
            const p = planning[j.num];
            return (
              <div key={j.num} className={`px-5 py-4 transition-colors ${p.actif ? 'bg-white' : 'bg-[var(--paper)] opacity-60'}`}>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2.5 w-28 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.actif}
                      onChange={() => toggleJour(j.num)}
                      className="w-4 h-4 accent-[var(--sage)] cursor-pointer"
                    />
                    <span className={`text-sm font-medium ${p.actif ? 'text-[var(--ink)]' : 'text-[var(--dust)]'}`}>
                      {j.label}
                    </span>
                  </label>
                  {p.actif && (
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="time"
                        value={p.hDebut}
                        onChange={e => setHeure(j.num, 'hDebut', e.target.value)}
                        className="px-2 py-1.5 border-[1.5px] border-[var(--line)] rounded-lg text-sm outline-none focus:border-[var(--sage)] bg-white"
                      />
                      <span className="text-[var(--dust)]">→</span>
                      <input
                        type="time"
                        value={p.hFin}
                        onChange={e => setHeure(j.num, 'hFin', e.target.value)}
                        className="px-2 py-1.5 border-[1.5px] border-[var(--line)] rounded-lg text-sm outline-none focus:border-[var(--sage)] bg-white"
                      />
                      <span className="text-[var(--dust)] text-xs">
                        {(() => {
                          const [h1, m1] = p.hDebut.split(':').map(Number);
                          const [h2, m2] = p.hFin.split(':').map(Number);
                          const diff = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
                          return diff > 0 ? `${diff.toFixed(1)} h` : '';
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Résumé */}
      {joursActifs.length > 0 && (
        <div className="bg-[var(--sage-light)] border border-[var(--sage-mid)] rounded-[var(--radius)] px-5 py-4 text-sm space-y-1.5">
          <div className="font-medium text-[var(--sage)] mb-2">Résumé hebdomadaire</div>
          <div className="flex justify-between">
            <span className="text-[var(--dust)]">Jours travaillés</span>
            <span className="font-medium">{joursActifs.length} j / semaine</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--dust)]">Heures / semaine</span>
            <span className="font-medium">{heuresParSemaine.toFixed(1)} h</span>
          </div>
          {hSup > 0 && (
            <div className="flex justify-between text-[var(--warn)]">
              <span>dont heures sup (+25%)</span>
              <span className="font-medium">{hSup.toFixed(1)} h</span>
            </div>
          )}
          <div className="flex justify-between pt-1.5 border-t border-[var(--sage-mid)] font-medium">
            <span>Volume mensuel (mensualisation)</span>
            <span>{hMensuel} h / mois</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-[var(--red)] bg-[var(--red-light)] rounded-lg px-4 py-2">{error}</p>}

      <div className="flex justify-between pt-2">
        <button onClick={() => router.back()} className={btnSecondary}>← Retour</button>
        <button onClick={suivant} className={btnPrimary}>Suivant : La paie →</button>
      </div>
    </div>
  );
}

const btnPrimary   = 'px-6 py-2.5 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors';
const btnSecondary = 'px-6 py-2.5 border-[1.5px] border-[var(--line)] text-[var(--ink)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] transition-colors bg-white';
