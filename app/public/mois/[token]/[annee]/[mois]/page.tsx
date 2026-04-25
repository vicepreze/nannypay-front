'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { calculerMois, calcHeuresSemaineFromPlanning, type Evt, type CalcResult } from '@/lib/calcul';

const MOIS_LONGS  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MOIS_COURTS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

type Famille = { label: string; nomAffiche: string | null };
type Modele = {
  tauxHoraireNet: number; hNormalesSemaine: number; hSup25Semaine: number;
  hSup50Semaine: number; repartitionA: number; navigoMontant: number;
  indemEntretien: number; indemKm: number; joursJson: string;
};
type Garde = {
  nom: string | null;
  nounou: { prenom: string } | null;
  familles: Famille[];
  enfants: { prenom: string; fam: string }[];
  modele: Modele | null;
};
type MoisRec = { annee: number; mois: number; statut: string; evenementsJson: string };

function dateStr(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export default function PublicMoisPage() {
  const { token, annee: anneeStr, mois: moisStr } = useParams<{ token: string; annee: string; mois: string }>();
  const annee = parseInt(anneeStr);
  const mois  = parseInt(moisStr);

  const [garde,   setGarde]   = useState<Garde | null>(null);
  const [moisRec, setMoisRec] = useState<MoisRec | null>(null);
  const [evts,    setEvts]    = useState<Evt[]>([]);
  const [result,  setResult]  = useState<CalcResult | null>(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/mois/${token}/${annee}/${mois}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setGarde(d.garde);
        if (d.moisRec) {
          setMoisRec(d.moisRec);
          setEvts(JSON.parse(d.moisRec.evenementsJson || '[]'));
        }
      })
      .finally(() => setLoading(false));
  }, [token, annee, mois]);

  useEffect(() => {
    if (!garde?.modele) return;
    const m = garde.modele;
    const { joursActifsParSemaine } = calcHeuresSemaineFromPlanning(m.joursJson || '{}');
    setResult(calculerMois({
      annee, mois,
      taux:                  m.tauxHoraireNet,
      hNormalesSemaine:      m.hNormalesSemaine,
      hSup25Semaine:         m.hSup25Semaine,
      hSup50Semaine:         m.hSup50Semaine,
      repartitionA:          m.repartitionA,
      racOptionActive:       false,
      navigo:                m.navigoMontant,
      indemEntretien:        m.indemEntretien,
      indemKm:               m.indemKm,
      joursActifsParSemaine: joursActifsParSemaine || 5,
      evenements:            evts,
    }));
  }, [garde, evts, annee, mois]);

  const renderCalendar = useCallback(() => {
    const premier = new Date(annee, mois - 1, 1);
    const offset  = premier.getDay() === 0 ? 6 : premier.getDay() - 1;
    const lundi   = new Date(annee, mois - 1, 1 - offset);
    const dernier = new Date(annee, mois, 0);
    const dow     = dernier.getDay();
    const vend    = new Date(dernier);
    if (dow >= 1 && dow <= 4) vend.setDate(dernier.getDate() + (5 - dow));
    else if (dow === 6) vend.setDate(dernier.getDate() - 1);
    else if (dow === 0) vend.setDate(dernier.getDate() - 2);

    const cells: React.ReactNode[] = [];
    const cur = new Date(lundi);
    while (cur <= vend) {
      if (cur.getDay() >= 1 && cur.getDay() <= 5) {
        const isCur = cur.getMonth() === mois - 1;
        const ds = dateStr(cur);
        const chips = evts.filter(e => e.debut <= ds && e.fin >= ds).map((e, i) => (
          <div key={i} className={'text-[9px] px-1 py-0.5 rounded mb-0.5 truncate ' + (e.type === 'conge_paye' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700')}>
            {e.type === 'conge_paye' ? 'CP' : 'Mal.'}
          </div>
        ));
        cells.push(
          <div
            key={ds}
            className={'border-r border-b border-[var(--line)] min-h-[64px] p-1.5 cursor-default' + (!isCur ? ' bg-[var(--paper)] opacity-30' : '')}
          >
            <div className="text-[11px] font-medium text-[var(--dust)] mb-1">{cur.getDate()}</div>
            {chips}
          </div>
        );
      }
      cur.setDate(cur.getDate() + 1);
    }
    return cells;
  }, [annee, mois, evts]);

  if (loading) return <Screen><p className="text-[var(--dust)]">Chargement…</p></Screen>;
  if (error)   return <Screen><div className="text-center"><div className="text-4xl mb-4">⚠️</div><p className="font-medium">{error}</p></div></Screen>;
  if (!garde)  return null;

  const famA   = garde.familles.find(f => f.label === 'A');
  const famB   = garde.familles.find(f => f.label === 'B');
  const moisLabel = `${MOIS_LONGS[mois - 1]} ${annee}`;
  const statutMap: Record<string, string> = {
    ouvert:    'En cours',
    valide_a:  `Validé ${famA?.nomAffiche ?? 'Fam. A'}`,
    valide_b:  `Validé ${famB?.nomAffiche ?? 'Fam. B'}`,
    valide_ab: 'Validé ✓',
  };
  const statut = moisRec?.statut ?? 'ouvert';

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center px-6 z-50 gap-4">
        <a href="/" className="font-serif text-[19px] tracking-tight text-[var(--ink)] no-underline">
          nounoulink<em className="text-[var(--sage)] not-italic">.</em>
        </a>
        <span className="text-[var(--line)]">|</span>
        <span className="text-sm text-[var(--dust)]">{garde.nom ?? 'Garde'} · {moisLabel}</span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium bg-[var(--paper)] text-[var(--dust)]">
          {statutMap[statut] ?? statut}
        </span>
      </header>

      <div className="pt-14 max-w-3xl mx-auto px-6 pb-16">
        <div className="pt-8 mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-serif text-3xl text-[var(--ink)]">{moisLabel}</h1>
            <p className="text-sm text-[var(--dust)] mt-1">
              {garde.nom ?? ''}
              {garde.nounou && <> · {garde.nounou.prenom}</>}
            </p>
          </div>
        </div>

        <div className="space-y-5">

          {/* Calendrier */}
          <Card title="Planning du mois">
            <div className="grid grid-cols-5">
              {['Lun','Mar','Mer','Jeu','Ven'].map(j => (
                <div key={j} className="py-2 text-center text-[10px] font-medium text-[var(--dust)] uppercase tracking-wide border-b border-r border-[var(--line)] last:border-r-0 bg-[var(--paper)]">{j}</div>
              ))}
              {renderCalendar()}
            </div>
            {result && (
              <div className="px-5 py-3 border-t border-[var(--line)] flex flex-wrap gap-5 text-sm bg-[var(--paper)]">
                <div><span className="text-[var(--dust)]">Jours ouvrables</span> <strong className="ml-2">{result.joursOuv}</strong></div>
                {result.joursAbsMaladie > 0 && <div><span className="text-[var(--dust)]">Maladie</span> <strong className="ml-2 text-red-500">−{result.joursAbsMaladie}</strong></div>}
                {result.joursAbsCP > 0 && <div><span className="text-[var(--dust)]">Congés payés</span> <strong className="ml-2 text-blue-600">−{result.joursAbsCP}</strong></div>}
                <div><span className="text-[var(--dust)]">Jours travaillés</span> <strong className="ml-2">{result.joursTrav}</strong></div>
              </div>
            )}
          </Card>

          {/* Événements */}
          {evts.length > 0 && (
            <Card title="Événements">
              {evts.map((e, i) => {
                const [, mo1, d1] = e.debut.split('-').map(Number);
                const [, mo2, d2] = e.fin.split('-').map(Number);
                const label = (d1 === d2 && mo1 === mo2)
                  ? `${d1} ${MOIS_COURTS[mo1-1]}`
                  : `${d1} ${MOIS_COURTS[mo1-1]} → ${d2} ${MOIS_COURTS[mo2-1]}`;
                return (
                  <div key={i} className="flex items-center px-5 py-2.5 border-b border-[var(--line)] last:border-0 text-sm gap-3">
                    <span className={'px-2 py-0.5 rounded text-xs ' + (e.type === 'conge_paye' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700')}>
                      {e.type === 'conge_paye' ? '🏖 Congé payé' : '🤒 Maladie'}
                    </span>
                    <span className="text-[var(--dust)]">{label}</span>
                  </div>
                );
              })}
            </Card>
          )}

          {/* Résultats */}
          {result && (
            <>
              {/* Total nounou */}
              <div className="bg-[var(--sage-light)] border border-[var(--sage)] rounded-[var(--radius)] px-5 py-4 flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--sage)]">Total net à recevoir (nounou)</span>
                <span className="text-2xl font-bold text-[var(--sage)]">{result.totalNounou.toFixed(2)} €</span>
              </div>

              {/* Pajemploi par famille */}
              <div className="grid grid-cols-2 gap-4">
                <PajemploiCard label="Famille A" nom={famA?.nomAffiche ?? null} color="blue" r={result.famA} />
                <PajemploiCard label="Famille B" nom={famB?.nomAffiche ?? null} color="sage" r={result.famB} />
              </div>
            </>
          )}

          {!moisRec && (
            <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] p-8 text-center text-sm text-[var(--dust)]">
              Aucun relevé disponible pour ce mois.
            </div>
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

function PajemploiCard({ label, nom, color, r }: {
  label: string;
  nom: string | null;
  color: 'blue' | 'sage';
  r: CalcResult['famA'];
}) {
  const fg = color === 'blue' ? 'var(--blue)' : 'var(--sage)';
  return (
    <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--line)] bg-[var(--paper)] text-[10px] font-bold uppercase tracking-wide" style={{ color: fg }}>
        {nom ?? label} — Pajemploi
      </div>
      <div className="divide-y divide-[var(--line)]">
        <Row label="H. normales"   value={`${r.hNorm} h`} />
        {r.hSup25 > 0 && <Row label="H. sup +25%"  value={`${r.hSup25} h`} />}
        {r.hSup50 > 0 && <Row label="H. sup +50%"  value={`${r.hSup50} h`} />}
        <Row label="Salaire net"   value={`${r.salNet.toFixed(2)} €`} />
        <Row label="Transport"     value={`${r.transport.toFixed(2)} €`} />
        <Row label="Entretien"     value={`${r.entretien.toFixed(2)} €`} />
        {r.km > 0 && <Row label="Frais km"     value={`${r.km.toFixed(2)} €`} />}
        <div className="flex justify-between px-4 py-2.5 bg-[var(--paper)] font-semibold text-sm" style={{ color: fg }}>
          <span>Total à verser</span>
          <span>{r.total.toFixed(2)} €</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-1.5 text-xs">
      <span className="text-[var(--dust)]">{label}</span>
      <span className="font-medium font-mono text-[var(--ink)]">{value}</span>
    </div>
  );
}
