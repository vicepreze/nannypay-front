import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Comment calculer le salaire d'une nounou en garde partagée : le guide complet | nounoulink.",
  description:
    "Formule, exemples chiffrés, heures supplémentaires et règles Pajemploi pour calculer et répartir le salaire de votre assistant parental en garde partagée en 2026.",
  alternates: {
    canonical: 'https://nounoulink.fr/blog/calculer-salaire-nounou-garde-partagee',
  },
};

// ── Composants de mise en page article ───────────────────────────────────────

function SectionNum({ n, error = false }: { n: string; error?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-white text-xs font-bold mr-2 align-middle relative -top-0.5 flex-shrink-0 ${
        error ? 'bg-red-600' : 'bg-[var(--sage)]'
      }`}
    >
      {n}
    </span>
  );
}

function Note({ type, children }: { type: 'info' | 'warn'; children: React.ReactNode }) {
  return (
    <div
      className={`flex gap-3 items-start rounded-[var(--radius)] px-4 py-3.5 my-5 text-sm leading-relaxed ${
        type === 'info'
          ? 'bg-[var(--sage-light)] border-l-[3px] border-[var(--sage)] text-[var(--ink)]'
          : 'bg-[#fdf8ee] border-l-[3px] border-[#c8a96e] text-[#5a4a20]'
      }`}
    >
      {children}
    </div>
  );
}

function FormulaBox({ label, formula }: { label: string; formula: React.ReactNode }) {
  return (
    <div className="bg-[#0f1923] rounded-[var(--radius)] px-6 py-5 my-5">
      <div className="text-[10px] font-semibold tracking-widest uppercase text-[var(--sage-mid)] mb-2.5 flex items-center gap-2">
        <span className="inline-block w-3.5 h-px bg-[var(--sage)]" />
        {label}
      </div>
      <code className="block font-sans text-sm font-medium text-white leading-loose not-italic">
        {formula}
      </code>
    </div>
  );
}

function CalcCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden my-5 shadow-sm">
      <div className="bg-[#1a2318] px-5 py-3.5 flex items-center gap-3">
        <span className="w-8 h-8 bg-[var(--sage)]/20 rounded-lg flex items-center justify-center text-base flex-shrink-0">
          {icon}
        </span>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      {children}
    </div>
  );
}

function CalcRow({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <tr className="border-b border-[var(--line)]">
      <td className="px-5 py-2.5 text-sm text-[var(--dust)]">{label}</td>
      <td className="px-5 py-2.5 text-sm text-right font-semibold text-[var(--ink)] whitespace-nowrap">{value}</td>
    </tr>
  );
}

function CalcSubtotalRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="bg-[var(--sage-light)]">
      <td className="px-5 py-2.5 text-sm font-bold text-[var(--sage)]">{label}</td>
      <td className="px-5 py-2.5 text-sm text-right font-bold text-[var(--sage)] whitespace-nowrap">{value}</td>
    </tr>
  );
}

function CalcTotalRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="bg-[#0f1923]">
      <td className="px-5 py-3 text-sm font-bold text-white">{label}</td>
      <td className="px-5 py-3 text-sm text-right font-bold text-white whitespace-nowrap">{value}</td>
    </tr>
  );
}

function CalcNoteRow({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={2} className="px-5 py-2 text-xs text-[var(--dust)] italic leading-relaxed">
        {children}
      </td>
    </tr>
  );
}

function Tag({ color, children }: { color: 'green' | 'gold' | 'red'; children: React.ReactNode }) {
  const cls = {
    green: 'bg-[var(--sage-light)] text-[var(--sage)]',
    gold:  'bg-[#fdf3e0] text-[#8a6020]',
    red:   'bg-red-50 text-red-600',
  }[color];
  return (
    <span className={`inline-block text-[11px] font-semibold px-1.5 py-0.5 rounded ml-1 ${cls}`}>
      {children}
    </span>
  );
}

function Step({
  num, title, children, error = false,
}: { num: string; title: string; children: React.ReactNode; error?: boolean }) {
  return (
    <div className="flex gap-3 items-start">
      <span
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white mt-0.5 ${
          error ? 'bg-red-600' : 'bg-[var(--sage)]'
        }`}
      >
        {num}
      </span>
      <div className="text-sm text-[var(--dust)] leading-relaxed">
        <strong className="block text-[var(--ink)] font-semibold mb-0.5">{title}</strong>
        {children}
      </div>
    </div>
  );
}

