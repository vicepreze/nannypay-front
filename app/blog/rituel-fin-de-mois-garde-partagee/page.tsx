import type { Metadata } from 'next';
import { ArticleLayout } from '../_components/ArticleLayout';
import {
  SummaryBox, Note, CalcCard, CalcRow, CalcTotalRow, CalcNoteRow,
  Step, Steps, CtaMid, SourcesSection, SectionNum,
} from '../_components/ArticleBlocks';

export const metadata: Metadata = {
  title: 'Salaire nounou en garde partagée : pourquoi le rituel de fin de mois revient chaque fois | nounoulink.',
  description:
    "Pourquoi deux familles en garde partagée revérifient leur déclaration de salaire chaque mois, et comment les paniers repas génèrent le plus d'écarts. Guide 2026.",
  alternates: {
    canonical: 'https://nounoulink.fr/blog/rituel-fin-de-mois-garde-partagee',
  },
};

export default function Article() {
  return (
    <ArticleLayout
      title="Salaire nounou en garde partagée : pourquoi le même rituel revient chaque fin de mois"
      intro="Chaque famille déclare sa propre part sur Pajemploi — mais rien, dans le système, ne vérifie que les deux déclarations racontent la même histoire. D'où le message de contrôle qui revient, presque à l'identique, chaque fin de mois."
      category="Coordination"
      publishedAt="2026-08-08"
    >
      <SummaryBox
        title="Ce que vous devez retenir de cet article"
        items={[
          <>En garde partagée, <strong>chaque famille déclare sa propre part</strong> du salaire chaque mois — d&apos;où
          un besoin naturel de vérification croisée, surtout si la nounou attend un salaire identique de la part de
          chaque famille.</>,
          <>Certaines indemnités (<strong>paniers repas, entretien</strong>, le plus souvent) ne sont pas
          mensualisées : elles dépendent du <strong>nombre de jours réellement travaillés</strong>, pas d&apos;un forfait
          fixe.</>,
          <>Un jour férié oublié ou un jour d&apos;absence mal compté suffit à créer un <strong>écart entre les deux
          déclarations</strong>.</>,
          <>Ce n&apos;est presque jamais une question de rigueur : c&apos;est la <strong>reconstruction manuelle</strong>,
          mois après mois, qui génère l&apos;erreur.</>,
          <>nounoulink. <strong>calcule et historise automatiquement</strong> ces montants pour les deux familles, sans
          ressaisie.</>,
        ]}
      />

      <p>
        Léa et Camille se partagent la garde de leurs enfants avec Inès, leur assistante parentale, depuis plus d&apos;un
        an. Chaque famille a son propre compte Pajemploi, son propre calcul, sa propre déclaration. Et pourtant, chaque
        fin de mois, le même message WhatsApp refait surface entre les deux foyers : <em>« On a compté X heures et Y
        jours de paniers repas, vous confirmez pareil ? »</em>
      </p>
      <p>
        Ce n&apos;est pas une question de méfiance entre les deux familles — c&apos;est l&apos;absence de tout garde-fou
        automatique qui les pousse à se recontrôler. Cet article détaille pourquoi ce rituel existe, d&apos;où viennent
        la plupart des écarts, et comment le sécuriser sans y passer une soirée chaque mois.
      </p>

      <Note type="info">
        <span className="text-base flex-shrink-0">📌</span>
        <span>Depuis le <strong>1er janvier 2026</strong>, le terme officiel est <strong>« assistant parental »</strong>{' '}
        (et non plus « garde d&apos;enfants à domicile »). La réglementation reste identique — seule la dénomination a
        changé dans les contrats et sur Pajemploi.</span>
      </Note>

      <h2 id="deux-declarations">
        <SectionNum n="1" />Pourquoi chaque famille déclare séparément, chaque mois
      </h2>
      <p>
        En garde partagée, Inès n&apos;a qu&apos;un seul bulletin de salaire — mais deux déclarations distinctes
        l&apos;alimentent. Léa déclare sa quote-part sur son compte Pajemploi, Camille fait de même sur le sien.{' '}
        <a href="https://www.pajemploi.urssaf.fr" target="_blank" rel="noopener noreferrer" className="text-[var(--sage)] no-underline hover:underline">
          Pajemploi
        </a>{' '}
        additionne ensuite les deux parts pour éditer un bulletin unique.
      </p>
      <p>
        Cette séparation est logique administrativement, mais elle crée un véritable <strong>effet tunnel</strong> :
        rien, dans le système, ne vérifie automatiquement que les deux déclarations racontent la même histoire. Si Léa
        compte 18 jours travaillés et que Camille en compte 19, personne n&apos;est alerté avant que le bulletin ne
        sorte.
      </p>
      <p>
        Pour Inès, c&apos;est le vrai risque : une <strong>mauvaise surprise</strong> découverte à la réception du
        bulletin, sans explication immédiate — un montant qui diffère d&apos;une famille à l&apos;autre, ou d&apos;un mois sur
        l&apos;autre. Quand l&apos;écart est repéré après coup, la correction se fait en <strong>régularisation le mois
        suivant</strong>, plutôt qu&apos;en prévention avant l&apos;envoi. C&apos;est ce décalage, plus que l&apos;écart
        lui-même, qui pèse sur la confiance.
      </p>

      <h2 id="rituel">
        <SectionNum n="2" />Le rituel de vérification croisée entre co-familles
      </h2>
      <p>
        C&apos;est cette absence de garde-fou qui pousse la plupart des co-familles à instaurer, sans jamais l&apos;avoir
        décidé formellement, un rituel de fin de mois : un message récapitulatif, envoyé par l&apos;une des deux
        familles à l&apos;autre, listant heures normales, heures majorées et jours de paniers repas — avec une question
        simple en clôture : <em>« vous confirmez pareil ? »</em>
      </p>

      <CalcCard icon="💬" title="Exemple — le message-type envoyé chaque mois entre Léa et Camille">
        <CalcRow label="Heures normales déclarées (90 h × 12,50 €)" value="1 125,00 €" />
        <CalcRow label="Heures majorées 25 % (12 h × 12,50 € × 1,25)" value="187,50 €" />
        <CalcRow label="Paniers repas (18 jours × 6 €)" value="108,00 €" />
        <CalcRow label="Indemnité transport (pass Navigo ÷ 2)" value="45,40 €" />
        <CalcTotalRow label="Total du mois, part famille" value="1 465,90 €" />
        <CalcNoteRow>
          Ce message est envoyé quasiment à l&apos;identique chaque mois — reconstruit à la main, sans historique
          commun entre les deux foyers.
        </CalcNoteRow>
      </CalcCard>

      <p>
        Ce rituel fonctionne, mais il repose entièrement sur la bonne volonté et la mémoire de chacun — et c&apos;est
        justement là que les écarts s&apos;installent.
      </p>

      <h2 id="ecarts">
        <SectionNum n="3" />Les écarts les plus fréquents, mois après mois
      </h2>
      <p>
        Ce type d&apos;écart n&apos;est presque jamais isolé. Il s&apos;inscrit dans une liste assez stable de causes, que la
        plupart des co-familles finissent par reconnaître avec le temps.
      </p>

      <Steps>
        <Step num="1" title="Un jour férié oublié dans le comptage">
          Le jour est compté comme travaillé par une famille, exclu par l&apos;autre — l&apos;écart type le plus courant.
        </Step>
        <Step num="2" title="Un tarif journalier qui évolue dans le temps">
          Le montant convenu au contrat change (revalorisation, avenant) sans que la nouvelle valeur soit reprise
          partout à la fois.
        </Step>
        <Step num="3" title="Une absence non signalée à temps">
          Un enfant gardé par les grands-parents un jour donné, sans que l&apos;information remonte avant l&apos;envoi du
          récapitulatif mensuel.
        </Step>
      </Steps>

      <CtaMid
        title="nounoulink. recompte les jours travaillés à votre place"
        desc="Jours fériés, absences, congés : tout est pris en compte automatiquement pour calculer le bon montant, chaque mois, pour chaque famille."
        ctaText="Essayer la démo →"
        ctaHref="/"
      />

      <h2 id="securiser">
        <SectionNum n="4" />Comment sécuriser ce suivi sans y passer une soirée
      </h2>
      <p>
        Ces écarts eux-mêmes ne sont pas graves — 6 € oubliés un mois se rattrapent facilement. Ce qui pèse
        réellement, c&apos;est le temps passé à les retrouver : rouvrir un fichier Excel, recompter un calendrier,
        comparer deux versions du même mois.
      </p>

      <Steps>
        <Step num="1" title="Fixer une source unique de vérité">
          Un seul document (partagé, pas dupliqué) sur lequel les deux familles s&apos;appuient, plutôt que deux
          fichiers séparés qu&apos;il faut ensuite comparer.
        </Step>
        <Step num="2" title="Compter les jours fériés une fois pour toutes">
          Les identifier en début d&apos;année évite de les recompter — et potentiellement les oublier — chaque mois.
        </Step>
        <Step num="3" title="Partager en amont les éléments à déclarer">
          Plutôt que d&apos;échanger un récapitulatif après coup, un lien public partagé entre les deux familles (et la
          nounou) permet de poser les chiffres avant l&apos;envoi — et de lever un doute en un coup d&apos;œil plutôt qu&apos;en
          un message.
        </Step>
        <Step num="4" title="Automatiser le calcul plutôt que le refaire à la main">
          Un outil qui applique la formule à chaque mise à jour élimine la majorité des écarts de recomptage manuel.
        </Step>
      </Steps>

      <h2 id="erreurs">
        <SectionNum n="!" error />Les erreurs les plus fréquentes
      </h2>

      <Steps>
        <Step num="✕" title="Compter les paniers repas comme un forfait fixe" error>
          Contrairement au salaire mensualisé, cette indemnité suit les jours réellement travaillés — un montant
          identique chaque mois est rarement correct.
        </Step>
        <Step num="✕" title="Se fier à la mémoire plutôt qu'à un document daté" error>
          Sans trace écrite du comptage initial, il est impossible de savoir plus tard où se situait l&apos;erreur.
        </Step>
        <Step num="✕" title="Ne pas tenir compte de l'impact d'un arrêt maladie sur les heures majorées" error>
          Sur une semaine avec arrêt maladie, la semaine est incomplète : les heures majorées ne s&apos;appliquent pas.
          Seul le salaire mensualisé est déclaré ce mois-là.
        </Step>
        <Step num="✕" title="Attendre le bulletin de salaire pour vérifier" error>
          À ce stade, la déclaration est déjà faite — mieux vaut confirmer les chiffres avant l&apos;envoi que corriger
          après coup.
        </Step>
      </Steps>

      <CtaMid
        title="Le temps en plus, c'est pour votre famille"
        desc="nounoulink. calcule salaire, heures sup et paniers repas automatiquement — avec un historique partagé entre les deux familles et la nounou."
        ctaText="Démarrer avec nounoulink. →"
        ctaHref="/"
      />

      <SourcesSection
        sources={[
          { href: 'https://www.pajemploi.urssaf.fr', label: 'Pajemploi Urssaf', suffix: "— portail employeur garde d'enfants à domicile" },
          {
            href: 'https://www.urssaf.fr/accueil/outils-documentation/simulateurs/calculer-salaire-mensualise-particulier-employeur.html',
            label: 'Urssaf — Simulateur salaire mensualisé particulier employeur',
          },
          { href: 'https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000044594539', label: 'Légifrance — CCN particuliers employeurs IDCC 3239' },
          { href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F104', label: 'Service-Public.fr — Temps de travail salarié à domicile' },
        ]}
      />
    </ArticleLayout>
  );
}
