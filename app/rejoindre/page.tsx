'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

function RejoindreContent() {
  const router      = useRouter();
  const params      = useSearchParams();
  const token       = params.get('token') ?? '';
  useSession();

  const [gardeName, setGardeName] = useState('');
  const [tokenErr,  setTokenErr]  = useState('');
  const [tab,       setTab]       = useState<'register' | 'login'>('register');

  // Champs register
  const [prenom, setPrenom] = useState('');
  const [nom,    setNom]    = useState('');
  const [email,  setEmail]  = useState('');
  const [pwd,    setPwd]    = useState('');
  const [nomFam, setNomFam] = useState('');

  // Champs login
  const [lEmail, setLEmail] = useState('');
  const [lPwd,   setLPwd]   = useState('');

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Valider le token au chargement
  useEffect(() => {
    if (!token) { setTokenErr('Lien d\'invitation manquant.'); return; }
    fetch(`/api/public/invitation/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setTokenErr(d.error);
        else setGardeName(d.garde.nom ?? 'une garde partagée');
      });
  }, [token]);

  async function rejoindre(userId: string) {
    const res = await fetch(`/api/public/invitation/${token}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, nomAffiche: nomFam || undefined }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    router.push(`/gardes/${data.gardeId}`);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pwd, prenom, nom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const result = await signIn('credentials', { email, password: pwd, redirect: false });
      if (result?.error) throw new Error('Erreur de connexion après inscription');

      await rejoindre(data.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', { email: lEmail, password: lPwd, redirect: false });
      if (result?.error) throw new Error('Identifiants incorrects');

      // Récupère l'userId via session (elle se met à jour après signIn)
      // On utilise l'API register pour retrouver l'id → on fetch /api/gardes à la place
      const me = await fetch('/api/auth/me').then(r => r.json());
      await rejoindre(me.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setLoading(false);
    }
  }

  if (tokenErr) {
    return (
      <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center p-6">
        <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] p-8 max-w-sm text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="font-medium text-[var(--ink)] mb-2">Lien invalide</h1>
          <p className="text-sm text-[var(--dust)]">{tokenErr}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center p-6">
      <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] p-8 w-[min(440px,100%)] shadow-sm">
        <a href="/" className="font-serif text-xl block mb-2">nounoulink<em className="text-[var(--sage)] not-italic">.</em></a>
        {gardeName && (
          <p className="text-sm text-[var(--dust)] mb-6">
            Vous avez été invité(e) à rejoindre <strong className="text-[var(--ink)]">{gardeName}</strong>.
          </p>
        )}

        {/* Nom famille (optionnel) */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-1.5">Votre nom de famille <span className="text-[var(--dust)] font-normal text-xs">(optionnel)</span></label>
          <input className={inp} value={nomFam} onChange={e => setNomFam(e.target.value)} placeholder="Martin" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--line)] mb-5">
          {(['register', 'login'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); }} className={'flex-1 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ' + (tab === t ? 'border-[var(--sage)] text-[var(--sage)]' : 'border-transparent text-[var(--dust)]')}>
              {t === 'register' ? 'Créer un compte' : 'J\'ai déjà un compte'}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-[var(--red)] bg-[var(--red-light)] rounded-lg px-3 py-2 mb-4">{error}</p>}

        {tab === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input className={inp} placeholder="Prénom" required value={prenom} onChange={e => setPrenom(e.target.value)} />
              <input className={inp} placeholder="Nom"    value={nom}    onChange={e => setNom(e.target.value)} />
            </div>
            <input className={inp} type="email"    placeholder="Email"        required value={email} onChange={e => setEmail(e.target.value)} />
            <input className={inp} type="password" placeholder="Mot de passe" required minLength={8} value={pwd} onChange={e => setPwd(e.target.value)} />
            <button type="submit" disabled={loading} className={btnPri + ' w-full'}>
              {loading ? 'Création…' : 'Créer mon compte et rejoindre'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            <input className={inp} type="email"    placeholder="Email"        required value={lEmail} onChange={e => setLEmail(e.target.value)} />
            <input className={inp} type="password" placeholder="Mot de passe" required value={lPwd}   onChange={e => setLPwd(e.target.value)} />
            <button type="submit" disabled={loading} className={btnPri + ' w-full'}>
              {loading ? 'Connexion…' : 'Se connecter et rejoindre'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function RejoindreePage() {
  return <Suspense><RejoindreContent /></Suspense>;
}

const inp    = 'w-full px-3 py-2 border-[1.5px] border-[var(--line)] rounded-lg text-sm outline-none focus:border-[var(--sage)] focus:ring-2 focus:ring-[var(--sage-light)] bg-white placeholder:text-gray-300';
const btnPri = 'px-4 py-2.5 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors disabled:opacity-50';
