'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { calcHeuresSemaineFromPlanning } from '@/lib/calcul';

const JOURS = [
  { num: 1, label: 'Lundi',    court: 'Lun' },
  { num: 2, label: 'Mardi',    court: 'Mar' },
  { num: 3, label: 'Mercredi', court: 'Mer' },
  { num: 4, label: 'Jeudi',    court: 'Jeu' },
  { num: 5, label: 'Vendredi', court: 'Ven' },
];

type Slot    = { actif: boolean; debut: string; fin: string };
type PerDay  = Record<string, Slot>;          // key: "1"–"5"
type Planning = Record<string, PerDay>;       // key: childName
type Enfant  = { prenom: string; fam: 'A' | 'B' };

const STORAGE_KEY = 'ng_planning';

function hhmm(t: string) {
  const [h, m] = (t || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function diffH(debut: string, fin: string) {
  const d = hhmm(fin) - hhmm(debut);
  return d > 0 ? d / 60 : 0;
}
function defaultSlots(): PerDay {
  return Object.fromEntries(
    JOURS.map(j => [String(j.num), { actif: j.num !== 3, debut: '08:30', fin: '18:30' }])
  );
}
function buildPlanning(enfants: Enfant[], saved: Planning | null): Planning {
  const result: Planning = {};
  for (const e of enfants) {
    result[e.prenom] = saved?.[e.prenom] ?? defaultSlots();
  }
  return result;
}

export default function PlanningPage() {
  const router = useRouter();
  const [planning, setPlanning] = useState<Planning>({});
  const [enfants,  setEnfants]  = useState<Enfant[]>([]);
  const [error,    setError]    = useState('');
  const [copier,   setCopier]   = useState<{ child: string; jour: string } | null>(null);

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

  // ── Mutations ────────────────────────────────────────────────────

  function toggleSlot(child: string, jour: string) {
    setPlanning(prev => ({
      ...prev,
      [child]: { ...prev[child], [jour]: { ...prev[child][jour], actif: !prev[child][jour].actif } },
    }));
  }

  function updateSlot(child: string, jour: string, field: 'debut' | 'fin', val: string) {
    setPlanning(prev => ({
      ...prev,
      [child]: { ...prev[child], [jour]: { ...prev[child][jour], [field]: val } },
    }));
  }

  function copierVers(child: string, source: string, cibles: string[]) {
    setPlanning(prev => {
      const src = prev[child][source];
      const updated = { ...prev[child] };
      for (const c of cibles) updated[c] = { ...src };
      return { ...prev, [child]: updated };
    });
    setCopier(null);
  }

  // ── Calcul résumé (union de tous les enfants) ────────────────────

  const planningJson = JSON.stringify(planning);
  const { hNormalesSemaine, hSup25Semaine, hSup50Semaine, joursActifsParSemaine } =
    calcHeuresSemaineFromPlanning(planningJson);
  const hTotal   = Math.round((hNormalesSemaine + hSup25Semaine + hSup50Semaine) * 10) / 10;
  const hMensuel = Math.round(hTotal * 52 / 12 * 10) / 10;

  const hasAnyActive = Object.values(planning).some(days =>
    Object.values(days).some(s => s.actif)
  );

  // ── Soumission ───────────────────────────────────────────────────

  function suivant() {
    setError('');
    if (!hasAnyActive) { setError('Activez au moins un jour pour un enfant.'); return; }
    for (const [child, days] of Object.entries(planning)) {
      for (const [jour, slot] of Object.entries(days)) {
        if (slot.actif) {
          if (!slot.debut || !slot.fin || hhmm(slot.fin) <= hhmm(slot.debut)) {
            const j = JOURS.find(x => String(x.num) === jour);
            setError(`Horaires invalides pour ${child} – ${j?.label ?? jour}.`);
            return;
          }
        }
      }
    }
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

      {/* Planning par enfant */}
      {enfants.map(enfant => {
        const days = planning[enfant.prenom] ?? defaultSlots();
        return (
          <div key={enfant.prenom} className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
            {/* En-tête enfant */}
            <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] flex items-center gap-2.5">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                enfant.fam === 'A'
                  ? 'bg-[var(--blue-light)] text-[var(--blue)]'
                  : 'bg-[var(--sage-light)] text-[var(--sage)]'
              }`}>
                {enfant.prenom}
              </span>
              <span className="text-xs text-[var(--dust)]">Famille {enfant.fam}</span>
            </div>

            <div className="divide-y divide-[var(--line)]">
              {JOURS.map(j => {
                const slot  = days[String(j.num)] ?? { actif: false, debut: '08:30', fin: '18:30' };
                const isCopy = copier?.child === enfant.prenom && copier?.jour === String(j.num);
                return (
                  <div key={j.num}>
                    <div className={`flex items-center gap-3 px-5 py-3 ${!slot.actif ? 'opacity-50' : ''}`}>
                      {/* Checkbox + label */}
                      <label className="flex items-center gap-2 cursor-pointer w-[88px] shrink-0">
                        <input
                          type="checkbox"
                          checked={slot.actif}
                          onChange={() => toggleSlot(enfant.prenom, String(j.num))}
                          className="w-4 h-4 accent-[var(--sage)] cursor-pointer"
                        />
                        <span className={`text-sm font-medium ${slot.actif ? 'text-[var(--ink)]' : 'text-[var(--dust)]'}`}>
                          {j.label}
                        </span>
                      </label>

                      {/* Horaires */}
                      {slot.actif && (
                        <>
                          <input
                            type="time"
                            value={slot.debut}
                            onChange={e => updateSlot(enfant.prenom, String(j.num), 'debut', e.target.value)}
                            className={inp}
                          />
                          <span className="text-[var(--dust)] text-xs">→</span>
                          <input
                            type="time"
                            value={slot.fin}
                            onChange={e => updateSlot(enfant.prenom, String(j.num), 'fin', e.target.value)}
                            className={inp}
                          />
                          {slot.debut && slot.fin && diffH(slot.debut, slot.fin) > 0 && (
                            <span className="text-[10px] text-[var(--dust)] min-w-[28px]">
                              {diffH(slot.debut, slot.fin).toFixed(1)}h
                            </span>
                          )}
                          <button
                            onClick={() => setCopier(isCopy ? null : { child: enfant.prenom, jour: String(j.num) })}
                            className="ml-auto text-[10px] text-[var(--dust)] hover:text-[var(--sage)] border border-[var(--line)] rounded px-2 py-0.5 transition-colors shrink-0"
                          >
                            Copier →
                          </button>
                        </>
                      )}
                    </div>

                    {/* Propagation inline */}
                    {isCopy && (
                      <div className="mx-5 mb-3 flex flex-wrap gap-1.5 p-2.5 bg-[var(--sage-light)] rounded-lg">
                        <span className="text-[10px] text-[var(--sage)] font-medium w-full mb-1">
                          Copier {j.label} vers :
                        </span>
                        {JOURS.filter(x => x.num !== j.num).map(x => (
                          <button
                            key={x.num}
                            onClick={() => copierVers(enfant.prenom, String(j.num), [String(x.num)])}
                            className="text-xs px-2.5 py-1 bg-white border border-[var(--sage)] text-[var(--sage)] rounded-lg hover:bg-[var(--sage)] hover:text-white transition-colors font-medium"
                          >
                            {x.court}
                          </button>
                        ))}
                        <button
                          onClick={() => copierVers(enfant.prenom, String(j.num), JOURS.filter(x => x.num !== j.num).map(x => String(x.num)))}
                          className="text-xs px-2.5 py-1 bg-[var(--sage)] text-white rounded-lg hover:bg-[#3a5431] transition-colors font-medium"
                        >
                          Tous
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Résumé (heures nounounou = union) */}
      {hasAnyActive && hTotal > 0 && (
        <div className="bg-[var(--sage-light)] border border-[var(--sage-mid)] rounded-[var(--radius)] px-5 py-4 text-sm space-y-1.5">
          <div className="font-medium text-[var(--sage)] mb-2">Résumé hebdomadaire (vue nounou)</div>
          <div className="flex justify-between">
            <span className="text-[var(--dust)]">Jours de présence</span>
            <span className="font-medium">{joursActifsParSemaine} j / semaine</span>
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
          {hTotal >= 50 && (
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
