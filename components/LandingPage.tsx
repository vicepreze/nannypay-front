'use client';

import { useState } from 'react';
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
  const now   = new Date();
  const annee = now.getFullYear();
  const mois  = now.getMonth() + 1;

  const [taux,      setTaux]      = useState(11);
  const [hHebdo,    setHHebdo]    = useState(40);
  const [nbEnfants, setNbEnfants] = useState<NbEnfants>(2);
  const [repartA,   setRepartA]   = useState(0.5);
  const [evts,      setEvts]      = useState<Evt[]>([]);

  const [modalOpen,  setModalOpen]  = useState(false);
  const [evtType,    setEvtType]    = useState<Evt['type'] | null>(null);
  const [evtDebut,   setEvtDebut]   = useState('');
  const [evtFin,     setEvtFin]     = useState('');
  const [modalError, setModalError] = useState('');

  const minDate = `${annee}-${String(mois).padStart(2, '0')}-01`;
  const maxDate = dateToStr(new Date(annee, mois, 0));


  // ── Calcul ────────────────────────────────────────────────────────
  const joursOuv  = joursOuvrablesMois(annee, mois);
  const joursMal  = evts
    .filter(e => e.type === 'maladie_nounou')
    .reduce((acc, e) => acc + joursOuvrablesIntersect(e.debut, e.fin, annee, mois), 0);
  const ratio      = joursOuv > 0 ? Math.max(0, joursOuv - joursMal) / joursOuv : 1;
  const hNorm  = Math.min(hHebdo, 40);
  const hSup   = Math.max(0, hHebdo - 40);
  const hSup25 = Math.min(hSup, 8);
  const hSup50 = Math.max(0, hSup - 8);
  const salNetMens = Math.round(
    (hNorm * (52/12) * taux + hSup25 * (52/12) * taux * 1.25 + hSup50 * (52/12) * taux * 1.50) * ratio * 100
  ) / 100;
  const salNetA    = Math.round(salNetMens * repartA * 100) / 100;
  const salNetB    = Math.round(salNetMens * (1 - repartA) * 100) / 100;
  const hasCP      = evts.some(e => e.type === 'conge_paye');

  const S_MIN = 20, S_MAX = 80;
  const pProportionnel = nbEnfants === 2 ? 0.5 : 2 / 3;
  const P_AIDES = 0.6;
  const SNAP3 = 0.015;
  const activeOpt: 'heures' | 'aides' | 'custom' =
    nbEnfants !== 3 ? 'heures'
    : Math.abs(repartA - pProportionnel) <= SNAP3 ? 'heures'
    : Math.abs(repartA - P_AIDES) <= SNAP3 ? 'aides'
    : 'custom';
  const posA3 = ((pProportionnel - S_MIN / 100) / ((S_MAX - S_MIN) / 100)) * 100;
  const nbA = nbEnfants === 2 ? 1 : 2;
  const nbB = 1;

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

  // ── Calendrier (desktop uniquement) ──────────────────────────────
  function buildCalendarCells() {
    const premier  = new Date(annee, mois - 1, 1);
    const dow      = premier.getDay();
    const offset   = dow === 0 ? 6 : dow - 1;
    const lundi    = new Date(annee, mois - 1, 1 - offset);
    const dernier  = new Date(annee, mois, 0);
    const lastDow  = dernier.getDay();
    const toSun    = lastDow === 0 ? 0 : 7 - lastDow;
    const dimanche = new Date(annee, mois - 1, dernier.getDate() + toSun);
    const today    = new Date();
    const cells: React.ReactNode[] = [];
    const cur = new Date(lundi);
    while (cur <= dimanche) {
      const isCurMonth = cur.getMonth() === mois - 1;
      const d = cur.getDay();
      const isWeekend  = d === 0 || d === 6;
      const isToday    = cur.toDateString() === today.toDateString();
      const ds         = dateToStr(cur);
      const hasEvtCP   = evts.some(e => e.type === 'conge_paye'     && e.debut <= ds && e.fin >= ds);
      const hasEvtMal  = evts.some(e => e.type === 'maladie_nounou' && e.debut <= ds && e.fin >= ds);
      const isWork     = isCurMonth && !isWeekend;
      let bg = '', fg = '';
      if (!isCurMonth || isWeekend) { fg = 'text-[var(--line)]'; }
      else if (hasEvtMal) { bg = 'bg-red-100';       fg = 'text-red-600 cursor-pointer hover:bg-red-200'; }
      else if (hasEvtCP)  { bg = 'bg-blue-100';      fg = 'text-blue-600 cursor-pointer hover:bg-blue-200'; }
      else                { bg = 'bg-[var(--sage)]'; fg = 'text-white cursor-pointer hover:opacity-90'; }
      cells.push(
        <div key={ds} onClick={() => isWork && openEvtModal(ds)}
          className={`relative flex items-center justify-center rounded-xl text-[13px] font-semibold transition-all ${bg} ${fg} ${isToday && isWork ? 'ring-2 ring-white ring-offset-1 ring-offset-[var(--sage)]' : ''}`}
          style={{ aspectRatio: '1' }}>
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
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center justify-between px-4 md:px-6 z-50">
        <span className="font-serif text-[19px] tracking-tight text-[var(--ink)]">
          nounoulink<em className="text-[var(--sage)] not-italic">.</em>
        </span>
        <div className="flex gap-2 items-center">
          <a href="/blog" className="px-3 py-2 text-sm text-[var(--dust)] hover:text-[var(--ink)] transition-colors no-underline">Blog</a>
          {/* Se connecter masqué sur très petit écran */}
          <button onClick={() => router.push('/sign-in')} className={`hidden sm:inline-flex ${btnGhost}`}>
            Se connecter
          </button>
          <button onClick={() => router.push('/sign-up')} className={btnPri}>
            Créer un compte
          </button>
        </div>
      </header>

      <main className="pt-14">

        {/* ── 1. HERO ──────────────────────────────────────────────── */}
        <section className="max-w-2xl mx-auto px-5 md:px-6 pt-12 md:pt-16 pb-10 md:pb-12 text-center">
          <h1 className="font-serif text-[32px] md:text-[42px] leading-tight text-[var(--ink)] mb-4">
            Une nounou, deux familles,<br />
            <em className="not-italic text-[var(--sage)]">enfin sur la même page.</em>
          </h1>
          <p className="text-[15px] md:text-[17px] text-[var(--dust)] leading-relaxed mb-8 md:mb-10 max-w-lg mx-auto">
            Calculez en 30 secondes, simulez les absences, et alignez-vous avec l&apos;autre famille — sans tableur, sans WhatsApp.
          </p>
          <div className="flex flex-col items-center gap-3">
            <button onClick={() => router.push('/sign-up')} className={btnPri + ' px-8 py-3 text-base w-full sm:w-auto'}>
              Créer un compte
            </button>
            <p className="text-xs text-[var(--dust)]">2 minutes pour configurer votre planning réel</p>
            <p className="text-sm text-[var(--dust)]">ou essayer la démo ci-dessous ↓</p>
          </div>
        </section>

        {/* ── 2. DÉMO ──────────────────────────────────────────────── */}
        <section id="demo-section" className="max-w-4xl mx-auto px-4 md:px-6 pb-16 md:pb-20 space-y-4">

          {/* ── Paramètres ── */}
          <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 md:px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-[10px] font-bold text-[var(--dust)] uppercase tracking-widest">
              Votre situation
            </div>
            {/* Mobile : vertical stack / Desktop : 3 colonnes */}
            <div className="divide-y divide-[var(--line)] md:divide-y-0 md:grid md:grid-cols-3 md:divide-x">
              <div className="px-5 py-4">
                <div className="text-sm font-semibold text-[var(--ink)] mb-2">Taux horaire net</div>
                <div className="flex items-center gap-2">
                  <NumInput value={taux} onChange={setTaux} className={numInp + ' flex-1'} />
                  <span className="text-sm text-[var(--dust)]">€/h</span>
                </div>
                <div className="text-xs text-[var(--dust)] mt-1">Net employeur (hors charges)</div>
              </div>
              <div className="px-5 py-4">
                <div className="text-sm font-semibold text-[var(--ink)] mb-2">Heures par semaine</div>
                <div className="flex items-center gap-2">
                  <NumInput value={hHebdo} onChange={v => setHHebdo(Math.round(v))} className={numInp + ' flex-1'} />
                  <span className="text-sm text-[var(--dust)]">h</span>
                </div>
                <div className="text-xs text-[var(--dust)] mt-1">Heures contractuelles</div>
              </div>
              <div className="px-5 py-4">
                <div className="text-sm font-semibold text-[var(--ink)] mb-2">Nombre d&apos;enfants gardés</div>
                <div className="flex rounded-xl overflow-hidden border border-[var(--line)] w-fit">
                  {([2, 3] as const).map(n => (
                    <button key={n} onClick={() => { setNbEnfants(n); setRepartA(n === 2 ? 0.5 : 2/3); }}
                      className={'px-5 py-2 text-sm font-medium transition-colors ' + (nbEnfants === n ? 'bg-[var(--sage)] text-white' : 'bg-white text-[var(--dust)] hover:text-[var(--ink)]')}>
                      {n} enfants
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Mobile : résultats simplifiés ── */}
          <div className="md:hidden space-y-3">
            {/* Total */}
            <div className="bg-[#0f1923] rounded-2xl px-5 py-5 text-center">
              <div className="text-xs text-white/50 mb-1 uppercase tracking-wide">Salaire total nounou</div>
              <div className="text-4xl font-bold text-white mb-1">{salNetMens.toFixed(0)} €</div>
              <div className="text-xs text-white/40">{MOIS_LONGS[mois - 1]} {annee}</div>
              {joursMal > 0 && <div className="text-xs text-red-300 mt-2">− {joursMal} jour{joursMal > 1 ? 's' : ''} maladie déduit{joursMal > 1 ? 's' : ''}</div>}
              {hasCP && <div className="text-xs text-blue-300 mt-1">Les CP ne réduisent pas le salaire mensuel.</div>}
            </div>
            {/* Familles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--sage-light)] rounded-xl px-4 py-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--sage)] text-white text-xs font-bold flex items-center justify-center shrink-0">A</span>
                  <span className="text-sm font-medium text-[var(--ink)]">Famille A</span>
                </div>
                <div className="text-[10px] text-[var(--dust)]">{nbA} enfant{nbA > 1 ? 's' : ''} · {(repartA * 100).toFixed(0)} %</div>
                <div className="text-2xl font-bold text-[var(--sage)] mt-1">{salNetA.toFixed(0)} €</div>
              </div>
              <div className="bg-[var(--sage-light)] rounded-xl px-4 py-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--sage)] text-white text-xs font-bold flex items-center justify-center shrink-0">B</span>
                  <span className="text-sm font-medium text-[var(--ink)]">Famille B</span>
                </div>
                <div className="text-[10px] text-[var(--dust)]">{nbB} enfant · {((1 - repartA) * 100).toFixed(0)} %</div>
                <div className="text-2xl font-bold text-[var(--sage)] mt-1">{salNetB.toFixed(0)} €</div>
              </div>
            </div>
            {/* Slider répartition mobile */}
            <div className="bg-white border border-[var(--line)] rounded-2xl px-5 py-4">
              <div className="text-xs font-semibold text-[var(--dust)] uppercase tracking-wide mb-3">Répartition</div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-medium text-[var(--sage)] w-10 text-right">{(repartA * 100).toFixed(0)} %</span>
                <input type="range" min={S_MIN} max={S_MAX} step={0.1}
                  value={repartA * 100}
                  onChange={e => setRepartA(parseFloat(e.target.value) / 100)}
                  className="flex-1 appearance-none bg-transparent cursor-pointer demo-slider-mob h-5"
                  style={{ WebkitAppearance: 'none' }} />
                <span className="text-xs font-medium text-[var(--sage)] w-10">{((1 - repartA) * 100).toFixed(0)} %</span>
              </div>
              <div className="flex justify-between text-[10px] text-[var(--dust)]">
                <span>Famille A</span>
                <span>Famille B</span>
              </div>
            </div>
            {/* Nudge mobile */}
            <div className="text-center pt-1">
              <p className="text-sm text-[var(--dust)]">
                Ça correspond ?{' '}
                <button onClick={() => router.push('/sign-up')} className="text-[var(--sage)] font-medium underline underline-offset-2 cursor-pointer bg-transparent border-none">
                  Créer un compte →
                </button>
              </p>
            </div>
          </div>

          {/* ── Desktop : résultats + calendrier côte à côte ── */}
          <div className="hidden md:grid grid-cols-2 gap-4">

            {/* Résultats desktop */}
            <div className="flex flex-col gap-4">
            <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-[10px] font-bold text-[var(--dust)] uppercase tracking-widest">
                Résultat du mois
              </div>
              <div className="p-5 space-y-3">
                <div className="bg-[#0f1923] rounded-xl px-5 py-4">
                  <div className="text-xs text-white/50 mb-1">Salaire total nounou</div>
                  <div className="text-3xl font-bold text-white">{salNetMens.toFixed(0)} €</div>
                  {joursMal > 0 && <div className="text-xs text-red-300 mt-2">− {joursMal} jour{joursMal > 1 ? 's' : ''} maladie déduit{joursMal > 1 ? 's' : ''}</div>}
                </div>
                <div className="flex items-center gap-3 bg-[var(--sage-light)] rounded-xl px-4 py-3">
                  <span className="w-7 h-7 rounded-full bg-[var(--sage)] text-white text-xs font-bold flex items-center justify-center shrink-0">A</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[var(--ink)]">Famille A</div>
                    <div className="text-[10px] text-[var(--dust)]">{nbA} enfant{nbA > 1 ? 's' : ''} · {(repartA * 100).toFixed(0)} %</div>
                  </div>
                  <span className="text-[15px] font-bold text-[var(--sage)]">{salNetA.toFixed(0)} €</span>
                </div>
                <div className="flex items-center gap-3 bg-[var(--sage-light)] rounded-xl px-4 py-3">
                  <span className="w-7 h-7 rounded-full bg-[var(--sage)] text-white text-xs font-bold flex items-center justify-center shrink-0">B</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[var(--ink)]">Famille B</div>
                    <div className="text-[10px] text-[var(--dust)]">{nbB} enfant · {((1 - repartA) * 100).toFixed(0)} %</div>
                  </div>
                  <span className="text-[15px] font-bold text-[var(--sage)]">{salNetB.toFixed(0)} €</span>
                </div>
                {hasCP && <p className="text-[11px] text-[var(--dust)] px-1">🏖 Les congés payés n&apos;impactent pas le salaire net mensuel.</p>}

                {/* Slider répartition desktop */}
                <div className="pt-2 border-t border-[var(--line)]">
                  <span className="text-[10px] font-semibold text-[var(--dust)] uppercase tracking-wide block mb-4">Répartition</span>
                  {nbEnfants === 2 && (
                    <div>
                      <div className="relative h-5">
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-[var(--line)]" />
                        <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--dust)]" style={{ left: '50%' }} />
                        <input type="range" min={S_MIN} max={S_MAX} step={0.1}
                          value={repartA * 100}
                          onChange={e => setRepartA(parseFloat(e.target.value) / 100)}
                          className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer demo-slider"
                          style={{ WebkitAppearance: 'none' }} />
                      </div>
                    </div>
                  )}
                  {nbEnfants === 3 && (
                    <div>
                      <div className="relative h-5 mb-1">
                        <span className="absolute text-[10px] text-[var(--dust)] -translate-x-1/2 whitespace-nowrap" style={{ left: '50%' }}>50/50</span>
                      </div>
                      <div className="relative h-6">
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[var(--line)]" />
                        <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[var(--dust)]" style={{ left: '50%' }} />
                        <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[var(--dust)]" style={{ left: `${posA3}%` }} />
                        <input type="range" min={S_MIN} max={S_MAX} step={0.1}
                          value={repartA * 100}
                          onChange={e => setRepartA(parseFloat(e.target.value) / 100)}
                          className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer demo-slider3"
                          style={{ WebkitAppearance: 'none' }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-[var(--dust)] mt-1">
                        <span>{S_MIN} %</span>
                        <span>{S_MAX} %</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <RatioPill
                          active={activeOpt === 'heures'}
                          label={`Calcul automatique · ${(pProportionnel * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`}
                          onClick={() => setRepartA(pProportionnel)} />
                        <RatioPill
                          active={activeOpt === 'aides'}
                          label={`Bonne pratique · ${(P_AIDES * 100).toFixed(0)}/${(100 - P_AIDES * 100).toFixed(0)}`}
                          onClick={() => setRepartA(P_AIDES)} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bandeau contextuel — inciter à la création de compte */}
            <div className="bg-white border border-[var(--line)] rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
              <p className="text-sm text-[var(--dust)] leading-relaxed">
                Ce calcul est une estimation simple. Créez un compte pour le refaire avec{' '}
                <span className="text-[var(--sage)] font-semibold">vos horaires exacts</span>, vos congés, et pour que l&apos;autre famille voie les mêmes chiffres que vous.
              </p>
              <button onClick={() => router.push('/sign-up')} className={btnPri + ' shrink-0 whitespace-nowrap'}>
                Créer mon compte
              </button>
            </div>
            </div>

            {/* Calendrier desktop */}
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
                <div className="grid grid-cols-7 gap-1">{buildCalendarCells()}</div>
                <p className="text-center text-[11px] text-[var(--dust)] mt-3">
                  Cliquez sur un jour ouvré pour simuler un CP ou une absence maladie
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. CTA SOMBRE ────────────────────────────────────────── */}
        <section className="bg-[#0f1923] text-white px-5 md:px-6 py-16 md:py-20">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs font-bold tracking-widest text-[var(--sage)] uppercase mb-4">
              Ça correspond à votre situation ?
            </p>
            <h2 className="font-serif text-[26px] md:text-[32px] leading-tight font-bold mb-5">
              Retrouvez exactement vos chiffres,<br />adaptés à votre contrat.
            </h2>
            <p className="text-[14px] md:text-[15px] text-white/60 leading-relaxed mb-10 md:mb-12 max-w-lg mx-auto">
              La démo ci-dessus est volontairement simplifiée. Créez un compte pour
              configurer votre planning exact, inviter l&apos;autre famille, et ne plus jamais perdre le fil.
            </p>

            {/* Features — 1 col mobile / 3 col desktop */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 md:mb-12 text-left">
              {[
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--sage)] mb-3"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/></svg>
                  ),
                  title: 'Votre situation, exactement',
                  desc: '✓ 2 ou 3 enfants, horaires différents\n✓ Répartition proportionnelle aux heures\n✓ Équilibrage au reste à charge CAF\n✓ Frais d\'entretien, repas, transport inclus'
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--sage)] mb-3"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/></svg>
                  ),
                  title: 'Simple pour tous',
                  desc: '✓ La nounou reçoit un lien sans compte\n✓ Elle voit ce que chaque famille lui verse\n✓ Fini les surprises sur le compte'
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--sage)] mb-3"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/><path d="M11 15h1"/><path d="M12 15v3"/></svg>
                  ),
                  title: 'Pas juste pour démarrer. Pour chaque mois.',
                  desc: '✓ Congés, maladies, absences tracés\n✓ Impact calculé automatiquement\n✓ Remplace les fils WhatsApp'
                },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-white/5 rounded-xl p-5">
                  <div>{icon}</div>
                  <div className="text-sm font-semibold mb-1.5">{title}</div>
                  <div className="text-xs text-white/50 leading-relaxed whitespace-pre-line">{desc}</div>
                </div>
              ))}
            </div>

            {/* Témoignages — 1 col mobile / 3 col desktop */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 md:mb-12 text-left">
              {[
                { quote: 'À remplacer par un vrai témoignage.', author: 'Prénom, Ville' },
                { quote: 'À remplacer par un vrai témoignage.', author: 'Prénom, Ville' },
                { quote: 'À remplacer par un vrai témoignage.', author: 'Prénom, Ville' },
              ].map((t, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-5">
                  <div className="text-[var(--sage)] text-sm mb-2">★★★★★</div>
                  <p className="text-xs text-white/60 italic leading-relaxed mb-3">&ldquo;{t.quote}&rdquo;</p>
                  <p className="text-xs font-medium text-white/80">{t.author}</p>
                </div>
              ))}
            </div>

            <button onClick={() => router.push('/sign-up')}
              className="w-full sm:w-auto px-8 py-4 bg-[var(--sage)] text-white rounded-xl text-[15px] font-semibold hover:bg-[#3a5431] transition-colors">
              Créer mon compte →
            </button>
            <p className="text-xs text-white/40 mt-3">Configuration en 2 min · La nounou n&apos;a pas besoin de compte</p>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────── */}
        <footer className="bg-white border-t border-[var(--line)] py-6 px-5 md:px-6">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center md:justify-between gap-4 text-center md:text-left">
            <span className="font-serif text-[15px] text-[var(--ink)]">
              nounoulink<em className="text-[var(--sage)] not-italic">.</em>
            </span>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6 text-xs text-[var(--dust)]">
              <a href="/mentions-legales"           className="hover:text-[var(--ink)] transition-colors no-underline">Mentions légales</a>
              <a href="/politique-confidentialite"  className="hover:text-[var(--ink)] transition-colors no-underline">Politique de confidentialité</a>
              <a href="/faq"                        className="hover:text-[var(--ink)] transition-colors no-underline">FAQ</a>
              <a href="mailto:contact@nounoulink.fr" className="hover:text-[var(--ink)] transition-colors no-underline">Contact</a>
            </div>
            <span className="text-xs text-[var(--dust)]">© {new Date().getFullYear()} nounoulink</span>
          </div>
        </footer>

      </main>

      {/* ── MODAL ÉVÉNEMENT ──────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/35 z-[150] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-[360px]">
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
            {evtType === 'conge_paye'     && <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-3">Les CP n&apos;impactent pas le salaire net mensuel.</p>}
            {evtType === 'maladie_nounou' && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">Les jours de maladie réduisent proportionnellement le salaire.</p>}
            <div className="grid grid-cols-2 gap-3 mb-1">
              <div>
                <label className="text-xs block mb-1 text-[var(--dust)]">Début</label>
                <input type="date" value={evtDebut} min={minDate} max={maxDate} onChange={e => { setEvtDebut(e.target.value); setModalError(''); }} className={inp} />
              </div>
              <div>
                <label className="text-xs block mb-1 text-[var(--dust)]">Fin</label>
                <input type="date" value={evtFin} min={minDate} max={maxDate} onChange={e => { setEvtFin(e.target.value); setModalError(''); }} className={inp} />
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

      {/* ── CSS sliders ──────────────────────────────────────────── */}
      <style jsx global>{`
        .demo-slider::-webkit-slider-thumb,.demo-slider-mob::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 18px; height: 18px; border-radius: 50%;
          background: white; border: 2px solid var(--sage);
          cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .demo-slider::-moz-range-thumb,.demo-slider-mob::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: white; border: 2px solid var(--sage);
          cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .demo-slider3::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 20px; height: 20px; border-radius: 50%;
          background: white; border: 2px solid var(--sage);
          cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .demo-slider3::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 50%;
          background: white; border: 2px solid var(--sage);
          cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
      `}</style>

    </div>
  );
}

function RatioPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-[var(--sage)] bg-[var(--sage-light,#eef4ec)] text-[var(--sage)]'
          : 'border-[var(--line)] text-[var(--dust)] hover:text-[var(--ink)]'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[var(--sage)]' : 'bg-[var(--line)]'}`} />
      {label}
    </button>
  );
}

function NumInput({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
  const [raw, setRaw] = useState(() => value !== 0 ? String(value) : '');
  return (
    <input type="text" inputMode="decimal" value={raw} placeholder="0"
      onChange={e => { const s = e.target.value; setRaw(s); const n = parseFloat(s.replace(',', '.')); onChange(isNaN(n) ? 0 : n); }}
      onBlur={() => { const n = parseFloat(raw.replace(',', '.')); setRaw(!isNaN(n) && n !== 0 ? String(n) : ''); onChange(isNaN(n) ? 0 : n); }}
      className={className} />
  );
}

const btnPri   = 'px-4 py-2 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors';
const btnSec   = 'px-4 py-2 border border-[var(--line)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] transition-colors bg-white text-[var(--ink)]';
const btnGhost = 'px-4 py-2 border border-[var(--line)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] text-[var(--dust)] hover:text-[var(--ink)] transition-colors bg-white';
const numInp   = 'px-3 py-2 border-[1.5px] border-[var(--line)] rounded-lg text-[14px] font-semibold text-center outline-none focus:border-[var(--sage)] bg-white';
const inp      = 'w-full px-3 py-2 rounded-lg text-sm outline-none bg-white border-[1.5px] border-[var(--line)] focus:border-[var(--sage)]';