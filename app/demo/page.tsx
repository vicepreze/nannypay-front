'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const H_NORM_SEM   = 40
const H_SUP25_SEM  = 8
const H_NORM_MENS  = Math.round(H_NORM_SEM  * 52 / 12 * 10) / 10
const H_SUP25_MENS = Math.round(H_SUP25_SEM * 52 / 12 * 10) / 10
const TRANSPORT    = 90.80

const SCENARIOS = {
  2: {
    enfants: [{ prenom: 'Emma', fam: 'A' }, { prenom: 'Lucas', fam: 'B' }],
    qp: { A: 0.5, B: 0.5 },
  },
  3: {
    enfants: [{ prenom: 'Emma', fam: 'A' }, { prenom: 'Chloé', fam: 'A' }, { prenom: 'Lucas', fam: 'B' }],
    qp: { A: 2 / 3, B: 1 / 3 },
  },
} as const

const MOIS_LONGS  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MOIS_COURTS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

type NbEnfants = 2 | 3
type Evt = { type: 'conge_paye' | 'maladie_nounou'; debut: string; fin: string }

function joursOuvrablesMois(a: number, m: number) {
  let nb = 0
  const cur = new Date(a, m - 1, 1)
  const fin = new Date(a, m, 0)
  while (cur <= fin) { if (cur.getDay() >= 1 && cur.getDay() <= 5) nb++; cur.setDate(cur.getDate() + 1) }
  return nb
}

function joursOuvrablesIntersect(debut: string, fin: string, a: number, m: number) {
  const [y1, mo1, d1] = debut.split('-').map(Number)
  const [y2, mo2, d2] = fin.split('-').map(Number)
  const dD = new Date(y1, mo1 - 1, d1), dF = new Date(y2, mo2 - 1, d2)
  const dMD = new Date(a, m - 1, 1), dMF = new Date(a, m, 0)
  const start = dD > dMD ? dD : dMD
  const end   = dF < dMF ? dF : dMF
  let nb = 0
  const cur = new Date(start)
  while (cur <= end) { if (cur.getDay() >= 1 && cur.getDay() <= 5) nb++; cur.setDate(cur.getDate() + 1) }
  return nb
}

