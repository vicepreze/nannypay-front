import type { Metadata } from 'next';
import { ArticleLayout } from '../_components/ArticleLayout';
import {
  SummaryBox, Note, FormulaBox, CalcCard, CalcRow, CalcSubtotalRow, CalcTotalRow, CalcNoteRow,
  Tag, Step, Steps, CtaMid, SourcesSection, SectionNum,
} from '../_components/ArticleBlocks';

export const metadata: Metadata = {
  title: "Garde partagée à 3 enfants : pourquoi la répartition est souvent 60/40 (et pas 66/33) | nounoulink.",
  description:
    "Plafond CMG, crédit d'impôt, reste à charge réel : on vous explique le calcul qui justifie la répartition 60/40 entre deux familles en garde partagée.",
  alternates: {
    canonical: 'https://nounoulink.fr/blog/repartition-60-40-garde-partagee-pourquoi',
  },
};

export default function Article() {
  return (
    <ArticleLayout
      title="Garde partagée à 3 enfants : pourquoi la répartition est souvent 60/40 (et pas 66/33)"
      intro="Deux familles, trois enfants, et un prorata par heures qui semble juste sur le papier — mais qui ne l'est plus une fois le crédit d'impôt pris en compte."
      category="Répartition"
      publishedAt="2026-07-20"
    >
      <SummaryBox
        title="Ce que vous devez retenir avant de continuer"
        items={[
          <>Le prorata par heures est un <strong>point de départ</strong>, pas une obligation légale.</>,
          <>Le crédit d&apos;impôt est <strong>plafonné par famille</strong> selon son nombre d&apos;enfants gardés — pas
          proportionnellement aux heures.</>,
          <>Sur le reste à charge, ce plafond pénalise davantage la famille qui garde <strong>le plus d&apos;enfants</strong>.</>,
          <>D&apos;où l&apos;usage fréquent de rééquilibrer la répartition du salaire vers <strong>60/40</strong> plutôt que de suivre
          le prorata strict.</>,
          <>Le calculateur nounoulink. simule les deux scénarios — et tous les autres — <strong>en quelques secondes</strong>.</>,
        ]}
      />

      <p>
        Cet article prend l&apos;exemple de deux familles qui gardent trois enfants à elles deux — Sophie et Lucas chez
        la famille A, Emma chez la famille B — pour chiffrer deux façons de répartir le salaire : le prorata strict par
        heures (66/33) et l&apos;ajustement le plus souvent pratiqué (60/40). On regarde ensuite l&apos;effet réel de chaque
        méthode sur le reste à charge pour comprendre pourquoi la majorité des familles dans cette situation finissent
        par choisir 60/40.
      </p>
      <p>
        Le calcul du salaire suit un prorata logique. Mais le crédit d&apos;impôt, lui, est plafonné par famille selon le
        nombre d&apos;enfants gardés — pas au même rythme que les heures. C&apos;est cet écart qui explique le passage au 60/40.
      </p>

      <Note type="info">
        <span className="text-base flex-shrink-0">💡</span>
        <span>Depuis janvier 2026, on parle d&apos;<strong>assistant parental</strong> et non plus de &laquo; garde d&apos;enfants à
        domicile &raquo;. Ce guide utilise cette terminologie tout du long.</span>
      </Note>

      <Note type="info">
        <span className="text-base flex-shrink-0">📌</span>
        <span>Pour isoler l&apos;effet du crédit d&apos;impôt, les exemples ci-dessous supposent que les deux familles ont des
        <strong> revenus fiscaux similaires</strong> : le CMG s&apos;applique alors de façon comparable des deux côtés et
        n&apos;explique pas, à lui seul, l&apos;écart de reste à charge. Le crédit d&apos;impôt, en revanche, est plafonné par
        famille selon son nombre d&apos;enfants gardés — c&apos;est ce plafond qui crée le déséquilibre.</span>
      </Note>

      <h2 id="prorata-heures">
        <SectionNum n="1" />Le prorata par heures : le cas Sophie, Lucas et Emma
      </h2>
      <p>
        Sophie et Lucas (famille A) et Emma (famille B) sont gardés par la même assistante parentale, aux mêmes
        horaires : 40h/semaine chacun. Le réflexe le plus courant est de répartir le salaire au prorata du nombre
        d&apos;heures gardées par enfant.
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
          À ce stade, seul le salaire est réparti — le crédit d&apos;impôt de chaque famille n&apos;a pas encore été pris en
          compte. Coût total mensuel de la garde (salaire net + charges) retenu pour la suite : 2 925 €.
        </CalcNoteRow>
      </CalcCard>

      <h2 id="rac-prorata-strict">
        <SectionNum n="2" />Le reste à charge au prorata strict : l&apos;effet du plafond
      </h2>
      <p>
        Le crédit d&apos;impôt couvre 50 % des dépenses nettes, dans la limite d&apos;un plafond annuel : <strong>6 750 €
        pour un enfant</strong> (562,50 €/mois), <strong>7 500 € pour deux enfants</strong> (625 €/mois) — une hausse
        d&apos;à peine <Tag color="gold">+ 11 %</Tag> pour deux fois plus d&apos;enfants gardés. Appliqué au prorata 66,7/33,3
        ci-dessus, ce plafond touche la famille A bien plus fort que la famille B.
      </p>

      <CalcCard icon="📊" title="Reste à charge mensuel — prorata strict 66,7 % / 33,3 %">
        <CalcRow label="Dépense famille A (66,7 % de 2 925 €)" value="1 951 €" />
        <CalcRow label="Dépense famille B (33,3 % de 2 925 €)" value="974 €" />
        <CalcRow label={<>Crédit d&apos;impôt famille A — 50 % de 1 951 €, plafonné<Tag color="red">Plafonné</Tag></>} value="625 €" />
        <CalcRow label={<>Crédit d&apos;impôt famille B — 50 % de 974 €, sous le plafond<Tag color="green">Non plafonné</Tag></>} value="487 €" />
        <CalcTotalRow label="Reste à charge famille A" value="1 326 €/mois" />
        <CalcTotalRow label="Reste à charge famille B" value="487 €/mois" />
        <CalcNoteRow>
          Famille A supporte ≈ 73 % du reste à charge total — davantage que sa part de 66,7 % au prorata initial. Le
          plafond du crédit d&apos;impôt, atteint uniquement côté famille A, accentue l&apos;écart au lieu de le compenser.
        </CalcNoteRow>
      </CalcCard>

      <h2 id="rac-60-40">
        <SectionNum n="3" />Le reste à charge à 60/40 : un rééquilibrage net
      </h2>
      <p>
        En ajustant la répartition du <strong>salaire</strong> à 60/40 plutôt qu&apos;à 66,7/33,3, la dépense de la famille A
        baisse suffisamment pour que le plafond du crédit d&apos;impôt pèse moins lourd dans la comparaison.
      </p>

      <CalcCard icon="⚖️" title="Reste à charge mensuel — répartition ajustée 60 % / 40 %">
        <CalcRow label="Dépense famille A (60 % de 2 925 €)" value="1 755 €" />
        <CalcRow label="Dépense famille B (40 % de 2 925 €)" value="1 170 €" />
        <CalcRow label={<>Crédit d&apos;impôt famille A — 50 % de 1 755 €, plafonné<Tag color="red">Plafonné</Tag></>} value="625 €" />
        <CalcRow label={<>Crédit d&apos;impôt famille B — 50 % de 1 170 €, plafonné de justesse<Tag color="gold">Plafonné</Tag></>} value="563 €" />
        <CalcTotalRow label="Reste à charge famille A" value="1 130 €/mois" />
        <CalcTotalRow label="Reste à charge famille B" value="608 €/mois" />
        <CalcNoteRow>
          Famille A supporte désormais ≈ 65 % du reste à charge total — beaucoup plus proche de sa part réelle de
          2 enfants sur 3 (66,7 %) que les 73 % obtenus avec le prorata strict.
        </CalcNoteRow>
      </CalcCard>

      <CtaMid
        title="nounoulink. calcule votre répartition exacte"
        desc="Entrez le nombre d'enfants de chaque famille et leurs horaires — le calculateur compare instantanément prorata strict, 60/40 ou toute autre répartition sur le reste à charge réel."
        ctaText="Essayer la démo →"
        ctaHref="/"
      />

      <h2 id="comparer">
        <SectionNum n="4" />Comparer les deux répartitions
      </h2>
      <p>
        Sur le salaire, le prorata strict et l&apos;ajustement à 60/40 ne sont séparés que de quelques points. Mais sur le
        reste à charge réellement payé chaque mois, l&apos;écart est net :
      </p>

      <CalcCard icon="🔍" title="Part du reste à charge total supportée par la famille A (2 enfants)">
        <CalcRow label="Prorata strict du salaire (66,7 %)" value="≈ 73 % du RAC total" />
        <CalcRow label="Répartition ajustée du salaire (60 %)" value="≈ 65 % du RAC total" />
        <CalcNoteRow>
          65 % est beaucoup plus proche des 66,7 % qui correspondent au poids réel de la famille A (2 enfants sur 3) —
          c&apos;est cette proximité qui explique pourquoi la majorité des familles dans cette configuration ajustent leur
          répartition vers 60/40.
        </CalcNoteRow>
      </CalcCard>

      <h2 id="calculateur">
        <SectionNum n="5" />Le calculateur nounoulink. simule tous les scénarios
      </h2>
      <p>
        Refaire ce calcul à la main chaque mois, en tenant compte du plafond du crédit d&apos;impôt et de l&apos;évolution des
        revenus de chaque famille, est fastidieux. Le calculateur nounoulink. simule en quelques secondes le prorata
        strict, le 60/40, ou toute autre répartition choisie par les deux familles, et affiche directement le reste à
        charge réel de chacune.
      </p>
      <p>
        Rien n&apos;impose de suivre 60/40 : la convention collective ne fixe aucune méthode de répartition entre familles
        en garde partagée. C&apos;est un accord librement négocié — le calculateur ne fait que rendre visible, chiffres à
        l&apos;appui, l&apos;effet de chaque choix.
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
        <Step num="✕" title="Imposer 60/40 comme une règle fixe" error>
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
