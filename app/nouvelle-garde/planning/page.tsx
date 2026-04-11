'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { calcHeuresSemaineFromPlanning } from '@/lib/calcul';

const JOURS = [
  { num: 1, label: 'Lundi',    court: 'Lun' },
  { num: 2, label: 'Mardi',    court: 'Mar' },
  { num: 3, label: 'Mercredi', court: 'Mer' },
  { num: 4, label: 'Jeudi',    court: 'Jeu' },
  { num: 5, label: 'Vendredi', court: 'Ven' },
];

type Plage = { id: string; debut: string; fin: string; enfantIds: string[] };
type JourPlanning = { actif: boolean; plages: Plage[] };
type Planning = Record<number, JourPlanning>;
type Enfant   = { prenom: string; fam: 'A' | 'B' };

const STORAGE_KEY = 'ng_planning';

function uid() { return Math.random().toString(36).slice(2, 9); }

function hhmm(t: string) {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function diffH(debut: string, fin: string) {
  const d = hhmm(fin) - hhmm(debut);
  return d > 0 ? d / 60 : 0;
}

function defaultPlanning(): Planning {
  return Object.fromEntries(
    JOURS.map(j => [j.num, {
      actif:  j.num !== 3,
      plages: j.num !== 3 ? [{ id: uid(), debut: '08:30', fin: '18:30', enfantIds: [] }] : [],
    }])
  );
}

export default function PlanningPage() {
  const router   = useRouter();
  const [planning, setPlanning]   = useState<Planning>(defaultPlanning());
  const [enfants,  setEnfants]    = useState<Enfant[]>([]);
  const [error,    setError]      = useState('');
  const [copier,   setCopier]     = useState<number | null>(null); // jour source pour propagation

  // Charge enfants depuis acteurs + planning sauvegardé
  useEffect(() => {
    const acteurs = sessionStorage.getItem('ng_acteurs');
    if (acteurs) {
      const d = JSON.parse(acteurs);
      setEnfants((d.enfants ?? []).filter((e: Enfant) => e.prenom));
    }
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) setPlanning(JSON.parse(saved));
  }, []);

  // ── Mutations ────────────────────────────────────────────────────

  function toggleJour(num: number) {
    setPlanning(prev => {
      const p = prev[num];
      return {
        ...prev,
        [num]: {
          actif:  !p.actif,
          plages: !p.actif && p.plages.length === 0
            ? [{ id: uid(), debut: '08:30', fin: '18:30', enfantIds: [] }]
            : p.plages,
        },
      };
    });
  }

  function addPlage(num: number) {
    setPlanning(prev => {
      const last = prev[num].plages.at(-1);
      const debut = last?.fin ?? '08:30';
      return {
        ...prev,
        [num]: { ...prev[num], plages: [...prev[num].plages, { id: uid(), debut, fin: debut, enfantIds: [] }] },
      };
    });
  }

  function removePlage(num: number, id: string) {
    setPlanning(prev => ({
      ...prev,
      [num]: { ...prev[num], plages: prev[num].plages.filter(p => p.id !== id) },
    }));
  }

  function updatePlage(num: number, id: string, field: 'debut' | 'fin', val: string) {
    setPlanning(prev => ({
      ...prev,
      [num]: {
        ...prev[num],
        plages: prev[num].plages.map(p => p.id === id ? { ...p, [field]: val } : p),
      },
    }));
  }

  function toggleEnfantPlage(num: number, plageId: string, prenom: string) {
    setPlanning(prev => ({
      ...prev,
      [num]: {
        ...prev[num],
        plages: prev[num].plages.map(p => {
          if (p.id !== plageId) return p;
          const has = p.enfantIds.includes(prenom);
          return { ...p, enfantIds: has ? p.enfantIds.filter(e => e !== prenom) : [...p.enfantIds, prenom] };
        }),
      },
    }));
  }

  function copierVers(source: number, cibles: number[]) {
    setPlanning(prev => {
      const sourcePlages = prev[source].plages;
      const update: Planning = { ...prev };
      for (const c of cibles) {
        update[c] = {
          actif:  true,
          plages: sourcePlages.map(p => ({ ...p, id: uid() })),
        };
      }
      return update;
    });
    setCopier(null);
  }

  // ── Calcul résumé ────────────────────────────────────────────────

  const summary = useCallback(() => {
    return calcHeuresSemaineFromPlanning(JSON.stringify(
      Object.fromEntries(Object.entries(planning).map(([k, v]) => [k, v]))
    ));
  }, [planning]);

  const joursActifs = JOURS.filter(j => planning[j.num].actif && planning[j.num].plages.length > 0);
  const { hNormalesSemaine, hSup25Semaine, hSup50Semaine } = summary();
  const hTotal    = Math.round((hNormalesSemaine + hSup25Semaine + hSup50Semaine) * 10) / 10;
  const hMensuel  = Math.round(hTotal * 52 / 12 * 10) / 10;

  // ── Soumission ───────────────────────────────────────────────────

  function suivant() {
    setError('');
    if (joursActifs.length === 0) { setError('Ajoutez au moins un jour avec des horaires.'); return; }
    const invalid = joursActifs.some(j =>
      planning[j.num].plages.some(p => !p.debut || !p.fin || hhmm(p.fin) <= hhmm(p.debut))
    );
    if (invalid) { setError('Vérifiez les horaires : l\'heure de fin doit être après le début.'); return; }

    // Calcul auto des heures pour le modèle
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      planning,
      hNormalesSemaine,
      hSup25Semaine,
      hSup50Semaine,
    }));
    router.push('/nouvelle-garde/paie');
  }

  return (
    <div className="space-y-5">

      {/* Jours */}
      <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-sm font-medium">
          Planning type hebdomadaire
        </div>

        <div className="divide-y divide-[var(--line)]">
          {JOURS.map(j => {
            const p = planning[j.num];
            return (
              <div key={j.num} className={`px-5 py-4 ${!p.actif ? 'opacity-50' : ''}`}>

                {/* En-tête jour */}
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
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
                    <button
                      onClick={() => setCopier(copier === j.num ? null : j.num)}
                      className="text-[10px] text-[var(--dust)] hover:text-[var(--sage)] border border-[var(--line)] rounded px-2 py-0.5 transition-colors"
                    >
                      Copier vers…
                    </button>
                  )}
                </div>

                {/* Propagation */}
                {copier === j.num && (
                  <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-[var(--sage-light)] rounded-lg">
                    <span className="text-[10px] text-[var(--sage)] font-medium w-full mb-1">Copier les plages de {j.label} vers :</span>
                    {JOURS.filter(x => x.num !== j.num).map(x => (
                      <button
                        key={x.num}
                        onClick={() => copierVers(j.num, [x.num])}
                        className="text-xs px-2.5 py-1 bg-white border border-[var(--sage)] text-[var(--sage)] rounded-lg hover:bg-[var(--sage)] hover:text-white transition-colors font-medium"
                      >
                        {x.court}
                      </button>
                    ))}
                    <button
                      onClick={() => copierVers(j.num, JOURS.filter(x => x.num !== j.num).map(x => x.num))}
                      className="text-xs px-2.5 py-1 bg-[var(--sage)] text-white rounded-lg hover:bg-[#3a5431] transition-colors font-medium"
                    >
                      Tous
                    </button>
                  </div>
                )}

                {/* Plages */}
                {p.actif && (
                  <div className="space-y-2">
                    {p.plages.map(plage => (
                      <div key={plage.id} className="flex flex-wrap items-center gap-2 bg-[var(--paper)] rounded-lg px-3 py-2">
                        <input
                          type="time"
                          value={plage.debut}
                          onChange={e => updatePlage(j.num, plage.id, 'debut', e.target.value)}
                          className={inp}
                        />
                        <span className="text-[var(--dust)] text-xs">→</span>
                        <input
                          type="time"
                          value={plage.fin}
                          onChange={e => updatePlage(j.num, plage.id, 'fin', e.target.value)}
                          className={inp}
                        />
                        {plage.debut && plage.fin && diffH(plage.debut, plage.fin) > 0 && (
                          <span className="text-[10px] text-[var(--dust)] min-w-[28px]">
                            {diffH(plage.debut, plage.fin).toFixed(1)}h
                          </span>
                        )}

                        {/* Sélection enfants */}
                        {enfants.length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-1">
                            {enfants.map(e => {
                              const selected = plage.enfantIds.includes(e.prenom);
                              return (
                                <button
                                  key={e.prenom}
                                  onClick={() => toggleEnfantPlage(j.num, plage.id, e.prenom)}
                                  className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${
                                    selected
                                      ? e.fam === 'A'
                                        ? 'bg-[var(--blue-light)] border-[var(--blue)] text-[var(--blue)]'
                                        : 'bg-[var(--sage-light)] border-[var(--sage)] text-[var(--sage)]'
                                      : 'bg-white border-[var(--line)] text-[var(--dust)]'
                                  }`}
                                >
                                  {e.prenom}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {p.plages.length > 1 && (
                          <button
                            onClick={() => removePlage(j.num, plage.id)}
                            className="ml-auto text-[var(--dust)] hover:text-[var(--red)] text-base leading-none"
                          >×</button>
                        )}
                      </div>
                    ))}

                    <button
                      onClick={() => addPlage(j.num)}
                      className="text-[11px] text-[var(--sage)] hover:underline ml-1"
                    >
                      + Ajouter une plage horaire
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Résumé */}
      {joursActifs.length > 0 && hTotal > 0 && (
        <div className="bg-[var(--sage-light)] border border-[var(--sage-mid)] rounded-[var(--radius)] px-5 py-4 text-sm space-y-1.5">
          <div className="font-medium text-[var(--sage)] mb-2">Résumé hebdomadaire (vue nounou)</div>
          <div className="flex justify-between">
            <span className="text-[var(--dust)]">Jours travaillés</span>
            <span className="font-medium">{joursActifs.length} j / semaine</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--dust)]">Heures normales (≤ 40h)</span>
            <span className="font-medium">{hNormalesSemaine} h</span>
          </div>
          {hSup25Semaine > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>Heures sup +25% (40–48h)</span>
              <span className="font-medium">{hSup25Semaine} h</span>
            </div>
          )}
          {hSup50Semaine > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Heures sup +50% (&gt;48h)</span>
              <span className="font-medium">{hSup50Semaine} h</span>
            </div>
          )}
          {hSup50Semaine > 0 && hTotal >= 50 && (
            <p className="text-[10px] text-red-600 font-medium">⚠ Plafond légal de 50h atteint</p>
          )}
          <div className="flex justify-between pt-1.5 border-t border-[var(--sage-mid)] font-medium">
            <span>Volume mensuel (mensualisation)</span>
            <span>{hMensuel} h / mois</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-[var(--red)] bg-[var(--red-light)] rounded-lg px-4 py-2">{error}</p>}

      <div className="flex justify-between pt-2">
        <button onClick={() => router.back()} className={btnSec}>← Retour</button>
        <button onClick={suivant} className={btnPri}>Suivant : La paie →</button>
      </div>
    </div>
  );
}

const inp    = 'px-2 py-1.5 border-[1.5px] border-[var(--line)] rounded-lg text-sm outline-none focus:border-[var(--sage)] bg-white w-[108px]';
const btnPri = 'px-6 py-2.5 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors';
const btnSec = 'px-6 py-2.5 border-[1.5px] border-[var(--line)] text-[var(--ink)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] transition-colors bg-white';
