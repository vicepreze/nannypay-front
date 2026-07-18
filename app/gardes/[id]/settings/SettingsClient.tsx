'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import {
  PlanningForm, PlanningSummaryCard, buildPlanning, validatePlanning, planningSummary,
  type Planning, type Enfant,
} from '@/components/nouvelle-garde/PlanningForm';
import { PaieForm, type PaieFormValue, type Aides } from '@/components/nouvelle-garde/PaieForm';
import { familleLabel } from '@/lib/familleLabel';

type Tab = 'acteurs' | 'planning' | 'paie';

type FamProps = {
  id: string; nomAffiche: string;
} & Aides;

type Props = {
  gardeId: string;
  gardeNom: string;
  moisUrl: string;
  statut: string;
  isProprietaire: boolean;
  archiveeVersGarde: { id: string; nom: string | null } | null;
  famA: FamProps;
  famB: FamProps;
  nounou: { prenom: string; nom: string } | null;
  modele: {
    tauxHoraireNet:    number;
    hNormalesSemaine:  number;
    hSup25Semaine:     number;
    hSup50Semaine:     number;
    navigoMontant:     number;
    indemKm:           number;
    indemEntretien:    number;
    repartitionA:      number;
    repartitionIndemA: number;
    racOptionActive:   boolean;
    joursJson:         string;
  } | null;
  enfants: Enfant[];
};

function aidesOf(f: FamProps): Aides {
  return {
    cmgCotisations:    f.cmgCotisations,
    cmgRemuneration:   f.cmgRemuneration,
    abattementCharges: f.abattementCharges,
    aideVille:         f.aideVille,
    creditImpot:       f.creditImpot,
  };
}

// Compare deux structures imbriquées indépendamment de l'ordre des clés.
function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  const keys = Object.keys(obj as object).sort();
  return `{${keys.map(k => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k])).join(',')}}`;
}

type ModelePatch = {
  joursJson: string;
  tauxHoraireNet: number;
  hNormalesSemaine: number;
  hSup25Semaine: number;
  hSup50Semaine: number;
  navigoMontant: number;
  indemKm: number;
  indemEntretien: number;
  repartitionA: number;
  repartitionIndemA: number;
  racOptionActive: boolean;
};

