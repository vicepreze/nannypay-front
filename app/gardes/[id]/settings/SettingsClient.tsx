'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignOutButton } from '@/components/SignOutButton';

type Tab = 'acteurs' | 'planning' | 'paie';

type Props = {
  gardeId: string;
  gardeNom: string;
  moisUrl: string;
  famA: { id: string; nomAffiche: string; emailContact: string };
  famB: { id: string; nomAffiche: string; emailContact: string };
  nounou: { prenom: string; nom: string; email: string } | null;
  modele: {
    tauxHoraireNet: number;
    hNormalesSemaine: number;
    hSup25Semaine: number;
    hSup50Semaine: number;
    navigoMontant: number;
    indemKm: number;
    indemEntretien: number;
  } | null;
};

export function SettingsClient({ gardeId, gardeNom, moisUrl, famA, famB, nounou, modele }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('acteurs');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  // Acteurs
  const [nom,         setNom]         = useState(gardeNom);
  const [nomA,        setNomA]        = useState(famA.nomAffiche);
  const [emailA,      setEmailA]      = useState(famA.emailContact);
  const [nomB,        setNomB]        = useState(famB.nomAffiche);
  const [emailB,      setEmailB]      = useState(famB.emailContact);
  const [prenomN,     setPrenomN]     = useState(nounou?.prenom ?? '');
  const [nomN,        setNomN]        = useState(nounou?.nom ?? '');
  const [emailN,      setEmailN]      = useState(nounou?.email ?? '');

  // Paie
  const [tauxNet,     setTauxNet]     = useState(modele?.tauxHoraireNet  ?? 0);
  const [hNorm,       setHNorm]       = useState(modele?.hNormalesSemaine ?? 0);
  const [hSup25,      setHSup25]      = useState(modele?.hSup25Semaine   ?? 0);
  const [hSup50,      setHSup50]      = useState(modele?.hSup50Semaine   ?? 0);
  const [navigo,      setNavigo]      = useState(modele?.navigoMontant   ?? 0);
  const [km,          setKm]          = useState(modele?.indemKm         ?? 0);
  const [entretien,   setEntretien]   = useState(modele?.indemEntretien  ?? 0);

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2500); }

  async function saveActeurs() {
    setSaving(true); setError('');
    const res = await fetch(`/api/gardes/${gardeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom,
        familleA: { nomAffiche: nomA, emailContact: emailA || null },
        familleB: { nomAffiche: nomB, emailContact: emailB || null },
        nounou:   { prenom: prenomN, nom: nomN || null, email: emailN || null },
      }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erreur'); setSaving(false); return; }
    flash(); router.refresh();
    setSaving(false);
  }

  async function savePaie() {
    if (!modele) return;
    setSaving(true); setError('');
    const res = await fetch(`/api/gardes/${gardeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modele: {
          tauxHoraireNet:   tauxNet,
          hNormalesSemaine: hNorm,
          hSup25Semaine:    hSup25,
          hSup50Semaine:    hSup50,
          navigoMontant:    navigo,
          indemKm:          km,
          indemEntretien:   entretien,
        },
      }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erreur'); setSaving(false); return; }
    flash();
    setSaving(false);
  }

  const saveLabel = saved ? '✓ Enregistré' : saving ? 'Sauvegarde…' : 'Enregistrer';

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/" className="font-serif text-base text-[var(--ink)] no-underline">nounoulink<em className="text-[var(--sage)] not-italic">.</em></Link>
          <span className="text-[var(--line)]">/</span>
          <Link href={moisUrl} className="text-[var(--dust)] hover:text-[var(--ink)] no-underline">{gardeNom || 'Garde'}</Link>
          <span className="text-[var(--line)]">/</span>
          <span className="font-medium text-[var(--ink)]">Paramètres</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-[var(--dust)] hover:text-[var(--ink)] no-underline transition-colors">Dashboard</Link>
          <Link href="/demo"      className="text-sm text-[var(--dust)] hover:text-[var(--ink)] no-underline transition-colors">Démo</Link>
          <SignOutButton />
        </div>
      </header>

      <div className="pt-14 max-w-2xl mx-auto px-6 pb-16">
        <div className="pt-8 mb-6">
          <h1 className="font-serif text-2xl text-[var(--ink)]">{gardeNom || 'Paramètres'}</h1>
          <p className="text-sm text-[var(--dust)] mt-1">Configuration de la garde partagée</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--line)] mb-6">
          {([['acteurs', 'Acteurs'], ['planning', 'Planning'], ['paie', 'Paie']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); setSaved(false); setError(''); }}
              className="px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
              style={{
                borderBottomColor: tab === id ? 'var(--sage)' : 'transparent',
                color: tab === id ? 'var(--sage)' : 'var(--dust)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-600">{error}</div>}

        {/* ── Acteurs ── */}
        {tab === 'acteurs' && (
          <div className="space-y-4">
            <Card title="Nom de la garde">
              <F label="Nom" value={nom} onChange={setNom} />
            </Card>
            <Card title="Nounou">
              <div className="grid grid-cols-2 gap-3">
                <F label="Prénom *" value={prenomN} onChange={setPrenomN} />
                <F label="Nom"      value={nomN}    onChange={setNomN} />
              </div>
              <F label="Email" value={emailN} onChange={setEmailN} type="email" />
            </Card>
            <Card title="Famille A">
              <div className="grid grid-cols-2 gap-3">
                <F label="Nom affiché *" value={nomA}   onChange={setNomA} />
                <F label="Email"         value={emailA} onChange={setEmailA} type="email" />
              </div>
            </Card>
            <Card title="Famille B">
              <div className="grid grid-cols-2 gap-3">
                <F label="Nom affiché" value={nomB}   onChange={setNomB} />
                <F label="Email"       value={emailB} onChange={setEmailB} type="email" />
              </div>
            </Card>
            <div className="flex justify-end">
              <Btn onClick={saveActeurs} disabled={saving} label={saveLabel} />
            </div>
          </div>
        )}

        {/* ── Planning ── */}
        {tab === 'planning' && (
          <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] p-8 text-center">
            <p className="text-sm text-[var(--ink)] mb-1">Modifier le planning type</p>
            <p className="text-xs text-[var(--dust)] mb-5">Horaires par enfant, jours travaillés, heures normales et supplémentaires.</p>
            <Link href={`/nouvelle-garde/planning`}
              className="inline-block px-5 py-2.5 rounded-[var(--radius)] text-sm font-medium text-white bg-[var(--sage)] hover:bg-[#3a5431] no-underline transition-colors">
              Ouvrir le planning →
            </Link>
          </div>
        )}

        {/* ── Paie ── */}
        {tab === 'paie' && (
          modele ? (
            <div className="space-y-4">
              <Card title="Rémunération">
                <FN label="Taux horaire net (€/h)" value={tauxNet}   onChange={setTauxNet} />
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <FN label="H. normales/sem."  value={hNorm}  onChange={setHNorm} />
                  <FN label="H. sup +25%/sem."  value={hSup25} onChange={setHSup25} />
                  <FN label="H. sup +50%/sem."  value={hSup50} onChange={setHSup50} />
                </div>
              </Card>
              <Card title="Indemnités">
                <div className="grid grid-cols-3 gap-3">
                  <FN label="Navigo (€/mois)"   value={navigo}    onChange={setNavigo} />
                  <FN label="Frais km (€/mois)"  value={km}        onChange={setKm} />
                  <FN label="Entretien (€/j)"    value={entretien} onChange={setEntretien} />
                </div>
              </Card>
              <div className="flex justify-end">
                <Btn onClick={savePaie} disabled={saving} label={saveLabel} />
              </div>
            </div>
          ) : (
            <div className="bg-white border border-dashed border-[var(--line)] rounded-[var(--radius)] p-8 text-center">
              <p className="text-sm text-[var(--dust)] mb-4">Aucun modèle de paie — configurez d&apos;abord le planning.</p>
              <Link href="/nouvelle-garde/planning" className="inline-block px-4 py-2 rounded-[var(--radius)] text-sm font-medium text-white bg-[var(--sage)] no-underline">
                Configurer le planning →
              </Link>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] overflow-hidden bg-white border border-[var(--line)]">
      <div className="px-5 py-3 text-sm font-semibold border-b border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]">{title}</div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

function F({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-[var(--dust)]">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-white border border-[var(--line)] focus:border-[var(--sage)]" />
    </div>
  );
}

function FN({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-[var(--dust)]">{label}</label>
      <input type="number" step="0.01" min="0" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-white border border-[var(--line)] focus:border-[var(--sage)]" />
    </div>
  );
}

function Btn({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  const green = label.startsWith('✓');
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-5 py-2.5 rounded-[var(--radius)] text-sm font-semibold text-white disabled:opacity-50 transition-colors"
      style={{ background: green ? '#2e7d32' : 'var(--sage)' }}>
      {label}
    </button>
  );
}
