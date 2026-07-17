'use client';

import { useState } from 'react';
import {
  JOURS, defaultSlots, diffH, planningSummary,
  type Planning, type Enfant,
} from './planningLogic';

export {
  JOURS, defaultSlots, buildPlanning, planningSummary, validatePlanning,
  type Slot, type PerDay, type Planning, type Enfant,
} from './planningLogic';

// ── Composant éditeur (cartes par enfant) ───────────────────────────
export function PlanningForm({ enfants, planning, onChange }: {
  enfants: Enfant[];
  planning: Planning;
  onChange: (p: Planning) => void;
}) {
  const [copier, setCopier] = useState<{ child: string; jour: string } | null>(null);

  function toggleSlot(child: string, jour: string) {
    onChange({
      ...planning,
      [child]: { ...planning[child], [jour]: { ...planning[child][jour], actif: !planning[child][jour].actif } },
    });
  }

  function updateSlot(child: string, jour: string, field: 'debut' | 'fin', val: string) {
    onChange({
      ...planning,
      [child]: { ...planning[child], [jour]: { ...planning[child][jour], [field]: val } },
    });
  }

  function copierVers(child: string, source: string, cibles: string[]) {
    const src = planning[child][source];
    const updated = { ...planning[child] };
    for (const c of cibles) updated[c] = { ...src };
    onChange({ ...planning, [child]: updated });
    setCopier(null);
  }

  return (
    <div className="space-y-3">
      {enfants.map(enfant => {
        const days = planning[enfant.prenom] ?? defaultSlots();
        return (
          <div key={enfant.prenom} className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
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
                          className="text-xs px-2.5 py-1 bg-[var(--sage)] text-white rounded-lg hover:bg-[var(--sage-dark)] transition-colors font-medium"
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
    </div>
  );
}

// ── Résumé hebdomadaire (vue nounou) ─────────────────────────────────
export function PlanningSummaryCard({ planning }: { planning: Planning }) {
  const { hNormalesSemaine, hSup25Semaine, hSup50Semaine, joursActifsParSemaine, hTotal, hMensuel, hasAnyActive } =
    planningSummary(planning);

  if (!hasAnyActive || hTotal <= 0) return null;

  return (
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
  );
}

const inp = 'px-2 py-1.5 border-[1.5px] border-[var(--line)] rounded-lg text-sm outline-none focus:border-[var(--sage)] bg-white w-[108px]';
