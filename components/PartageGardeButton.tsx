'use client';

import { useState } from 'react';

type Props = { gardeId: string; initialToken: string | null };

export function PartageGardeButton({ gardeId, initialToken }: Props) {
  const [token,   setToken]   = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [copied,  setCopied]  = useState(false);

  async function partager() {
    setLoading(true);
    let t = token;
    if (!t) {
      const res  = await fetch(`/api/gardes/${gardeId}/invitation`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setLoading(false); return; }
      t = data.token;
      setToken(t);
    }
    await navigator.clipboard.writeText(`${window.location.origin}/rejoindre?token=${t}`);
    setCopied(true);
    setLoading(false);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      onClick={partager}
      disabled={loading}
      className="px-4 py-2 bg-[var(--blue)] text-white rounded-[var(--radius)] text-sm font-medium hover:opacity-90 transition-opacity"
    >
      {copied ? '✓ Lien copié !' : loading ? 'Génération…' : '🔗 Partager l\'accès'}
    </button>
  );
}