function CtaMid({ title, desc, ctaText, ctaHref }: {
  title: string; desc: string; ctaText: string; ctaHref: string;
}) {
  return (
    <div className="bg-[#0f1923] rounded-2xl px-8 py-9 my-10 text-center relative overflow-hidden">
      <h3 className="font-serif text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/55 mb-6 max-w-sm mx-auto leading-relaxed">{desc}</p>
      <Link
        href={ctaHref}
        className="inline-block bg-[var(--sage)] text-white font-semibold text-sm px-8 py-3 rounded-lg hover:bg-[#3a5431] transition-colors no-underline"
      >
        {ctaText}
      </Link>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ArticleCalculerSalaire() {
  return (
    <div className="min-h-screen bg-[var(--paper)]">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center justify-between px-4 md:px-6 z-50">
        <Link href="/" className="font-serif text-[19px] tracking-tight text-[var(--ink)] no-underline">
          nounoulink<em className="text-[var(--sage)] not-italic">.</em>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/blog" className="text-sm text-[var(--dust)] hover:text-[var(--ink)] transition-colors no-underline">
            Blog
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors no-underline"
          >
            Essayer la démo →
          </Link>
        </nav>
      </header>

      <main className="pt-14">

        {/* Hero */}
        <div className="bg-[#0f1923] px-5 md:px-8 pt-16 pb-12 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 80% at 10% 50%, rgba(74,103,65,0.18) 0%, transparent 60%)' }}
          />
          <div className="relative max-w-[780px] mx-auto">

            {/* Breadcrumb */}
            <nav className="text-xs text-white/35 mb-6 flex items-center flex-wrap gap-1.5">
              <Link href="/" className="text-white/40 hover:text-[var(--sage-mid)] no-underline transition-colors">nounoulink.</Link>
              <span className="text-white/20">/</span>
              <Link href="/blog" className="text-white/40 hover:text-[var(--sage-mid)] no-underline transition-colors">Blog</Link>
              <span className="text-white/20">/</span>
              <span>Guide salaire</span>
            </nav>

            {/* Tag */}
            <div className="inline-flex items-center gap-2 bg-[var(--sage)]/25 border border-[var(--sage)]/40 text-[var(--sage-mid)] text-[11px] font-medium tracking-widest uppercase px-3.5 py-1.5 rounded-full mb-5">
              <span className="text-[8px]">●</span>
              Guide complet · Mis à jour mai 2026
            </div>

            {/* H1 */}
            <h1 className="font-serif font-bold leading-tight text-white tracking-tight" style={{ fontSize: 'clamp(1.9rem, 4.5vw, 3rem)' }}>
              Comment calculer le salaire d&apos;une nounou{' '}
              <em className="italic text-[var(--sage-mid)]">en garde partagée</em>{' '}
              : le guide complet
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap gap-5 mt-5 text-xs text-white/40">
              {['Lecture 9 min', 'Sources Pajemploi, Urssaf, Légifrance', 'Chiffres 2026'].map((m) => (
                <span key={m} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[var(--sage)] inline-block flex-shrink-0" />
                  {m}
                </span>
              ))}
            </div>

          </div>
        </div>

        {/* Content : article + sidebar */}
        <div className="max-w-[1120px] mx-auto px-5 md:px-8 py-12 md:py-16 grid grid-cols-1 md:grid-cols-[1fr_256px] gap-8 md:gap-10 items-start">

          {/* ── Article ── */}
          <article>

            {/* Résumé */}
            <div className="bg-[#0f1923] rounded-2xl px-6 py-7 mb-10">
              <div className="text-[10px] font-semibold tracking-widest uppercase text-[var(--sage-mid)] mb-3 flex items-center gap-2">
                <span className="inline-block w-[18px] h-px bg-[var(--sage)]" />
                Résumé · 1 minute
              </div>
              <h2 className="font-serif text-[18px] font-bold text-white mb-4">
                Ce que vous devez retenir avant de continuer
              </h2>
              <ul className="space-y-2.5">
                {[
                  <>Le salaire est <strong className="text-white">mensualisé</strong> : même montant chaque mois, même pendant les congés payés.</>,
                  <>Formule de base : <strong className="text-white">salaire horaire × (heures hebdo × 52 ÷ 12)</strong>.</>,
                  <>Au-delà de <strong className="text-white">40h/semaine</strong> : majoration <strong className="text-white">+25 %</strong> jusqu&apos;à la 48e heure, puis <strong className="text-white">+50 %</strong> au-delà.</>,
                  <>En garde partagée : chaque famille fait <strong className="text-white">sa propre déclaration Pajemploi</strong> chaque mois.</>,
                  <>nounoulink. calcule tout ça et vous donne <strong className="text-white">exactement quoi saisir sur Pajemploi</strong>.</>,
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/75 leading-snug list-none">
                    <span className="text-[var(--sage-mid)] flex-shrink-0 mt-0.5">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Intro */}
            <p className="text-[var(--dust)] leading-relaxed mb-3">
              Vous venez de trouver une super assistante parentale et une famille co-partenaire pour partager la garde. Maintenant vient la vraie question : <em>combien on lui paie, et qui paie quoi ?</em>
            </p>
            <p className="text-[var(--dust)] leading-relaxed mb-4">
              La bonne nouvelle : le calcul suit une logique claire. La moins bonne : il y a plusieurs étapes, et la moindre erreur se retrouve dans votre déclaration Pajemploi. Ce guide vous emmène pas à pas, avec des chiffres réels.
            </p>

            {/* ── 1. Salaire horaire ── */}
            <h2 id="salaire-horaire" className="font-serif text-2xl font-bold text-[var(--ink)] mt-12 mb-4 leading-tight">
              <SectionNum n="1" />Déterminer le salaire horaire
            </h2>
            <p className="text-[var(--dust)] leading-relaxed mb-4">
              Vous avez deux contraintes : le <strong>salaire minimum conventionnel</strong> fixé par la convention collective nationale (IDCC 3239) et le <strong>SMIC</strong>. C&apos;est toujours le plus élevé des deux qui s&apos;applique.
            </p>

            <CalcCard icon="📋" title="Salaires minima au 1er juin 2026 — Assistant parental">
              <table className="w-full border-collapse">
                <tbody>
                  <CalcRow label={<>Niveau A — sans diplôme spécifique<Tag color="green">Le plus courant</Tag></>} value="12,89 € brut/h" />
                  <CalcRow label="Niveau B — avec qualification reconnue" value="13,08 € brut/h" />
                  <CalcRow label="SMIC horaire 2026" value="12,02 € brut/h" />
                  <CalcNoteRow>
                    Le salaire conventionnel (12,89 €) étant supérieur au SMIC, c&apos;est lui qui s&apos;applique. Source : CCN IDCC 3239, avenant salaire en vigueur au 1er juin 2026.
                  </CalcNoteRow>
                </tbody>
              </table>
            </CalcCard>

            <Note type="info">
              <span className="text-base flex-shrink-0">💡</span>
              <span>En garde partagée, le salaire horaire est <strong>souvent négocié légèrement au-dessus</strong> du minimum : gérer deux enfants de deux familles différentes représente une responsabilité accrue qui se justifie à l&apos;embauche.</span>
            </Note>

            {/* ── 2. Mensualisation ── */}
            <h2 id="mensualisation" className="font-serif text-2xl font-bold text-[var(--ink)] mt-12 mb-4 leading-tight">
              <SectionNum n="2" />Calculer le salaire mensuel (mensualisation)
            </h2>
            <p className="text-[var(--dust)] leading-relaxed mb-4">
              La mensualisation garantit un salaire <strong>identique chaque mois</strong>, que le mois compte 4 ou 5 semaines, en février comme en août. C&apos;est une obligation légale dès que l&apos;accueil est régulier.
            </p>

            <FormulaBox
              label="Formule officielle — Pajemploi / Urssaf"
              formula={
                <>
                  Salaire mensuel brut ={' '}
                  <em className="not-italic text-[var(--sage-mid)]">Salaire horaire brut</em>
                  {' × ('}
                  <em className="not-italic text-[var(--sage-mid)]">Heures hebdomadaires</em>
                  {' × 52 ÷ 12)'}
                </>
              }
            />

            <CalcCard icon="🧮" title="Exemple — Sophie, niveau A, 40h/semaine, 13,50 €/h">
              <table className="w-full border-collapse">
                <tbody>
                  <CalcRow label="Salaire horaire brut" value="13,50 €" />
                  <CalcRow label="Heures hebdomadaires" value="40 h" />
                  <CalcRow label="Calcul : 13,50 × (40 × 52 ÷ 12)" value="13,50 × 173,33" />
                  <CalcSubtotalRow label="Salaire mensuel brut" value="2 340 € brut" />
                  <CalcNoteRow>
                    Soit environ 1 826 € net/mois · Ce montant est déclaré identiquement chaque mois sur Pajemploi, y compris pendant les 5 semaines de congés payés légaux.
                  </CalcNoteRow>
                </tbody>
              </table>
            </CalcCard>

            {/* ── 3. Heures supplémentaires ── */}
            <h2 id="heures-sup" className="font-serif text-2xl font-bold text-[var(--ink)] mt-12 mb-4 leading-tight">
              <SectionNum n="3" />Heures supplémentaires : majorations obligatoires
            </h2>
            <p className="text-[var(--dust)] leading-relaxed mb-4">
              La convention collective des particuliers employeurs (IDCC 3239, art. 136 et 147) prévoit une durée de référence de <strong>40 heures par semaine</strong>. Au-delà, chaque heure travaillée est majorée selon un barème précis — et cette majoration est <strong>obligatoire, même avec l&apos;accord de votre assistante parentale</strong>.
            </p>

            <Note type="warn">
              <span className="text-base flex-shrink-0">⚠️</span>
              <span>Les heures supplémentaires se décomptent <strong>par semaine civile</strong> (lundi 0h → dimanche 24h). En cas d&apos;horaires irréguliers, elles sont calculées sur une <strong>moyenne de 40h sur 8 semaines consécutives</strong>. Source : Légifrance, CCN IDCC 3239.</span>
            </Note>

            {/* Barre heures sup */}
            <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden my-5">
              <div className="bg-[#1a2318] px-5 py-3.5 flex items-center gap-3">
                <span className="w-8 h-8 bg-[var(--sage)]/20 rounded-lg flex items-center justify-center text-base flex-shrink-0">📊</span>
                <span className="text-sm font-semibold text-white">Barème légal des majorations — Convention collective IDCC 3239</span>
              </div>
              <div className="px-5 py-5">
                <div className="flex h-12 rounded-lg overflow-hidden mb-4">
                  <div className="flex items-center justify-center bg-[var(--sage)] text-white text-[11px] font-bold text-center leading-snug px-1" style={{ flex: 40 }}>
                    0 → 40h<br />taux normal
                  </div>
                  <div className="flex items-center justify-center bg-[#c8a96e] text-white text-[11px] font-bold text-center leading-snug px-1" style={{ flex: 8 }}>
                    41e → 48e h<br />+ 25 %
                  </div>
                  <div className="flex items-center justify-center bg-red-600 text-white text-[11px] font-bold text-center leading-snug px-1" style={{ flex: 4 }}>
                    &gt; 48h<br />+ 50 %
                  </div>
                </div>
                <div className="flex flex-wrap gap-5">
                  {[
                    { cls: 'bg-[var(--sage)]', label: <>0 à 40h — taux contractuel normal</> },
                    { cls: 'bg-[#c8a96e]',     label: <>41e à 48e heure — majoration <strong>+ 25 %</strong></> },
                    { cls: 'bg-red-600',        label: <>Au-delà de 48h — majoration <strong>+ 50 %</strong></> },
                  ].map(({ cls, label }, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-[var(--dust)]">
                      <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${cls}`} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <h3 className="text-base font-semibold text-[var(--ink)] mt-7 mb-3">
              Exemple chiffré — Sophie travaille 50h dans une semaine
            </h3>

            <CalcCard icon="🕐" title="Décomposition du salaire sur une semaine à 50h — taux horaire 13,50 €">
              <table className="w-full border-collapse">
                <tbody>
                  <CalcRow label="40 heures normales × 13,50 €" value="540,00 €" />
                  <CalcRow
                    label={<>8 heures sup. (41e→48e) × 13,50 × 1,25 <Tag color="gold">+ 25 %</Tag></>}
                    value="135,00 €"
                  />
                  <CalcRow
                    label={<>2 heures sup. (49e→50e) × 13,50 × 1,50 <Tag color="red">+ 50 %</Tag></>}
                    value="40,50 €"
                  />
                  <CalcTotalRow label="Total brut sur cette semaine" value="715,50 €" />
                  <CalcNoteRow>
                    Sans majoration, 50h à taux normal auraient coûté 675 €. La majoration légale représente ici + 40,50 € sur la semaine.
                  </CalcNoteRow>
                </tbody>
              </table>
            </CalcCard>

            <h3 className="text-base font-semibold text-[var(--ink)] mt-7 mb-3">
              En garde partagée : qui paie les heures supplémentaires ?
            </h3>
            <p className="text-[var(--dust)] leading-relaxed mb-4">
              La convention collective précise : en garde partagée, si le total des heures dépasse 40h/semaine, la rémunération des heures supplémentaires est supportée <strong>selon le mode de répartition convenu entre les familles</strong>.
            </p>

            <Note type="info">
              <span className="text-base flex-shrink-0">💡</span>
              <span>En pratique : si les heures sup sont générées par <strong>une seule famille</strong> (ex. la famille A a demandé une heure supplémentaire ce jour-là), <strong>c&apos;est elle qui les prend entièrement en charge</strong>. Si elles résultent d&apos;une décision commune, elles se répartissent au prorata habituel entre les deux familles.</span>
            </Note>

            <CtaMid
              title="nounoulink. calcule les heures sup automatiquement"
              desc="Entrez vos horaires, signalez les événements du mois — on gère les majorations et on vous dit exactement quoi déclarer sur Pajemploi."
              ctaText="Essayer la démo →"
              ctaHref="/"
            />

            {/* ── 4. Répartition ── */}
            <h2 id="repartition" className="font-serif text-2xl font-bold text-[var(--ink)] mt-12 mb-4 leading-tight">
              <SectionNum n="4" />Répartir le salaire entre les deux familles
            </h2>
            <p className="text-[var(--dust)] leading-relaxed mb-4">
              La convention collective ne fixe aucune méthode de répartition entre familles en garde partagée. C&apos;est un accord librement négocié — mais la méthode la plus juste et la plus courante est de se répartir <strong>au prorata des heures gardées par chaque enfant</strong>.
            </p>

            <FormulaBox
              label="Formule de répartition"
              formula={
                <>
                  Part famille A (%) ={' '}
                  <em className="not-italic text-[var(--sage-mid)]">Heures gardées par l&apos;enfant A</em>
                  {' ÷ '}
                  <em className="not-italic text-[var(--sage-mid)]">Total heures cumulées de tous les enfants</em>
                </>
              }
            />

            <p className="text-[var(--dust)] leading-relaxed mb-4">
              Cette méthode proportionnelle est un point de départ, pas une obligation : c&apos;est à chaque famille de décider de son mode de répartition. Certaines l&apos;ajustent pour équilibrer leur reste à charge réel une fois les aides prises en compte (voir l&apos;exemple 3 ci-dessous).
            </p>

            <h3 className="text-base font-semibold text-[var(--ink)] mt-7 mb-3">
              Exemple 1 — Répartition 50/50 : même temps de garde
            </h3>

            <CalcCard icon="⚖️" title="Lucas (famille A) et Emma (famille B) — 40h chacun/semaine">
              <table className="w-full border-collapse">
                <tbody>
                  <CalcRow label="Heures hebdo de Lucas" value="40 h" />
                  <CalcRow label="Heures hebdo d'Emma" value="40 h" />
                  <CalcRow label="Part famille A" value="40 ÷ 80 = 50 %" />
                  <CalcRow label="Part famille B" value="40 ÷ 80 = 50 %" />
                  <CalcTotalRow label="Chaque famille déclare sur Pajemploi" value="1 170 € brut/mois" />
                </tbody>
              </table>
            </CalcCard>

            <h3 className="text-base font-semibold text-[var(--ink)] mt-7 mb-3">
              Exemple 2 — Horaires asymétriques
            </h3>

            <CalcCard icon="🕐" title="Théo (famille A) 45h/sem · Louise (famille B) 40h/sem">
              <table className="w-full border-collapse">
                <tbody>
                  <CalcRow label="Contexte : Louise arrive à 9h alors que Sophie est déjà là depuis 8h avec Théo" value="5h/sem en garde simple (famille A)" />
                  <CalcRow label="Heures partagées simultanées (9h→17h × 5j)" value="40h partagées" />
                  <CalcRow label="Part famille A : 20h partagées + 5h simples" value="25h → 55,5 %" />
                  <CalcRow label="Part famille B : 20h partagées" value="20h → 44,5 %" />
                  <CalcTotalRow label="Famille A déclare" value="≈ 1 298 € brut/mois" />
                  <CalcTotalRow label="Famille B déclare" value="≈ 1 041 € brut/mois" />
                </tbody>
              </table>
            </CalcCard>

            <h3 className="text-base font-semibold text-[var(--ink)] mt-7 mb-3">
              Exemple 3 — 3 enfants pour 2 familles : pourquoi 60/40 et pas 66/33
            </h3>
            <p className="text-[var(--dust)] leading-relaxed mb-4">
              Cas fréquent à trois enfants : une famille en a deux, l&apos;autre un seul. Si les trois enfants sont gardés exactement les mêmes heures, le prorata strict par heures donne un résultat déséquilibré une fois les aides prises en compte — en pratique, l&apos;usage est plutôt de se rapprocher de 60/40.
            </p>

            <CalcCard icon="👨‍👩‍👧‍👦" title="Léna et Tom (famille A, 2 enfants) · Nina (famille B, 1 enfant) — 40h/semaine chacun">
              <table className="w-full border-collapse">
                <tbody>
                  <CalcRow label="Heures hebdo Léna + Tom (famille A)" value="40 + 40 = 80 h" />
                  <CalcRow label="Heures hebdo Nina (famille B)" value="40 h" />
                  <CalcRow label="Prorata strict par heures — famille A" value="80 ÷ 120 = 66,7 %" />
                  <CalcRow label="Prorata strict par heures — famille B" value="40 ÷ 120 = 33,3 %" />
                  <CalcSubtotalRow label="Répartition réellement pratiquée — famille A" value="≈ 60 %" />
                  <CalcSubtotalRow label="Répartition réellement pratiquée — famille B" value="≈ 40 %" />
                  <CalcNoteRow>
                    Le ratio exact dépend des revenus de chaque famille — nounoulink. le calcule automatiquement via son Mode Magique pour équilibrer le reste à charge réel.
                  </CalcNoteRow>
                </tbody>
              </table>
            </CalcCard>

            <Note type="info">
              <span className="text-base flex-shrink-0">💡</span>
              <span>
                Pourquoi pas 66/33 ? Le CMG (volet cotisations) est plafonné à <strong>524 €/mois</strong>, que vous gardiez 1 ou 2 enfants — ce plafond ne double pas. Le crédit d&apos;impôt suit la même logique : son plafond passe de <strong>6 750 €/an pour 1 enfant</strong> à seulement <strong>7 500 €/an pour 2 enfants</strong>, soit + 11 % pour deux fois plus d&apos;enfants gardés. La famille à deux enfants reçoit donc proportionnellement moins d&apos;aide par enfant. Avec un prorata strictement proportionnel aux heures, elle supporterait un reste à charge disproportionné — d&apos;où l&apos;usage de rééquilibrer vers 60/40.
              </span>
            </Note>

            {/* ── 5. Pajemploi ── */}
            <h2 id="pajemploi" className="font-serif text-2xl font-bold text-[var(--ink)] mt-12 mb-4 leading-tight">
              <SectionNum n="5" />Ce que vous déclarez sur Pajemploi
            </h2>

            <div className="flex flex-col gap-4 my-5">
              <Step num="1" title="Deux déclarations distinctes, chaque mois">
                En garde partagée, chaque famille a son propre compte Pajemploi et déclare sa quote-part séparément. L&apos;assistante parentale reçoit un seul bulletin, édité par Pajemploi à partir des deux déclarations.
              </Step>
              <Step num="2" title="Ce que vous renseignez dans chaque champ">
                Les heures effectuées (votre part), les jours d&apos;activité, les congés payés pris ce mois, le salaire net à verser et les indemnités éventuelles (transport, repas). Pajemploi calcule ensuite vos charges sociales.
              </Step>
              <Step num="3" title="Le CMG est déduit automatiquement">
                Si vous bénéficiez du Complément de libre choix du Mode de Garde (réformé en septembre 2025, suppression du reste à charge de 15 %), Pajemploi intègre l&apos;aide et ne vous réclame que votre reste à charge réel.
              </Step>
              <Step num="4" title="La fiche de paie est générée par Pajemploi">
                Vous n&apos;avez pas à créer de bulletin de salaire. Pajemploi l&apos;édite et le met à disposition de votre assistante parentale dans son espace en ligne personnel.
              </Step>
            </div>

            {/* ── 6. Coût réel ── */}
            <h2 id="cout-reel" className="font-serif text-2xl font-bold text-[var(--ink)] mt-12 mb-4 leading-tight">
              <SectionNum n="6" />Ce que ça vous coûte vraiment après aides
            </h2>

            <CalcCard icon="💰" title="Coût réel estimé — une famille à 50 % de la garde">
              <table className="w-full border-collapse">
                <tbody>
                  <CalcRow label="Part du salaire brut mensuel" value="1 170 €" />
                  <CalcRow label="Charges patronales (≈ 25 %)" value="+ 293 €" />
                  <CalcRow label="Coût total avant aides" value="≈ 1 463 €" />
                  <CalcRow
                    label={<>CMG — prise en charge 50 % des cotisations (plafonnée)<Tag color="green">CAF</Tag></>}
                    value="− env. 150–260 €"
                  />
                  <CalcRow
                    label={<>Crédit d&apos;impôt 50 % des dépenses nettes<Tag color="green">Impôts</Tag></>}
                    value="− env. 300–450 €"
                  />
                  <CalcTotalRow label="Reste à charge effectif estimé" value="400 – 700 € / mois*" />
                  <CalcNoteRow>
                    *Varie selon vos revenus, l&apos;âge de l&apos;enfant et le CMG accordé par la CAF. Utilisez le simulateur officiel sur urssaf.fr pour votre situation exacte.
                  </CalcNoteRow>
                </tbody>
              </table>
            </CalcCard>

            <Note type="info">
              <span className="text-base flex-shrink-0">📌</span>
              <span>Depuis <strong>septembre 2025</strong>, la réforme du CMG a supprimé le reste à charge obligatoire de 15 %. L&apos;aide est désormais calculée sur les heures réellement effectuées — ce qui peut réduire significativement votre coût selon vos revenus. Source : CAF, Urssaf.</span>
            </Note>

            {/* ── Erreurs ── */}
            <h2 id="erreurs" className="font-serif text-2xl font-bold text-[var(--ink)] mt-12 mb-4 leading-tight">
              <SectionNum n="!" error />Les erreurs les plus fréquentes
            </h2>

            <div className="flex flex-col gap-4 my-5">
              <Step num="✕" title="Ne pas mensualiser" error>
                Payer « au réel » selon les heures du mois n&apos;est pas autorisé pour une garde régulière. La mensualisation est obligatoire dès que l&apos;accueil est hebdomadaire et fixe.
              </Step>
              <Step num="✕" title="Faire une seule déclaration pour les deux familles" error>
                Chaque famille est employeur à part entière. Chacune doit faire sa propre déclaration mensuelle sur Pajemploi, avec sa quote-part.
              </Step>
              <Step num="✕" title="Ne pas majorer les heures supplémentaires" error>
                Au-delà de 40h/semaine, la majoration de 25 % (puis 50 % au-delà de 48h) est une obligation légale — elle ne peut pas être supprimée même avec l&apos;accord de votre assistante parentale.
              </Step>
              <Step num="✕" title="Ne pas se coordonner avant la déclaration" error>
                Si les deux familles déclarent des heures incohérentes, votre assistante parentale se retrouve avec des bulletins contradictoires. Validez ensemble les heures avant de déclarer.
              </Step>
            </div>

            <CtaMid
              title="Calculez votre situation exacte en 30 secondes"
              desc="nounoulink. calcule salaire, heures supplémentaires et répartition — et vous donne les valeurs exactes à saisir dans Pajemploi pour chaque famille, chaque mois."
              ctaText="Démarrer avec nounoulink. →"
              ctaHref="/"
            />

            {/* Sources */}
            <div className="border-t border-[var(--line)] mt-10 pt-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--dust)] mb-3">
                Sources officielles
              </p>
              <ul className="space-y-1.5">
                {[
                  {
                    href: 'https://www.pajemploi.urssaf.fr',
                    label: 'Pajemploi Urssaf',
                    suffix: '— portail employeur garde d\'enfants à domicile',
                  },
                  {
                    href: 'https://www.urssaf.fr/accueil/outils-documentation/simulateurs/calculer-salaire-mensualise-particulier-employeur.html',
                    label: 'Urssaf — Simulateur salaire mensualisé particulier employeur',
                    suffix: '',
                  },
                  {
                    href: 'https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000044594539',
                    label: 'Légifrance — CCN particuliers employeurs IDCC 3239',
                    suffix: '· art. 136 et 147 (heures supplémentaires)',
                  },
                  {
                    href: 'https://www.service-public.fr/particuliers/vosdroits/F104',
                    label: 'Service-Public.fr — Temps de travail salarié à domicile',
                    suffix: '(mis à jour mars 2025)',
                  },
                  {
                    href: 'https://www.caf.fr/allocataires/actualites/actualites-nationales/reforme-du-cmg-une-aide-plus-adaptee-pour-les-familles',
                    label: 'CAF — Réforme du CMG septembre 2025',
                    suffix: '',
                  },
                  {
                    href: 'https://www.franceemploidomicile.fr',
                    label: 'France Emploi Domicile — Salaire garde à domicile 2026',
                    suffix: '',
                  },
                ].map(({ href, label, suffix }) => (
                  <li key={href} className="text-sm text-[var(--dust)] list-none">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--sage)] hover:underline no-underline"
                    >
                      {label}
                    </a>
                    {suffix && ` ${suffix}`}
                  </li>
                ))}
              </ul>
            </div>

          </article>

          {/* ── Sidebar ── */}
          <aside className="md:sticky md:top-[74px] space-y-4">

            {/* CTA sidebar */}
            <div className="bg-[#0f1923] rounded-2xl px-5 py-6 text-center">
              <p className="font-serif text-[17px] font-bold text-white mb-1 leading-snug">
                Calculez en 30 secondes
              </p>
              <span className="block text-sm text-white/50 mb-5">
                Votre montant exact Pajemploi, sans calcul manuel
              </span>
              <Link
                href="/"
                className="block w-full bg-[var(--sage)] text-white font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-[#3a5431] transition-colors no-underline text-center"
              >
                Essayer nounoulink. →
              </Link>
            </div>

            {/* Sommaire */}
            <div className="bg-white border border-[var(--line)] rounded-2xl px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--dust)] mb-4">
                Sommaire
              </p>
              <ul className="divide-y divide-[var(--line)]">
                {[
                  { href: '#salaire-horaire', num: '1', label: 'Salaire horaire minimum' },
                  { href: '#mensualisation',  num: '2', label: 'Mensualisation' },
                  { href: '#heures-sup',      num: '3', label: 'Heures supplémentaires' },
                  { href: '#repartition',     num: '4', label: 'Répartition entre familles' },
                  { href: '#pajemploi',       num: '5', label: 'Déclaration Pajemploi' },
                  { href: '#cout-reel',       num: '6', label: 'Coût réel après aides' },
                  { href: '#erreurs',         num: '!', label: 'Erreurs fréquentes' },
                ].map(({ href, num, label }) => (
                  <li key={href} className="list-none">
                    <a
                      href={href}
                      className="flex items-center gap-2.5 py-2.5 text-sm text-[var(--dust)] hover:text-[var(--sage)] no-underline transition-colors"
                    >
                      <span className="flex-shrink-0 w-5 h-5 bg-[var(--sage-light)] text-[var(--sage)] rounded flex items-center justify-center text-[10px] font-bold">
                        {num}
                      </span>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

          </aside>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0f1923] py-6 px-5 md:px-6 text-center text-xs text-white/30">
        <p>
          © {new Date().getFullYear()} nounoulink. ·{' '}
          <Link href="/blog" className="text-white/45 hover:text-[var(--sage-mid)] no-underline transition-colors">Blog</Link>
          {' · '}
          <Link href="/" className="text-white/45 hover:text-[var(--sage-mid)] no-underline transition-colors">Accueil</Link>
          {' · '}
          Sources : Pajemploi, Urssaf, CAF, Légifrance, Service-Public.fr
        </p>
      </footer>

    </div>
  );
}
