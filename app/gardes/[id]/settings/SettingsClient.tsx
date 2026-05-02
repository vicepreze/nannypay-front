'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignOutButton } from '@/components/SignOutButton';
import {
  calcBModeRepartition,
  calcEquitableRatioIteratif,
  estimerCMG2025,
  ciPlafondMensuel,
  K_TOTAL,
} from '@/lib/calcul';

type Tab = 'acteurs' | 'planning' | 'paie';

type Aides = {
  cmgCotisations:    number;
  cmgRemuneration:   number;
  abattementCharges: number;
  aideVille:         number;
  creditImpot:       number;
};

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

  const [repartA,    setRepartA]    = useState(modele?.repartitionA    ?? 0.5);
  const [racOption,  setRacOption]  = useState(modele?.racOptionActive ?? false);
  const [modeExpert, setModeExpert] = useState(false);
  const [revFiscauxA, setRevFiscauxA] = useState(80_000);
  const [revFiscauxB, setRevFiscauxB] = useState(80_000);

  const pProportionnel = useMemo(
    () => calcBModeRepartition(modele?.joursJson ?? '{}', enfants),
    [modele?.joursJson, enfants]
  );

  const nbEnfantsA = useMemo(() => Math.max(1, enfants.filter(e => e.fam === 'A').length), [enfants]);
  const nbEnfantsB = useMemo(() => Math.max(1, enfants.filter(e => e.fam === 'B').length), [enfants]);

  const salNetTotalMens = useMemo(() => {
    const base  = hNorm  * 52/12 * tauxNet;
    const sup25 = hSup25 * 52/12 * tauxNet * 1.25;
    const sup50 = hSup50 * 52/12 * tauxNet * 1.50;
    return Math.round((base + sup25 + sup50) * 100) / 100;
  }, [hNorm, hSup25, hSup50, tauxNet]);

  const racOptimal = useMemo(() => {
    if (!racOption || salNetTotalMens <= 0) return null;
    return calcEquitableRatioIteratif(
      salNetTotalMens,
      { nbEnfants: nbEnfantsA, revenusFiscaux: revFiscauxA, autresAidesMens: 0 },
      { nbEnfants: nbEnfantsB, revenusFiscaux: revFiscauxB, autresAidesMens: 0 },
      pProportionnel,
    );
  }, [racOption, salNetTotalMens, nbEnfantsA, nbEnfantsB, revFiscauxA, revFiscauxB, pProportionnel]);

  // Live preview at current slider position
  const preview = useMemo(() => {
    const salNetA = Math.round(repartA * salNetTotalMens * 100) / 100;
    const salNetB = Math.round((1 - repartA) * salNetTotalMens * 100) / 100;
    return { salNetA, salNetB };
  }, [repartA, salNetTotalMens]);

  // Live RAC at current repartA (engine formula)
  const liveRac = useMemo(() => {
    if (!racOption) return { racA: 0, racB: 0, totalRac: 0 };
    const salA = preview.salNetA;
    const salB = preview.salNetB;
    const coutA = salA * K_TOTAL;
    const coutB = salB * K_TOTAL;
    const cmgA = estimerCMG2025(revFiscauxA, nbEnfantsA, salA, coutA - salA);
    const cmgB = estimerCMG2025(revFiscauxB, nbEnfantsB, salB, coutB - salB);
    const eligA = Math.max(0, coutA - cmgA);
    const eligB = Math.max(0, coutB - cmgB);
    const ciA = Math.min(Math.round(eligA * 0.5 * 100) / 100, ciPlafondMensuel(nbEnfantsA));
    const ciB = Math.min(Math.round(eligB * 0.5 * 100) / 100, ciPlafondMensuel(nbEnfantsB));
    const racA = Math.round((coutA - cmgA - ciA) * 100) / 100;
    const racB = Math.round((coutB - cmgB - ciB) * 100) / 100;
    return { racA, racB, totalRac: racA + racB };
  }, [racOption, preview.salNetA, preview.salNetB, revFiscauxA, revFiscauxB, nbEnfantsA, nbEnfantsB]);

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2500); }

  function handleRacToggle(on: boolean) {
    setRacOption(on);
    setModeExpert(false);
    setRevFiscauxA(80_000);
    setRevFiscauxB(80_000);
    if (on && salNetTotalMens > 0) {
      const res = calcEquitableRatioIteratif(
        salNetTotalMens,
        { nbEnfants: nbEnfantsA, revenusFiscaux: 80_000, autresAidesMens: 0 },
        { nbEnfants: nbEnfantsB, revenusFiscaux: 80_000, autresAidesMens: 0 },
        pProportionnel,
      );
      setRepartA(res.meilleurRatio);
    }
  }

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
        familleA: {
          cmgCotisations: famA.cmgCotisations, cmgRemuneration: famA.cmgRemuneration,
          abattementCharges: famA.abattementCharges, aideVille: famA.aideVille, creditImpot: famA.creditImpot,
        },
        familleB: {
          cmgCotisations: famB.cmgCotisations, cmgRemuneration: famB.cmgRemuneration,
          abattementCharges: famB.abattementCharges, aideVille: famB.aideVille, creditImpot: famB.creditImpot,
        },
      }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erreur'); setSaving(false); return; }
    flash();
    setSaving(false);
  }

  const saveLabel = saved ? '✓ Enregistré' : saving ? 'Sauvegarde…' : 'Enregistrer';
  const SLIDER_MIN = 20;
  const SLIDER_MAX = 80;
  const pct = (p: number) => ((p * 100 - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

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
                <FN label="Taux horaire net (€/h)" value={tauxNet}   onChange={setTauxNet} />
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <FN label="H. normales/sem."  value={hNorm}  onChange={setHNorm} />
                  <FN label="H. sup +25%/sem."  value={hSup25} onChange={setHSup25} />
                  <FN label="H. sup +50%/sem."  value={hSup50} onChange={setHSup50} />
                </div>
              </Card>

              <Card title="2 — Indemnités">
                <div className="grid grid-cols-3 gap-3">
                  <FN label="Navigo (€/mois)"   value={navigo}    onChange={setNavigo} />
                  <FN label="Frais km (€/mois)" value={km}        onChange={setKm} />
                  <FN label="Entretien (€/j)"   value={entretien} onChange={setEntretien} />
                </div>
              </Card>

              {/* ── A — Slider répartition ─────────────────────────── */}
              <div className="rounded-[var(--radius)] overflow-hidden bg-white border border-[var(--line)]">
                <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)]">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--sage)] text-white text-xs font-bold">A</span>
                    Répartition du salaire en fonction des heures par enfant
                  </div>
                  <p className="text-xs text-[var(--dust)] mt-1 ml-7">Position calculée selon le nombre d&apos;enfants et les heures. Ajustez si besoin.</p>
                </div>
                <div className="p-5">
                  <SliderRow
                    value={repartA}
                    onChange={setRepartA}
                    min={SLIDER_MIN} max={SLIDER_MAX}
                    markers={[
                      { value: 0.5, label: '50/50' },
                      ...(racOption && racOptimal ? [{ value: racOptimal.meilleurRatio, label: 'Équitable RAC', highlight: true }] : []),
                    ]}
                    pct={pct}
                  />

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <FamPreview
                      label={nomA || 'Famille A'}
                      percent={repartA}
                      color="sage"
                      salNet={preview.salNetA}
                      rac={liveRac.racA}
                      totalRac={liveRac.totalRac}
                      racOption={racOption}
                    />
                    <FamPreview
                      label={nomB || 'Famille B'}
                      percent={1 - repartA}
                      color="blue"
                      salNet={preview.salNetB}
                      rac={liveRac.racB}
                      totalRac={liveRac.totalRac}
                      racOption={racOption}
                    />
                  </div>

                  <button
                    onClick={() => setRepartA(pProportionnel)}
                    className="text-xs text-[var(--dust)] hover:text-[var(--ink)] mt-4 underline decoration-dotted"
                  >
                    ↩ Revenir au calcul automatique ({(pProportionnel * 100).toFixed(1)} %)
                  </button>
                </div>
              </div>

              {/* ── B — Option RAC ─────────────────────────────────── */}
              <div className="rounded-[var(--radius)] overflow-hidden bg-white border border-[var(--line)]">
                <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--sage)] text-white text-xs font-bold">B</span>
                    Reste à charge par famille
                  </div>
                  <Toggle checked={racOption} onChange={handleRacToggle} />
                </div>

                {racOption && (
                  <div className="p-5 space-y-4">
                    {!modeExpert ? (
                      <p className="text-xs text-[var(--dust)]">
                        Calcul automatique — revenus fiscaux : <strong>80 000 €</strong> (Tranche 3 CAF, aides minimales).
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <FN label={`Revenus fiscaux ${nomA || 'Famille A'} (€/an)`} value={revFiscauxA} onChange={setRevFiscauxA} />
                        <FN label={`Revenus fiscaux ${nomB || 'Famille B'} (€/an)`} value={revFiscauxB} onChange={setRevFiscauxB} />
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      {!modeExpert ? (
                        <button
                          onClick={() => setModeExpert(true)}
                          className="text-xs text-[var(--dust)] hover:text-[var(--ink)] underline decoration-dotted transition-colors"
                        >
                          ⚙️ Passer en mode expert
                        </button>
                      ) : (
                        <button
                          onClick={() => { setModeExpert(false); setRevFiscauxA(80_000); setRevFiscauxB(80_000); }}
                          className="text-xs text-[var(--dust)] hover:text-[var(--ink)] underline decoration-dotted transition-colors"
                        >
                          ↩ Revenir au mode automatique
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

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

// ── Sub-components ─────────────────────────────────────────────────

function SliderRow({ value, onChange, min, max, markers, pct }: {
  value: number;
  onChange: (v: number) => void;
  min: number; max: number;
  markers: { value: number; label: string; highlight?: boolean }[];
  pct: (v: number) => number;
}) {
  return (
    <div>
      <div className="relative h-5 mb-1">
        {markers.map((m, i) => {
          const p = pct(m.value);
          if (p < -5 || p > 105) return null;
          return (
            <span
              key={i}
              className={`absolute text-[10px] -translate-x-1/2 whitespace-nowrap ${m.highlight ? 'text-[var(--sage)] font-semibold' : 'text-[var(--dust)]'}`}
              style={{ left: `${p}%` }}
            >
              {m.label}
            </span>
          );
        })}
      </div>

      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[var(--line)]" />
        {markers.map((m, i) => {
          const p = pct(m.value);
          if (p < 0 || p > 100) return null;
          return (
            <span
              key={i}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${m.highlight ? 'bg-[var(--sage)]' : 'bg-[var(--dust)]'}`}
              style={{ left: `${p}%` }}
            />
          );
        })}
        <input
          type="range"
          min={min} max={max} step={0.1}
          value={value * 100}
          onChange={e => onChange(parseFloat(e.target.value) / 100)}
          className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer slider-thumb"
          style={{ WebkitAppearance: 'none' }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-[var(--dust)] mt-1">
        <span>{min} %</span>
        <span>{max} %</span>
      </div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid var(--sage);
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid var(--sage);
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
}

function FamPreview({ label, percent, color, salNet, rac, totalRac, racOption }: {
  label: string; percent: number; color: 'sage' | 'blue';
  salNet: number; rac: number; totalRac: number;
  racOption: boolean;
}) {
  const bg   = color === 'sage' ? 'bg-[var(--sage-light)]'  : 'bg-blue-50';
  const text = color === 'sage' ? 'text-[var(--sage)]'       : 'text-blue-700';
  const pctRac = totalRac > 0 ? rac / totalRac : percent;

  return (
    <div className={`rounded-[var(--radius)] p-4 ${bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${text}`}>{label}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded bg-white ${text}`}>{(percent * 100).toFixed(1)} %</span>
      </div>
      <div className="text-[11px] text-[var(--dust)]">Salaire net à verser</div>
      <div className={`text-xl font-bold ${text}`}>{salNet.toFixed(2)} €</div>

      {racOption && (
        <div className="mt-3 pt-3 border-t border-white/70">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] text-[var(--dust)]">Reste à charge</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded bg-white ${text}`}>{(pctRac * 100).toFixed(1)} %</span>
          </div>
          <div className={`text-lg font-bold ${text}`}>{rac.toFixed(2)} €</div>
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[var(--sage)]' : 'bg-[var(--line)]'}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
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
  const [raw, setRaw] = useState(() => (value !== 0 ? String(value) : ''));

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const s = e.target.value;
    setRaw(s);
    const n = parseFloat(s.replace(',', '.'));
    onChange(isNaN(n) ? 0 : n);
  }

  function handleBlur() {
    const n = parseFloat(raw.replace(',', '.'));
    setRaw(!isNaN(n) && n !== 0 ? String(n) : '');
    onChange(isNaN(n) ? 0 : n);
  }

  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-[var(--dust)]">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        placeholder="0"
        onChange={handleChange}
        onBlur={handleBlur}
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
