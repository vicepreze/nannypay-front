'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CongesConfig } from '@/app/api/gardes/[id]/conges/route';

const MOIS_COURTS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export function CongesCard({ gardeId, annee, mois, cpThisMonth, refreshKey }: {
  gardeId: string;
  annee: number;
  mois: number;
  cpThisMonth: number;
  refreshKey: number;
}) {
  const now  = new Date();
  const nowY = now.getFullYear(), nowM = now.getMonth() + 1;

  type Summary = { joursCumules: number; joursConsoHisto: number };

  const [config,       setConfig]       = useState<CongesConfig | null>(null);
  const [summary,      setSummary]      = useState<Summary | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving,       setSaving]       = useState(false);

  const [regle,        setRegle]        = useState<'semaines' | 'jours_par_mois'>('semaines');
  const [nbSemaines,   setNbSemaines]   = useState(5);
  const [cycleDebut,   setCycleDebut]   = useState(`${nowY}-09-01`);
  const [joursParMois, setJoursParMois] = useState(2.5);
  const [debutSuivi,   setDebutSuivi]   = useState(`${nowY}-01-01`);
  const [depAnnee,     setDepAnnee]     = useState(nowY);
  const [depMois,      setDepMois]      = useState(nowM);
  const [depJousConso, setDepJousConso] = useState(0);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/gardes/${gardeId}/conges?annee=${annee}&mois=${mois}`)
      .then(r => r.json())
      .then(d => {
        setConfig(d.config);
        setSummary(d.summary);
        if (d.config) populateForm(d.config);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gardeId, annee, mois, refreshKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function populateForm(c: CongesConfig) {
    setRegle(c.regle);
    setNbSemaines(c.nbSemaines ?? 5);
    setCycleDebut(c.cycleDebut ?? `${nowY}-09-01`);
    setJoursParMois(c.joursParMois ?? 2.5);
    setDebutSuivi(c.debutSuivi ?? `${nowY}-01-01`);
    setDepAnnee(c.decompteDepart?.annee ?? nowY);
    setDepMois(c.decompteDepart?.mois ?? nowM);
    setDepJousConso(c.decompteDepart?.jousConso ?? 0);
  }

  async function sauvegarder() {
    setSaving(true);
    const newConfig: CongesConfig = {
      regle, nbSemaines, cycleDebut, joursParMois, debutSuivi,
      decompteDepart: { annee: depAnnee, mois: depMois, jousConso: depJousConso },
    };
    const res = await fetch(`/api/gardes/${gardeId}/conges`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: newConfig }),
    });
    if (res.ok) {
      const d = await fetch(`/api/gardes/${gardeId}/conges?annee=${annee}&mois=${mois}`).then(r => r.json());
      setConfig(d.config); setSummary(d.summary);
      setSettingsOpen(false);
    }
    setSaving(false);
  }

  const inp = 'w-full px-2.5 py-1.5 border-[1.5px] border-[var(--line)] rounded-lg text-xs outline-none focus:border-[var(--sage)] bg-white';
  const total     = summary?.joursCumules   ?? 0;
  const conso     = Math.round(((summary?.joursConsoHisto ?? 0) + cpThisMonth) * 10) / 10;
  const reste     = Math.max(0, Math.round((total - conso) * 10) / 10);
  const consoPct  = total > 0 ? Math.min(100, (conso / total) * 100) : 0;
  const restePct  = total > 0 ? Math.min(100 - consoPct, (reste / total) * 100) : 0;
  const moisLabel = MOIS_COURTS[mois - 1];

  return (
    <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--line)] bg-[var(--paper)] flex items-center justify-between">
        <span className="text-[10px] font-medium text-[var(--dust)] uppercase tracking-wide">🏖 Congés payés</span>
        <button
          onClick={() => { if (!settingsOpen && !config) { setSettingsOpen(true); } else setSettingsOpen(s => !s); }}
          className="text-[var(--dust)] hover:text-[var(--ink)] transition-colors text-sm leading-none"
          title="Paramètres"
        >⚙</button>
      </div>

      {loading ? (
        <div className="px-4 py-3 text-xs text-[var(--dust)]">Chargement…</div>
      ) : settingsOpen || !config ? (
        <div className="p-4 space-y-4">
          <div>
            <div className="text-[10px] font-semibold text-[var(--dust)] uppercase tracking-wide mb-2">Règle d&apos;acquisition</div>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="regle" value="semaines" checked={regle === 'semaines'}
                  onChange={() => setRegle('semaines')} className="mt-0.5 accent-[var(--sage)]" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-[var(--ink)]">Semaines par an</div>
                  {regle === 'semaines' && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="number" min={1} max={10} step={0.5} value={nbSemaines}
                          onChange={e => setNbSemaines(parseFloat(e.target.value) || 5)}
                          className={inp + ' w-16'} />
                        <span className="text-xs text-[var(--dust)]">{(nbSemaines * 5).toFixed(0)} j ouvrés/an</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--dust)] block mb-1">Début du cycle CP</label>
                        <input type="date" value={cycleDebut} onChange={e => setCycleDebut(e.target.value)} className={inp} />
                      </div>
                    </div>
                  )}
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="regle" value="jours_par_mois" checked={regle === 'jours_par_mois'}
                  onChange={() => setRegle('jours_par_mois')} className="mt-0.5 accent-[var(--sage)]" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-[var(--ink)]">Jours par mois travaillé</div>
                  {regle === 'jours_par_mois' && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="number" min={0.5} max={5} step={0.5} value={joursParMois}
                          onChange={e => setJoursParMois(parseFloat(e.target.value) || 2.5)}
                          className={inp + ' w-16'} />
                        <span className="text-xs text-[var(--dust)]">j/mois</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--dust)] block mb-1">Début du suivi</label>
                        <input type="date" value={debutSuivi} onChange={e => setDebutSuivi(e.target.value)} className={inp} />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold text-[var(--dust)] uppercase tracking-wide mb-1">Décompte de départ</div>
            <p className="text-[10px] text-[var(--dust)] mb-2">Jours déjà consommés à fin du mois de référence.</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[var(--dust)] block mb-1">Mois de référence</label>
                <select value={`${depAnnee}-${depMois}`}
                  onChange={e => { const [y,m] = e.target.value.split('-').map(Number); setDepAnnee(y); setDepMois(m); }}
                  className={inp}>
                  {Array.from({ length: 24 }, (_, i) => {
                    const d = new Date(nowY, nowM - 1 - i, 1);
                    const y = d.getFullYear(), m = d.getMonth() + 1;
                    return <option key={i} value={`${y}-${m}`}>{MOIS_COURTS[m-1]} {y}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[var(--dust)] block mb-1">Jours consommés</label>
                <input type="number" min={0} max={100} step={0.5} value={depJousConso}
                  onChange={e => setDepJousConso(parseFloat(e.target.value) || 0)} className={inp} />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={sauvegarder} disabled={saving}
              className="flex-1 py-2 bg-[var(--sage)] text-white rounded-lg text-xs font-medium hover:bg-[#3a5431] transition-colors disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {config && (
              <button onClick={() => { populateForm(config); setSettingsOpen(false); }}
                className="px-3 py-2 border border-[var(--line)] rounded-lg text-xs text-[var(--dust)] hover:border-[var(--ink)] transition-colors">
                Annuler
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 py-3">
          <div className="flex justify-between items-baseline mb-2">
            <div className="text-xs">
              <span className="font-semibold text-orange-500">{conso} j</span>
              <span className="text-[var(--dust)] ml-1">pris</span>
            </div>
            <div className="text-[10px] text-[var(--dust)]">{total} j acquis fin {moisLabel}</div>
            <div className="text-xs">
              <span className="font-semibold text-[var(--sage)]">{reste} j</span>
              <span className="text-[var(--dust)] ml-1">restants</span>
            </div>
          </div>
          <div className="h-3 rounded-full bg-[var(--paper)] border border-[var(--line)] overflow-hidden flex">
            <div className="h-full bg-orange-400 transition-all duration-300" style={{ width: `${consoPct}%` }} />
            <div className="h-full bg-[var(--sage)] transition-all duration-300" style={{ width: `${restePct}%` }} />
          </div>
          <div className="mt-2 text-[10px] text-[var(--dust)]">
            {config.regle === 'semaines'
              ? `${config.nbSemaines} sem./an · cycle depuis ${config.cycleDebut?.slice(0,7)}`
              : `${config.joursParMois} j/mois · depuis ${config.debutSuivi?.slice(0,7)}`}
          </div>
        </div>
      )}
    </div>
  );
}
