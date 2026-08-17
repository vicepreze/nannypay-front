import type { Metadata } from 'next';
import { ArticleLayout } from '../_components/ArticleLayout';
import {
  SummaryBox, Note, Steps, Step, CalcCard, CalcRow, CalcTotalRow, CtaMid, SourcesSection, SectionNum,
} from '../_components/ArticleBlocks';

export const metadata: Metadata = {
  title: 'Simulateur de salaire nounou en garde partagée (2026) | nounoulink.',
  description:
    "Ce qu'un simulateur de salaire doit prendre en compte pour une garde partagée : taux horaire, heures, répartition entre familles. Exemple chiffré et accès au simulateur complet.",
  alternates: {
    canonical: 'https://nounoulink.fr/blog/simulateur-salaire-nounou-garde-partagee',
  },
};

export default function Article() {
  return (
    <ArticleLayout
      title="Simulateur de salaire nounou en garde partagée"
      intro={
        'Chercher un "simulateur de salaire nounou" en ligne renvoie surtout des outils pensés pour une garde ' +
        "classique, à une seule famille. Ce court guide explique ce qu'un simulateur adapté à la garde partagée " +
        'doit prendre en compte, avec un exemple simple à vérifier soi-même.'
      }
      category="Calcul de salaire"
      publishedAt="2026-08-17"
    >
      <SummaryBox
        title="Ce que vous devez retenir de cet article"
        items={[
          <>Un simulateur de salaire nounou doit intégrer des règles <strong>propres à la garde partagée</strong> :
          deux familles, une répartition, des majorations spécifiques.</>,
          <>Quatre données suffisent pour une estimation fiable : <strong>taux horaire, heures hebdomadaires,
          nombre d&apos;enfants, répartition entre familles</strong>.</>,
          <>Un exemple calculé à la main permet de vérifier qu&apos;un simulateur applique bien la bonne méthode,
          avant de lui faire confiance.</>,
          <>Le simulateur complet de nounoulink. applique ces règles automatiquement, pour chaque famille.</>,
        ]}
      />

      <Note type="info">
        <span className="text-base flex-shrink-0">📌</span>
        <span>Depuis le <strong>1er janvier 2026</strong>, le terme officiel est <strong>« assistant
        parental »</strong> (et non plus « garde d&apos;enfants à domicile »).</span>
      </Note>

      <h2 id="prendre-en-compte">
        <SectionNum n="1" />Ce qu&apos;un simulateur doit prendre en compte en garde partagée
      </h2>
      <p>
        Quatre données suffisent pour obtenir une estimation fiable — mais elles doivent toutes être prises en
        compte ensemble, pas une par une.
      </p>

      <Steps>
        <Step num="1" title="Le taux horaire net">
          Encadré par un minimum légal, national, quelle que soit la ville.
        </Step>
        <Step num="2" title="Les heures hebdomadaires">
          Elles déclenchent des majorations automatiques au-delà de 40h, puis de 48h par semaine.{' '}
          <a
            href="https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000044594539"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--sage)] hover:underline no-underline"
          >
            Légifrance
          </a>
        </Step>
        <Step num="3" title="Le nombre d'enfants gardés">
          Influence le taux horaire négocié, et implique une répartition entre les familles.
        </Step>
        <Step num="4" title="La répartition entre les deux familles">
          Chaque famille déclare sa propre part sur Pajemploi — un simulateur générique, pensé pour un seul
          employeur, ne le prévoit pas.
        </Step>
      </Steps>

      <h2 id="exemple">
        <SectionNum n="2" />Un exemple simple, calculé à la main
      </h2>
      <p>
        Avant de faire confiance à un simulateur, vérifier une fois le calcul à la main permet de savoir ce
        qu&apos;il doit produire.
      </p>

      <CalcCard icon="🧮" title="Exemple — 40h/semaine, taux 12,89 €/h net, répartition 50/50">
        <CalcRow label="Salaire hebdomadaire (40h × 12,89 €)" value="515,60 €" />
        <CalcRow label="Mensualisation (× 52 ÷ 12)" value="2 233,93 €" />
        <CalcTotalRow label="Part de chaque famille (50 %)" value="1 116,97 €" />
      </CalcCard>

      <CtaMid
        title="Le simulateur complet de nounoulink."
        desc="Taux horaire, heures, répartition, majorations : calculés automatiquement pour chaque famille, avec les règles propres à la garde partagée."
        ctaText="Utiliser le simulateur →"
        ctaHref="/"
      />

      <SourcesSection
        sources={[
          {
            href: 'https://www.pajemploi.urssaf.fr',
            label: 'Pajemploi Urssaf',
            suffix: "— portail employeur garde d'enfants à domicile",
          },
          {
            href: 'https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000044594539',
            label: 'Légifrance',
            suffix: '— CCN particuliers employeurs IDCC 3239',
          },
        ]}
      />
    </ArticleLayout>
  );
}
