'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { calculerMois, CalcResult } from '@/lib/calcul';

type Famille = { label: string; nomAffiche: string | null };
type Enfant  = { id: string; prenom: string; fam: string };
type Modele  = {
  tauxHoraireNet: number; hNormalesSemaine: number; hSupplementairesSemaine: number;
  modeCalcul: string; repartitionA: number; navigoMontant: number;
  indemEntretien: number; indemKm: number; joursJson: string;
};
type MoisRec = {
  id: string; annee: number; mois: number; statut: string; evenementsJson: string;
};
type Garde = {
  id: string; nom: string | null;
  nounou: { prenom: string; nom: string | null } | null;
  familles: Famille[]; enfants: Enfant[]; modele: Modele | null;
  mois: MoisRec[];
};

const MOIS_LABELS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function PublicNounouPage() {
  const { token } = useParams<{ token: string }>();
  const [garde,    setGarde]   = useState<Garde | null>(null);
  const [error,    setError]   = useState('');
  const [loading,  setLoading] = useState(true);
  const [selected, setSelected] = useState<MoisRec | null>(null);
  const [result,   setResult]  = useState<CalcResult | null>(null);

  useEffect(() => {
    fetch(`/api/public/nounou/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setGarde(d.garde);
        if (d.garde.mois.length > 0) setSelected(d.garde.mois[0]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!selected || !garde?.modele) { setResult(null); return; }
    const m = garde.modele;
    const joursJson = JSON.parse(m.joursJson || '{}') as Record<string, { actif: boolean }>;
    const joursActifs = Object.values(joursJson).filter(j => j.actif).length || 5;
    setResult(calculerMois({
      annee:                 selected.annee,
      mois:                  selected.mois,
      taux:                  m.tauxHoraireNet,
      hNormalesSemaine:      m.hNormalesSemaine,
      hSupSemaine:           m.hSupplementairesSemaine,
      repartitionA:          m.repartitionA,
      navigo:                m.navigoMontant,
      indemEntretien:        m.indemEntretien,
      indemKm:               m.indemKm,
      joursActifsParSemaine: joursActifs,
      evenements:            JSON.parse(selected.evenementsJson),
    }));
  }, [selected, garde]);

  if (loading) return <Screen><p className="text-[var(--dust)]">Chargement…</p></Screen>;
  if (error)   return <Screen><div className="text-center"><div className="text-4xl mb-4">⚠️</div><p className="font-medium">{error}</p></div></Screen>;
  if (!garde)  return null;

  const famA = garde.familles.find(f => f.label === 'A');
  const famB = garde.familles.find(f => f.label === 'B');

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center px-6 z-50 gap-4">
        <a href="/" className="font-serif text-[19px] tracking-tight text-[var(--ink)] no-underline">
          nounoulink<em className="text-[var(--sage)] not-italic">.</em>
        </a>
        <span className="text-[var(--line)]">|</span>
        <span className="text-sm text-[var(--dust)]">Vue nounou</span>
      </header>

      <div className="pt-14 max-w-2xl mx-auto px-6 pb-16">
        <div className="pt-8 mb-6">
          <h1 className="font-serif text-3xl text-[var(--ink)]">{garde.nom ?? 'Garde'}</h1>
          {garde.nounou && (
            <p className="text-sm text-[var(--dust)] mt-1">
              {garde.nounou.prenom}{garde.nounou.nom ? ' ' + garde.nounou.nom : ''}
            </p>
          )}
        </div>

        <div className="space-y-5">

          {/* Familles */}
          <Card title="Familles">
            <div className="p-5 flex flex-wrap gap-4">
              {famA?.nomAffiche && (
                <div>
                  <p className="text-[10px] font-bold text-[var(--blue)] uppercase tracking-wide mb-0.5">Famille A</p>
                  <p className="text-sm font-medium">{famA.nomAffiche}</p>
                </div>
              )}
              {famB?.nomAffiche && (
                <div>
                  <p className="text-[10px] font-bold text-[var(--sage)] uppercase tracking-wide mb-0.5">Famille B</p>
                  <p className="text-sm font-medium">{famB.nomAffiche}</p>
                </div>
              )}
              {garde.enfants.length > 0 && (
                <div className="w-full flex flex-wrap gap-2 pt-2">
                  {garde.enfants.map(e => (
                    <span key={e.id} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${e.fam === 'A' ? 'bg-[var(--blue-light)] text-[var(--blue)]' : 'bg-[var(--sage-light)] text-[var(--sage)]'}`}>
                      {e.prenom} · Fam. {e.fam}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Historique des mois */}
          {garde.mois.length > 0 && (
            <Card title="Récapitulatifs mensuels">
              {/* Sélecteur de mois */}
              <div className="px-5 pt-4 pb-2 flex flex-wrap gap-2">
                {garde.mois.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${selected?.id === m.id ? 'bg-[var(--sage)] text-white border-[var(--sage)]' : 'border-[var(--line)] text-[var(--dust)] hover:border-[var(--sage)] hover:text-[var(--sage)]'}`}
                  >
                    {MOIS_LABELS[m.mois]} {m.annee}
                    {m.statut === 'valide_ab' && <span className="ml-1 opacity-75">✓</span>}
                  </button>
                ))}
              </div>

              {/* Résultat du mois sélectionné */}
              {selected && result && (
                <div className="p-5 border-t border-[var(--line)] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-[var(--ink)]">
                      {MOIS_LABELS[selected.mois]} {selected.annee}
                    </h3>
                    <StatutBadge statut={selected.statut} />
                  </div>

                  {/* Résumé jours */}
                  <div className="grid grid-cols-3 gap-3">
                    <StatBox label="Jours ouvrables" value={String(result.joursOuv)} />
                    <StatBox label="Jours d'absence" value={String(result.joursAbs)} />
                    <StatBox label="Jours travaillés" value={String(result.joursTrav)} />
                  </div>

                  {/* Total net */}
                  <div className="bg-[var(--sage-light)] border border-[var(--sage)] rounded-lg px-5 py-3 flex justify-between items-center">
                    <span className="text-sm font-medium text-[var(--sage)]">Total net à recevoir</span>
                    <span className="text-xl font-bold text-[var(--sage)]">{result.totalNounou.toFixed(2)} €</span>
                  </div>

                  {/* Détail par famille */}
                  <div className="grid grid-cols-2 gap-3">
                    <FamCard label="Famille A" color="blue" res={result.famA} />
                    <FamCard label="Famille B" color="sage" res={result.famB} />
                  </div>
                </div>
              )}
            </Card>
          )}

          {garde.mois.length === 0 && (
            <Card title="Récapitulatifs mensuels">
              <div className="p-8 text-center text-sm text-[var(--dust)]">
                Aucun mois enregistré pour l&apos;instant.
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center p-6">
      <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] p-8 max-w-sm w-full text-center">
        {children}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] text-sm font-medium">{title}</div>
      {children}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--paper)] rounded-lg p-3 text-center">
      <div className="text-lg font-bold text-[var(--ink)]">{value}</div>
      <div className="text-[10px] text-[var(--dust)] mt-0.5">{label}</div>
    </div>
  );
}

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ouvert:    { label: 'En cours',      cls: 'bg-[var(--paper)] text-[var(--dust)]' },
    valide_a:  { label: 'Validé Fam. A', cls: 'bg-[var(--blue-light)] text-[var(--blue)]' },
    valide_b:  { label: 'Validé Fam. B', cls: 'bg-[var(--sage-light)] text-[var(--sage)]' },
    valide_ab: { label: 'Validé ✓',      cls: 'bg-[var(--sage-light)] text-[var(--sage)]' },
  };
  const { label, cls } = map[statut] ?? map.ouvert;
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>;
}

function FamCard({ label, color, res }: { label: string; color: 'blue' | 'sage'; res: { hNorm: number; hSup25: number; salNet: number; transport: number; entretien: number; km: number; total: number } }) {
  const c = color === 'blue'
    ? { bg: 'var(--blue-light)', fg: 'var(--blue)' }
    : { bg: 'var(--sage-light)', fg: 'var(--sage)' };
  return (
    <div className="border border-[var(--line)] rounded-lg overflow-hidden">
      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide" style={{ background: `var(--paper)`, color: c.fg }}>{label}</div>
      <div className="p-3 space-y-1 text-xs">
        <Row label="H. normales"   value={`${res.hNorm} h`} />
        <Row label="H. sup. +25%"  value={`${res.hSup25} h`} />
        <Row label="Salaire net"   value={`${res.salNet.toFixed(2)} €`} />
        {res.transport > 0 && <Row label="Transport"   value={`${res.transport.toFixed(2)} €`} />}
        {res.entretien > 0 && <Row label="Entretien"   value={`${res.entretien.toFixed(2)} €`} />}
        {res.km        > 0 && <Row label="Frais km"    value={`${res.km.toFixed(2)} €`} />}
        <div className="pt-1 border-t border-[var(--line)] flex justify-between font-medium" style={{ color: c.fg }}>
          <span>Total</span>
          <span>{res.total.toFixed(2)} €</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[var(--dust)]">
      <span>{label}</span>
      <span className="font-medium text-[var(--ink)]">{value}</span>
    </div>
  );
}