export function SettingsClient({
  gardeId, gardeNom, moisUrl, statut, isProprietaire, archiveeVersGarde,
  famA, famB, nounou, modele, enfants,
}: Props) {
  const router = useRouter();
  const [tab, setTab]       = useState<Tab>('acteurs');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');
  const [forking, setForking] = useState(false);

  const readOnly = statut === 'archivé' || !isProprietaire;

  // ── Acteurs ────────────────────────────────────────────────────────
  const [nom,     setNom]     = useState(gardeNom);
  const [nomA,    setNomA]    = useState(famA.nomAffiche);
  const [nomB,    setNomB]    = useState(famB.nomAffiche);
  const [prenomN, setPrenomN] = useState(nounou?.prenom ?? '');
  const [nomN,    setNomN]    = useState(nounou?.nom ?? '');

  // Prénoms des enfants — édités séparément car ils servent aussi de clé
  // dans le planning (joursJson) ; le rename doit être propagé partout.
  const [enfantsEdit, setEnfantsEdit] = useState(
    () => enfants.map(e => ({ id: e.id ?? '', prenom: e.prenom, fam: e.fam }))
  );
  const enfantsBaseline = useRef(enfantsEdit.map(e => ({ ...e })));

  // ── Planning ───────────────────────────────────────────────────────
  const [planning, setPlanning] = useState<Planning>(() =>
    buildPlanning(enfants, modele ? safeParsePlanning(modele.joursJson) : null)
  );
  const [planningError, setPlanningError] = useState('');

  // ── Paie ───────────────────────────────────────────────────────────
  const [paieValue, setPaieValue] = useState<PaieFormValue>(() => ({
    taux:         modele?.tauxHoraireNet    ?? 11,
    navigo:       modele?.navigoMontant     ?? 90.80,
    indemKm:      modele?.indemKm           ?? 0,
    entretien:    modele?.indemEntretien    ?? 6.0,
    repartIndemA: modele?.repartitionIndemA ?? 0.5,
    repartA:      modele?.repartitionA      ?? 0.5,
    racOption:    modele?.racOptionActive   ?? false,
    modeExpert:   false,
    aA: aidesOf(famA),
    aB: aidesOf(famB),
  }));

  // Référence des valeurs telles que chargées depuis la DB — sert à détecter
  // si Planning/Paie ont réellement changé (déclenche le choix fork/update).
  const baseline = useRef<ModelePatch>({
    joursJson:         stableStringify(modele ? safeParsePlanning(modele.joursJson) : {}),
    tauxHoraireNet:    modele?.tauxHoraireNet    ?? 11,
    hNormalesSemaine:  modele?.hNormalesSemaine  ?? 0,
    hSup25Semaine:     modele?.hSup25Semaine     ?? 0,
    hSup50Semaine:     modele?.hSup50Semaine     ?? 0,
    navigoMontant:     modele?.navigoMontant     ?? 90.80,
    indemKm:           modele?.indemKm           ?? 0,
    indemEntretien:    modele?.indemEntretien    ?? 6.0,
    repartitionA:      modele?.repartitionA      ?? 0.5,
    repartitionIndemA: modele?.repartitionIndemA ?? 0.5,
    racOptionActive:   modele?.racOptionActive   ?? false,
  });

  const pendingModele: ModelePatch = useMemo(() => {
    const ps = planningSummary(planning);
    return {
      joursJson:         JSON.stringify(planning),
      tauxHoraireNet:    paieValue.taux,
      hNormalesSemaine:  ps.hNormalesSemaine,
      hSup25Semaine:     ps.hSup25Semaine,
      hSup50Semaine:     ps.hSup50Semaine,
      navigoMontant:     paieValue.navigo,
      indemKm:           paieValue.indemKm,
      indemEntretien:    paieValue.entretien,
      repartitionA:      paieValue.repartA,
      repartitionIndemA: paieValue.repartIndemA,
      racOptionActive:   paieValue.racOption,
    };
  }, [planning, paieValue]);

  const hasModeleChanges = useMemo(() => {
    const b = baseline.current;
    return (
      stableStringify(JSON.parse(pendingModele.joursJson)) !== b.joursJson ||
      pendingModele.tauxHoraireNet    !== b.tauxHoraireNet ||
      pendingModele.hNormalesSemaine  !== b.hNormalesSemaine ||
      pendingModele.hSup25Semaine     !== b.hSup25Semaine ||
      pendingModele.hSup50Semaine     !== b.hSup50Semaine ||
      pendingModele.navigoMontant     !== b.navigoMontant ||
      pendingModele.indemKm           !== b.indemKm ||
      pendingModele.indemEntretien    !== b.indemEntretien ||
      pendingModele.repartitionA      !== b.repartitionA ||
      pendingModele.repartitionIndemA !== b.repartitionIndemA ||
      pendingModele.racOptionActive   !== b.racOptionActive
    );
  }, [pendingModele]);

  const [forkModal, setForkModal] = useState<null | { modelePatch: ModelePatch; aidesA: Aides; aidesB: Aides }>(null);

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2500); }

  function pendingAides() {
    const aidesA = paieValue.modeExpert ? paieValue.aA : aidesOf(famA);
    const aidesB = paieValue.modeExpert ? paieValue.aB : aidesOf(famB);
    return { aidesA, aidesB };
  }

  async function saveActeurs() {
    setSaving(true); setError('');

    const changedEnfants = enfantsEdit.filter(e => {
      const base = enfantsBaseline.current.find(b => b.id === e.id);
      const prenom = e.prenom.trim();
      return e.id && base && prenom.length > 0 && base.prenom !== prenom;
    });

    const res = await fetch(`/api/gardes/${gardeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom,
        familleA: { nomAffiche: nomA },
        familleB: { nomAffiche: nomB },
        nounou:   { prenom: prenomN, nom: nomN || null },
        ...(changedEnfants.length > 0
          ? { enfants: changedEnfants.map(e => ({ id: e.id, prenom: e.prenom.trim() })) }
          : {}),
      }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erreur'); setSaving(false); return; }

    if (changedEnfants.length > 0) {
      // Renomme les clés du planning local pour ne pas perdre les horaires
      // déjà saisis pour l'enfant renommé (le planning est keyé par prénom).
      setPlanning(prev => {
        const next = { ...prev };
        for (const e of changedEnfants) {
          const base = enfantsBaseline.current.find(b => b.id === e.id)!;
          const newName = e.prenom.trim();
          if (Object.prototype.hasOwnProperty.call(next, base.prenom)) {
            next[newName] = next[base.prenom];
            if (newName !== base.prenom) delete next[base.prenom];
          }
        }
        return next;
      });
      setEnfantsEdit(cur => cur.map(e => ({ ...e, prenom: e.prenom.trim() })));
      enfantsBaseline.current = enfantsEdit.map(e => ({ ...e, prenom: e.prenom.trim() }));
    }

    flash(); router.refresh();
    setSaving(false);
  }

  // Déclenché par le bouton "Enregistrer" des onglets Planning et Paie.
  function handleSaveModele() {
    setError('');
    if (tab === 'planning') {
      const msg = validatePlanning(planning);
      if (msg) { setPlanningError(msg); return; }
    }
    setPlanningError('');
    if (!paieValue.taux || paieValue.taux <= 0) { setError('Taux horaire requis.'); return; }

    const { aidesA, aidesB } = pendingAides();

    if (!hasModeleChanges) {
      void doUpdateModele(pendingModele, aidesA, aidesB);
      return;
    }
    setForkModal({ modelePatch: pendingModele, aidesA, aidesB });
  }

  async function doUpdateModele(modelePatch: ModelePatch, aidesA: Aides, aidesB: Aides) {
    setSaving(true); setError('');
    const res = await fetch(`/api/gardes/${gardeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modele: modelePatch, familleA: aidesA, familleB: aidesB }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erreur'); setSaving(false); setForkModal(null); return; }
    baseline.current = { ...modelePatch, joursJson: stableStringify(JSON.parse(modelePatch.joursJson)) };
    flash();
    setSaving(false);
    setForkModal(null);
  }

  async function doDupliquer(modelePatch: ModelePatch, aidesA: Aides, aidesB: Aides) {
    setForking(true); setError('');
    const res = await fetch(`/api/gardes/${gardeId}/dupliquer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modele: modelePatch,
        ...(paieValue.modeExpert ? { aidesA, aidesB } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Erreur'); setForking(false); setForkModal(null); return; }
    router.push(`/gardes/${data.garde.id}/settings`);
  }

  const saveLabel = saved ? '✓ Enregistré' : saving ? 'Sauvegarde…' : 'Enregistrer';

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <AppHeader
        left={
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="font-serif text-base text-[var(--ink)] no-underline">nounoulink<em className="text-[var(--sage)] not-italic">.</em></Link>
            <span className="text-[var(--line)]">/</span>
            <Link href={moisUrl} className="text-[var(--dust)] hover:text-[var(--ink)] no-underline">{gardeNom || 'Garde'}</Link>
            <span className="text-[var(--line)]">/</span>
            <span className="font-medium text-[var(--ink)]">Paramètres</span>
          </div>
        }
      />

      <div className="pt-14 max-w-2xl mx-auto px-6 pb-16">
        <div className="pt-8 mb-6">
          <h1 className="font-serif text-2xl text-[var(--ink)]">{gardeNom || 'Paramètres'}</h1>
          <p className="text-sm text-[var(--dust)] mt-1">Configuration de la garde partagée</p>
        </div>

        {statut === 'archivé' && (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm bg-amber-50 border border-amber-200 text-amber-800">
            Cette garde a été archivée — ses paramètres ont été repris dans une nouvelle garde.{' '}
            {archiveeVersGarde && (
              <Link href={`/gardes/${archiveeVersGarde.id}/settings`} className="font-medium underline">
                Voir la garde actuelle →
              </Link>
            )}
          </div>
        )}
        {!isProprietaire && statut !== 'archivé' && (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm bg-[var(--paper)] border border-[var(--line)] text-[var(--dust)]">
            Lecture seule — seul·e le ou la créateur·rice de cette garde peut modifier ses paramètres.
          </div>
        )}

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

        <div className={readOnly ? 'opacity-60 pointer-events-none' : ''}>
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
              </Card>
              <Card title={familleLabel(nomA, isProprietaire)}>
                <F label="Nom affiché *" value={nomA} onChange={setNomA} />
              </Card>
              <Card title={familleLabel(nomB, !isProprietaire)}>
                <F label="Nom affiché" value={nomB} onChange={setNomB} />
              </Card>
              {enfantsEdit.length > 0 && (
                <Card title="Enfants">
                  <div className="grid grid-cols-2 gap-3">
                    {enfantsEdit.map((e, i) => (
                      <F key={e.id} label={familleLabel(null, e.fam === 'A' ? isProprietaire : !isProprietaire)} value={e.prenom}
                        onChange={v => setEnfantsEdit(cur => cur.map((c, j) => (j === i ? { ...c, prenom: v } : c)))} />
                    ))}
                  </div>
                </Card>
              )}
              <div className="flex justify-end">
                <Btn onClick={saveActeurs} disabled={saving || readOnly} label={saveLabel} />
              </div>
            </div>
          )}

          {tab === 'planning' && (
            modele ? (
              enfantsEdit.length === 0 ? (
                <EmptyNotice text="Aucun enfant rattaché à cette garde." />
              ) : (
                <div className="space-y-4">
                  <PlanningForm enfants={enfantsEdit} planning={planning} onChange={setPlanning} estMoiA={isProprietaire} />
                  <PlanningSummaryCard planning={planning} />
                  {planningError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{planningError}</p>}
                  <div className="flex justify-end">
                    <Btn onClick={handleSaveModele} disabled={saving || readOnly} label={saveLabel} />
                  </div>
                </div>
              )
            ) : (
              <EmptyNotice text="Aucun modèle de paie pour cette garde." />
            )
          )}

          {tab === 'paie' && (
            modele ? (
              <div className="space-y-4">
                <PaieForm
                  value={paieValue}
                  onChange={setPaieValue}
                  nomA={familleLabel(nomA, isProprietaire)}
                  nomB={familleLabel(nomB, !isProprietaire)}
                  joursJson={JSON.stringify(planning)}
                  enfants={enfantsEdit}
                />
                <div className="flex justify-end">
                  <Btn onClick={handleSaveModele} disabled={saving || readOnly} label={saveLabel} />
                </div>
              </div>
            ) : (
              <EmptyNotice text="Aucun modèle de paie pour cette garde." />
            )
          )}
        </div>
      </div>

      {forkModal && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-semibold mb-2 text-[var(--ink)]">⚠️ Cette modification a des conséquences</h3>
            <p className="text-sm text-[var(--dust)] mb-4">
              Les paramètres de paie ne sont pas figés mois par mois : changer le taux, les heures, les indemnités ou la répartition recalcule <strong className="text-[var(--ink)]">tous les mois de cette garde</strong>, y compris ceux déjà validés par les deux familles.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => doDupliquer(forkModal.modelePatch, forkModal.aidesA, forkModal.aidesB)}
                disabled={forking}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[var(--sage)] hover:bg-[var(--sage-dark)] transition-colors disabled:opacity-50"
              >
                {forking ? 'Création…' : 'Dupliquer en nouvelle garde (recommandé)'}
              </button>
              <button
                onClick={() => doUpdateModele(forkModal.modelePatch, forkModal.aidesA, forkModal.aidesB)}
                disabled={saving || forking}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border-[1.5px] border-[var(--line)] text-[var(--ink)] hover:border-[var(--ink)] bg-white transition-colors disabled:opacity-50"
              >
                Mettre à jour cette garde quand même
              </button>
              <button
                onClick={() => setForkModal(null)}
                disabled={forking}
                className="px-4 py-2 text-xs text-[var(--dust)] hover:text-[var(--ink)] transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function safeParsePlanning(json: string): Planning {
  try { return JSON.parse(json || '{}'); } catch { return {}; }
}

// ── Sub-components ─────────────────────────────────────────────────

function EmptyNotice({ text }: { text: string }) {
  return (
    <div className="bg-white border border-dashed border-[var(--line)] rounded-[var(--radius)] p-8 text-center">
      <p className="text-sm text-[var(--dust)]">{text}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] overflow-hidden bg-white border border-[var(--line)]">
      <div className="px-5 py-2.5 border-b border-[var(--line)] bg-[var(--paper)]">
        <span className="text-sm font-semibold text-[var(--ink)]">{title}</span>
      </div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

function F({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-[var(--dust)]">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
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
