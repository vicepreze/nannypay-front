'use client';

import { useRouter } from 'next/navigation';

export function ArchiveButton({ gardeId, className }: { gardeId: string; className?: string }) {
  const router = useRouter();
  async function handleClick() {
    if (!confirm('Archiver cette garde ? Elle ne sera plus visible dans la liste principale.')) return;
    await fetch(`/api/gardes/${gardeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'archivé' }),
    });
    router.refresh();
  }
  return (
    <button onClick={handleClick} className={className}>
      Archiver
    </button>
  );
}
