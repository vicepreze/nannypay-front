'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type NbEnfants = 2 | 3;
type Evt = { type: 'conge_paye' | 'maladie_nounou'; debut: string; fin: string };

const MOIS_LONGS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

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
  const dMD = new Date(a, m - 1, 1),    dMF = new Date(a, m, 0);
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
  const annee = now.getFullYear();
  const mois  = now.getMonth() + 1;

  // Demo
  const [taux,      setTaux]      = useState(11);
  const [hHebdo,    setHHebdo]    = useState(40);
  const [nbEnfants, setNbEnfants] = useState<NbEnfants>(2);
  const [repartA,   setRepartA]   = useState(0.5);
  const [evts,      setEvts]      = useState<Evt[]>([]);

  // Modal événement
  const [modalOpen,  setModalOpen]  = useState(false);
  const [evtType,    setEvtType]    = useState<Evt['type'] | null>(null);
  const [evtDebut,   setEvtDebut]   = useState('');
  const [evtFin,     setEvtFin]     = useState('');
  const [modalError, setModalError] = useState('');

  const minDate = `${annee}-${String(mois).padStart(2, '0')}-01`;
  const maxDate = dateToStr(new Date(annee, mois, 0));

  // Auth modal
  const [authOpen,    setAuthOpen]    = useState(false);
  const [authTab,     setAuthTab]     = useState<'login' | 'register'>('login');
  const [authEmail,   setAuthEmail]   = useState('');
  const [authPwd,     setAuthPwd]     = useState('');
  const [authPrenom,  setAuthPrenom]  = useState('');
  const [authNom,     setAuthNom]     = useState('');
  const [authError,   setAuthError]   = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // ── Calcul ────────────────────────────────────────────────────────
  const joursOuv  = joursOuvrablesMois(annee, mois);
  const joursMal  = evts
    .filter(e => e.type === 'maladie_nounou')
    .reduce((acc, e) => acc + joursOuvrablesIntersect(e.debut, e.fin, annee, mois), 0);
  const ratio      = joursOuv > 0 ? Math.max(0, joursOuv - joursMal) / joursOuv : 1;
  const salNetMens = Math.round(hHebdo * (52 / 12) * taux * ratio * 100) / 100;
  const salNetA    = Math.round(salNetMens * repartA * 100) / 100;
  const salNetB    = Math.round(salNetMens * (1 - repartA) * 100) / 100;
  const hasCP      = evts.some(e => e.type === 'conge_paye');
  // Slider markers
  const S_MIN = 20, S_MAX = 80;
  const sPct  = (p: number) => ((p * 100 - S_MIN) / (S_MAX - S_MIN)) * 100;
  const pProportionnel = nbEnfants === 2 ? 0.5 : 2 / 3;
  const markers = nbEnfants === 2
    ? [{ value: 0.5,  label: 'Proportionnel', highlight: false }]
    : [{ value: 2/3,  label: 'Proportionnel', highlight: false },
       { value: 0.6,  label: 'Après aides CAF', highlight: true }];
  const nbA = nbEnfants === 2 ? 1 : 2;
  const nbB = 1;

  // ── Événements ───────────────────────────────────────────────────
  function openEvtModal(ds: string) {
    setEvtType(null); setEvtDebut(ds); setEvtFin(ds); setModalError(''); setModalOpen(true);
  }

  function addEvt() {
    setModalError('');
    if (!evtType)             { setModalError('Choisissez un type.'); return; }
    if (!evtDebut || !evtFin) { setModalError('Les deux dates sont requises.'); return; }
    if (evtFin < evtDebut)    { setModalError('La fin doit être après le début.'); return; }
    if (evts.some(e => e.debut <= evtFin && e.fin >= evtDebut)) {
      setModalError('Cet intervalle chevauche un événement existant.'); return;
    }
    setEvts(p => [...p, { type: evtType, debut: evtDebut, fin: evtFin }]);
    setModalOpen(false);
  }

  // ── Auth ──────────────────────────────────────────────────────────
  function openAuth(tab: 'login' | 'register') {
    setAuthTab(tab); setAuthOpen(true); setAuthError('');
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault(); setAuthLoading(true); setAuthError('');
    try {
      if (authTab === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPwd, prenom: authPrenom, nom: authNom }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
      const result = await signIn('credentials', { email: authEmail, password: authPwd, redirect: false });
      if (result?.error) throw new Error('Identifiants incorrects');
      router.push('/nouvelle-garde/acteurs');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Erreur'); setAuthLoading(false);
    }
  }

  // ── Calendrier ────────────────────────────────────────────────────
  function buildCalendarCells() {
    const premier = new Date(annee, mois - 1, 1);
    const dow     = premier.getDay();
    const offset  = dow === 0 ? 6 : dow - 1;
    const lundi   = new Date(annee, mois - 1, 1 - offset);
    const dernier = new Date(annee, mois, 0);
    const lastDow = dernier.getDay();
    const toSun   = lastDow === 0 ? 0 : 7 - lastDow;
    const dimanche = new Date(annee, mois - 1, dernier.getDate() + toSun);

    const today = new Date();
    const cells: React.ReactNode[] = [];
    const cur = new Date(lundi);

    while (cur <= dimanche) {
      const isCurMonth = cur.getMonth() === mois - 1;
      const d          = cur.getDay();
      const isWeekend  = d === 0 || d === 6;
      const isToday    = cur.toDateString() === today.toDateString();
      const ds         = dateToStr(cur);
      const hasEvtCP   = evts.some(e => e.type === 'conge_paye'       && e.debut <= ds && e.fin >= ds);
      const hasEvtMal  = evts.some(e => e.type === 'maladie_nounou'   && e.debut <= ds && e.fin >= ds);
      const isWork     = isCurMonth && !isWeekend;

      let bg = '', fg = '';
      if (!isCurMonth || isWeekend) { bg = ''; fg = 'text-[var(--line)]'; }
      else if (hasEvtMal) { bg = 'bg-red-100';         fg = 'text-red-600 cursor-pointer hover:bg-red-200'; }
      else if (hasEvtCP)  { bg = 'bg-blue-100';        fg = 'text-blue-600 cursor-pointer hover:bg-blue-200'; }
      else                { bg = 'bg-[var(--sage)]';   fg = 'text-white cursor-pointer hover:opacity-90'; }

      cells.push(
        <div
          key={ds}
          onClick={() => isWork && openEvtModal(ds)}
          className={`relative flex items-center justify-center rounded-xl text-[13px] font-semibold transition-all ${bg} ${fg} ${isToday && isWork ? 'ring-2 ring-white ring-offset-1 ring-offset-[var(--sage)]' : ''}`}
          style={{ aspectRatio: '1' }}
        >
          {isCurMonth ? cur.getDate() : ''}
        </div>
      );
      cur.setDate(cur.getDate() + 1);
    }
    return cells;
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center justify-between px-6 z-50">
        <span className="font-serif text-[19px] tracking-tight text-[var(--ink)]">
          nounoulink<em className="text-[var(--sage)] not-italic">.</em>
        </span>
        <div className="flex gap-2.5">
          <button onClick={() => openAuth('login')}    className={btnSec}>Se connecter</button>
          <button onClick={() => openAuth('register')} className={btnPri}>Créer un compte gratuit</button>
        </div>
      </header>

      {/* ── AUTH MODAL ───────────────────────────────────────────── */}
      {authOpen && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center" onClick={e => e.target === e.currentTarget && setAuthOpen(false)}>
          <div className="bg-white rounded-2xl p-8 w-[min(420px,92vw)] shadow-2xl relative">
            <button onClick={() => setAuthOpen(false)} className="absolute top-4 right-5 text-[var(--dust)] hover:text-[var(--ink)] text-xl leading-none">✕</button>
            <div className="font-serif text-xl mb-1 text-[var(--ink)]">nounoulink<em className="text-[var(--sage)] not-italic">.</em></div>
            <p className="text-sm text-[var(--dust)] mb-5">Coordonnez votre garde partagée sereinement.</p>
            <div className="flex border-b border-[var(--line)] mb-5">
              {(['login', 'register'] as const).map(t => (
                <button key={t} onClick={() => { setAuthTab(t); setAuthError(''); }}
                  className={'flex-1 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ' + (authTab === t ? 'border-[var(--sage)] text-[var(--sage)]' : 'border-transparent text-[var(--dust)]')}>
                  {t === 'login' ? 'Se connecter' : 'Créer un compte'}
                </button>
              ))}
            </div>
            {authError && <p className="text-sm text-[var(--red)] bg-red-50 rounded-lg px-3 py-2 mb-4">{authError}</p>}
            <form onSubmit={handleAuth} className="space-y-3">
              {authTab === 'register' && (
                <div className="grid grid-cols-2 gap-3">
                  <input className={inp} placeholder="Prénom" value={authPrenom} onChange={e => setAuthPrenom(e.target.value)} />
                  <input className={inp} placeholder="Nom"    value={authNom}    onChange={e => setAuthNom(e.target.value)} />
                </div>
              )}
              <input className={inp} type="email"    placeholder="Email"        required value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
              <input className={inp} type="password" placeholder="Mot de passe" required minLength={8} value={authPwd} onChange={e => setAuthPwd(e.target.value)} />
              <button type="submit" disabled={authLoading} className={btnPri + ' w-full mt-1'}>
                {authLoading ? 'Chargement…' : authTab === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </button>
            </form>
          </div>
        </div>
      )}

      <main className="pt-14">

        {/* ── 1. HERO ──────────────────────────────────────────────── */}
        <section className="max-w-2xl mx-auto px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--line)] text-[var(--dust)] mb-8">
            <span className="text-[var(--sage)]">✓</span>
            Gratuit · Aucun compte requis pour démarrer
          </div>
          <h1 className="font-serif text-[42px] leading-tight text-[var(--ink)] mb-4">
            Une nounou, deux familles,<br />
            <em className="not-italic text-[var(--sage)]">enfin sur la même page.</em>
          </h1>
          <p className="text-[17px] text-[var(--dust)] leading-relaxed mb-10 max-w-lg mx-auto">
            Calculez en 30 secondes, simulez les absences, et alignez-vous avec l&apos;autre famille — sans tableur, sans WhatsApp.
          </p>
          <p className="text-sm text-[var(--dust)]">
            <span className="mr-1">👇</span> Essayez maintenant, modifiez les paramètres ci-dessous
          </p>
        </section>

        {/* ── 2. DÉMO ──────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-6 pb-20 space-y-4">

          {/* Paramètres */}
          <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-[10px] font-bold text-[var(--dust)] uppercase tracking-widest">
              Votre situation
            </div>
            <div className="grid grid-cols-3 divide-x divide-[var(--line)]">
              <div className="px-6 py-5">
                <div className="text-sm font-semibold text-[var(--ink)] mb-3">Taux horaire net</div>
                <div className="flex items-center gap-2">
                  <input type="number" min={5} max={50} step={0.5} value={taux}
                    onChange={e => setTaux(parseFloat(e.target.value) || 11)}
                    className={numInp + ' flex-1'} />
                  <span className="text-sm text-[var(--dust)]">€/h</span>
                </div>
                <div className="text-xs text-[var(--dust)] mt-2">Net employeur (hors charges)</div>
              </div>
              <div className="px-6 py-5">
                <div className="text-sm font-semibold text-[var(--ink)] mb-3">Heures par semaine</div>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={60} step={1} value={hHebdo}
                    onChange={e => setHHebdo(parseInt(e.target.value) || 40)}
                    className={numInp + ' flex-1'} />
                  <span className="text-sm text-[var(--dust)]">h</span>
                </div>
                <div className="text-xs text-[var(--dust)] mt-2">Heures contractuelles</div>
              </div>
              <div className="px-6 py-5">
                <div className="text-sm font-semibold text-[var(--ink)] mb-3">Nombre d&apos;enfants gardés</div>
                <div className="flex rounded-xl overflow-hidden border border-[var(--line)] w-fit">
                  {([2, 3] as const).map(n => (
                    <button key={n} onClick={() => { setNbEnfants(n); setRepartA(n === 2 ? 0.5 : 2/3); }}
                      className={'px-5 py-2 text-sm font-medium transition-colors ' + (nbEnfants === n ? 'bg-[var(--sage)] text-white' : 'bg-white text-[var(--dust)] hover:text-[var(--ink)]')}>
                      {n} enfants
                    </button>
                  ))}
                </div>
                <div className="text-xs text-[var(--dust)] mt-2">Partage équitable entre familles</div>
              </div>
            </div>
          </div>

          {/* Résultats + Calendrier */}
          <div className="grid grid-cols-2 gap-4">

            {/* ── Résultats ── */}
            <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-[10px] font-bold text-[var(--dust)] uppercase tracking-widest">
                Résultat du mois
              </div>
              <div className="p-5 space-y-3">
                <div className="bg-[#0f1923] rounded-xl px-5 py-4">
                  <div className="text-xs text-white/50 mb-1">Salaire total nounou</div>
                  <div className="text-3xl font-bold text-white">{salNetMens.toFixed(2)} €</div>
                  {joursMal > 0 && (
                    <div className="text-xs text-red-300 mt-2">
                      − {joursMal} jour{joursMal > 1 ? 's' : ''} maladie déduit{joursMal > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 bg-[var(--sage-light)] rounded-xl px-4 py-3">
                  <span className="w-7 h-7 rounded-full bg-[var(--sage)] text-white text-xs font-bold flex items-center justify-center shrink-0">A</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[var(--ink)]">Famille A</div>
                    <div className="text-[10px] text-[var(--dust)]">{nbA} enfant{nbA > 1 ? 's' : ''} · {(repartA * 100).toFixed(1)} %</div>
                  </div>
                  <span className="text-[15px] font-bold text-[var(--sage)]">{salNetA.toFixed(2)} €</span>
                </div>
                <div className="flex items-center gap-3 bg-[var(--sage-light)] rounded-xl px-4 py-3">
                  <span className="w-7 h-7 rounded-full bg-[var(--sage)] text-white text-xs font-bold flex items-center justify-center shrink-0">B</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[var(--ink)]">Famille B</div>
                    <div className="text-[10px] text-[var(--dust)]">{nbB} enfant · {((1 - repartA) * 100).toFixed(1)} %</div>
                  </div>
                  <span className="text-[15px] font-bold text-[var(--sage)]">{salNetB.toFixed(2)} €</span>
                </div>
                {hasCP && (
                  <p className="text-[11px] text-[var(--dust)] px-1">
                    🏖 Les congés payés n&apos;impactent pas le salaire net mensuel.
                  </p>
                )}

                {/* Slider intégré */}
                <div className="pt-2 border-t border-[var(--line)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold text-[var(--dust)] uppercase tracking-wide">Répartition</span>
                    <button onClick={() => setRepartA(pProportionnel)}
                      className="text-[10px] text-[var(--dust)] hover:text-[var(--sage)] transition-colors">
                      ↺ Auto
                    </button>
                  </div>
                  {/* Markers */}
                  <div className="relative h-4 mb-0.5">
                    {markers.map((m, i) => {
                      const p = sPct(m.value);
                      if (p < 0 || p > 100) return null;
                      return (
                        <span key={i}
                          className={`absolute text-[9px] -translate-x-1/2 whitespace-nowrap ${m.highlight ? 'text-[var(--sage)] font-semibold' : 'text-[var(--dust)]'}`}
                          style={{ left: `${p}%` }}>
                          {m.highlight ? 'CAF' : 'Auto'}
                        </span>
                      );
                    })}
                  </div>
                  {/* Track */}
                  <div className="relative h-5">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-[var(--line)]" />
                    {markers.map((m, i) => {
                      const p = sPct(m.value);
                      if (p < 0 || p > 100) return null;
                      return (
                        <span key={i}
                          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${m.highlight ? 'bg-[var(--sage)]' : 'bg-[var(--dust)]'}`}
                          style={{ left: `${p}%` }} />
                      );
                    })}
                    <input type="range" min={S_MIN} max={S_MAX} step={0.1}
                      value={repartA * 100}
                      onChange={e => setRepartA(parseFloat(e.target.value) / 100)}
                      className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer demo-slider"
                      style={{ WebkitAppearance: 'none' }}
                    />
                  </div>
                  <style jsx>{`
                    .demo-slider::-webkit-slider-thumb {
                      -webkit-appearance: none; appearance: none;
                      width: 16px; height: 16px; border-radius: 50%;
                      background: white; border: 2px solid var(--sage);
                      cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
                    }
                    .demo-slider::-moz-range-thumb {
                      width: 16px; height: 16px; border-radius: 50%;
                      background: white; border: 2px solid var(--sage);
                      cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
                    }
                  `}</style>
                </div>

              </div>
            </div>

            {/* ── Calendrier ── */}
            <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] flex items-center justify-between">
                <span className="text-[10px] font-bold text-[var(--dust)] uppercase tracking-widest">Simulez un événement</span>
                <div className="flex items-center gap-3 text-xs text-[var(--dust)]">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />CP</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Maladie</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[var(--ink)]">{MOIS_LONGS[mois - 1]} {annee}</span>
                  {evts.length > 0 && (
                    <button onClick={() => setEvts([])} className="text-xs text-[var(--dust)] hover:text-red-500 underline decoration-dotted transition-colors">
                      Tout effacer
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['L','M','M','J','V','S','D'].map((j, i) => (
                    <div key={i} className="text-center text-[10px] font-semibold text-[var(--dust)] py-1">{j}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {buildCalendarCells()}
                </div>
                <p className="text-center text-[11px] text-[var(--dust)] mt-3">
                  Cliquez sur un jour ouvré pour simuler un CP ou une absence maladie
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. CTA SOMBRE ────────────────────────────────────────── */}
        <section className="bg-[#0f1923] text-white px-6 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs font-bold tracking-widest text-[var(--sage)] uppercase mb-4">
              Ça correspond à votre situation ?
            </p>
            <h2 className="font-serif text-[32px] leading-tight font-bold mb-5">
              Retrouvez exactement vos chiffres,<br />adaptés à votre contrat.
            </h2>
            <p className="text-[15px] text-white/60 leading-relaxed mb-12 max-w-lg mx-auto">
              La démo ci-dessus est volontairement simplifiée. Créez un compte gratuit pour
              configurer votre planning exact, inviter l&apos;autre famille, et ne plus jamais perdre le fil.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-12 text-left">
              {[
                { icon: '⚙️', title: 'Votre situation, exactement', desc: '✓ 2 ou 3 enfants, horaires identiques ou différents\n✓ Répartition proportionnelle aux heures par enfant\n✓ Équilibrage au reste à charge selon vos aides CAF\n✓ Frais d\'entretien, repas et transport inclus' },
                { icon: '👨‍👩‍👦‍👦', title: 'Collaboration famille', desc: 'Chaque famille accède à ses chiffres. Fini les allers-retours sur WhatsApp.' },
                { icon: '📅', title: 'Suivi mensuel',          desc: 'Historique des salaires, congés et absences. Toujours à jour, toujours lisible.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-white/5 rounded-xl p-5">
                  <div className="text-2xl mb-3">{icon}</div>
                  <div className="text-sm font-semibold mb-1.5">{title}</div>
                  <div className="text-xs text-white/50 leading-relaxed whitespace-pre-line">{desc}</div>
                </div>
              ))}
            </div>
            <button onClick={() => openAuth('register')}
              className="inline-block px-8 py-4 bg-[var(--sage)] text-white rounded-xl text-[15px] font-semibold hover:bg-[#3a5431] transition-colors">
              Créer mon compte gratuit →
            </button>
            <p className="text-xs text-white/40 mt-3">Aucune carte bancaire · Configuration en 2 min</p>
          </div>
        </section>

      </main>

      {/* ── MODAL ÉVÉNEMENT ──────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/35 z-[150] flex items-center justify-center" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-[min(360px,90vw)]">
            <h3 className="text-base font-semibold mb-4 text-[var(--ink)]">Ajouter un événement</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(['conge_paye', 'maladie_nounou'] as const).map(t => (
                <button key={t} onClick={() => { setEvtType(t); setModalError(''); }}
                  className="py-2.5 rounded-lg text-sm transition-all"
                  style={{
                    border: evtType === t ? '1.5px solid var(--sage)' : '1.5px solid var(--line)',
                    background: evtType === t ? 'var(--sage-light)' : 'white',
                    color: evtType === t ? 'var(--sage)' : 'var(--ink)',
                    fontWeight: evtType === t ? 500 : 400,
                  }}>
                  {t === 'conge_paye' ? '🏖 Congé payé' : '🤒 Maladie'}
                </button>
              ))}
            </div>
            {evtType === 'conge_paye' && (
              <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-3">
                Les CP n&apos;impactent pas le salaire net mensuel.
              </p>
            )}
            {evtType === 'maladie_nounou' && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
                Les jours de maladie réduisent proportionnellement le salaire.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 mb-1">
              <div>
                <label className="text-xs block mb-1 text-[var(--dust)]">Début</label>
                <input type="date" value={evtDebut} min={minDate} max={maxDate}
                  onChange={e => { setEvtDebut(e.target.value); setModalError(''); }} className={inp} />
              </div>
              <div>
                <label className="text-xs block mb-1 text-[var(--dust)]">Fin</label>
                <input type="date" value={evtFin} min={minDate} max={maxDate}
                  onChange={e => { setEvtFin(e.target.value); setModalError(''); }} className={inp} />
              </div>
            </div>
            {modalError && <p className="text-xs mt-2 text-[var(--red)]">{modalError}</p>}
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setModalOpen(false)} className={btnSec}>Annuler</button>
              <button onClick={addEvt} className={btnPri}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const btnPri = 'px-4 py-2 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors';
const btnSec = 'px-4 py-2 border border-[var(--line)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] transition-colors bg-white text-[var(--ink)]';
const numInp = 'px-3 py-2 border-[1.5px] border-[var(--line)] rounded-lg text-[14px] font-semibold text-center outline-none focus:border-[var(--sage)] bg-white';
const inp    = 'w-full px-3 py-2 rounded-lg text-sm outline-none bg-white border-[1.5px] border-[var(--line)] focus:border-[var(--sage)]';
