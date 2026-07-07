'use client';

import { useState } from 'react';

type EnfantBadge = { id: string; prenom: string; fam: string };

export function EditableEnfantsBadges({
  gardeId, enfants, editable,
}: {
  gardeId: string;
  enfants: EnfantBadge[];
  editable: boolean;
}) {
  const [items, setItems]           = useState(enfants);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [draft, setDraft]           = useState('');
  const [savingId, setSavingId]     = useState<string | null>(null);

  function startEdit(e: EnfantBadge) {
    if (!editable) return;
    setEditingId(e.id);
    setDraft(e.prenom);
  }

  async function commit(id: string) {
    setEditingId(null);
    const prenom = draft.trim();
    const prev = items.find(i => i.id === id);
    if (!prev || !prenom || prev.prenom === prenom) return;

    setItems(cur => cur.map(i => (i.id === id ? { ...i, prenom } : i)));
    setSavingId(id);
    try {
      const res = await fetch(`/api/gardes/${gardeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enfants: [{ id, prenom }] }),
      });
      if (!res.ok) throw new Error('save failed');
    } catch {
      setItems(cur => cur.map(i => (i.id === id ? prev : i)));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map(e =>
        editingId === e.id ? (
          <input
            key={e.id}
            autoFocus
            value={draft}
            onChange={ev => setDraft(ev.target.value)}
            onBlur={() => commit(e.id)}
            onKeyDown={ev => {
              if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
              if (ev.key === 'Escape') setEditingId(null);
            }}
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium outline-none border bg-white ${e.fam === 'A' ? 'border-[var(--blue)] text-[var(--blue)]' : 'border-[var(--sage)] text-[var(--sage)]'}`}
            style={{ width: `${Math.max(draft.length + 1, 5)}ch` }}
          />
        ) : (
          <button
            key={e.id}
            type="button"
            onClick={() => startEdit(e)}
            disabled={!editable}
            title={editable ? 'Cliquer pour renommer' : undefined}
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-opacity ${e.fam === 'A' ? 'bg-[var(--blue-light)] text-[var(--blue)]' : 'bg-[var(--sage-light)] text-[var(--sage)]'} ${editable ? 'hover:opacity-70 cursor-pointer' : 'cursor-default'} ${savingId === e.id ? 'opacity-50' : ''}`}
          >
            {e.prenom}
          </button>
        )
      )}
    </div>
  );
}
