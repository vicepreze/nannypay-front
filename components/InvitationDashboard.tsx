'use client';

import { useState } from 'react';

export function InvitationDashboard({ gardeId, initialToken }: {
  gardeId: string;
  initialToken: string | null;
}) {
  const [token,   setToken]   = useState(initialToken);
  const [copied,  setCopied]  = useState(false);
  const [loading, setLoading] = useState(false);

  const inviteUrl = typeof window !== 'undefined' && token
    ? `${window.location.origin}/rejoindre?token=${token}` : '';

  async function generer() {
    setLoading(true);
    const res = await fetch(`/api/gardes/${gardeId}/invitation`, { method: 'POST' });
    if (res.ok) { const d = await res.json(); setToken(d.token); }
    setLoading(false);
  }

  async function revoquer() {
    if (!confirm('Révoquer le lien d\'invitation ?')) return;
    setLoading(true);
    await fetch(`/api/gardes/${gardeId}/invitation`, { method: 'DELETE' });
    setToken(null);
    setLoading(false);
  }

  function copier() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (token) {
    return (
      <div className="flex gap-2">
        <button onClick={copier} disabled={loading}
          className="flex-1 py-1.5 text-xs rounded-lg border border-[var(--line)] bg-white hover:border-[var(--sage)] transition-colors disabled:opacity-50">
          {copied ? '✓ Copié !' : 'Copier le lien'}
        </button>
        <button onClick={revoquer} disabled={loading}
          className="px-3 py-1.5 text-[10px] text-[var(--dust)] hover:text-red-500 transition-colors border border-[var(--line)] rounded-lg bg-white disabled:opacity-50">
          Révoquer
        </button>
      </div>
    );
  }

  return (
    <button onClick={generer} disabled={loading}
      className="w-full py-1.5 text-xs rounded-lg bg-[var(--sage)] text-white hover:bg-[#3a5431] transition-colors disabled:opacity-50">
      {loading ? 'Génération…' : 'Générer le lien'}
    </button>
  );
}
