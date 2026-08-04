import type { Metadata } from 'next';
import { ArticleLayout } from '../_components/ArticleLayout';
import {
  SummaryBox, Note, FormulaBox, CalcCard, CalcRow, CalcSubtotalRow, CalcTotalRow, CalcNoteRow,
  Tag, Step, Steps, CtaMid, SourcesSection, SectionNum, EquityFlow,
} from '../_components/ArticleBlocks';

export const metadata: Metadata = {
  title: "Garde partagée à 3 enfants : pourquoi la répartition est souvent 60%/40% (et pas 66%/33%) | nounoulink.",
  description:
    "Plafond CMG, crédit d'impôt, reste à charge réel : on vous explique le calcul qui justifie la répartition 60%/40% entre deux familles en garde partagée.",
  alternates: {
    canonical: 'https://nounoulink.fr/blog/repartition-60-40-garde-partagee-pourquoi',
  },
};

export default function Article() {
  return (
    <ArticleLayout
      title="Garde partagée à 3 enfants : pourquoi la répartition est souvent 60%/40% (et pas 66%/33%)"
      intro="Deux familles, trois enfants, et un prorata par heures qui semble juste sur le papier — mais qui ne l'est plus une fois le crédit d'impôt pris en compte."
      category="Répartition"
      publishedAt="2026-07-20"
    >
      <SummaryBox
        title="Ce que vous devez retenir de cet article"
        items={[
          <>Le prorata par heures est un <strong>point de départ</strong>, pas une obligation légale.</>,
          <>Le crédit d&apos;impôt est <strong>plafonné par famille</strong> selon son nombre d&apos;enfants gardés — pas
          proportionnellement aux heures.</>,
          <>Sur le reste à charge, ce plafond pénalise davantage la famille qui garde <strong>le plus d&apos;enfants</strong>.</>,
          <>D&apos;où l&apos;usage fréquent de rééquilibrer la répartition du salaire vers <strong>60%/40%</strong> plutôt que de suivre
          le prorata strict.</>,
          <>Le calculateur nounoulink. simule les deux scénarios — et tous les autres — <strong>en quelques secondes</strong>.</>,
        ]}
      />

      <EquityFlow
        headerLabel="Pourquoi 60 % / 40 % ? — la mécanique en un coup d'œil"
        topNode="👨‍👩‍👧 3 enfants gardés par la même assistante parentale"
        familyA={{ title: 'Famille A — 2 enfants', sub: 'Sophie + Lucas' }}
        familyB={{ title: 'Famille B — 1 enfant', sub: 'Emma' }}
        prorata={[
          { value: 66.7, label: '66,7 %' },
          { value: 33.3, label: '33,3 %' },
        ]}
        prorataNote="Ça paraît juste : 2 enfants sur 3 = 66,7 % du salaire."
        ceilingLabel="Le crédit d'impôt, lui, est plafonné par famille"
        ceilingBars={[
          { amount: '562,50 €', heightPx: 44, label: 'Plafond\n1 enfant' },
          { amount: '625 €', heightPx: 49, label: 'Plafond\n2 enfants' },
          { amount: '1 125 €', heightPx: 88, label: 'Si c\'était\nx2 (attendu)', ghost: true },
        ]}
        ceilingNote="+ 11 % de plafond seulement entre 1 et 2 enfants gardés — pas le double attendu."
        before={[
          { value: 73, label: '73 %' },
          { value: 27, label: '27 %' },
        ]}
        beforeNote={<>Famille A supporte <strong>73 %</strong> du reste à charge réel — plus que sa part de 66,7 %.</>}
        fixLabel="On réajuste le salaire à 60 % / 40 %"
        after={[
          { value: 65, label: '65 %' },
          { value: 35, label: '35 %' },
        ]}
        afterNote="65 % ≈ 66,7 % réel : l'écart est corrigé."
      />

      <p>
        Concrètement : Sophie et Lucas (famille A) et Emma (famille B) sont gardés par la même assistante parentale,
        40h/semaine chacun, pour un coût total mensuel de <strong>2 925 €</strong> (salaire net + charges). Les
        sections suivantes détaillent, poste par poste, le calcul qui mène aux chiffres du schéma ci-dessus.
      </p>

      <Note type="info">
        <span className="text-base flex-shrink-0">📌</span>
        <span>Pour isoler l&apos;effet du crédit d&apos;impôt, cet exemple suppose des <strong>revenus fiscaux
        similaires</strong> entre les deux familles — sinon le CMG, lui aussi plafonné par famille, brouillerait la
        comparaison.</span>
      </Note>

      <h2 id="prorata-heures">
        <SectionNum n="1" />Le prorata par heures : le détail du calcul
      </h2>
      <p>
        Le réflexe le plus courant : répartir le salaire au prorata du nombre d&apos;heures gardées par enfant.
      </p>

      <FormulaBox
        label="Prorata par heures — formule de départ"
        formula={
          <>
            Part famille A (%) ={' '}
            <em className="not-italic text-[var(--sage-dark)]">Heures cumulées des enfants de la famille A</em>
            {' ÷ '}
            <em className="not-italic text-[var(--sage-dark)]">Total des heures cumulées de tous les enfants</em>
          </>
        }
      />

      <CalcCard icon="👨‍👩‍👧‍👦" title="Prorata strict par heures — Sophie et Lucas (famille A) · Emma (famille B), 40h/semaine chacun">
        <CalcRow label="Heures hebdo Sophie + Lucas (famille A)" value="40 + 40 = 80 h" />
        <CalcRow label="Heures hebdo Emma (famille B)" value="40 h" />
        <CalcSubtotalRow label="Part famille A — prorata strict" value="80 ÷ 120 = 66,7 %" />
        <CalcSubtotalRow label="Part famille B — prorata strict" value="40 ÷ 120 = 33,3 %" />
        <CalcNoteRow>
          Seul le salaire est réparti à ce stade — le crédit d&apos;impôt de chaque famille n&apos;a pas encore été
          pris en compte.
        </CalcNoteRow>
      </CalcCard>

      <h2 id="reste-a-charge">
        <SectionNum n="2" />Le reste à charge, poste par poste
      </h2>
      <p>
        Le crédit d&apos;impôt couvre 50 % des dépenses nettes, plafonné annuellement par famille (schéma ci-dessus).
        Voici l&apos;effet chiffré sur les deux répartitions :
      </p>

      <CalcCard icon="📊" title="Reste à charge mensuel — prorata strict 66,7 % / 33,3 %">
        <CalcRow label="Dépense famille A (66,7 % de 2 925 €)" value="1 951 €" />
        <CalcRow label="Dépense famille B (33,3 % de 2 925 €)" value="974 €" />
        <CalcRow label={<>Crédit d&apos;impôt famille A — 50 % de 1 951 €, plafonné<Tag color="red">Plafonné</Tag></>} value="625 €" />
        <CalcRow label={<>Crédit d&apos;impôt famille B — 50 % de 974 €, sous le plafond<Tag color="green">Non plafonné</Tag></>} value="487 €" />
        <CalcTotalRow label="Reste à charge famille A" value="1 326 €/mois" />
        <CalcTotalRow label="Reste à charge famille B" value="487 €/mois" />
        <CalcNoteRow>
          Famille A supporte ≈ 73 % du reste à charge total — plus que sa part de 66,7 % au prorata. Le plafond,
          atteint côté famille A, accentue l&apos;écart au lieu de le compenser.
        </CalcNoteRow>
      </CalcCard>

      <CalcCard icon="⚖️" title="Reste à charge mensuel — répartition ajustée 60 % / 40 %">
        <CalcRow label="Dépense famille A (60 % de 2 925 €)" value="1 755 €" />
        <CalcRow label="Dépense famille B (40 % de 2 925 €)" value="1 170 €" />
        <CalcRow label={<>Crédit d&apos;impôt famille A — 50 % de 1 755 €, plafonné<Tag color="red">Plafonné</Tag></>} value="625 €" />
        <CalcRow label={<>Crédit d&apos;impôt famille B — 50 % de 1 170 €, plafonné de justesse<Tag color="gold">Plafonné</Tag></>} value="563 €" />
        <CalcTotalRow label="Reste à charge famille A" value="1 130 €/mois" />
        <CalcTotalRow label="Reste à charge famille B" value="608 €/mois" />
        <CalcNoteRow>
          Famille A supporte désormais ≈ 65 % du reste à charge total — proche de sa part réelle de 2 enfants sur 3
          (66,7 %), contre 73 % avec le prorata strict.
        </CalcNoteRow>
      </CalcCard>

      <CtaMid
        title="nounoulink. calcule votre répartition exacte"
        desc="Entrez le nombre d'enfants de chaque famille et leurs horaires — le calculateur compare instantanément prorata strict, 60%/40% ou toute autre répartition sur le reste à charge réel."
        ctaText="Essayer la démo →"
        ctaHref="/"
      />

      <h2 id="calculateur">
        <SectionNum n="3" />Le calculateur nounoulink. simule tous les scénarios
      </h2>
      <p>
        Refaire ce calcul à la main chaque mois, en tenant compte du plafond du crédit d&apos;impôt et des revenus de
        chaque famille, est fastidieux. Le calculateur nounoulink. simule en quelques secondes le prorata strict, le
        60 % / 40 %, ou toute autre répartition choisie par les deux familles, et affiche directement le reste à
        charge réel de chacune.
      </p>

      <h2 id="erreurs">
        <SectionNum n="!" error />Les erreurs les plus fréquentes
      </h2>

      <Steps>
        <Step num="✕" title="Confondre prorata du salaire et prorata du reste à charge" error>
          Ce ne sont pas la même chose. Le prorata par heures répartit le salaire ; le reste à charge dépend en plus du
          crédit d&apos;impôt de chaque famille, qui ne suit pas ce même prorata.
        </Step>
        <Step num="✕" title="Croire que le crédit d'impôt suit le même prorata que les enfants gardés" error>
          Son plafond annuel n&apos;augmente que d&apos;environ 11 % entre un et deux enfants gardés — largement moins que le
          doublement que suggérerait un simple prorata par enfant.
        </Step>
        <Step num="✕" title="Recalculer soi-même son crédit d'impôt exact" error>
          Le calcul dépend du foyer fiscal de chaque famille. Utilisez le simulateur officiel sur impots.gouv.fr plutôt
          que de généraliser l&apos;exemple de cet article à votre situation.
        </Step>
        <Step num="✕" title="Imposer 60%/40% comme une règle fixe" error>
          Ce n&apos;est pas un taux légal : c&apos;est un ordre de grandeur observé dans ce type de configuration à 2 + 1
          enfants. Le ratio exact dépend des revenus et de la situation de chaque famille.
        </Step>
      </Steps>

      <CtaMid
        title="Laissez nounoulink. faire le calcul à votre place"
        desc="Renseignez les enfants de chaque famille — le calculateur simule chaque répartition possible et affiche le reste à charge réel, chaque mois."
        ctaText="Démarrer avec nounoulink. →"
        ctaHref="/"
      />

      <SourcesSection
        sources={[
          {
            href: 'https://www.impots.gouv.fr/particulier/questions/jemploie-une-personne-domicile-quel-est-mon-avantage-fiscal',
            label: 'impots.gouv.fr — Crédit d\'impôt pour l\'emploi d\'un salarié à domicile',
            suffix: '',
          },
          {
            href: 'https://www.pajemploi.urssaf.fr',
            label: 'Pajemploi Urssaf',
            suffix: '— portail employeur garde d\'enfants à domicile',
          },
          {
            href: 'https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000044594539',
            label: 'Légifrance — CCN particuliers employeurs IDCC 3239',
            suffix: '',
          },
          {
            href: 'https://www.caf.fr/allocataires/actualites/actualites-nationales/reforme-du-cmg-une-aide-plus-adaptee-pour-les-familles',
            label: 'CAF — Réforme du CMG septembre 2025',
            suffix: '',
          },
        ]}
      />
    </ArticleLayout>
  );
}
