'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CompteCP, CompteRepos, SoldeCompte } from '@/lib/calcul';

const MOIS_COURTS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const MOIS_LONGS  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

type CongesResp = {
  config: { cp: CompteCP | null; repos: CompteRepos | null } | null;
  cp:     SoldeCompte | null;
  repos:  SoldeCompte | null;
};

export function CongesCard({ gardeId, annee, mois, refreshKey }: {
  gardeId: string;
  annee: number;
  mois: number;
  refreshKey: number;
}) {
  const now  = new Date();
  const nowY = now.getFullYear(), nowM = now.getMonth() + 1;

  // 13 options : mois courant → +12
  const monthOptions = Array.from({ length: 13 }, (_, i) => {
    const d = new Date(nowY, nowM - 1 + i, 1);
    return { annee: d.getFullYear(), mois: d.getMonth() + 1 };
  });
  const initialOffset = Math.max(0, monthOptions.findIndex(o => o.annee === annee && o.mois === mois));

  const [targetOffset, setTargetOffset] = useState(initialOffset);
  const [data,         setData]         = useState<CongesResp | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving,       setSaving]       = useState(false);

  const [cpRegle,        setCpRegle]        = useState<'semaines' | 'jours_par_mois'>('semaines');
  const [cpNbSemaines,   setCpNbSemaines]   = useState(5);
  const [cpCycleDebut,   setCpCycleDebut]   = useState(`${nowY}-09-01`);
  const [cpJoursParMois, setCpJoursParMois] = useState(2.5);
  const [cpDebutSuivi,   setCpDebutSuivi]   = useState(`${nowY}-01-01`);
  const [cpDepAnnee,     setCpDepAnnee]     = useState(nowY);
  const [cpDepMois,      setCpDepMois]      = useState(nowM);
  const [cpDepJours,     setCpDepJours]     = useState(0);

  const [reposTotal,     setReposTotal]     = useState(6);
  const [reposCycleDebut, setReposCycleDebut] = useState(`${nowY}-09-01`);
  const [reposDepAnnee,  setReposDepAnnee]  = useState(nowY);
  const [reposDepMois,   setReposDepMois]   = useState(nowM);
  const [reposDepJours,  setReposDepJours]  = useState(0);

  const target = monthOptions[targetOffset];

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/gardes/${gardeId}/conges?targetAnnee=${target.annee}&targetMois=${target.mois}`)
      .then(r => r.json())
      .then((d: CongesResp) => {
        setData(d);
        if (d.config) populateForm(d.config);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gardeId, target.annee, target.mois, refreshKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function populateForm(c: { cp: CompteCP | null; repos: CompteRepos | null }) {
    if (c.cp) {
      setCpRegle(c.cp.regle);
      setCpNbSemaines(c.cp.nbSemaines ?? 5);
      setCpCycleDebut(c.cp.cycleDebut ?? `${nowY}-09-01`);
      setCpJoursParMois(c.cp.joursParMois ?? 2.5);
      setCpDebutSuivi(c.cp.debutSuivi ?? `${nowY}-01-01`);
      setCpDepAnnee(c.cp.decompteDepart?.annee ?? nowY);
      setCpDepMois(c.cp.decompteDepart?.mois ?? nowM);
      setCpDepJours(c.cp.decompteDepart?.jousConso ?? 0);
    }
    if (c.repos) {
      setReposTotal(c.repos.totalAnnuel ?? 6);
      setReposCycleDebut(c.repos.cycleDebut ?? `${nowY}-09-01`);
      setReposDepAnnee(c.repos.decompteDepart?.annee ?? nowY);
      setReposDepMois(c.repos.decompteDepart?.mois ?? nowM);
      setReposDepJours(c.repos.decompteDepart?.jousConso ?? 0);
    }
  }

  async function sauvegarder() {
    setSaving(true);
    const config = {
      cp: {
        regle: cpRegle, nbSemaines: cpNbSemaines, cycleDebut: cpCycleDebut,
        joursParMois: cpJoursParMois, debutSuivi: cpDebutSuivi,
        decompteDepart: { annee: cpDepAnnee, mois: cpDepMois, jousConso: cpDepJours },
      },
      repos: {
        totalAnnuel: reposTotal, cycleDebut: reposCycleDebut,
        decompteDepart: { annee: reposDepAnnee, mois: reposDepMois, jousConso: reposDepJours },
      },
    };
    const res = await fetch(`/api/gardes/${gardeId}/conges`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    if (res.ok) {
      await fetchData();
      setSettingsOpen(false);
    }
    setSaving(false);
  }

  const inp = 'w-full px-2.5 py-1.5 border-[1.5px] border-[var(--line)] rounded-lg text-xs outline-none focus:border-[var(--sage)] bg-white';
  const configured = !!(data?.config?.cp || data?.config?.repos);
  const totalDispo = Math.round(((data?.cp?.soldeActuel ?? 0) + (data?.repos?.soldeActuel ?? 0)) * 10) / 10;

  return (
    <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--line)] bg-[var(--paper)] flex items-center justify-between">
        <span className="text-[10px] font-medium text-[var(--dust)] uppercase tracking-wide">🏖 Congés &amp; repos</span>
        <button
          onClick={() => { if (!settingsOpen && !configured) { setSettingsOpen(true); } else setSettingsOpen(s => !s); }}
          className="text-[var(--dust)] hover:text-[var(--ink)] transition-colors text-sm leading-none"
          title="Paramètres"
        >⚙</button>
      </div>

      {loading ? (
        <div className="px-4 py-3 text-xs text-[var(--dust)]">Chargement…</div>
      ) : settingsOpen || !configured ? (
        <div className="p-4 space-y-5">
          <div>
            <div className="text-[10px] font-semibold text-[var(--dust)] uppercase tracking-wide mb-2">🏖 Congés payés — règle d&apos;acquisition</div>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="cpRegle" value="semaines" checked={cpRegle === 'semaines'}
                  onChange={() => setCpRegle('semaines')} className="mt-0.5 accent-[var(--sage)]" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-[var(--ink)]">Semaines par an</div>
                  {cpRegle === 'semaines' && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="number" min={1} max={10} step={0.5} value={cpNbSemaines}
                          onChange={e => setCpNbSemaines(parseFloat(e.target.value) || 5)}
                          className={inp + ' w-16'} />
                        <span className="text-xs text-[var(--dust)]">{(cpNbSemaines * 5).toFixed(0)} j ouvrés/an</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--dust)] block mb-1">Début du cycle CP</label>
                        <input type="date" value={cpCycleDebut} onChange={e => setCpCycleDebut(e.target.value)} className={inp} />
                      </div>
                    </div>
                  )}
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="cpRegle" value="jours_par_mois" checked={cpRegle === 'jours_par_mois'}
                  onChange={() => setCpRegle('jours_par_mois')} className="mt-0.5 accent-[var(--sage)]" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-[var(--ink)]">Jours par mois travaillé</div>
                  {cpRegle === 'jours_par_mois' && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="number" min={0.5} max={5} step={0.5} value={cpJoursParMois}
                          onChange={e => setCpJoursParMois(parseFloat(e.target.value) || 2.5)}
                          className={inp + ' w-16'} />
                        <span className="text-xs text-[var(--dust)]">j/mois</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--dust)] block mb-1">Début du suivi</label>
                        <input type="date" value={cpDebutSuivi} onChange={e => setCpDebutSuivi(e.target.value)} className={inp} />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
            <DecompteDepart
              depAnnee={cpDepAnnee} depMois={cpDepMois} depJours={cpDepJours}
              setDepAnnee={setCpDepAnnee} setDepMois={setCpDepMois} setDepJours={setCpDepJours}
              nowY={nowY} nowM={nowM} inp={inp}
            />
          </div>

          <div className="pt-1 border-t border-[var(--line)]">
            <div className="text-[10px] font-semibold text-[var(--dust)] uppercase tracking-wide mt-3 mb-2">😌 Jours de repos</div>
            <p className="text-[10px] text-[var(--dust)] mb-2">Jours négociés (RTT, récup…), remis à zéro chaque année au renouvellement du cycle.</p>
            <div className="flex items-center gap-2 mb-2">
              <input type="number" min={0} max={30} step={0.5} value={reposTotal}
                onChange={e => setReposTotal(parseFloat(e.target.value) || 0)} className={inp + ' w-16'} />
              <span className="text-xs text-[var(--dust)]">jours/an</span>
            </div>
            <div>
              <label className="text-[10px] text-[var(--dust)] block mb-1">Date de renouvellement annuel</label>
              <input type="date" value={reposCycleDebut} onChange={e => setReposCycleDebut(e.target.value)} className={inp} />
            </div>
            <DecompteDepart
              depAnnee={reposDepAnnee} depMois={reposDepMois} depJours={reposDepJours}
              setDepAnnee={setReposDepAnnee} setDepMois={setReposDepMois} setDepJours={setReposDepJours}
              nowY={nowY} nowM={nowM} inp={inp}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={sauvegarder} disabled={saving}
              className="flex-1 py-2 bg-[var(--sage)] text-white rounded-lg text-xs font-medium hover:bg-[#3a5431] transition-colors disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {configured && (
              <button onClick={() => { if (data?.config) populateForm(data.config); setSettingsOpen(false); }}
                className="px-3 py-2 border border-[var(--line)] rounded-lg text-xs text-[var(--dust)] hover:border-[var(--ink)] transition-colors">
                Annuler
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-xs">
              <span className="font-semibold text-[var(--sage)]">{totalDispo} j</span>
              <span className="text-[var(--dust)] ml-1">disponibles aujourd&apos;hui</span>
            </div>
            <select
              value={targetOffset}
              onChange={e => setTargetOffset(parseInt(e.target.value))}
              className="text-[11px] border-[1.5px] border-[var(--line)] rounded-lg px-2 py-1 outline-none focus:border-[var(--sage)] bg-white"
            >
              {monthOptions.map((o, i) => (
                <option key={i} value={i}>{i === 0 ? 'Ce mois-ci' : `Fin ${MOIS_LONGS[o.mois - 1]} ${o.annee}`}</option>
              ))}
            </select>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[9px] text-[var(--dust)] uppercase tracking-wide">
                <th className="text-left font-medium pb-1.5">Compte</th>
                <th className="text-right font-medium pb-1.5">Actuel</th>
                <th className="text-right font-medium pb-1.5">Posés</th>
                <th className="text-right font-medium pb-1.5">À acquérir</th>
                <th className="text-right font-medium pb-1.5">Estimé</th>
              </tr>
            </thead>
            <tbody>
              {data?.cp    && <CompteRow label="🏖 Congés payés" solde={data.cp} />}
              {data?.repos && <CompteRow label="😌 Jours de repos" solde={data.repos} />}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CompteRow({ label, solde }: { label: string; solde: SoldeCompte }) {
  return (
    <tr className="border-t border-[var(--line)]">
      <td className="py-1.5 text-[var(--ink)] whitespace-nowrap">{label}</td>
      <td className="text-right font-mono font-medium">{solde.soldeActuel}</td>
      <td className="text-right font-mono text-[var(--dust)]">{solde.joursPoses}</td>
      <td className="text-right font-mono text-[var(--dust)]">{solde.aAcquerir}</td>
      <td className="text-right font-mono font-semibold text-[var(--sage)]">{solde.soldeEstime}</td>
    </tr>
  );
}

function DecompteDepart({ depAnnee, depMois, depJours, setDepAnnee, setDepMois, setDepJours, nowY, nowM, inp }: {
  depAnnee: number; depMois: number; depJours: number;
  setDepAnnee: (v: number) => void; setDepMois: (v: number) => void; setDepJours: (v: number) => void;
  nowY: number; nowM: number; inp: string;
}) {
  return (
    <div className="mt-3">
      <div className="text-[10px] font-semibold text-[var(--dust)] uppercase tracking-wide mb-1">Décompte de départ</div>
      <p className="text-[10px] text-[var(--dust)] mb-2">Jours déjà consommés à fin du mois de référence.</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[var(--dust)] block mb-1">Mois de référence</label>
          <select value={`${depAnnee}-${depMois}`}
            onChange={e => { const [y, m] = e.target.value.split('-').map(Number); setDepAnnee(y); setDepMois(m); }}
            className={inp}>
            {Array.from({ length: 24 }, (_, i) => {
              const d = new Date(nowY, nowM - 1 - i, 1);
              const y = d.getFullYear(), m = d.getMonth() + 1;
              return <option key={i} value={`${y}-${m}`}>{MOIS_COURTS[m - 1]} {y}</option>;
            })}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--dust)] block mb-1">Jours consommés</label>
          <input type="number" min={0} max={100} step={0.5} value={depJours}
            onChange={e => setDepJours(parseFloat(e.target.value) || 0)} className={inp} />
        </div>
      </div>
    </div>
  );
}
