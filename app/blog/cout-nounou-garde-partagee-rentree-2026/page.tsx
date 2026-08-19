import type { Metadata } from 'next';
import { ArticleLayout } from '../_components/ArticleLayout';
import {
  SummaryBox, Note, FormulaBox, Steps, Step, CtaMid, SourcesSection, SectionNum,
  CalcCard, CalcRow, CalcSubtotalRow, CalcTotalRow, CalcNoteRow, Tag,
} from '../_components/ArticleBlocks';

export const metadata: Metadata = {
  title: 'Combien coûte une nounou en garde partagée à la rentrée 2026 ? | nounoulink.',
  description:
    "Salaire brut, charges patronales, horaires, ville et nombre d'enfants : le calcul complet du coût réel d'une nounou en garde partagée à la rentrée 2026.",
  alternates: {
    canonical: 'https://nounoulink.com/blog/cout-nounou-garde-partagee-rentree-2026',
  },
};

export default function Article() {
  return (
    <ArticleLayout
      title="Combien coûte une nounou en garde partagée à la rentrée 2026 ?"
      intro="Salaire brut, charges patronales, ville, horaires et nombre d'enfants : le calcul complet du coût réel avant aides, avec un exemple chiffré pour une famille à 50% de la garde."
      category="Coût & budget"
      publishedAt="2026-08-19"
    >
      <SummaryBox
        title="Ce que vous devez retenir de cet article"
        items={[
          <>Le <strong>coût total</strong> d&apos;une nounou en garde partagée ne se résume pas au salaire net
          versé : il inclut aussi les <strong>charges patronales</strong>.</>,
          <>Ce coût varie selon trois facteurs concrets : la <strong>ville</strong>, le <strong>nombre
          d&apos;heures</strong> hebdomadaires, et le <strong>nombre d&apos;enfants</strong> gardés.</>,
          <>La rentrée est le moment où ce coût <strong>change le plus</strong> : nouveaux horaires, parfois
          nouveau contrat.</>,
          <>Les aides (CMG, crédit d&apos;impôt) qui réduisent ensuite ce coût font l&apos;objet d&apos;un
          <strong> article dédié</strong> — ici, on reste sur le coût réel avant aides.</>,
          <>nounoulink. calcule ce coût <strong>automatiquement</strong>, pour chaque famille, en tenant compte
          de leur situation propre.</>,
        ]}
      />

      <p>
        Marion et Nadia démarrent une garde partagée à la rentrée pour leurs enfants, avec Manon comme assistante
        parentale. Avant de signer quoi que ce soit, la question qui revient en premier n&apos;est pas le salaire
        horaire — c&apos;est <em>combien ça va nous coûter vraiment, chaque mois ?</em>
      </p>
      <p>
        C&apos;est une question légitime, mais dont la réponse dépend de plusieurs éléments qui s&apos;empilent :
        le salaire brut, les charges patronales, et des facteurs très concrets comme la ville, les horaires et le
        nombre d&apos;enfants gardés. Ce guide détaille chaque étape du calcul, avec un exemple chiffré complet
        pour une famille à 50% de la garde.
      </p>

      <Note type="info">
        <span className="text-base flex-shrink-0">📌</span>
        <span>Depuis le <strong>1er janvier 2026</strong>, le terme officiel est <strong>« assistant
        parental »</strong> (et non plus « garde d&apos;enfants à domicile »). La réglementation reste identique
        — seule la dénomination a changé dans les contrats et sur Pajemploi.</span>
      </Note>

      <h2 id="composition">
        <SectionNum n="1" />Ce qui compose le coût total, avant toute aide
      </h2>
      <p>
        Le coût d&apos;une nounou pour une famille ne se limite jamais au salaire net qu&apos;elle perçoit. Deux
        éléments s&apos;ajoutent systématiquement au calcul : le salaire brut, et les charges patronales qui
        financent la protection sociale de la salariée.
      </p>

      <FormulaBox
        label="Formule — Coût total avant aides"
        formula={
          <>
            Coût total ={' '}
            <em className="not-italic text-[var(--sage-dark)]">Salaire brut mensuel</em>
            {' + '}
            <em className="not-italic text-[var(--sage-dark)]">Charges patronales</em>
          </>
        }
      />

      <p>
        Les charges patronales représentent environ 25% du salaire brut pour un assistant parental, avant
        application de l&apos;abattement de charges auquel les particuliers employeurs ont droit.{' '}
        <a
          href="https://www.urssaf.fr/accueil/outils-documentation/simulateurs/calculer-salaire-mensualise-particulier-employeur.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--sage)] hover:underline no-underline"
        >
          Urssaf
        </a>{' '}
        propose un simulateur officiel pour affiner ce calcul selon la situation exacte du contrat.
      </p>

      <h2 id="salaire-brut">
        <SectionNum n="2" />Le salaire brut selon le niveau et les heures
      </h2>
      <p>
        Le point de départ, c&apos;est le taux horaire — encadré par un minimum conventionnel qui dépend du niveau
        de qualification de l&apos;assistant parental.
      </p>

      <CalcCard icon="📋" title="Salaires minima 2026 — Assistant parental">
        <CalcRow
          label={<>Niveau A — sans diplôme spécifique<Tag color="green">Le plus courant</Tag></>}
          value="12,89 € brut/h"
        />
        <CalcRow label="Niveau B — avec qualification reconnue" value="13,08 € brut/h" />
        <CalcRow label="SMIC horaire 2026" value="12,02 € brut/h" />
      </CalcCard>

      <p>
        Pour une garde à temps plein (40h/semaine), ce taux horaire se traduit en salaire mensuel via la
        mensualisation — un montant identique chaque mois, quelle que soit la répartition des semaines dans
        l&apos;année.
      </p>

      <h2 id="horaires">
        <SectionNum n="3" />Les horaires les plus courants, et leur impact sur le coût
      </h2>
      <p>
        Une fois le taux horaire connu, reste à fixer les horaires eux-mêmes — et c&apos;est souvent là que le
        coût final se joue vraiment, avant même de parler d&apos;aides.
      </p>
      <p>
        Il n&apos;existe pas de statistique officielle sur &laquo;&nbsp;l&apos;horaire le plus répandu&nbsp;&raquo;,
        mais les exemples les plus fréquemment cités dans les contrats et les simulateurs tournent autour de{' '}
        <strong>9h-17h</strong> (40h/semaine, sans aucune majoration) ou <strong>9h-18h</strong> (45h/semaine,
        dans la tranche à +25%). Au-delà, chaque heure supplémentaire coûte progressivement plus cher.
      </p>

      <Note type="warn">
        <span className="text-base flex-shrink-0">⚠️</span>
        <span>La convention collective fixe un plafond absolu de <strong>50h par semaine</strong> (ou 48h en
        moyenne sur 12 semaines){' '}
        <a
          href="https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000044594539"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--sage-dark)] underline"
        >
          Légifrance
        </a>{' '}
        — au-delà, ce n&apos;est plus une question de coût, mais de légalité du planning.</span>
      </Note>

      <p>
        C&apos;est pour cette raison que beaucoup de familles qui font <strong>10h par jour</strong> allègent
        volontairement le vendredi d&apos;une heure ou deux : non pas pour économiser un peu, mais pour rester
        sous le seuil des 48h et éviter la tranche la plus coûteuse, celle à +50%.
      </p>

      <CalcCard icon="🕐" title="Impact du vendredi allégé — coût hebdomadaire total, taux 12,89 €/h">
        <CalcRow label="Semaine à 50h (5 jours × 10h)" value="683,17 €" />
        <CalcRow label="— dont 2h à +50 % (au-delà de 48h)" value="38,67 €" />
        <CalcSubtotalRow label="Semaine à 48h (vendredi réduit de 2h)" value="644,50 €" />
        <CalcNoteRow>
          Même volume presque identique de travail, mais 0h dans la tranche à +50 % — l&apos;écart se répète
          chaque semaine mensualisée, donc chaque mois.
        </CalcNoteRow>
      </CalcCard>

      <CtaMid
        title="nounoulink. calcule votre coût réel en 30 secondes"
        desc="Taux horaire, heures majorées, charges patronales : le calcul complet, sans tableur à recouper vous-même."
        ctaText="Essayer la démo →"
        ctaHref="/"
      />

      <h2 id="exemple">
        <SectionNum n="4" />Exemple chiffré : le coût total pour une famille à 50%
      </h2>
      <p>
        Pour rendre ce calcul concret, voici la situation de Marion, dont la fille est gardée à 50% du temps par
        Manon, aux côtés de la famille de Nadia.
      </p>

      <CalcCard icon="💰" title="Coût total estimé — famille à 50% de la garde, niveau A">
        <CalcRow label="Part du salaire brut mensuel" value="1 118 €" />
        <CalcRow label="Charges patronales (≈ 25 %)" value="+ 280 €" />
        <CalcTotalRow label="Coût total avant aides" value="1 398 € / mois" />
        <CalcNoteRow>
          Les aides (CMG, crédit d&apos;impôt) qui réduisent ensuite ce montant font l&apos;objet d&apos;un
          article dédié.
        </CalcNoteRow>
      </CalcCard>

      <h2 id="variation">
        <SectionNum n="5" />Méthodologie : ce qui fait vraiment varier le coût
      </h2>
      <p>
        Ce montant de 1 398 € n&apos;est qu&apos;un point de repère pour un cas précis. Isolé, chaque facteur —
        la ville, le nombre d&apos;heures, le nombre d&apos;enfants gardés — peut faire varier ce chiffre de
        plusieurs centaines d&apos;euros. Pour rester rigoureux, chaque tableau ci-dessous isole un seul facteur
        à la fois, toutes choses égales par ailleurs (niveau A, 40h/semaine, brut avant charges, sauf mention
        contraire).
      </p>

      <h3>Par ville : le taux légal est national, le taux négocié ne l&apos;est pas</h3>
      <p>
        Le minimum conventionnel (12,89 €/h) s&apos;applique de façon identique partout en France. Ce qui varie
        d&apos;une ville à l&apos;autre, c&apos;est le taux réellement négocié — plus élevé là où la demande
        dépasse l&apos;offre.
      </p>

      <Note type="info">
        <span className="text-base flex-shrink-0">📌</span>
        <span>Les montants par ville ci-dessous sont des <strong>observations de marché</strong>, pas un barème
        officiel — aucun texte réglementaire ne fixe de taux différent selon la géographie. Ils servent
        d&apos;ordre de grandeur, à ajuster à la réalité locale.</span>
      </Note>

      <CalcCard icon="📍" title="Salaire brut mensuel selon la ville — 40h/semaine, niveau A">
        <CalcRow label="Villes moyennes, zones moins tendues (12,89 €/h, minimum)" value="2 234 €" />
        <CalcRow label="Lyon, Bordeaux, Toulouse (13,00 €/h observé)" value="2 253 €" />
        <CalcRow label="Paris / Île-de-France (13,80 €/h observé)" value="2 392 €" />
      </CalcCard>

      <h3>Par nombre d&apos;heures hebdomadaires</h3>
      <p>
        Toujours au minimum conventionnel national, mais en faisant varier cette fois uniquement les horaires —
        l&apos;effet des tranches de majoration devient vite visible.
      </p>

      <CalcCard icon="🕐" title="Salaire brut mensuel selon les horaires — taux 12,89 €/h">
        <CalcRow label="30h/semaine (temps partiel, aucune majoration)" value="1 676 €" />
        <CalcRow label="40h/semaine (aucune majoration)" value="2 234 €" />
        <CalcRow label="45h/semaine (dont 5h à +25 %)" value="2 583 €" />
      </CalcCard>

      <h3>Par nombre d&apos;enfants gardés (2 ou 3)</h3>
      <p>
        Troisième variable : le nombre d&apos;enfants gardés simultanément influe sur le taux horaire négocié —
        pas sur autre chose. La façon dont ce coût se répartit ensuite entre les familles fait l&apos;objet
        d&apos;un <strong>article dédié</strong>, pas de celui-ci.
      </p>

      <CalcCard icon="👨‍👩‍👧‍👦" title="Salaire brut mensuel selon le nombre d'enfants — 40h/semaine">
        <CalcRow label="2 enfants — niveau A (12,89 €/h)" value="2 234 €" />
        <CalcRow label="3 enfants gardés simultanément — souvent niveau B (13,08 €/h)" value="2 267 €" />
        <CalcNoteRow>
          Le passage au niveau B pour la garde simultanée de plusieurs enfants est une pratique courante, pas une
          règle confirmée noir sur blanc dans la convention collective — à négocier au cas par cas.
        </CalcNoteRow>
      </CalcCard>

      <h2 id="anticiper">
        <SectionNum n="7" />Comment anticiper ce coût avant de signer
      </h2>
      <p>
        Avant de s&apos;engager sur un contrat à la rentrée, il est possible de sécuriser une estimation fiable
        plutôt que de découvrir le coût réel sur les premières fiches de paie.
      </p>

      <Steps>
        <Step num="1" title="Vérifier le taux de marché de sa ville avant de négocier">
          S&apos;aligner sur le minimum légal dans une zone tendue peut rendre la recherche de nounou beaucoup
          plus difficile.
        </Step>
        <Step num="2" title="Fixer les horaires avant de fixer le taux">
          Une même semaine peut coûter sensiblement plus ou moins cher selon qu&apos;elle reste sous ou dépasse
          le seuil des 48h.
        </Step>
        <Step num="3" title="Recalculer dès que les horaires scolaires changent">
          Un nouvel emploi du temps à la rentrée modifie le salaire mensualisé dès le premier mois — mieux vaut
          l&apos;anticiper que le découvrir sur la fiche de paie.
        </Step>
      </Steps>

      <h2 id="erreurs">
        <SectionNum n="!" error />Les erreurs les plus fréquentes
      </h2>

      <Steps>
        <Step num="✕" title="Confondre salaire net et coût réel" error>
          Le montant versé à la nounou n&apos;est qu&apos;une partie du coût total — les charges patronales
          doivent être intégrées pour avoir le vrai chiffre.
        </Step>
        <Step num="✕" title="Négocier au minimum légal en zone tendue" error>
          À Paris ou dans une grande métropole, s&apos;aligner strictement sur le minimum conventionnel peut
          rendre la recherche beaucoup plus longue que prévu.
        </Step>
        <Step num="✕" title="Ignorer le seuil des 48h en cumulant les horaires" error>
          Un planning qui dépasse ce seuil bascule dans la tranche à +50 %, la plus coûteuse — un détail qui
          passe souvent inaperçu au moment de fixer les horaires.
        </Step>
        <Step num="✕" title="Ne pas anticiper le changement d'horaires de rentrée" error>
          Un nouvel emploi du temps scolaire modifie le salaire mensualisé dès le premier mois — un coût qui
          peut surprendre s&apos;il n&apos;est pas recalculé à l&apos;avance.
        </Step>
      </Steps>

      <CtaMid
        title="Démarrez la rentrée avec un budget clair"
        desc="nounoulink. calcule votre coût réel, pour chaque famille, avant même de signer le contrat."
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
            href: 'https://www.urssaf.fr/accueil/outils-documentation/simulateurs/calculer-salaire-mensualise-particulier-employeur.html',
            label: 'Urssaf',
            suffix: '— Simulateur salaire mensualisé particulier employeur',
          },
          {
            href: 'https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000044594539',
            label: 'Légifrance',
            suffix: '— CCN particuliers employeurs IDCC 3239 (durées de travail, art. 136 et 147)',
          },
          {
            href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F104',
            label: 'Service-Public.fr',
            suffix: '— Temps de travail salarié à domicile',
          },
        ]}
      />
    </ArticleLayout>
  );
}
