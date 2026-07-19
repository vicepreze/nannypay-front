import type { Metadata } from 'next';
import { LegalLayout } from '@/components/LegalLayout';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — nounoulink',
  description: 'Comment nounoulink collecte, utilise et protège vos données personnelles.',
};

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalLayout title="Politique de confidentialité" updatedAt="19 juillet 2026">
      <section>
        <p>
          nounoulink coordonne une garde partagée entre deux familles et une nounou : calcul du salaire Pajemploi, planning et suivi des absences. Cette page explique quelles données sont collectées pour rendre ce service, et comment les faire valoir vos droits.
        </p>
      </section>

      <section>
        <h2>Responsable du traitement</h2>
        <p>
          Arthur Boueilh — <a href="mailto:pajemploi.facile@gmail.com">pajemploi.facile@gmail.com</a>.
        </p>
      </section>

      <section>
        <h2>Données collectées</h2>
        <ul>
          <li>Compte utilisateur (via Clerk) : email, prénom, nom</li>
          <li>Garde partagée : prénoms des enfants, prénom/nom/email de la nounou, nom affiché et email de contact des familles</li>
          <li>Planning et paie : horaires travaillés, absences, congés, maladie, taux horaire, indemnités, aides CAF/fiscales déclarées (CMG, crédit d&apos;impôt) et tranche de revenus fiscaux utilisée pour les estimer</li>
        </ul>
      </section>

      <section>
        <h2>Finalité et base légale</h2>
        <p>
          Ces données sont utilisées pour fournir le service que vous avez demandé : calculer le salaire, coordonner le planning entre les familles et la nounou, et estimer les aides CAF/fiscales. Le traitement est fondé sur l&apos;exécution du service auquel vous accédez en créant un compte ou en rejoignant une garde.
        </p>
      </section>

      <section>
        <h2>Qui a accès à ces données</h2>
        <ul>
          <li>Clerk, Inc. (authentification) — États-Unis, sous clauses contractuelles types</li>
          <li>Neon, Inc. (hébergement de la base de données) — Union européenne (Francfort)</li>
          <li>Vercel Inc. (hébergement de l&apos;application) — États-Unis, sous clauses contractuelles types</li>
          <li>Typeform (formulaire de retour, uniquement si vous cliquez sur « Signaler un bug / une idée »)</li>
        </ul>
        <p>
          Au sein d&apos;une même garde, les deux familles et la nounou voient les données nécessaires à la coordination (planning, paie, prénoms des enfants) — c&apos;est le principe même du service.
        </p>
      </section>

      <section>
        <h2>Durée de conservation</h2>
        <p>
          Vos données sont conservées tant que votre compte et vos gardes sont actifs. Vous pouvez supprimer une garde à tout moment depuis ses paramètres, ou demander la suppression complète de votre compte par email.
        </p>
      </section>

      <section>
        <h2>Vos droits</h2>
        <p>
          Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de portabilité, d&apos;opposition et de limitation sur vos données.
        </p>
        <ul>
          <li>Exporter vos données : bouton « Exporter mes données » sur votre tableau de bord</li>
          <li>Supprimer une garde : bouton « Supprimer la garde » dans ses paramètres</li>
          <li>Toute autre demande : <a href="mailto:pajemploi.facile@gmail.com">pajemploi.facile@gmail.com</a></li>
          <li>Réclamation : vous pouvez saisir la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">CNIL</a></li>
        </ul>
      </section>

      <section>
        <h2>Cookies et traceurs</h2>
        <p>
          nounoulink n&apos;utilise ni cookie publicitaire ni traceur tiers de suivi. Seuls sont utilisés le cookie de session strictement nécessaire à l&apos;authentification (Clerk) et Vercel Analytics, une mesure d&apos;audience sans cookie ni identifiant personnel.
        </p>
      </section>
    </LegalLayout>
  );
}
