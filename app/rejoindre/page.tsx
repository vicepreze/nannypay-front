'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth, SignIn, SignUp } from '@clerk/nextjs';

function RejoindreContent() {
  const router      = useRouter();
  const params      = useSearchParams();
  const token       = params.get('token') ?? '';
  const { userId, isLoaded } = useAuth();

  const [gardeName, setGardeName] = useState('');
  const [tokenErr,  setTokenErr]  = useState('');
  const [famBDisponible,   setFamBDisponible]   = useState(true);
  const [nounouDisponible, setNounouDisponible] = useState(true);
  const [role,      setRole]      = useState<'B' | 'nounou' | null>(null);
  const [tab,       setTab]       = useState<'login' | 'register'>('register');
  const [nomFam,    setNomFam]    = useState('');
  const [joining,   setJoining]   = useState(false);
  const [error,     setError]     = useState('');

  // Valider le token au chargement
  useEffect(() => {
    if (!token) { setTokenErr('Lien d\'invitation manquant.'); return; }
    fetch(`/api/public/invitation/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setTokenErr(d.error); return; }
        setGardeName(d.garde.nom ?? 'une garde partagée');
        setFamBDisponible(d.famBDisponible);
        setNounouDisponible(d.nounouDisponible);
      });
  }, [token]);

  // Dès que l'utilisateur est connecté (et a choisi son rôle), on le rattache à la garde
  useEffect(() => {
    if (!isLoaded || !userId || !token || tokenErr || !role) return;
    setJoining(true);
    fetch(`/api/public/invitation/${token}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role, nomAffiche: role === 'B' ? (nomFam || undefined) : undefined }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setJoining(false); }
        else router.push(`/gardes/${d.gardeId}`);
      })
      .catch(() => { setError('Erreur réseau'); setJoining(false); });
  }, [isLoaded, userId, token, tokenErr, role]); // nomFam intentionnellement absent pour ne pas re-trigger

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

  if (!isLoaded || joining) {
    return (
      <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center">
        <p className="text-sm text-[var(--dust)]">{joining ? 'Rattachement en cours…' : 'Chargement…'}</p>
      </div>
    );
  }

  if (!famBDisponible && !nounouDisponible) {
    return (
      <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center p-6">
        <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] p-8 max-w-sm text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="font-medium text-[var(--ink)] mb-2">Ce lien a déjà été utilisé</h1>
          <p className="text-sm text-[var(--dust)]">Famille B et la nounou ont déjà rejoint cette garde.</p>
        </div>
      </div>
    );
  }

  // L'invité se déclare (Famille B ou nounou) avant de créer/se connecter à son compte
  if (!role) {
    return (
      <div className="min-h-screen bg-[var(--paper)] flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-center mb-2">
          <a href="/" className="font-serif text-xl">nounoulink<em className="text-[var(--sage)] not-italic">.</em></a>
          {gardeName && (
            <p className="text-sm text-[var(--dust)] mt-2">
              Vous avez été invité(e) à rejoindre <strong className="text-[var(--ink)]">{gardeName}</strong>.
            </p>
          )}
        </div>
        <div className="w-full max-w-sm space-y-3">
          <p className="text-sm font-medium text-[var(--ink)] text-center mb-1">Vous êtes :</p>
          <button
            onClick={() => setRole('B')}
            disabled={!famBDisponible}
            className="w-full px-4 py-3 bg-white border-[1.5px] border-[var(--line)] rounded-[var(--radius)] text-sm font-medium text-[var(--ink)] hover:border-[var(--sage)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            👨‍👩‍👧 L&apos;autre famille (Famille B){!famBDisponible && ' · déjà rejoint'}
          </button>
          <button
            onClick={() => setRole('nounou')}
            disabled={!nounouDisponible}
            className="w-full px-4 py-3 bg-white border-[1.5px] border-[var(--line)] rounded-[var(--radius)] text-sm font-medium text-[var(--ink)] hover:border-[var(--sage)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            👩 La nounou{!nounouDisponible && ' · déjà rejoint'}
          </button>
        </div>
      </div>
    );
  }

  // Utilisateur déjà connecté → le useEffect s'en charge
  if (userId) return null;

  // Utilisateur non connecté → afficher sign-in / sign-up Clerk
  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-center mb-2">
        <a href="/" className="font-serif text-xl">nounoulink<em className="text-[var(--sage)] not-italic">.</em></a>
        {gardeName && (
          <p className="text-sm text-[var(--dust)] mt-2">
            Vous avez été invité(e) à rejoindre <strong className="text-[var(--ink)]">{gardeName}</strong>.
          </p>
        )}
      </div>

      {/* Nom famille optionnel — uniquement pour Famille B */}
      {role === 'B' && (
        <div className="w-full max-w-sm">
          <label className="block text-sm font-medium mb-1.5 text-[var(--ink)]">
            Votre nom de famille <span className="text-[var(--dust)] font-normal text-xs">(optionnel)</span>
          </label>
          <input
            className="w-full px-3 py-2 border-[1.5px] border-[var(--line)] rounded-lg text-sm outline-none focus:border-[var(--sage)] bg-white placeholder:text-gray-300"
            value={nomFam}
            onChange={e => setNomFam(e.target.value)}
            placeholder="Martin"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 w-full max-w-sm text-center">{error}</p>
      )}

      {/* Tabs */}
      <div className="w-full max-w-sm">
        <div className="flex border-b border-[var(--line)] mb-5">
          {(['register', 'login'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={'flex-1 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ' +
                (tab === t ? 'border-[var(--sage)] text-[var(--sage)]' : 'border-transparent text-[var(--dust)]')}
            >
              {t === 'register' ? 'Créer un compte' : 'J\'ai déjà un compte'}
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          {tab === 'register'
            ? <SignUp routing="hash" />
            : <SignIn  routing="hash" />
          }
        </div>
      </div>
    </div>
  );
}

export default function RejoindreePage() {
  return <Suspense><RejoindreContent /></Suspense>;
}
