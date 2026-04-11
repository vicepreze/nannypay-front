'use client';

import { useState } from 'react';
import Link from 'next/link';

type Famille = { id: string; label: string; nomAffiche: string | null; emailContact: string | null; statutAcces: string; utilisateurId: string | null };
type Enfant  = { id: string; prenom: string; fam: string };
type Nounou  = { id: string; prenom: string; nom: string | null; email: string | null } | null;
type Modele  = { tauxHoraireNet: number; hNormalesSemaine: number; hSup25Semaine: number; hSup50Semaine: number; modeCalcul: string; navigoMontant: number; indemEntretien: number; indemKm: number } | null;

export type GardeData = {
  id: string; nom: string | null; statut: string;
  invitationTokenB: string | null; invitationTokenBExpiresAt: Date | null;
  publicTokenNounou: string | null;
  nounou: Nounou; familles: Famille[]; enfants: Enfant[]; modele: Modele;
};

const MODES: Record<string, string> = {
  'A.1': 'Moitié-moitié',
  'B.1': 'Partage au temps',
  'A.2': 'Partage au coût',
  'B.2': '100% personnalisé',
};

export function GardeDetail({ garde: initial, monRole, moisUrl }: { garde: GardeData; monRole: string; moisUrl?: string }) {
  const [garde,    setGarde]   = useState(initial);
  const [token,      setToken]      = useState(initial.invitationTokenB ?? '');
  const [publicToken, setPublicToken] = useState(initial.publicTokenNounou ?? '');
  const [copied,       setCopied]       = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [loading,  setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Champs éditables
  const famA = garde.familles.find(f => f.label === 'A');
  const famB = garde.familles.find(f => f.label === 'B');
  const famBActif = famB?.statutAcces === 'invite_actif';

  const [nomGarde,      setNomGarde]      = useState(garde.nom ?? '');
  const [nounouPrenom,  setNounouPrenom]  = useState(garde.nounou?.prenom ?? '');
  const [nounouNom,     setNounouNom]     = useState(garde.nounou?.nom ?? '');
  const [nounouEmail,   setNounouEmail]   = useState(garde.nounou?.email ?? '');
  const [famANom,       setFamANom]       = useState(famA?.nomAffiche ?? '');
  const [famAEmail,     setFamAEmail]     = useState(famA?.emailContact ?? '');
  const [famBNom,       setFamBNom]       = useState(famB?.nomAffiche ?? '');
  const [famBEmail,     setFamBEmail]     = useState(famB?.emailContact ?? '');
  // Modèle de paie éditable
  const [modeleTaux,       setModeleTaux]       = useState(garde.modele?.tauxHoraireNet ?? 11);
  const [modeleNavigo,     setModeleNavigo]     = useState(garde.modele?.navigoMontant  ?? 90.8);
  const [modeleEntretien,  setModeleEntretien]  = useState(garde.modele?.indemEntretien ?? 6);
  const [modeleKm,         setModeleKm]         = useState(garde.modele?.indemKm        ?? 0);

  const inviteUrl = typeof window !== 'undefined' && token
    ? `${window.location.origin}/rejoindre?token=${token}` : '';

  async function sauvegarder() {
    setLoading(true);
    const res = await fetch(`/api/gardes/${garde.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom:     nomGarde,
        nounou:  { prenom: nounouPrenom, nom: nounouNom || null, email: nounouEmail || null },
        familleA: { nomAffiche: famANom, emailContact: famAEmail || null },
        familleB: { nomAffiche: famBNom, emailContact: famBEmail || null },
        ...(garde.modele ? { modele: { tauxHoraireNet: modeleTaux, navigoMontant: modeleNavigo, indemEntretien: modeleEntretien, indemKm: modeleKm } } : {}),
      }),
    });
    const data = await res.json();
    if (res.ok) { setGarde(data.garde); setEditMode(false); }
    setLoading(false);
  }

  async function genererInvitation() {
    setLoading(true);
    const res  = await fetch(`/api/gardes/${garde.id}/invitation`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) setToken(data.token);
    setLoading(false);
  }

  async function archiverGarde() {
    if (!confirm('Archiver cette garde ? Elle n\'apparaîtra plus dans votre dashboard.')) return;
    setLoading(true);
    const res = await fetch(`/api/gardes/${garde.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'archivé' }),
    });
    if (res.ok) window.location.href = '/dashboard';
    setLoading(false);
  }

  async function revoquerInvitation() {
    setLoading(true);
    await fetch(`/api/gardes/${garde.id}/invitation`, { method: 'DELETE' });
    setToken('');
    setLoading(false);
  }

  function copierLien() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const publicUrl = typeof window !== 'undefined' && publicToken
    ? `${window.location.origin}/public/nounou/${publicToken}` : '';

  async function genererLienPublic() {
    setLoading(true);
    const res  = await fetch(`/api/gardes/${garde.id}/public-token`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) setPublicToken(data.token);
    setLoading(false);
  }

  async function revoquerLienPublic() {
    setLoading(true);
    await fetch(`/api/gardes/${garde.id}/public-token`, { method: 'DELETE' });
    setPublicToken('');
    setLoading(false);
  }

  function copierLienPublic() {
    navigator.clipboard.writeText(publicUrl);
    setCopiedPublic(true);
    setTimeout(() => setCopiedPublic(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-[var(--dust)] hover:text-[var(--ink)] text-sm no-underline">← Dashboard</Link>
          <span className="text-[var(--line)]">/</span>
          <span className="text-sm font-medium text-[var(--ink)]">{garde.nom ?? 'Garde'}</span>
        </div>
        <div className="flex gap-2">
          {moisUrl && !editMode && (
            <Link href={moisUrl} className={btnPri + ' no-underline'}>Mois en cours</Link>
          )}
          {!editMode && garde.statut !== 'archivé' && (
            <button onClick={archiverGarde} disabled={loading} className="px-4 py-2 border-[1.5px] border-[var(--line)] text-[var(--dust)] rounded-[var(--radius)] text-sm font-medium hover:border-red-300 hover:text-red-500 transition-colors bg-white disabled:opacity-50">
              Archiver
            </button>
          )}
          {!editMode ? (
            <button onClick={() => setEditMode(true)} className={btnSec}>Modifier</button>
          ) : (
            <>
              <button onClick={() => setEditMode(false)} className={btnSec} disabled={loading}>Annuler</button>
              <button onClick={sauvegarder} className={btnPri} disabled={loading}>{loading ? 'Sauvegarde…' : 'Sauvegarder'}</button>
            </>
          )}
        </div>
      </header>

      <div className="pt-14 max-w-2xl mx-auto px-6 pb-16">
        <div className="pt-8 mb-6">
          {editMode ? (
            <input value={nomGarde} onChange={e => setNomGarde(e.target.value)} className={inp + ' font-serif text-2xl'} placeholder="Nom de la garde" />
          ) : (
            <h1 className="font-serif text-3xl text-[var(--ink)]">{garde.nom ?? 'Garde sans nom'}</h1>
          )}
        </div>

        <div className="space-y-5">

          {/* Nounou */}
          <Section title="Nounou">
            <div className="p-5 space-y-3">
              {editMode ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldEdit label="Prénom" value={nounouPrenom} onChange={setNounouPrenom} />
                    <FieldEdit label="Nom"    value={nounouNom}    onChange={setNounouNom} />
                  </div>
                  <FieldEdit label="Email" value={nounouEmail} onChange={setNounouEmail} type="email" />
                </div>
              ) : garde.nounou ? (
                <InfoRow label="Prénom / Nom" value={`${garde.nounou.prenom}${garde.nounou.nom ? ' ' + garde.nounou.nom : ''}`} />
              ) : (
                <p className="text-sm text-[var(--dust)]">Aucune nounou renseignée</p>
              )}
            </div>
          </Section>

          {/* Familles */}
          <Section title="Familles">
            <div className="divide-y divide-[var(--line)]">
              {/* Famille A */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-[var(--blue)] uppercase tracking-wide">Famille A</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--blue-light)] text-[var(--blue)]">Propriétaire</span>
                </div>
                {editMode ? (
                  <div className="grid grid-cols-2 gap-3">
                    <FieldEdit label="Nom"   value={famANom}   onChange={setFamANom} />
                    <FieldEdit label="Email" value={famAEmail} onChange={setFamAEmail} type="email" />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <InfoRow label="Nom"   value={famA?.nomAffiche   ?? '—'} />
                    <InfoRow label="Email" value={famA?.emailContact ?? '—'} />
                  </div>
                )}
              </div>

              {/* Famille B */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-[var(--sage)] uppercase tracking-wide">Famille B</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${famBActif ? 'bg-[var(--sage-light)] text-[var(--sage)]' : 'bg-[var(--paper)] text-[var(--dust)]'}`}>
                    {famBActif ? 'Actif' : 'En attente'}
                  </span>
                </div>
                {editMode ? (
                  <div className="grid grid-cols-2 gap-3">
                    <FieldEdit label="Nom"   value={famBNom}   onChange={setFamBNom} />
                    <FieldEdit label="Email" value={famBEmail} onChange={setFamBEmail} type="email" />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <InfoRow label="Nom"   value={famB?.nomAffiche   ?? '—'} />
                    <InfoRow label="Email" value={famB?.emailContact ?? '—'} />
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* Invitation Famille B — visible uniquement pour Famille A */}
          {monRole === 'A' && !famBActif && (
            <Section title="Invitation Famille B">
              <div className="p-5">
                {token ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[var(--dust)]">Envoyez ce lien à Famille B pour qu&apos;elle crée son compte :</p>
                    <div className="flex gap-2">
                      <code className="flex-1 text-xs bg-[var(--paper)] border border-[var(--line)] rounded-lg px-3 py-2 break-all text-[var(--ink)]">
                        {inviteUrl}
                      </code>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={copierLien} className={btnPri + ' flex-1'}>
                        {copied ? '✓ Copié !' : 'Copier le lien'}
                      </button>
                      <button onClick={revoquerInvitation} disabled={loading} className={btnSec}>Révoquer</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-sm text-[var(--dust)] mb-4">Générez un lien d&apos;invitation pour que Famille B puisse rejoindre.</p>
                    <button onClick={genererInvitation} disabled={loading} className={btnPri}>
                      {loading ? 'Génération…' : 'Générer un lien d\'invitation'}
                    </button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Lien public nounou */}
          <Section title="Lien de suivi pour la nounou">
            <div className="p-5">
              {publicToken ? (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--dust)]">Partagez ce lien avec la nounou pour qu&apos;elle puisse suivre ses récapitulatifs :</p>
                  <div className="flex gap-2">
                    <code className="flex-1 text-xs bg-[var(--paper)] border border-[var(--line)] rounded-lg px-3 py-2 break-all text-[var(--ink)]">
                      {publicUrl}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={copierLienPublic} className={btnPri + ' flex-1'}>
                      {copiedPublic ? '✓ Copié !' : 'Copier le lien'}
                    </button>
                    <button onClick={revoquerLienPublic} disabled={loading} className={btnSec}>Révoquer</button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-[var(--dust)] mb-4">Générez un lien de suivi public pour que la nounou puisse consulter ses récapitulatifs sans créer de compte.</p>
                  <button onClick={genererLienPublic} disabled={loading} className={btnPri}>
                    {loading ? 'Génération…' : 'Générer un lien de suivi'}
                  </button>
                </div>
              )}
            </div>
          </Section>

          {/* Enfants */}
          <Section title="Enfants gardés">
            <div className="p-5">
              {garde.enfants.length === 0 ? (
                <p className="text-sm text-[var(--dust)]">Aucun enfant</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {garde.enfants.map(e => (
                    <span key={e.id} className={`text-sm font-medium px-3 py-1 rounded-full ${e.fam === 'A' ? 'bg-[var(--blue-light)] text-[var(--blue)]' : 'bg-[var(--sage-light)] text-[var(--sage)]'}`}>
                      {e.prenom} · Fam. {e.fam}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Modèle de paie */}
          {garde.modele && (
            <Section title="Modèle de paie">
              {editMode ? (
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldEditNum label="Taux horaire net (€/h)"      value={modeleTaux}      onChange={setModeleTaux} />
                    <FieldEditNum label="Navigo / transport (€/mois)" value={modeleNavigo}    onChange={setModeleNavigo} />
                    <FieldEditNum label="Indemnité entretien (€/j)"   value={modeleEntretien} onChange={setModeleEntretien} />
                    <FieldEditNum label="Frais kilométriques (€/mois)" value={modeleKm}       onChange={setModeleKm} />
                  </div>
                  <p className="text-[11px] text-[var(--dust)]">
                    Les heures hebdomadaires sont issues du planning et ne peuvent pas être modifiées ici.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--line)]">
                  <InfoRow label="Mode de calcul"    value={`${garde.modele.modeCalcul} — ${MODES[garde.modele.modeCalcul] ?? ''}`} padded />
                  <InfoRow label="Taux horaire net"  value={`${garde.modele.tauxHoraireNet} €/h`} padded />
                  <InfoRow label="H. normales/sem."  value={`${garde.modele.hNormalesSemaine} h`} padded />
                  {garde.modele.hSup25Semaine > 0 && <InfoRow label="H. sup +25%/sem."  value={`${garde.modele.hSup25Semaine} h`} padded />}
                  {garde.modele.hSup50Semaine > 0 && <InfoRow label="H. sup +50%/sem."  value={`${garde.modele.hSup50Semaine} h`} padded />}
                  <InfoRow label="Transport"         value={`${garde.modele.navigoMontant} €/mois`} padded />
                  <InfoRow label="Entretien"         value={`${garde.modele.indemEntretien} €/j`} padded />
                  {garde.modele.indemKm > 0 && <InfoRow label="Frais km" value={`${garde.modele.indemKm} €/mois`} padded />}
                </div>
              )}
            </Section>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── Petits composants ────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-sm font-medium">{title}</div>
      {children}
    </div>
  );
}
function InfoRow({ label, value, padded }: { label: string; value: string; padded?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${padded ? 'px-5 py-2.5' : ''}`}>
      <span className="text-[var(--dust)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
function FieldEdit({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs text-[var(--dust)] mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className={inp} />
    </div>
  );
}
function FieldEditNum({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs text-[var(--dust)] mb-1">{label}</label>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className={inp}
      />
    </div>
  );
}

const inp    = 'w-full px-3 py-2 border-[1.5px] border-[var(--line)] rounded-lg text-sm outline-none focus:border-[var(--sage)] focus:ring-2 focus:ring-[var(--sage-light)] bg-white placeholder:text-gray-300';
const btnPri = 'px-4 py-2 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors disabled:opacity-50';
const btnSec = 'px-4 py-2 border-[1.5px] border-[var(--line)] text-[var(--ink)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] transition-colors bg-white disabled:opacity-50';
