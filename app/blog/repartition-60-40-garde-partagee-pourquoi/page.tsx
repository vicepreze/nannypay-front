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
      intro="Deux familles, trois enfants, et un prorata par heures qui semble juste sur le papier — mais qui ne l'est plus une fois les aides prises en compte."
      category="Répartition"
      publishedAt="2026-07-20"
    >
      <SummaryBox
        title="Ce que vous devez retenir avant de continuer"
        items={[
          <>Le prorata par heures est un <strong>point de départ</strong>, pas une obligation légale.</>,
          <>Les aides (CMG, crédit d&apos;impôt) ne suivent <strong>pas le même prorata</strong> que les heures gardées.</>,
          <>Une famille avec deux enfants reçoit proportionnellement <strong>moins d&apos;aide par enfant</strong> qu&apos;une famille qui n&apos;en a qu&apos;un.</>,
          <>D&apos;où l&apos;usage fréquent de rééquilibrer vers <strong>60/40</strong> plutôt que de suivre le prorata strict des heures.</>,
          <>nounoulink. calcule ce rééquilibrage automatiquement via son <strong>Mode Magique</strong>.</>,
        ]}
      />

      <p>
        Sophie et Lucas sont gardés par la famille A, Emma par la famille B — même assistante parentale, mêmes horaires,
        même nombre d&apos;heures chaque semaine. Sur le papier, la répartition du salaire devrait suivre simplement le
        nombre d&apos;enfants et d&apos;heures gardées de chaque côté. C&apos;est ce que beaucoup de familles font en premier réflexe :
        un prorata strict, à l&apos;heure près.
      </p>
      <p>
        Le problème arrive au moment de calculer le reste à charge réel, une fois les aides (CMG, crédit d&apos;impôt)
        déduites. Le prorata strict par heures ignore un détail important : ces aides ne doublent pas simplement parce
        qu&apos;une famille garde deux enfants au lieu d&apos;un. Ce guide explique pourquoi, dans ce cas précis, la répartition
        qui finit par être appliquée se rapproche souvent de 60/40 plutôt que du 66/33 calculé à l&apos;heure.
      </p>

      <Note type="info">
        <span className="text-base flex-shrink-0">💡</span>
        <span>Depuis janvier 2026, on parle d&apos;<strong>assistant parental</strong> et non plus de &laquo; garde d&apos;enfants à
        domicile &raquo;. Ce guide utilise cette terminologie tout du long.</span>
      </Note>

      <h2 id="prorata-heures">
        <SectionNum n="1" />Le prorata par heures : le point de départ le plus courant
      </h2>
      <p>
        La convention collective des particuliers employeurs ne fixe aucune méthode de répartition entre familles en
        garde partagée — c&apos;est un accord librement négocié entre elles. La méthode la plus intuitive, et la plus
        utilisée en premier réflexe, consiste à répartir le salaire <strong>au prorata des heures gardées par
        chaque enfant</strong>.
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

      <h2 id="cas-3-enfants">
        <SectionNum n="2" />Le cas à 3 enfants, 2 familles : Sophie, Lucas et Emma
      </h2>
      <p>
        Sophie et Lucas (famille A) et Emma (famille B) sont gardés exactement les mêmes heures chaque semaine par la
        même assistante parentale. Appliqué strictement, le prorata par heures donne un résultat qui semble logique au
        premier regard :
      </p>

      <CalcCard icon="👨‍👩‍👧‍👦" title="Prorata strict par heures — Sophie et Lucas (famille A) · Emma (famille B), 40h/semaine chacun">
        <CalcRow label="Heures hebdo Sophie + Lucas (famille A)" value="40 + 40 = 80 h" />
        <CalcRow label="Heures hebdo Emma (famille B)" value="40 h" />
        <CalcSubtotalRow label="Part famille A — prorata strict" value="80 ÷ 120 = 66,7 %" />
        <CalcSubtotalRow label="Part famille B — prorata strict" value="40 ÷ 120 = 33,3 %" />
        <CalcNoteRow>
          À ce stade, seul le salaire est réparti — les aides de chaque famille n&apos;ont pas encore été prises en compte.
        </CalcNoteRow>
      </CalcCard>

      <p>
        Deux tiers / un tiers : la famille A garde deux fois plus d&apos;enfants, elle paie donc deux fois plus. Le
        raisonnement semble imparable — jusqu&apos;à ce qu&apos;on regarde ce que chaque famille récupère réellement en aides.
      </p>

      <h2 id="ce-que-le-prorata-ignore">
        <SectionNum n="3" />Ce que le prorata strict ignore : les aides ne suivent pas le même rythme
      </h2>
      <p>
        Le CMG (Complément de libre choix du Mode de Garde) et le crédit d&apos;impôt sont calculés par famille, en
        fonction du nombre d&apos;enfants gardés — mais <strong>pas proportionnellement</strong>. Une famille qui garde deux
        enfants ne touche pas deux fois l&apos;aide d&apos;une famille qui n&apos;en garde qu&apos;un.
      </p>

      <Note type="warn">
        <span className="text-base flex-shrink-0">⚠️</span>
        <span>Ne pas développer soi-même le détail exact du barème CMG dans un calcul manuel : les règles évoluent et
        varient selon les revenus. Utilisez le simulateur officiel sur <strong>caf.fr</strong> pour votre situation
        exacte — ce guide n&apos;explique que le principe général qui justifie le rééquilibrage.</span>
      </Note>

      <CtaMid
        title="nounoulink. calcule votre répartition exacte"
        desc="Entrez le nombre d'enfants de chaque famille et leurs horaires — on calcule le prorata, puis on vous propose le rééquilibrage qui égalise le reste à charge réel."
        ctaText="Essayer la démo →"
        ctaHref="/"
      />

      <h2 id="plafond-cmg">
        <SectionNum n="4" />Le plafond CMG ne double pas avec un deuxième enfant
      </h2>
      <p>
        Le volet cotisations du CMG est plafonné, et ce plafond <strong>ne double pas</strong> entre une famille qui garde
        un enfant et une famille qui en garde deux. La famille A, avec Sophie et Lucas, reçoit donc une aide plafonnée
        qui ne suit pas le même facteur 2 que ses heures gardées.
      </p>

      <h2 id="credit-impot">
        <SectionNum n="5" />Le crédit d&apos;impôt : un plafond qui augmente bien moins vite que le nombre d&apos;enfants
      </h2>
      <p>
        Même logique côté crédit d&apos;impôt : son plafond annuel passe d&apos;environ <strong>6 750 €/an pour un enfant</strong> à
        seulement <strong>7 500 €/an pour deux enfants</strong> — soit une hausse d&apos;environ <Tag color="gold">+ 11 %</Tag> pour
        deux fois plus d&apos;enfants gardés. La famille A reçoit donc proportionnellement moins d&apos;aide par enfant que la
        famille B.
      </p>

      <CalcCard icon="📊" title="Ce que le prorata strict 66/33 produirait sur le reste à charge (ordre de grandeur)">
        <CalcRow label="Famille A (2 enfants) — part du salaire au prorata strict" value="66,7 %" />
        <CalcRow label="Famille B (1 enfant) — part du salaire au prorata strict" value="33,3 %" />
        <CalcRow label="Aide reçue par la famille A — plafonnée, ne double pas" value="Sous-proportionnelle" />
        <CalcTotalRow label="Résultat" value="Reste à charge de la famille A disproportionné" />
        <CalcNoteRow>
          En payant 66,7 % du salaire mais en recevant une aide plafonnée qui ne suit pas ce même facteur, la famille A
          supporte, une fois les aides déduites, une part de reste à charge plus lourde que ce que son prorata initial
          laissait penser.
        </CalcNoteRow>
      </CalcCard>

      <h2 id="reste-a-charge-reel">
        <SectionNum n="6" />Le reste à charge réel : pourquoi 60/40 rééquilibre les choses
      </h2>
      <p>
        C&apos;est ce déséquilibre qui explique l&apos;usage observé dans ce type de configuration : plutôt que de rester au
        prorata strict des heures (66,7 % / 33,3 %), les familles ajustent la répartition du <strong>salaire</strong> pour
        que le <strong>reste à charge</strong> — ce qu&apos;il reste réellement à payer après CMG et crédit d&apos;impôt — soit, lui,
        équilibré. En pratique, cet ajustement se rapproche souvent d&apos;une répartition à <strong>60/40</strong> plutôt que
        66/33.
      </p>

      <CalcCard icon="⚖️" title="Répartition réellement pratiquée — famille A (2 enfants) / famille B (1 enfant)">
        <CalcRow label="Prorata strict par heures — famille A" value="66,7 %" />
        <CalcRow label="Prorata strict par heures — famille B" value="33,3 %" />
        <CalcSubtotalRow label="Répartition ajustée sur le reste à charge — famille A" value="≈ 60 %" />
        <CalcSubtotalRow label="Répartition ajustée sur le reste à charge — famille B" value="≈ 40 %" />
        <CalcNoteRow>
          Le ratio exact dépend des revenus de chaque famille, de l&apos;âge des enfants et du CMG accordé par la CAF — il
          n&apos;y a pas de règle fixe à 60/40, seulement une tendance observée dans ce type de configuration à 2 + 1
          enfants.
        </CalcNoteRow>
      </CalcCard>

      <h2 id="mode-magique">
        <SectionNum n="7" />Comment nounoulink. calcule ce rééquilibrage automatiquement
      </h2>
      <p>
        Recalculer ce rééquilibrage à la main chaque mois, en tenant compte des revenus de chaque famille et de
        l&apos;évolution des aides, est fastidieux et source d&apos;erreur. Le <strong>Mode Magique</strong> de nounoulink. fait ce
        calcul automatiquement : il balaie les répartitions possibles et retient celle qui équilibre le reste à charge
        réel entre les deux familles, plutôt que de s&apos;arrêter au simple prorata des heures.
      </p>
      <p>
        Rien n&apos;empêche une famille de préférer rester au prorata strict par heures si elle le souhaite — la
        convention collective ne l&apos;impose pas. Le Mode Magique est une proposition, pas une obligation : un
        &laquo; Mode Expert &raquo; permet de saisir manuellement la répartition et les aides de chaque famille si vous
        préférez garder la main.
      </p>

      <h2 id="erreurs">
        <SectionNum n="!" error />Les erreurs les plus fréquentes
      </h2>

      <Steps>
        <Step num="✕" title="Confondre prorata du salaire et prorata du reste à charge" error>
          Ce ne sont pas la même chose. Le prorata par heures répartit le salaire ; le reste à charge dépend en plus des
          aides de chaque famille, qui ne suivent pas ce même prorata.
        </Step>
        <Step num="✕" title="Croire que le CMG double avec un deuxième enfant" error>
          Le volet cotisations du CMG est plafonné et ne suit pas un facteur 2 entre une famille à un enfant et une
          famille à deux enfants.
        </Step>
        <Step num="✕" title="Vouloir reproduire le détail exact du barème CMG soi-même" error>
          Les règles évoluent et dépendent des revenus de chaque famille. Utilisez le simulateur officiel sur caf.fr ou
          urssaf.fr plutôt que d&apos;estimer à la main.
        </Step>
        <Step num="✕" title="Imposer 60/40 comme une règle fixe" error>
          Ce n&apos;est pas un taux légal : c&apos;est un ordre de grandeur observé dans ce type de configuration à 2 + 1
          enfants. Le ratio exact dépend des revenus et de la situation de chaque famille.
        </Step>
      </Steps>

      <CtaMid
        title="Laissez nounoulink. faire le calcul à votre place"
        desc="Renseignez les enfants et les revenus de chaque famille — le Mode Magique propose la répartition qui équilibre le reste à charge réel, chaque mois."
        ctaText="Démarrer avec nounoulink. →"
        ctaHref="/"
      />

      <SourcesSection
        sources={[
          {
            href: 'https://www.pajemploi.urssaf.fr',
            label: 'Pajemploi Urssaf',
            suffix: '— portail employeur garde d\'enfants à domicile',
          },
          {
            href: 'https://www.caf.fr/allocataires/actualites/actualites-nationales/reforme-du-cmg-une-aide-plus-adaptee-pour-les-familles',
            label: 'CAF — Réforme du CMG septembre 2025',
            suffix: '',
          },
          {
            href: 'https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000044594539',
            label: 'Légifrance — CCN particuliers employeurs IDCC 3239',
            suffix: '',
          },
          {
            href: 'https://www.service-public.fr/particuliers/vosdroits/F13684',
            label: 'Service-Public.fr — Crédit d\'impôt pour l\'emploi d\'un salarié à domicile',
            suffix: '',
          },
        ]}
      />
    </ArticleLayout>
  );
}
