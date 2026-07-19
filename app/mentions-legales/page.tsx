import type { Metadata } from 'next';
import { LegalLayout } from '@/components/LegalLayout';

export const metadata: Metadata = {
  title: 'Mentions légales — nounoulink',
  description: 'Mentions légales du site nounoulink (pajemploi-facile.org).',
};

export default function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales" updatedAt="19 juillet 2026">
      <section>
        <h2>Éditeur du site</h2>
        <p>
          Le site nounoulink (pajemploi-facile.org) est édité par une personne physique agissant à titre non professionnel. Conformément à l&apos;article 6-III-2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique, l&apos;éditeur a communiqué ses éléments d&apos;identification à l&apos;hébergeur du site et a fait usage de son droit de ne pas les publier.
        </p>
        <p>
          Contact : <a href="mailto:pajemploi.facile@gmail.com">pajemploi.facile@gmail.com</a>
        </p>
      </section>

      <section>
        <h2>Directeur de la publication</h2>
        <p>L&apos;éditeur du site, tel que défini ci-dessus.</p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p>
          L&apos;application est hébergée par :<br />
          Vercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis — <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
        </p>
        <p>
          La base de données est hébergée par Neon, Inc., dans l&apos;Union européenne (région Francfort, Allemagne).
        </p>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des contenus du site (textes, calculs, design, logo) est protégé au titre du droit d&apos;auteur. Toute reproduction ou représentation, totale ou partielle, sans autorisation préalable est interdite.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Pour toute question relative au site : <a href="mailto:pajemploi.facile@gmail.com">pajemploi.facile@gmail.com</a>. Pour l&apos;utilisation de vos données personnelles, voir la <a href="/politique-confidentialite">politique de confidentialité</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