function dateToStr(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export default function DemoPage() {
  const now = new Date()
  const [nbEnfants, setNbEnfants] = useState<NbEnfants>(2)
  const [taux,      setTaux]      = useState(11)
  const [evts,      setEvts]      = useState<Evt[]>([])
  const [annee] = useState(now.getFullYear())
  const [mois]  = useState(now.getMonth() + 1)

  const [results, setResults] = useState({
    totalNounou: 0,
    a: { hNorm: 0, hSup: 0, salNet: 0, entretien: 0, total: 0 },
    b: { hNorm: 0, hSup: 0, salNet: 0, entretien: 0, total: 0 },
  })

  const [modalOpen,  setModalOpen]  = useState(false)
  const [evtType,    setEvtType]    = useState<Evt['type'] | null>(null)
  const [evtDebut,   setEvtDebut]   = useState('')
  const [evtFin,     setEvtFin]     = useState('')
  const [modalError, setModalError] = useState('')

  const minDate = `${annee}-${String(mois).padStart(2, '0')}-01`
  const maxDate = dateToStr(new Date(annee, mois, 0))

  useEffect(() => {
    const saved = localStorage.getItem('demo_v2')
    if (saved) {
      try {
        const d = JSON.parse(saved)
        setNbEnfants(d.nbEnfants ?? 2)
        setTaux(d.taux ?? 11)
        setEvts(d.evts ?? [])
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('demo_v2', JSON.stringify({ nbEnfants, taux, evts }))
  }, [nbEnfants, taux, evts])

  useEffect(() => {
    const scenario = SCENARIOS[nbEnfants]
    const joursOuv        = joursOuvrablesMois(annee, mois)
    const joursAbsMaladie = evts.filter(e => e.type === 'maladie_nounou')
      .reduce((acc, e) => acc + joursOuvrablesIntersect(e.debut, e.fin, annee, mois), 0)
    const joursAbsCP      = evts.filter(e => e.type === 'conge_paye')
      .reduce((acc, e) => acc + joursOuvrablesIntersect(e.debut, e.fin, annee, mois), 0)
    const ratio              = joursOuv > 0 ? Math.max(0, joursOuv - joursAbsMaladie) / joursOuv : 1
    const joursEntretienBase = Math.max(0, joursOuv - joursAbsMaladie - joursAbsCP)

    const calc = (fam: 'A' | 'B') => {
      const qp      = scenario.qp[fam]
      const hNorm   = Math.round(H_NORM_MENS  * qp * ratio)
      const hSup25  = Math.round(H_SUP25_MENS * qp * ratio)
      const salNet  = Math.round((H_NORM_MENS * qp * taux * ratio + H_SUP25_MENS * qp * taux * 1.25 * ratio) * 100) / 100
      const entretien = Math.round(qp * joursEntretienBase * 6.0 * 100) / 100
      const total   = Math.round((salNet + TRANSPORT / 2 + entretien) * 100) / 100
      return { hNorm, hSup: hSup25, salNet, entretien, total }
    }
    const a = calc('A'), b = calc('B')
    setResults({ totalNounou: Math.round((a.total + b.total) * 100) / 100, a, b })
  }, [nbEnfants, taux, evts, annee, mois])

  const renderCalendar = useCallback(() => {
    const premier  = new Date(annee, mois - 1, 1)
    const offset   = premier.getDay() === 0 ? 6 : premier.getDay() - 1
    const lundi    = new Date(annee, mois - 1, 1 - offset)
    const dernier  = new Date(annee, mois, 0)
    const dow      = dernier.getDay()
    const vendredi = new Date(dernier)
    if (dow >= 1 && dow <= 4) vendredi.setDate(dernier.getDate() + (5 - dow))
    else if (dow === 6) vendredi.setDate(dernier.getDate() - 1)
    else if (dow === 0) vendredi.setDate(dernier.getDate() - 2)

    const today = new Date()
    const cells: React.ReactNode[] = []
    const cur = new Date(lundi)

    while (cur <= vendredi) {
      const d = cur.getDay()
      if (d >= 1 && d <= 5) {
        const isCur  = cur.getMonth() === mois - 1
        const isToday = cur.toDateString() === today.toDateString()
        const ds = dateToStr(cur)
        const chips = evts.filter(e => e.debut <= ds && e.fin >= ds).map((e, i) => (
          <div key={i} className={'text-[9px] px-1 py-0.5 rounded mb-0.5 truncate ' + (e.type === 'conge_paye' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700')}>
            {e.type === 'conge_paye' ? 'CP' : 'Mal.'}
          </div>
        ))
        cells.push(
          <div
            key={ds}
            onClick={() => isCur && openEvtModal(ds)}
            className={'border-r border-b border-[var(--line)] min-h-[64px] p-1.5 ' + (isCur ? 'cursor-pointer hover:bg-[var(--sage-light)]' : 'bg-[var(--paper)] opacity-30 cursor-default')}
          >
            <div className={isToday ? 'w-5 h-5 rounded-full bg-[var(--sage)] text-white text-[10px] flex items-center justify-center mb-1' : 'text-[11px] font-medium text-[var(--dust)] mb-1'}>
              {cur.getDate()}
            </div>
            {chips}
          </div>
        )
      }
      cur.setDate(cur.getDate() + 1)
    }
    return cells
  }, [annee, mois, evts])

  function openEvtModal(ds?: string) {
    setEvtType(null)
    setEvtDebut(ds ?? '')
    setEvtFin(ds ?? '')
    setModalError('')
    setModalOpen(true)
  }

  function addEvt() {
    setModalError('')
    if (!evtType)             { setModalError('Choisissez un type.'); return }
    if (!evtDebut || !evtFin) { setModalError('Les deux dates sont requises.'); return }
    if (evtFin < evtDebut)    { setModalError('La fin doit être après le début.'); return }
    const conflict = evts.some(e => e.debut <= evtFin && e.fin >= evtDebut)
    if (conflict) { setModalError('Cet intervalle chevauche un événement existant.'); return }
    setEvts(p => [...p, { type: evtType, debut: evtDebut, fin: evtFin }])
    setModalOpen(false)
  }

  const scenario = SCENARIOS[nbEnfants]

  return (
    <div className="min-h-screen bg-[var(--paper)]">

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center justify-between px-6 z-50">
        <Link href="/" className="font-serif text-[19px] tracking-tight text-[var(--ink)] no-underline">
          nounoulink<em className="not-italic text-[var(--sage)]">.</em>
        </Link>
        <div className="flex gap-2.5">
          <Link href="/" className={btnSec}>Se connecter</Link>
          <Link href="/" className={btnPri}>Créer un compte</Link>
        </div>
      </header>

      {/* MAIN */}
      <main className="pt-14">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="pt-8 pb-5">
            <h1 className="font-serif text-[26px] mb-1 text-[var(--ink)]">Calculez le salaire de votre garde partagée</h1>
            <p className="text-[13px] text-[var(--dust)]">Simulateur instantané · aucun compte requis · données sauvegardées localement</p>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: '264px 1fr 340px' }}>

            {/* GAUCHE */}
            <aside className="flex flex-col gap-3">
              <Panel title="Paramètres">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
                  <span className="text-sm font-medium text-[var(--ink)]">Taux horaire net</span>
                  <div className="flex items-center gap-1.5 text-sm text-[var(--dust)]">
                    <input
                      type="number" min={5} max={50} step={0.5} value={taux}
                      onChange={e => setTaux(parseFloat(e.target.value) || 11)}
                      className="w-16 px-2 py-1.5 rounded-lg text-[14px] font-semibold text-center outline-none bg-white border-[1.5px] border-[var(--line)] focus:border-[var(--sage)]"
                    />
                    <span>€/h</span>
                  </div>
                </div>
                {[
                  ['H. normales / sem.',  `${H_NORM_SEM} h`],
                  ['H. sup +25% / sem.',  `${H_SUP25_SEM} h`],
                  ['Total hebdo',         `${H_NORM_SEM + H_SUP25_SEM} h`],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between px-4 py-2 text-xs border-b border-[var(--line)] last:border-0 text-[var(--dust)]">
                    <span>{l}</span>
                    <span className="font-medium font-mono text-[var(--ink)]">{v}</span>
                  </div>
                ))}
              </Panel>

              <Panel title="Constantes du modèle" badge="50 / 50">
                {[['Transport', '90,80 €/mois'], ['Frais km', '0 €'], ['Entretien', '6,00 €/j']].map(([l, v]) => (
                  <div key={l} className="flex justify-between px-4 py-2 text-xs border-b border-[var(--line)] last:border-0 text-[var(--dust)]">
                    <span>{l}</span><span className="font-medium font-mono">{v}</span>
                  </div>
                ))}
              </Panel>

              <Panel title="Mode de calcul">
                <div className="grid grid-cols-2 gap-2 p-3">
                  {[
                    { id: 'A.1', nom: 'Moitié-moitié',    active: true },
                    { id: 'B.1', nom: 'Partage au temps',  active: false },
                    { id: 'A.2', nom: 'Partage au coût',   active: false },
                    { id: 'B.2', nom: '100% personnalisé', active: false },
                  ].map(m => (
                    <div key={m.id} className="rounded-lg p-3 relative" style={{
                      border: m.active ? '1.5px solid var(--sage)' : '1.5px solid var(--line)',
                      background: m.active ? 'var(--sage-light)' : 'white',
                      opacity: m.active ? 1 : 0.5,
                    }}>
                      {!m.active && <span className="absolute top-1.5 right-2 text-[10px]">🔒</span>}
                      <div className="text-[10px] font-bold mb-1" style={{ color: m.active ? 'var(--sage)' : '#888' }}>{m.id}</div>
                      <div className="text-[11px] font-medium leading-tight text-[var(--ink)]">{m.nom}</div>
                      {!m.active && <div className="text-[9px] italic mt-1 text-[var(--dust)]">avec un compte</div>}
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Scénario">
                <div className="p-3 space-y-2.5">
                  <div className="flex rounded-lg overflow-hidden border border-[var(--line)]">
                    {([2, 3] as const).map(n => (
                      <button key={n} onClick={() => setNbEnfants(n)}
                        className="flex-1 py-2 text-xs font-medium transition-colors"
                        style={{ background: nbEnfants === n ? 'var(--sage)' : 'white', color: nbEnfants === n ? 'white' : 'var(--dust)' }}>
                        {n} enfants
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {scenario.enfants.map((e, i) => (
                      <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: e.fam === 'A' ? 'var(--blue-light)' : 'var(--sage-light)', color: e.fam === 'A' ? 'var(--blue)' : 'var(--sage)' }}>
                        {e.prenom} · Fam. {e.fam}
                      </span>
                    ))}
                  </div>
                </div>
              </Panel>
            </aside>

            {/* CALENDRIER */}
            <div>
              <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--line)]">
                  <span className="text-[15px] font-medium text-[var(--ink)]">{MOIS_LONGS[mois - 1]} {annee}</span>
                  <button onClick={() => openEvtModal()} className={btnSec + ' !py-1.5 !text-xs'}>+ Événement</button>
                </div>
                <div className="grid grid-cols-5">
                  {['Lun','Mar','Mer','Jeu','Ven'].map(j => (
                    <div key={j} className="py-2 text-center text-[10px] font-medium uppercase tracking-wide border-b border-r border-[var(--line)] last:border-r-0 bg-[var(--paper)] text-[var(--dust)]">{j}</div>
                  ))}
                  {renderCalendar()}
                </div>
              </div>

              {evts.length > 0 && (
                <div className="mt-3 bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[var(--line)] text-[10px] font-medium uppercase tracking-wide bg-[var(--paper)] text-[var(--dust)]">
                    Événements
                  </div>
                  {evts.map((e, i) => {
                    const [, mo1, d1] = e.debut.split('-').map(Number)
                    const [, mo2, d2] = e.fin.split('-').map(Number)
                    const label = (d1 === d2 && mo1 === mo2)
                      ? `${d1} ${MOIS_COURTS[mo1-1]}`
                      : `${d1} ${MOIS_COURTS[mo1-1]} → ${d2} ${MOIS_COURTS[mo2-1]}`
                    return (
                      <div key={i} className="flex items-center px-4 py-2 border-b border-[var(--line)] last:border-0 text-xs gap-2">
                        <span className={'px-2 py-0.5 rounded text-[10px] ' + (e.type === 'conge_paye' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700')}>
                          {e.type === 'conge_paye' ? '🏖 CP' : '🤒 Mal.'}
                        </span>
                        <span className="flex-1 text-right text-[var(--dust)]">{label}</span>
                        <button onClick={() => setEvts(p => p.filter((_, j) => j !== i))} className="text-lg leading-none text-[var(--dust)] hover:text-[var(--red)]">×</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* RÉSULTATS */}
            <aside className="flex flex-col gap-3">
              <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[var(--line)] text-[10px] font-medium uppercase tracking-wide bg-[var(--paper)] text-[var(--dust)]">Salaire total nounou</div>
                <div className="flex justify-between items-center px-4 py-3 bg-[var(--paper)]">
                  <span className="text-sm text-[var(--ink)]">Famille A + B</span>
                  <strong className="text-[15px] text-[var(--ink)]">{results.totalNounou.toFixed(2)} €</strong>
                </div>
              </div>
              <FamilleCard label="A" color="blue" r={results.a} />
              <FamilleCard label="B" color="sage" r={results.b} />
            </aside>
          </div>

          <div className="py-12 text-center text-xs text-[var(--dust)]">
            <Link href="/" className="underline text-[var(--sage)]">Créer un compte gratuit</Link>
            {' '}pour sauvegarder, inviter Famille B, et valider à 3.
          </div>
        </div>
      </main>

      {/* MODAL ÉVÉNEMENT */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/35 z-[150] flex items-center justify-center" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 shadow-2xl" style={{ width: 'min(360px, 90vw)' }}>
            <h3 className="text-base font-medium mb-4 text-[var(--ink)]">Ajouter un événement</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(['conge_paye', 'maladie_nounou'] as const).map(t => (
                <button key={t} onClick={() => setEvtType(t)}
                  className="py-2.5 rounded-lg text-sm transition-all"
                  style={{
                    border: evtType === t ? '1.5px solid var(--sage)' : '1.5px solid var(--line)',
                    background: evtType === t ? 'var(--sage-light)' : 'white',
                    color: evtType === t ? 'var(--sage)' : 'var(--ink)',
                    fontWeight: evtType === t ? 500 : 400,
                  }}>
                  {t === 'conge_paye' ? '🏖 Congé payé' : '🤒 Maladie'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-1">
              <div>
                <label className="text-xs block mb-1 text-[var(--dust)]">Début</label>
                <input type="date" value={evtDebut} min={minDate} max={maxDate} onChange={e => { setEvtDebut(e.target.value); setModalError('') }} className={inp} />
              </div>
              <div>
                <label className="text-xs block mb-1 text-[var(--dust)]">Fin</label>
                <input type="date" value={evtFin} min={minDate} max={maxDate} onChange={e => { setEvtFin(e.target.value); setModalError('') }} className={inp} />
              </div>
            </div>
            {modalError && <p className="text-xs mt-2 mb-1 text-[var(--red)]">{modalError}</p>}
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setModalOpen(false)} className={btnSec}>Annuler</button>
              <button onClick={addEvt} className={btnPri}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Panel({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--line)] bg-[var(--paper)]">
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--dust)]">{title}</span>
        {badge && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[var(--sage-light)] text-[var(--sage)]">{badge}</span>}
      </div>
      {children}
    </div>
  )
}

function FamilleCard({ label, color, r }: {
  label: string
  color: 'blue' | 'sage'
  r: { hNorm: number; hSup: number; salNet: number; entretien: number; total: number }
}) {
  const c = color === 'blue' ? 'var(--blue)' : 'var(--sage)'
  return (
    <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--line)] text-[10px] font-medium uppercase tracking-wide bg-[var(--paper)]" style={{ color: c }}>
        Famille {label} — Pajemploi
      </div>
      {[
        ['Heures normales', r.hNorm + ' h',                   false],
        ['Heures sup +25%', r.hSup  + ' h',                   r.hSup === 0],
        ['Heures sup +50%', '0 h',                            true],
        ['Salaire net',     r.salNet.toFixed(2)    + ' €',    false],
        ['Transport',       (TRANSPORT / 2).toFixed(2) + ' €', false],
        ['Entretien',       r.entretien.toFixed(2) + ' €',    false],
        ['Frais km',        '0,00 €',                         true],
      ].map(([l, v, dim]) => (
        <div key={String(l)} className={'flex justify-between px-4 py-1.5 border-b border-[var(--line)] last:border-0 text-xs ' + (dim ? 'opacity-40' : '')}>
          <span className="text-[var(--dust)]">{l}</span>
          <span className="font-medium font-mono text-[var(--ink)]">{v}</span>
        </div>
      ))}
      <div className="flex justify-between px-4 py-2.5 font-semibold text-sm bg-[var(--paper)] text-[var(--ink)]">
        <span>Total à verser</span>
        <span>{r.total.toFixed(2)} €</span>
      </div>
    </div>
  )
}

const btnPri = 'px-4 py-2 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors no-underline'
const btnSec = 'px-4 py-2 border border-[var(--line)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] transition-colors bg-white no-underline text-[var(--ink)]'
const inp    = 'w-full px-3 py-2 rounded-lg text-sm outline-none bg-white border-[1.5px] border-[var(--line)] focus:border-[var(--sage)]'
