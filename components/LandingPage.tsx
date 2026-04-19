'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type NbEnfants = 2 | 3;

export function LandingPage() {
  const router = useRouter();

  // Demo state
  const [taux,      setTaux]      = useState(11);
  const [hHebdo,    setHHebdo]    = useState(40);
  const [nbEnfants, setNbEnfants] = useState<NbEnfants>(2);

  // Auth modal
  const [authOpen,    setAuthOpen]    = useState(false);
  const [authTab,     setAuthTab]     = useState<'login' | 'register'>('login');
  const [authEmail,   setAuthEmail]   = useState('');
  const [authPwd,     setAuthPwd]     = useState('');
  const [authPrenom,  setAuthPrenom]  = useState('');
  const [authNom,     setAuthNom]     = useState('');
  const [authError,   setAuthError]   = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Calcul simplifié : salaire net mensuel (52 semaines / 12)
  const salNetMens = Math.round(hHebdo * (52 / 12) * taux * 100) / 100;
  const qpA        = nbEnfants === 2 ? 0.5 : 2 / 3;
  const salNetA    = Math.round(salNetMens * qpA * 100) / 100;
  const salNetB    = Math.round(salNetMens * (1 - qpA) * 100) / 100;

  function openAuth(tab: 'login' | 'register') {
    setAuthTab(tab); setAuthOpen(true); setAuthError('');
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true); setAuthError('');
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
            Fini les désaccords<br />
            <em className="not-italic text-[var(--sage)]">sur le salaire de votre nounou.</em>
          </h1>
          <p className="text-[17px] text-[var(--dust)] leading-relaxed mb-10 max-w-lg mx-auto">
            Calculez en 30 secondes, simulez les absences, et alignez-vous avec l&apos;autre famille — sans tableur, sans WhatsApp.
          </p>
          <p className="text-sm text-[var(--dust)]">
            <span className="mr-1">👇</span> Essayez maintenant, modifiez les 3 paramètres ci-dessous
          </p>
        </section>

        {/* ── 2. DÉMO ──────────────────────────────────────────────── */}
        <section className="max-w-xl mx-auto px-6 pb-20">

          {/* Inputs */}
          <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden shadow-sm mb-5">
            <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-xs font-medium text-[var(--dust)] uppercase tracking-wide">
              Paramètres
            </div>
            <div className="divide-y divide-[var(--line)]">
              <InputRow label="Taux horaire net" hint="€ / heure">
                <input
                  type="number" min={5} max={50} step={0.5} value={taux}
                  onChange={e => setTaux(parseFloat(e.target.value) || 11)}
                  className={numInp}
                />
              </InputRow>
              <InputRow label="Heures par semaine" hint="h / sem.">
                <input
                  type="number" min={1} max={60} step={1} value={hHebdo}
                  onChange={e => setHHebdo(parseInt(e.target.value) || 40)}
                  className={numInp}
                />
              </InputRow>
              <InputRow label="Nombre d'enfants" hint="">
                <div className="flex rounded-lg overflow-hidden border border-[var(--line)]">
                  {([2, 3] as const).map(n => (
                    <button key={n} onClick={() => setNbEnfants(n)}
                      className={'px-5 py-1.5 text-sm font-medium transition-colors ' + (nbEnfants === n ? 'bg-[var(--sage)] text-white' : 'bg-white text-[var(--dust)] hover:text-[var(--ink)]')}>
                      {n}
                    </button>
                  ))}
                </div>
              </InputRow>
            </div>
          </div>

          {/* Résultats */}
          <div className="grid grid-cols-3 gap-3">
            <ResultCard
              label="Total nounou"
              sublabel="Salaire net / mois"
              value={salNetMens}
              color="ink"
              bold
            />
            <ResultCard
              label="Famille A"
              sublabel={nbEnfants === 3 ? '2 enfants · 66,7 %' : '1 enfant · 50 %'}
              value={salNetA}
              color="blue"
            />
            <ResultCard
              label="Famille B"
              sublabel={nbEnfants === 3 ? '1 enfant · 33,3 %' : '1 enfant · 50 %'}
              value={salNetB}
              color="sage"
            />
          </div>

          <p className="text-center text-xs text-[var(--dust)] mt-4">
            Répartition proportionnelle au nombre d&apos;enfants · hors indemnités
          </p>
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
                { icon: '⚙️', title: 'Calcul sur mesure',      desc: 'Planning personnalisé, heures réelles ou mensualisées, cas 2 et 3 enfants.' },
                { icon: '👨‍👩‍👦‍👦', title: 'Collaboration famille',  desc: 'Chaque famille accède à ses chiffres. Fini les allers-retours sur WhatsApp.' },
                { icon: '📅', title: 'Suivi mensuel',           desc: 'Historique des salaires, congés et absences. Toujours à jour, toujours lisible.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-white/5 rounded-xl p-5">
                  <div className="text-2xl mb-3">{icon}</div>
                  <div className="text-sm font-semibold mb-1.5">{title}</div>
                  <div className="text-xs text-white/50 leading-relaxed">{desc}</div>
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
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function InputRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div>
        <div className="text-sm font-medium text-[var(--ink)]">{label}</div>
        {hint && <div className="text-xs text-[var(--dust)]">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function ResultCard({ label, sublabel, value, color, bold }: {
  label: string; sublabel: string; value: number; color: 'ink' | 'blue' | 'sage'; bold?: boolean;
}) {
  const textColor = color === 'ink' ? 'text-[var(--ink)]' : color === 'blue' ? 'text-[var(--blue)]' : 'text-[var(--sage)]';
  const bg        = color === 'ink' ? 'bg-[var(--paper)]' : color === 'blue' ? 'bg-blue-50' : 'bg-[var(--sage-light)]';
  return (
    <div className={`rounded-xl p-4 ${bg}`}>
      <div className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${textColor}`}>{label}</div>
      <div className={`text-xl ${bold ? 'font-bold' : 'font-semibold'} ${textColor}`}>{value.toFixed(2)} €</div>
      <div className="text-[10px] text-[var(--dust)] mt-1">{sublabel}</div>
    </div>
  );
}

const btnPri = 'px-4 py-2 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors';
const btnSec = 'px-4 py-2 border border-[var(--line)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] transition-colors bg-white text-[var(--ink)]';
const numInp = 'w-20 px-2 py-1.5 border-[1.5px] border-[var(--line)] rounded-lg text-[14px] font-semibold text-center outline-none focus:border-[var(--sage)] bg-white';
const inp    = 'w-full px-3 py-2 rounded-lg text-sm outline-none bg-white border-[1.5px] border-[var(--line)] focus:border-[var(--sage)]';
