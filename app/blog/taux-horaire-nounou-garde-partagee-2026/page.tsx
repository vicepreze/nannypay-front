import type { Metadata } from 'next';
import { ArticleLayout } from '../_components/ArticleLayout';
import {
  SummaryBox, Note, Steps, Step, CtaMid, SourcesSection, SectionNum,
  HSupVisual, RangeChart, CompareTable,
} from '../_components/ArticleBlocks';

export const metadata: Metadata = {
  title: 'Quel taux horaire net proposer à sa nounou en garde partagée ? | nounoulink.',
  description:
    "Fourchettes de taux horaire net observées par géographie, nombre d'enfants et heures hebdomadaires, pour négocier un contrat de garde partagée en 2026.",
  alternates: {
    canonical: 'https://nounoulink.fr/blog/taux-horaire-nounou-garde-partagee-2026',
  },
};

export default function Article() {
  return (
    <ArticleLayout
      title="Quel taux horaire net proposer en garde partagée ?"
      intro="Le plancher légal est national et identique partout en France. Le taux réellement négocié, lui, dépend de la géographie, du nombre d'enfants gardés et du volume horaire — avec des fourchettes de marché, pas un barème officiel."
      category="Négociation"
      publishedAt="2026-08-10"
    >
      <SummaryBox
        title="Ce que vous devez retenir de cet article"
        items={[
          <>Le taux horaire <strong>minimum légal</strong> est national et identique partout en France.</>,
          <>Le taux <strong>réellement négocié</strong>, lui, varie fortement selon la ville, la région, et la
          tension du marché local.</>,
          <>Le nombre d&apos;enfants gardés simultanément influence aussi le taux — plus qu&apos;une règle fixe, une
          pratique de marché.</>,
          <>Le nombre d&apos;heures hebdomadaires ne change pas le taux net lui-même, mais déclenche des majorations
          automatiques au-delà de certains seuils.</>,
          <>Cet article donne des <strong>fourchettes de négociation</strong>, pas un chiffre unique — avec les
          limites de ces données clairement posées.</>,
        ]}
      />

      <p>
        Avant de signer un contrat, la question n&apos;est jamais &laquo;&nbsp;quel est le taux&nbsp;?&nbsp;&raquo;
        mais &laquo;&nbsp;dans quelle fourchette suis-je raisonnable&nbsp;?&nbsp;&raquo;. Entre deux familles en garde
        partagée, cette question se pose deux fois : une fois pour fixer le taux, une fois pour s&apos;assurer que les
        deux employeurs sont alignés avant de le proposer.
      </p>
      <p>
        Ce court guide donne des repères concrets pour négocier, selon trois critères : la géographie, le nombre
        d&apos;enfants, et les heures hebdomadaires.
      </p>

      <Note type="info">
        <span className="text-base flex-shrink-0">📌</span>
        <span>Depuis le <strong>1er janvier 2026</strong>, le terme officiel est <strong>« assistant
        parental »</strong> (et non plus « garde d&apos;enfants à domicile »).</span>
      </Note>

      <h2 id="plancher">
        <SectionNum n="1" />Le plancher légal, avant toute négociation
      </h2>
      <p>
        Quelle que soit la ville, deux taux minimums s&apos;appliquent — c&apos;est toujours le plus élevé des deux
        qui prévaut : <strong>10,07 € net/h</strong> (niveau A, minimum conventionnel) ou le SMIC net équivalent, plus
        bas (
        <a
          href="https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000044594539"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--sage)] hover:underline no-underline"
        >
          Légifrance
        </a>
        ). Aucune négociation ne peut descendre sous ce plancher, où que vous soyez en France.
      </p>

      <h2 id="geographie">
        <SectionNum n="2" />Par géographie
      </h2>
      <p>
        C&apos;est le facteur qui fait le plus varier le taux réellement négocié. Les fourchettes ci-dessous sont des
        observations de marché, pas un barème officiel.
      </p>

      <RangeChart
        title="Fourchette de taux horaire net observée, par zone"
        rows={[
          { label: 'Paris & petite couronne', value: '13,00 – 17,00 €', left: 21.7, right: 0 },
          { label: 'Bordeaux, Nantes, Marseille et grandes métropoles', value: '11,00 – 14,00 €', left: 9.1, right: 22.2 },
          { label: 'Reste de la France (minimum légal)', value: '≈ 10,07 €', left: 0, right: 44.4 },
        ]}
        scale={['10 €', '12 €', '14 €', '16 €', '18 €']}
      />

      <Note type="warn">
        <span className="text-base flex-shrink-0">⚠️</span>
        <span>Un cas réel observé à Paris : <strong>12,50 € net/h</strong>, soit légèrement sous la fourchette basse
        citée ci-dessus. Une fourchette de marché reste un repère, pas une garantie — le taux réel dépend aussi de la
        négociation, de l&apos;expérience de la nounou et de la tension locale du moment.</span>
      </Note>

      <h2 id="enfants">
        <SectionNum n="3" />Par nombre d&apos;enfants gardés
      </h2>
      <p>
        Ici, plutôt qu&apos;une fourchette de marché large, deux cas réels observés donnent une idée concrète de la
        majoration pratiquée au passage de 2 à 3 enfants — toujours en net, taux horaire normal, hors majoration.
      </p>

      <RangeChart
        title="Cas réels observés — passage de 2 à 3 enfants gardés (taux net, hors majoration)"
        rows={[
          { label: '2 enfants', value: 'base', width: 80 },
          { label: '3 enfants', value: '+13 % à +18 %', width: 95 },
        ]}
      />

      <Note type="info">
        <span className="text-base flex-shrink-0">📌</span>
        <span>Toutes choses égales par ailleurs, le passage de 2 à 3 enfants gardés génère une majoration de
        <strong> +13 % à +18 %</strong> du taux net, sur 2 cas réels observés. Ce n&apos;est pas une moyenne de
        marché — à traiter comme un ordre de grandeur de négociation.</span>
      </Note>

      <CtaMid
        title="nounoulink. applique ces seuils automatiquement"
        desc="Entrez le taux net négocié, nounoulink. calcule les majorations pour vous, chaque mois."
        ctaText="Essayer la démo →"
        ctaHref="/"
      />

      <h2 id="heures">
        <SectionNum n="4" />Par nombre d&apos;heures hebdomadaires
      </h2>
      <p>
        Le nombre d&apos;heures hebdomadaires ne change pas le taux horaire normal négocié. Ce qui change, c&apos;est
        la mécanique légale des majorations au-delà de certains seuils :
      </p>

      <HSupVisual />

      <h2 id="recap">
        <SectionNum n="5" />Tableau récapitulatif — deux cas concrets
      </h2>
      <p>
        Pour visualiser comment un taux net se transforme en coût hebdomadaire une fois les seuils appliqués, voici
        deux situations réelles, reprenant les taux observés plus haut.
      </p>

      <CompareTable
        columns={[
          { label: 'Famille A — Paris', sub: '49h/semaine, 2 enfants' },
          { label: 'Famille B — Saint-Ouen', sub: '45h/semaine, 3 enfants' },
        ]}
        rows={[
          { label: 'Taux horaire net', values: ['11,00 €/h', '12,30 €/h'] },
          { label: 'Majoration 3e enfant', values: ['—', '10,50 € → 12,30 € (+17,1 %)'] },
          { label: '0-40h (normal)', values: ['440,00 €', '492,00 €'] },
          { label: '41-48h (+25%)', values: ['110,00 €', '76,88 €'] },
          { label: '>48h (+50%)', values: ['16,50 €', '—'] },
          { label: 'Total semaine', values: ['566,50 €', '568,88 €'], total: true },
          {
            label: (
              <>
                Mensualisation
                <span className="block text-[11px] text-[var(--dust)] font-normal mt-0.5">
                  total semaine × 52 ÷ 12
                </span>
              </>
            ),
            values: ['× 52 ÷ 12', '× 52 ÷ 12'],
          },
          { label: 'Salaire net à déclarer /mois', values: ['2 454,83 €', '2 465,15 €'], total: true },
        ]}
      />

      <Note type="info">
        <span className="text-base flex-shrink-0">📌</span>
        <span>La <strong>mensualisation</strong> transforme un total hebdomadaire (qui varie selon les jours fériés,
        les semaines du mois) en un <strong>salaire mensuel identique chaque mois</strong> : total semaine × 52
        semaines ÷ 12 mois. C&apos;est ce montant, pas le total hebdomadaire, qui est déclaré chaque mois sur
        Pajemploi.</span>
      </Note>

      <p className="text-[13px] text-[var(--dust)]">
        Deux taux de base différents, deux volumes horaires différents — pour un total hebdomadaire quasiment
        identique. C&apos;est précisément ce type de calcul qui se refait, à la main, chaque semaine sans outil
        dédié.
      </p>

      <h2 id="limites">
        <SectionNum n="!" error />Limites de ces données
      </h2>
      <p>Pour rester honnête sur la fiabilité de ces repères :</p>

      <Steps>
        <Step num="✕" title="Sources commerciales, pas statistiques officielles" error>
          Les fourchettes par ville viennent d&apos;agrégateurs commerciaux (plateformes de mise en relation, sites
          spécialisés), pas de statistiques officielles — méthode de collecte et échantillon inconnus.
        </Step>
        <Step num="✕" title="Nantes incluse par extrapolation" error>
          Nantes n&apos;est pas nommée explicitement dans la source utilisée pour « grandes métropoles » — elle y est
          incluse par extrapolation, pas par une donnée dédiée.
        </Step>
        <Step num="✕" title="Paris et petite couronne regroupés" error>
          La source regroupe Paris et sa petite couronne en une seule fourchette — aucune donnée distincte trouvée
          pour la seule proche banlieue.
        </Step>
      </Steps>

      <p className="text-[13px] text-[var(--dust)] italic">
        Ces chiffres sont un point de départ de négociation, pas une vérité statistique.
      </p>

      <CtaMid
        title="Calculez votre situation exacte en 30 secondes"
        desc="Entrez le taux négocié et les horaires de chaque famille — nounoulink. calcule majorations, répartition et montant à déclarer sur Pajemploi."
        ctaText="Démarrer avec nounoulink. →"
        ctaHref="/"
      />

      <SourcesSection
        sources={[
          {
            href: 'https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000044594539',
            label: 'Légifrance',
            suffix: '— CCN particuliers employeurs IDCC 3239 (minimum légal)',
          },
          {
            href: 'https://www.culture-formation.fr/actualites/salaire-nounou-a-domicile/',
            label: 'Culture et Formation',
            suffix: '— fourchettes de marché par zone géographique, 2026',
          },
          {
            href: 'https://www.babysittor.com/blog/tarif-horaire-nounou-domicile',
            label: 'Babysittor',
            suffix: '— facteurs de variation du tarif (nombre d\'enfants, horaires atypiques)',
          },
          {
            href: 'https://www.pajemploi.urssaf.fr',
            label: 'Pajemploi Urssaf',
            suffix: '— portail employeur garde d\'enfants à domicile',
          },
        ]}
      />
    </ArticleLayout>
  );
}
