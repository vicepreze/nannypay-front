import type { Metadata } from 'next';
import { LegalLayout } from '@/components/LegalLayout';

export const metadata: Metadata = {
  title: 'Conditions générales d\'utilisation — nounoulink',
  description: 'Conditions générales d\'utilisation du service nounoulink.',
};

export default function CguPage() {
  return (
    <LegalLayout title="Conditions générales d'utilisation" updatedAt="19 juillet 2026">
      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes conditions générales d&apos;utilisation (CGU) définissent les modalités de mise à disposition du service nounoulink (pajemploi-facile.org) : calcul du salaire Pajemploi d&apos;une garde partagée, planning partagé entre deux familles et une assistante parentale, suivi des absences, et estimation des aides CAF/fiscales.
        </p>
      </section>

      <section>
        <h2>2. Acceptation</h2>
        <p>
          En créant un compte ou en rejoignant une garde via un lien d&apos;invitation, vous acceptez les présentes CGU ainsi que la <a href="/politique-confidentialite">politique de confidentialité</a>.
        </p>
      </section>

      <section>
        <h2>3. Description du service et limitation de responsabilité</h2>
        <ul>
          <li>Les calculs (salaire, heures supplémentaires, indemnités, reste à charge, aides CAF) sont fournis à titre indicatif, sur la base des informations que vous saisissez et des règles de la convention collective nationale des salariés du particulier employeur (CCN IDCC 3239) et du dispositif Pajemploi en vigueur à la date du calcul.</li>
          <li>nounoulink ne se substitue pas à un conseil juridique, comptable ou social professionnel. En cas de doute, rapprochez-vous du Cesu/Pajemploi, de l&apos;Urssaf ou d&apos;un professionnel qualifié.</li>
          <li>L&apos;exactitude des calculs dépend de l&apos;exactitude des informations saisies (heures, taux horaire, absences, etc.). Il appartient à chaque famille de vérifier les montants avant toute déclaration.</li>
          <li>nounoulink ne peut être tenu responsable des conséquences d&apos;une déclaration erronée résultant d&apos;une saisie incorrecte ou d&apos;une évolution de la réglementation non encore répercutée dans l&apos;outil.</li>
        </ul>
      </section>

      <section>
        <h2>4. Compte utilisateur</h2>
        <ul>
          <li>Un compte est nécessaire pour créer ou gérer une garde. L&apos;authentification est gérée par Clerk.</li>
          <li>Vous êtes responsable de la confidentialité de vos identifiants.</li>
          <li>Vous pouvez supprimer une garde à tout moment depuis ses paramètres, ou demander la suppression complète de votre compte par email.</li>
        </ul>
      </section>

      <section>
        <h2>5. Partage de données entre les parties d&apos;une même garde</h2>
        <p>
          Une garde partagée réunit jusqu&apos;à trois utilisateurs (Famille A, Famille B, assistante parentale). En rejoignant une garde, chaque partie accepte que les autres parties voient les données nécessaires à la coordination (planning, paie, prénoms des enfants). Voir la <a href="/politique-confidentialite">politique de confidentialité</a> pour le détail.
        </p>
      </section>

      <section>
        <h2>6. Disponibilité du service</h2>
        <p>
          nounoulink est un service en développement, fourni « en l&apos;état », sans garantie de disponibilité continue. Des interruptions ponctuelles peuvent survenir pour maintenance.
        </p>
      </section>

      <section>
        <h2>7. Propriété intellectuelle</h2>
        <p>
          Voir les <a href="/mentions-legales">mentions légales</a>.
        </p>
      </section>

      <section>
        <h2>8. Résiliation</h2>
        <p>
          Vous pouvez cesser d&apos;utiliser le service à tout moment et supprimer vos données (voir <a href="/politique-confidentialite">politique de confidentialité</a>).
        </p>
      </section>

      <section>
        <h2>9. Droit applicable</h2>
        <p>
          Les présentes CGU sont soumises au droit français. Tout litige relève des tribunaux français compétents.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          Pour toute question : <a href="mailto:pajemploi.facile@gmail.com">pajemploi.facile@gmail.com</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
