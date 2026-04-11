'use client';

import { useState, useEffect, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// ── CONSTANTES ────────────────────────────────────────────────────
const H_NORM_SEM   = 40;
const H_SUP25_SEM  = 8;
const H_NORM_MENS  = Math.round(H_NORM_SEM  * 52 / 12 * 10) / 10;
const H_SUP25_MENS = Math.round(H_SUP25_SEM * 52 / 12 * 10) / 10;
const TRANSPORT    = 90.80;

const SCENARIOS = {
  2: {
    enfants: [{ prenom: 'Emma', fam: 'A' }, { prenom: 'Lucas', fam: 'B' }],
    qp: { A: 0.5, B: 0.5 },
  },
  3: {
    enfants: [{ prenom: 'Emma', fam: 'A' }, { prenom: 'Chloé', fam: 'A' }, { prenom: 'Lucas', fam: 'B' }],
    qp: { A: 2 / 3, B: 1 / 3 },
  },
} as const;

const MOIS_LONGS  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MOIS_COURTS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

type NbEnfants = 2 | 3;
type Evt = { type: 'conge_paye' | 'maladie_nounou'; debut: string; fin: string };

function joursOuvrablesMois(a: number, m: number) {
  let nb = 0;
  const cur = new Date(a, m - 1, 1);
  const fin = new Date(a, m, 0);
  while (cur <= fin) { if (cur.getDay() >= 1 && cur.getDay() <= 5) nb++; cur.setDate(cur.getDate() + 1); }
  return nb;
}
function joursOuvrablesIntersect(debut: string, fin: string, a: number, m: number) {
  const [y1, mo1, d1] = debut.split('-').map(Number);
  const [y2, mo2, d2] = fin.split('-').map(Number);
  const dD = new Date(y1, mo1 - 1, d1), dF = new Date(y2, mo2 - 1, d2);
  const dMD = new Date(a, m - 1, 1), dMF = new Date(a, m, 0);
  const start = dD > dMD ? dD : dMD;
  const end   = dF < dMF ? dF : dMF;
  let nb = 0;
  const cur = new Date(start);
  while (cur <= end) { if (cur.getDay() >= 1 && cur.getDay() <= 5) nb++; cur.setDate(cur.getDate() + 1); }
  return nb;
}
function dateToStr(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function LandingPage() {
  const router = useRouter();
  const now = new Date();

  // Demo state
  const [nbEnfants, setNbEnfants] = useState<NbEnfants>(2);
  const [taux,      setTaux]      = useState(11);
  const [evts,      setEvts]      = useState<Evt[]>([]);
  const [annee] = useState(now.getFullYear());
  const [mois]  = useState(now.getMonth() + 1);

  // Résultats calculés
  const [results, setResults] = useState({ totalNounou: 0, a: { hNorm: 0, hSup: 0, salNet: 0, total: 0 }, b: { hNorm: 0, hSup: 0, salNet: 0, total: 0 } });

  // Modal event
  const [modalOpen, setModalOpen] = useState(false);
  const [evtType,   setEvtType]   = useState<Evt['type'] | null>(null);
  const [evtDebut,  setEvtDebut]  = useState('');
  const [evtFin,    setEvtFin]    = useState('');

  // Auth modal
  const [authOpen,    setAuthOpen]    = useState(false);
  const [authTab,     setAuthTab]     = useState<'login' | 'register'>('login');
  const [authEmail,   setAuthEmail]   = useState('');
  const [authPwd,     setAuthPwd]     = useState('');
  const [authPrenom,  setAuthPrenom]  = useState('');
  const [authNom,     setAuthNom]     = useState('');
  const [authError,   setAuthError]   = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Load/save state
  useEffect(() => {
    const saved = localStorage.getItem('demo_v2');
    if (saved) {
      const d = JSON.parse(saved);
      setNbEnfants(d.nbEnfants ?? 2);
      setTaux(d.taux ?? 11);
      setEvts(d.evts ?? []);
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('demo_v2', JSON.stringify({ nbEnfants, taux, evts }));
  }, [nbEnfants, taux, evts]);

  // Recalcul
  useEffect(() => {
    const scenario = SCENARIOS[nbEnfants];
    const joursOuv = joursOuvrablesMois(annee, mois);
    const joursAbs = evts.reduce((acc, e) => acc + joursOuvrablesIntersect(e.debut, e.fin, annee, mois), 0);
    const ratio = joursOuv > 0 ? Math.max(0, joursOuv - joursAbs) / joursOuv : 1;

    const calc = (fam: 'A' | 'B') => {
      const qp = scenario.qp[fam];
      const hNorm  = Math.round(H_NORM_MENS  * qp * ratio);
      const hSup25 = Math.round(H_SUP25_MENS * qp * ratio);
      const salNet = Math.round((H_NORM_MENS * qp * taux * ratio + H_SUP25_MENS * qp * taux * 1.25 * ratio) * 100) / 100;
      const total  = Math.round((salNet + TRANSPORT / 2) * 100) / 100;
      return { hNorm, hSup: hSup25, salNet, total };
    };
    const a = calc('A'), b = calc('B');
    setResults({ totalNounou: Math.round((a.total + b.total) * 100) / 100, a, b });
  }, [nbEnfants, taux, evts, annee, mois]);

  // Calendar
  const renderCalendar = useCallback(() => {
    const premier   = new Date(annee, mois - 1, 1);
    const offset    = premier.getDay() === 0 ? 6 : premier.getDay() - 1;
    const lundi     = new Date(annee, mois - 1, 1 - offset);
    const dernier   = new Date(annee, mois, 0);
    const dow       = dernier.getDay();
    const vendredi  = new Date(dernier);
    if (dow >= 1 && dow <= 4) vendredi.setDate(dernier.getDate() + (5 - dow));
    else if (dow === 6) vendredi.setDate(dernier.getDate() - 1);
    else if (dow === 0) vendredi.setDate(dernier.getDate() - 2);

    const today = new Date();
    const cells: React.ReactNode[] = [];
    const cur = new Date(lundi);

    while (cur <= vendredi) {
      const dow2 = cur.getDay();
      if (dow2 >= 1 && dow2 <= 5) {
        const isCur = cur.getMonth() === mois - 1;
        const isToday = cur.toDateString() === today.toDateString();
        const ds = dateToStr(cur);
        const chips = evts.filter(e => e.debut <= ds && e.fin >= ds).map((e, i) => (
          <div key={i} className={'text-[9px] px-1 py-0.5 rounded mb-0.5 truncate ' + (e.type === 'conge_paye' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700')}>
            {e.type === 'conge_paye' ? 'CP' : 'Mal.'}
          </div>
        ));
        cells.push(
          <div
            key={ds}
            onClick={() => isCur && openEvtModal(ds)}
            className={'border-r border-b border-[var(--line)] min-h-[64px] p-1.5 ' + (isCur ? 'cursor-pointer hover:bg-[var(--sage-light)]' : 'bg-[var(--paper)] opacity-30 cursor-default')}
          >
            <div className={isToday ? 'w-5 h-5 rounded-full bg-[var(--sage)] text-white text-[10px] flex items-center justify-center mb-1' : 'text-[11px] font-medium text-[var(--dust)] mb-1'}>
              {cur.getDate()}
            </div>
            {chips}
          </div>
        );
      }
      cur.setDate(cur.getDate() + 1);
    }
    return cells;
  }, [annee, mois, evts]);

  function openEvtModal(ds?: string) {
    setEvtType(null);
    setEvtDebut(ds ?? '');
    setEvtFin(ds ?? '');
    setModalOpen(true);
  }
  function addEvt() {
    if (!evtType) { alert('Choisissez un type.'); return; }
    if (!evtDebut || !evtFin) { alert('Dates requises.'); return; }
    if (evtFin < evtDebut) { alert('Date fin après début.'); return; }
    setEvts(p => [...p, { type: evtType, debut: evtDebut, fin: evtFin }]);
    setModalOpen(false);
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authTab === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPwd, prenom: authPrenom, nom: authNom }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
      const result = await signIn('credentials', { email: authEmail, password: authPwd, redirect: false });
      if (result?.error) throw new Error('Identifiants incorrects');
      router.push('/nouvelle-garde/acteurs');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Erreur');
      setAuthLoading(false);
    }
  }

  const scenario = SCENARIOS[nbEnfants];

  return (
    <div className="min-h-screen bg-[var(--paper)]">

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center justify-between px-6 z-50">
        <span className="font-serif text-[19px] tracking-tight">nounoulink<em className="text-[var(--sage)] not-italic">.</em></span>
        <div className="flex gap-2.5">
          <button onClick={() => { setAuthTab('login');    setAuthOpen(true); setAuthError(''); }} className={btnSec}>Se connecter</button>
          <button onClick={() => { setAuthTab('register'); setAuthOpen(true); setAuthError(''); }} className={btnPri}>Créer un compte</button>
        </div>
      </header>

      {/* ── AUTH MODAL ───────────────────────────────────────────── */}
      {authOpen && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center" onClick={e => e.target === e.currentTarget && setAuthOpen(false)}>
          <div className="bg-white rounded-2xl p-8 w-[min(420px,92vw)] shadow-2xl relative">
            <button onClick={() => setAuthOpen(false)} className="absolute top-4 right-5 text-[var(--dust)] hover:text-[var(--ink)] text-xl leading-none">✕</button>
            <div className="font-serif text-xl mb-1">nounoulink<em className="text-[var(--sage)] not-italic">.</em></div>
            <p className="text-sm text-[var(--dust)] mb-5">Coordonnez votre garde partagée sereinement.</p>
            {/* Tabs */}
            <div className="flex border-b border-[var(--line)] mb-5">
              {(['login', 'register'] as const).map(t => (
                <button key={t} onClick={() => { setAuthTab(t); setAuthError(''); }} className={'flex-1 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ' + (authTab === t ? 'border-[var(--sage)] text-[var(--sage)]' : 'border-transparent text-[var(--dust)]')}>
                  {t === 'login' ? 'Se connecter' : 'Créer un compte'}
                </button>
              ))}
            </div>
            {authError && <p className="text-sm text-[var(--red)] bg-[var(--red-light)] rounded-lg px-3 py-2 mb-4">{authError}</p>}
            <form onSubmit={handleAuth} className="space-y-3">
              {authTab === 'register' && (
                <div className="grid grid-cols-2 gap-3">
                  <input className={inp} placeholder="Prénom" value={authPrenom} onChange={e => setAuthPrenom(e.target.value)} />
                  <input className={inp} placeholder="Nom"    value={authNom}    onChange={e => setAuthNom(e.target.value)} />
                </div>
              )}
              <input className={inp} type="email"    placeholder="Email"          required value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
              <input className={inp} type="password" placeholder="Mot de passe"   required minLength={8} value={authPwd} onChange={e => setAuthPwd(e.target.value)} />
              <button type="submit" disabled={authLoading} className={btnPri + ' w-full justify-center mt-1'}>
                {authLoading ? 'Chargement…' : authTab === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── DEMO MAIN ────────────────────────────────────────────── */}
      <main className="pt-14">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="pt-8 pb-5">
            <h1 className="font-serif text-[26px] text-[var(--ink)] mb-1">Calculez le salaire de votre garde partagée</h1>
            <p className="text-[13px] text-[var(--dust)]">Simulateur instantané · aucun compte requis · données sauvegardées localement</p>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: '264px 1fr 340px' }}>

            {/* ── GAUCHE ─────────────────────────────────────────── */}
            <aside className="flex flex-col gap-3">

              {/* Taux */}
              <Panel title="Paramètres">
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm font-medium">Taux horaire net</span>
                  <div className="flex items-center gap-1.5 text-sm text-[var(--dust)]">
                    <input
                      type="number" min={5} max={50} step={0.5} value={taux}
                      onChange={e => setTaux(parseFloat(e.target.value) || 11)}
                      className="w-16 px-2 py-1.5 border-[1.5px] border-[var(--line)] rounded-lg text-[14px] font-semibold text-center outline-none focus:border-[var(--sage)] bg-white"
                    />
                    <span>€/h</span>
                  </div>
                </div>
              </Panel>

              {/* Constantes */}
              <Panel title="Constantes du modèle" badge="50 / 50">
                {[['Transport', '90,80 €/mois'], ['Frais km', '0 €'], ['Entretien', '6,00 €/j']].map(([l, v]) => (
                  <div key={l} className="flex justify-between px-4 py-2 text-xs text-[var(--dust)] opacity-70 border-b border-[var(--line)] last:border-0">
                    <span>{l}</span><span className="font-medium font-mono">{v}</span>
                  </div>
                ))}
              </Panel>

              {/* Modes 2×2 */}
              <Panel title="Mode de calcul">
                <div className="grid grid-cols-2 gap-2 p-3">
                  {[
                    { id: 'A.1', nom: 'Moitié-moitié',    active: true },
                    { id: 'B.1', nom: 'Partage au temps',  active: false },
                    { id: 'A.2', nom: 'Partage au coût',   active: false },
                    { id: 'B.2', nom: '100% personnalisé', active: false },
                  ].map(m => (
                    <div key={m.id} className={'rounded-lg border-[1.5px] p-3 relative ' + (m.active ? 'border-[var(--sage)] bg-[var(--sage-light)]' : 'border-[var(--line)] opacity-50')}>
                      {!m.active && <span className="absolute top-1.5 right-2 text-[10px]">🔒</span>}
                      <div className={'text-[10px] font-bold mb-1 ' + (m.active ? 'text-[var(--sage)]' : 'text-[var(--dust)]')}>{m.id}</div>
                      <div className="text-[11px] font-medium leading-tight">{m.nom}</div>
                      {!m.active && <div className="text-[9px] text-[var(--dust)] italic mt-1">avec un compte</div>}
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Scénario */}
              <Panel title="Scénario">
                <div className="p-3 space-y-2.5">
                  <div className="flex rounded-lg overflow-hidden border-[1.5px] border-[var(--line)]">
                    {([2, 3] as const).map(n => (
                      <button key={n} onClick={() => setNbEnfants(n)}
                        className={'flex-1 py-2 text-xs font-medium transition-colors ' + (nbEnfants === n ? 'bg-[var(--sage)] text-white' : 'bg-white text-[var(--dust)]')}>
                        {n} enfants
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {scenario.enfants.map((e, i) => (
                      <span key={i} className={'text-[11px] font-medium px-2 py-0.5 rounded-full ' + (e.fam === 'A' ? 'bg-[var(--blue-light)] text-[var(--blue)]' : 'bg-[var(--sage-light)] text-[var(--sage)]')}>
                        {e.prenom} · Fam. {e.fam}
                      </span>
                    ))}
                  </div>
                </div>
              </Panel>

            </aside>

            {/* ── CALENDRIER ─────────────────────────────────────── */}
            <div>
              <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--line)]">
                  <span className="text-[15px] font-medium">{MOIS_LONGS[mois - 1]} {annee}</span>
                  <button onClick={() => openEvtModal()} className={btnSec + ' !py-1.5 !text-xs'}>+ Événement</button>
                </div>
                <div className="grid grid-cols-5">
                  {['Lun','Mar','Mer','Jeu','Ven'].map(j => (
                    <div key={j} className="py-2 text-center text-[10px] font-medium text-[var(--dust)] uppercase tracking-wide border-b border-r border-[var(--line)] last:border-r-0 bg-[var(--paper)]">{j}</div>
                  ))}
                  {renderCalendar()}
                </div>
              </div>

              {/* Événements */}
              {evts.length > 0 && (
                <div className="mt-3 bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[var(--line)] text-[10px] font-medium text-[var(--dust)] uppercase tracking-wide">
                    Événements
                  </div>
                  {evts.map((e, i) => {
                    const [, mo1, d1] = e.debut.split('-').map(Number);
                    const [, mo2, d2] = e.fin.split('-').map(Number);
                    const label = (d1 === d2 && mo1 === mo2) ? `${d1} ${MOIS_COURTS[mo1-1]}` : `${d1} ${MOIS_COURTS[mo1-1]} → ${d2} ${MOIS_COURTS[mo2-1]}`;
                    return (
                      <div key={i} className="flex items-center px-4 py-2 border-b border-[var(--line)] last:border-0 text-xs gap-2">
                        <span className={'px-2 py-0.5 rounded text-[10px] ' + (e.type === 'conge_paye' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700')}>
                          {e.type === 'conge_paye' ? '🏖 CP' : '🤒 Mal.'}
                        </span>
                        <span className="flex-1 text-right text-[var(--dust)]">{label}</span>
                        <button onClick={() => setEvts(p => p.filter((_, j) => j !== i))} className="text-[var(--dust)] hover:text-[var(--red)] text-base leading-none">×</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── RÉSULTATS ──────────────────────────────────────── */}
            <aside className="flex flex-col gap-3">

              {/* Total */}
              <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[var(--line)] text-[10px] font-medium text-[var(--dust)] uppercase tracking-wide bg-[var(--paper)]">Salaire total nounou</div>
                <div className="flex justify-between items-center px-4 py-3 bg-[var(--paper)]">
                  <span className="text-sm">Famille A + B</span>
                  <strong className="text-[15px]">{results.totalNounou.toFixed(2)} €</strong>
                </div>
              </div>

              {/* Famille A */}
              <FamilleCard label="A" color="blue" r={results.a} />
              {/* Famille B */}
              <FamilleCard label="B" color="sage" r={results.b} />

            </aside>
          </div>

          <div className="py-12 text-center text-xs text-[var(--dust)]">
            <a href="#" onClick={e => { e.preventDefault(); setAuthTab('register'); setAuthOpen(true); }} className="text-[var(--sage)] underline">
              Créer un compte gratuit
            </a>
            {' '}pour sauvegarder, inviter Famille B, et valider à 3.
          </div>
        </div>
      </main>

      {/* ── MODAL ÉVÉNEMENT ──────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/35 z-[150] flex items-center justify-center" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 w-[min(360px,90vw)] shadow-2xl">
            <h3 className="text-base font-medium mb-4">Ajouter un événement</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(['conge_paye', 'maladie_nounou'] as const).map(t => (
                <button key={t} onClick={() => setEvtType(t)}
                  className={'py-2.5 rounded-lg border-[1.5px] text-sm transition-all ' + (evtType === t ? 'border-[var(--sage)] bg-[var(--sage-light)] text-[var(--sage)] font-medium' : 'border-[var(--line)]')}>
                  {t === 'conge_paye' ? '🏖 Congé payé' : '🤒 Maladie'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-1">
              <div>
                <label className="text-xs text-[var(--dust)] block mb-1">Début</label>
                <input type="date" value={evtDebut} onChange={e => setEvtDebut(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="text-xs text-[var(--dust)] block mb-1">Fin</label>
                <input type="date" value={evtFin} onChange={e => setEvtFin(e.target.value)} className={inp} />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setModalOpen(false)} className={btnSec}>Annuler</button>
              <button onClick={addEvt} className={btnPri}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--line)] bg-[var(--paper)]">
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--dust)]">{title}</span>
        {badge && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--sage-light)] text-[var(--sage)] font-medium">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function FamilleCard({ label, color, r }: { label: string; color: 'blue' | 'sage'; r: { hNorm: number; hSup: number; salNet: number; total: number } }) {
  const c = color === 'blue' ? 'text-[var(--blue)]' : 'text-[var(--sage)]';
  return (
    <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <div className={`px-4 py-2.5 border-b border-[var(--line)] text-[10px] font-medium uppercase tracking-wide bg-[var(--paper)] ${c}`}>
        Famille {label} — Pajemploi
      </div>
      {[
        ['Heures normales', r.hNorm + ' h', false],
        ['Heures sup +25%', r.hSup + ' h', false],
        ['Heures sup +50%', '0 h',         true],
        ['Salaire net',     r.salNet.toFixed(2) + ' €', false],
        ['Transport',       '45,40 €',     false],
        ['Frais km',        '0,00 €',      true],
      ].map(([l, v, dim]) => (
        <div key={String(l)} className={'flex justify-between px-4 py-1.5 border-b border-[var(--line)] last:border-0 text-xs ' + (dim ? 'opacity-40' : '')}>
          <span className="text-[var(--dust)]">{l}</span>
          <span className="font-medium font-mono">{v}</span>
        </div>
      ))}
      <div className="flex justify-between px-4 py-2.5 bg-[var(--paper)] font-semibold text-sm">
        <span>Total à verser</span>
        <span>{r.total.toFixed(2)} €</span>
      </div>
    </div>
  );
}

const btnPri = 'px-4 py-2 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors';
const btnSec = 'px-4 py-2 border-[1.5px] border-[var(--line)] text-[var(--ink)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] transition-colors bg-white';
const inp    = 'w-full px-3 py-2 border-[1.5px] border-[var(--line)] rounded-lg text-sm outline-none focus:border-[var(--sage)] bg-white placeholder:text-gray-300';
