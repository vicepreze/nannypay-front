'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignOutButton } from '@/components/SignOutButton';
import { calcBModeRepartition, calcEquitableRatioA } from '@/lib/calcul';
import { PaieFormCore, Aides, totalAidesMens } from '@/components/PaieFormCore';

type Tab = 'acteurs' | 'planning' | 'paie';

type FamProps = {
  id: string; nomAffiche: string;
} & Aides;

type Props = {
  gardeId: string;
  gardeNom: string;
  moisUrl: string;
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
    racOptionActive:   boolean;
    joursJson:         string;
  } | null;
  enfants: { prenom: string; fam: string }[];
};

export function SettingsClient({ gardeId, gardeNom, moisUrl, famA, famB, nounou, modele, enfants }: Props) {
  const router = useRouter();
  const [tab, setTab]       = useState<Tab>('acteurs');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  const [nom,     setNom]     = useState(gardeNom);
  const [nomA,    setNomA]    = useState(famA.nomAffiche);
  const [nomB,    setNomB]    = useState(famB.nomAffiche);
  const [prenomN, setPrenomN] = useState(nounou?.prenom ?? '');
  const [nomN,    setNomN]    = useState(nounou?.nom ?? '');

  const [tauxNet,   setTauxNet]   = useState(modele?.tauxHoraireNet  ?? 0);
  const [hNorm,     setHNorm]     = useState(modele?.hNormalesSemaine ?? 0);
  const [hSup25,    setHSup25]    = useState(modele?.hSup25Semaine   ?? 0);
  const [hSup50,    setHSup50]    = useState(modele?.hSup50Semaine   ?? 0);
  const [navigo,    setNavigo]    = useState(modele?.navigoMontant   ?? 0);
  const [km,        setKm]        = useState(modele?.indemKm         ?? 0);
  const [entretien, setEntretien] = useState(modele?.indemEntretien  ?? 0);

  const [repartA,   setRepartA]   = useState(modele?.repartitionA    ?? 0.5);
  const [racOption, setRacOption] = useState(modele?.racOptionActive ?? false);

  const [aA, setAA] = useState<Aides>({
    cmgCotisations:    famA.cmgCotisations,
    cmgRemuneration:   famA.cmgRemuneration,
    abattementCharges: famA.abattementCharges,
    aideVille:         famA.aideVille,
    creditImpot:       famA.creditImpot,
  });
  const [aB, setAB] = useState<Aides>({
    cmgCotisations:    famB.cmgCotisations,
    cmgRemuneration:   famB.cmgRemuneration,
    abattementCharges: famB.abattementCharges,
    aideVille:         famB.aideVille,
    creditImpot:       famB.creditImpot,
  });

  const pProportionnel = useMemo(
    () => calcBModeRepartition(modele?.joursJson ?? '{}', enfants),
    [modele?.joursJson, enfants]
  );

  const salNetTotalMens = useMemo(() => {
    const baseNet  = hNorm  * 52/12 * tauxNet;
    const sup25Net = hSup25 * 52/12 * tauxNet * 1.25;
    const sup50Net = hSup50 * 52/12 * tauxNet * 1.50;
    return Math.round((baseNet + sup25Net + sup50Net) * 100) / 100;
  }, [hNorm, hSup25, hSup50, tauxNet]);

  const aidesAMens = useMemo(() => totalAidesMens(aA), [aA]);
  const aidesBMens = useMemo(() => totalAidesMens(aB), [aB]);

  const pEquitable = useMemo(
    () => calcEquitableRatioA(pProportionnel, salNetTotalMens, aidesAMens, aidesBMens),
    [pProportionnel, salNetTotalMens, aidesAMens, aidesBMens]
  );

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2500); }

  async function saveActeurs() {
    setSaving(true); setError('');
    const res = await fetch(`/api/gardes/${gardeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom,
        familleA: { nomAffiche: nomA },
        familleB: { nomAffiche: nomB },
        nounou:   { prenom: prenomN, nom: nomN || null },
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
          repartitionA:     repartA,
          racOptionActive:  racOption,
        },
        familleA: { ...aA },
        familleB: { ...aB },
      }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erreur'); setSaving(false); return; }
    flash();
    setSaving(false);
  }

  const saveLabel = saved ? '✓ Enregistré' : saving ? 'Sauvegarde…' : 'Enregistrer';

  return (
    <div className="min-h-screen bg-[var(--paper)]">
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
            <Card title="Famille A">
              <F label="Nom affiché *" value={nomA} onChange={setNomA} />
            </Card>
            <Card title="Famille B">
              <F label="Nom affiché" value={nomB} onChange={setNomB} />
            </Card>
            <div className="flex justify-end">
              <Btn onClick={saveActeurs} disabled={saving} label={saveLabel} />
            </div>
          </div>
        )}

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

        {tab === 'paie' && (
          modele ? (
            <div className="space-y-4">
              <Card title="1 — Rémunération">
                <FN label="Taux horaire net (€/h)" value={tauxNet} onChange={setTauxNet} />
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <FN label="H. normales/sem."  value={hNorm}  onChange={setHNorm} />
                  <FN label="H. sup +25%/sem."  value={hSup25} onChange={setHSup25} />
                  <FN label="H. sup +50%/sem."  value={hSup50} onChange={setHSup50} />
                </div>
              </Card>

              <PaieFormCore
                nomA={nomA || 'Famille A'} nomB={nomB || 'Famille B'}
                navigo={navigo}       setNavigo={setNavigo}
                km={km}               setKm={setKm}
                entretien={entretien} setEntretien={setEntretien}
                salNetTotalMens={salNetTotalMens}
                pProportionnel={pProportionnel}
                pEquitable={pEquitable}
                aidesAMens={aidesAMens} aidesBMens={aidesBMens}
                repartA={repartA}     setRepartA={setRepartA}
                racOption={racOption} setRacOption={setRacOption}
                aA={aA} setAA={setAA}
                aB={aB} setAB={setAB}
              />

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

// ── Sous-composants (onglets Acteurs et section 1 Paie) ───────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] overflow-hidden bg-white border border-[var(--line)]">
      <div className="px-5 py-3 text-sm font-semibold border-b border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]">{title}</div>
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

function FN({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [raw, setRaw] = useState(() => value !== 0 ? String(value) : '');
  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-[var(--dust)]">{label}</label>
      <input
        type="text" inputMode="decimal" value={raw} placeholder="0"
        onChange={e => { const s = e.target.value; setRaw(s); const n = parseFloat(s.replace(',', '.')); onChange(isNaN(n) ? 0 : n); }}
        onBlur={() => { const n = parseFloat(raw.replace(',', '.')); setRaw(!isNaN(n) && n !== 0 ? String(n) : ''); onChange(isNaN(n) ? 0 : n); }}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-white border border-[var(--line)] focus:border-[var(--sage)]"
      />
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
