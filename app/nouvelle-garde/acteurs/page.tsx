'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Enfant = { prenom: string; fam: 'A' | 'B' };

const STORAGE_KEY = 'ng_acteurs';

export default function ActeursPage() {
  const router = useRouter();

  const [nounouPrenom, setNounouPrenom] = useState('');
  const [nounouEmail,  setNounouEmail]  = useState('');
  const [famANom,  setFamANom]  = useState('');
  const [famAEmail, setFamAEmail] = useState('');
  const [famBNom,  setFamBNom]  = useState('');
  const [famBEmail, setFamBEmail] = useState('');
  const [enfants, setEnfants]   = useState<Enfant[]>([
    { prenom: '', fam: 'A' },
    { prenom: '', fam: 'B' },
  ]);
  const [error, setError] = useState('');

  // Restore from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const d = JSON.parse(saved);
    setNounouPrenom(d.nounouPrenom ?? '');
    setNounouEmail(d.nounouEmail ?? '');
    setFamANom(d.famANom ?? '');
    setFamAEmail(d.famAEmail ?? '');
    setFamBNom(d.famBNom ?? '');
    setFamBEmail(d.famBEmail ?? '');
    setEnfants(d.enfants ?? [{ prenom: '', fam: 'A' }, { prenom: '', fam: 'B' }]);
  }, []);

  function updateEnfant(i: number, field: keyof Enfant, val: string) {
    setEnfants(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  }
  function ajouterEnfant() {
    if (enfants.length < 3) setEnfants(prev => [...prev, { prenom: '', fam: 'A' }]);
  }
  function supprimerEnfant(i: number) {
    if (enfants.length > 2) setEnfants(prev => prev.filter((_, idx) => idx !== i));
  }

  function suivant() {
    setError('');
    if (!nounouPrenom.trim()) { setError('Le prénom de la nounou est requis.'); return; }
    if (!famANom.trim())      { setError('Le nom de la Famille A est requis.'); return; }
    const enfantsValides = enfants.filter(e => e.prenom.trim());
    if (enfantsValides.length < 2) { setError('Au moins 2 enfants sont requis.'); return; }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      nounouPrenom, nounouEmail, famANom, famAEmail, famBNom, famBEmail,
      enfants: enfantsValides,
    }));
    router.push('/nouvelle-garde/planning');
  }

  return (
    <div className="space-y-6">

      {/* Nounou */}
      <Card title="Votre nounou">
        <Field label="Prénom" required>
          <input className={input} value={nounouPrenom} onChange={e => setNounouPrenom(e.target.value)} placeholder="Marie" />
        </Field>
        <Field label="Email" hint="Pour lui envoyer les récapitulatifs">
          <input className={input} type="email" value={nounouEmail} onChange={e => setNounouEmail(e.target.value)} placeholder="marie@exemple.fr" />
        </Field>
      </Card>

      {/* Famille A */}
      <Card title="Famille A" accent="blue">
        <Field label="Nom de famille" required>
          <input className={input} value={famANom} onChange={e => setFamANom(e.target.value)} placeholder="Dupont" />
        </Field>
        <Field label="Email">
          <input className={input} type="email" value={famAEmail} onChange={e => setFamAEmail(e.target.value)} placeholder="dupont@exemple.fr" />
        </Field>
      </Card>

      {/* Famille B */}
      <Card title="Famille B" accent="sage">
        <p className="text-xs text-[var(--dust)] mb-4 bg-[var(--sage-light)] rounded-lg px-3 py-2">
          Famille B pourra créer son compte via un lien d&apos;invitation que vous enverrez après configuration.
        </p>
        <Field label="Nom de famille" hint="Optionnel — vous pourrez le modifier plus tard">
          <input className={input} value={famBNom} onChange={e => setFamBNom(e.target.value)} placeholder="Martin" />
        </Field>
        <Field label="Email">
          <input className={input} type="email" value={famBEmail} onChange={e => setFamBEmail(e.target.value)} placeholder="martin@exemple.fr" />
        </Field>
      </Card>

      {/* Enfants */}
      <Card title="Enfants gardés">
        <div className="space-y-3">
          {enfants.map((e, i) => (
            <div key={i} className="flex gap-3 items-start bg-[var(--paper)] rounded-lg p-3 border border-[var(--line)]">
              <div className="flex-1">
                <input
                  className={input}
                  value={e.prenom}
                  onChange={ev => updateEnfant(i, 'prenom', ev.target.value)}
                  placeholder={`Prénom enfant ${i + 1}`}
                />
              </div>
              <div className="flex gap-3 pt-2.5">
                {(['A', 'B'] as const).map(fam => (
                  <label key={fam} className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name={`fam-${i}`}
                      checked={e.fam === fam}
                      onChange={() => updateEnfant(i, 'fam', fam)}
                      className="accent-[var(--sage)]"
                    />
                    <span className={e.fam === fam ? 'font-medium' : 'text-[var(--dust)]'}>Fam. {fam}</span>
                  </label>
                ))}
              </div>
              {enfants.length > 2 && (
                <button onClick={() => supprimerEnfant(i)} className="pt-2.5 text-[var(--dust)] hover:text-[var(--red)] text-lg leading-none">×</button>
              )}
            </div>
          ))}
          {enfants.length < 3 && (
            <button onClick={ajouterEnfant} className="w-full py-2.5 border-2 border-dashed border-[var(--line)] rounded-lg text-sm text-[var(--dust)] hover:border-[var(--sage-mid)] hover:text-[var(--sage)] transition-colors">
              + Ajouter un 3ème enfant
            </button>
          )}
        </div>
      </Card>

      {error && <p className="text-sm text-[var(--red)] bg-[var(--red-light)] rounded-lg px-4 py-2">{error}</p>}

      <div className="flex justify-end pt-2">
        <button onClick={suivant} className={btnPrimary}>
          Suivant : Planning →
        </button>
      </div>
    </div>
  );
}

/* ── Petits composants locaux ──────────────────────────────────── */
function Card({ title, accent, children }: { title: string; accent?: 'blue' | 'sage'; children: React.ReactNode }) {
  const borderTop = accent === 'blue' ? 'border-t-[3px] border-t-[var(--blue)]'
    : accent === 'sage' ? 'border-t-[3px] border-t-[var(--sage)]' : '';
  return (
    <div className={`bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden ${borderTop}`}>
      <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-sm font-medium">{title}</div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}
function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">
        {label}{required && <span className="text-[var(--red)] ml-1">*</span>}
        {hint && <span className="text-xs text-[var(--dust)] font-normal ml-2">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
const input = 'w-full px-3 py-2 border-[1.5px] border-[var(--line)] rounded-[var(--radius)] text-sm bg-white outline-none focus:border-[var(--sage)] focus:ring-2 focus:ring-[var(--sage-light)] transition-colors placeholder:text-gray-300';
const btnPrimary = 'px-6 py-2.5 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors';
