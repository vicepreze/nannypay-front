import type { Metadata } from 'next';
import { ArticleLayout } from '../_components/ArticleLayout';
import {
  SummaryBox, Note, Steps, Step, CtaMid, SourcesSection, SectionNum,
  CalcCard, CalcRow, CalcNoteRow,
} from '../_components/ArticleBlocks';

export const metadata: Metadata = {
  title: 'Déclarer une garde partagée sur Pajemploi : le guide pas à pas | nounoulink.',
  description:
    "Comment déclarer une garde partagée sur Pajemploi, étape par étape : ouverture de compte, ce que chaque famille déclare, et comment éviter les erreurs de déclaration séparée. Guide 2026.",
  alternates: {
    canonical: 'https://nounoulink.com/blog/declarer-garde-partagee-pajemploi',
  },
};

export default function Article() {
  return (
    <ArticleLayout
      title="Déclarer une garde partagée sur Pajemploi : le guide pas à pas"
      intro="Deux comptes, deux déclarations, un seul bulletin de salaire : voici, étape par étape, comment chaque famille déclare sa part sur Pajemploi — et où se glisse la plupart des erreurs."
      category="Déclaration Pajemploi"
      publishedAt="2026-08-19"
    >
      <SummaryBox
        title="Ce que vous devez retenir de cet article"
        items={[
          <>En garde partagée, <strong>chaque famille ouvre son propre compte Pajemploi</strong> et fait sa propre
          déclaration, chaque mois.</>,
          <>Pajemploi <strong>additionne les deux déclarations</strong> pour éditer un bulletin de salaire unique
          — mais rien ne vérifie automatiquement qu&apos;elles concordent.</>,
          <>La plupart des erreurs viennent du <strong>même point</strong> : les deux familles déclarent sans
          s&apos;être calées avant l&apos;envoi.</>,
          <>Une checklist simple, appliquée avant chaque déclaration, évite la majorité des écarts.</>,
          <>nounoulink. donne les <strong>montants exacts à saisir</strong>, identiques pour les deux familles,
          avant la déclaration.</>,
        ]}
      />

      <p>
        Élise et Thomas viennent de démarrer une garde partagée avec Claire comme assistante parentale. Premier
        mois, première déclaration Pajemploi — et une question toute simple qui bloque tout : qui déclare quoi, et
        comment être sûr que les deux déclarations racontent la même histoire ?
      </p>
      <p>
        Ce n&apos;est pas une question absurde. Contrairement à une garde classique à un seul employeur, la garde
        partagée repose sur deux comptes, deux déclarations, un seul bulletin final. Ce guide détaille chaque
        étape, dans l&apos;ordre, avec le point précis où la plupart des erreurs se glissent.
      </p>

      <Note type="info">
        <span className="text-base flex-shrink-0">📌</span>
        <span>Depuis le <strong>1er janvier 2026</strong>, le terme officiel est <strong>« assistant
        parental »</strong> (et non plus « garde d&apos;enfants à domicile »). La réglementation reste identique
        — seule la dénomination a changé dans les contrats et sur Pajemploi.</span>
      </Note>

      <h2 id="deux-comptes">
        <SectionNum n="1" />Pourquoi il y a deux déclarations, pas une
      </h2>
      <p>
        Claire n&apos;a qu&apos;un seul bulletin de salaire — mais deux déclarations distinctes l&apos;alimentent.{' '}
        <a
          href="https://www.pajemploi.urssaf.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--sage)] hover:underline no-underline"
        >
          Pajemploi
        </a>{' '}
        précise que chaque parent employeur déclare sa propre quote-part, avec son propre numéro employeur. Élise
        déclare sur son compte, Thomas sur le sien.
      </p>
      <p>
        Cette organisation est logique administrativement : chaque famille est un employeur à part entière, avec
        ses propres cotisations et son propre historique. Mais elle a une conséquence directe — rien, dans le
        système, ne compare automatiquement les deux déclarations entre elles.
      </p>

      <h2 id="ouvrir-compte">
        <SectionNum n="2" />Ouvrir son compte Pajemploi employeur
      </h2>
      <p>
        Avant toute déclaration, chaque famille doit disposer de son propre accès. C&apos;est la première étape,
        et elle se fait indépendamment de l&apos;autre famille.
      </p>

      <Steps>
        <Step num="1" title="Créer son compte employeur particulier">
          Sur pajemploi.urssaf.fr, avec ses informations personnelles — indépendamment du compte de l&apos;autre
          famille.
        </Step>
        <Step num="2" title="Déclarer le contrat de travail">
          Informations sur l&apos;assistant parental, date de début, éléments du contrat propres à sa quote-part
          de garde.
        </Step>
        <Step num="3" title="Mentionner l'enfant gardé">
          Nom, prénom, date de naissance — chaque famille déclare son ou ses propres enfants, pas ceux de
          l&apos;autre famille.
        </Step>
      </Steps>

      <h2 id="chaque-mois">
        <SectionNum n="3" />Ce que chaque famille déclare, mois par mois
      </h2>
      <p>
        Une fois les comptes ouverts, la déclaration mensuelle revient à renseigner plusieurs champs, chacun avec
        sa propre logique.
      </p>

      <CalcCard icon="📋" title="Les champs à renseigner chaque mois">
        <CalcRow label="Heures normales" value="Mensualisées, identiques chaque mois" />
        <CalcRow label="Heures majorées" value="Au-delà de 40h et 48h/semaine" />
        <CalcRow label="Jours d'activité" value="Mensualisés eux aussi" />
        <CalcRow label="Congés payés pris ce mois" value="Le cas échéant" />
        <CalcRow label="Indemnités (transport, repas, entretien)" value="Dans des champs séparés du salaire" />
        <CalcNoteRow>
          Transport et repas ne se saisissent jamais dans le champ salaire — c&apos;est une des erreurs les plus
          fréquentes.
        </CalcNoteRow>
      </CalcCard>

      <CtaMid
        title="nounoulink. donne les montants exacts à saisir"
        desc="Les mêmes chiffres, pour les deux familles, prêts à copier-coller dans Pajemploi — sans recalcul à la main."
        ctaText="Essayer la démo →"
        ctaHref="/"
      />

      <h2 id="piege">
        <SectionNum n="4" />Le piège de la déclaration séparée
      </h2>
      <p>
        C&apos;est ici que se logent la majorité des erreurs constatées en garde partagée : les deux familles
        déclarent chacune de leur côté, sans avoir comparé leurs chiffres avant l&apos;envoi.
      </p>

      <Note type="warn">
        <span className="text-base flex-shrink-0">⚠️</span>
        <span>Si Élise compte 18 jours travaillés et que Thomas en compte 19, <strong>rien n&apos;alerte
        personne avant que le bulletin ne sorte</strong>. La correction, si elle est nécessaire, se fait alors
        après coup — en régularisation le mois suivant — plutôt qu&apos;en prévention avant l&apos;envoi.</span>
      </Note>

      <p>
        La bonne pratique n&apos;est pas de déclarer plus vite, mais de se caler avant, pas après : comparer les
        chiffres des deux familles avant que l&apos;une d&apos;elles ne valide sa déclaration.
      </p>

      <h2 id="apres">
        <SectionNum n="5" />Ce qui se passe après la déclaration
      </h2>

      <Steps>
        <Step num="1" title="Pajemploi additionne les deux parts">
          Les deux déclarations sont cumulées pour calculer le salaire total et les cotisations dues.
        </Step>
        <Step num="2" title="Un bulletin unique est généré">
          Claire reçoit un seul bulletin, pas deux — même si deux familles ont chacune déclaré leur part.
        </Step>
        <Step num="3" title="Chaque famille est prélevée pour sa propre part">
          Le prélèvement des cotisations se fait sur le compte bancaire renseigné par chaque famille,
          indépendamment de l&apos;autre.
        </Step>
      </Steps>

      <h2 id="checklist">
        <SectionNum n="6" />Checklist avant chaque déclaration mensuelle
      </h2>

      <Steps>
        <Step num="1" title="Comparer les heures avec l'autre famille">
          Avant, pas après l&apos;envoi.
        </Step>
        <Step num="2" title="Vérifier les jours fériés et absences du mois">
          Une source commune évite que chaque famille recompte de son côté, avec un risque de divergence.
        </Step>
        <Step num="3" title="Séparer salaire et indemnités">
          Transport, repas et entretien vont dans leurs propres champs, jamais dans le champ salaire.
        </Step>
      </Steps>

      <h2 id="erreurs">
        <SectionNum n="!" error />Les erreurs les plus fréquentes
      </h2>

      <Steps>
        <Step num="✕" title="Déclarer sans avoir comparé avec l'autre famille" error>
          La cause la plus fréquente d&apos;écart — chacun déclare sa version, sans vérification croisée avant
          l&apos;envoi.
        </Step>
        <Step num="✕" title="Mettre les indemnités dans le champ salaire" error>
          Transport et repas ont leurs propres champs sur Pajemploi — les fusionner avec le salaire fausse la
          déclaration.
        </Step>
        <Step num="✕" title="Oublier de mentionner l'enfant sur son propre compte" error>
          Chaque famille déclare son ou ses enfants sur son propre compte — pas ceux de l&apos;autre famille.
        </Step>
        <Step num="✕" title="Attendre le bulletin pour vérifier" error>
          À ce stade, les deux déclarations sont déjà parties — mieux vaut comparer avant l&apos;envoi que
          corriger après coup.
        </Step>
      </Steps>

      <CtaMid
        title="Une déclaration alignée, chaque mois"
        desc="nounoulink. calcule les montants pour les deux familles à partir des mêmes données — plus besoin de comparer après coup."
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
            suffix: '— CCN particuliers employeurs IDCC 3239',
          },
        ]}
      />
    </ArticleLayout>
  );
}
