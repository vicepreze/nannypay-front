import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SettingsClient } from './SettingsClient';

type Props = { params: { id: string } };

export default async function SettingsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const garde = await prisma.garde.findFirst({
    where: { id: params.id, familles: { some: { utilisateurId: session.user.id } } },
    include: { familles: true, nounou: true, modele: true },
  });
  if (!garde) redirect('/dashboard');

  const now    = new Date();
  const moisUrl = `/gardes/${params.id}/mois/${now.getFullYear()}/${now.getMonth() + 1}`;

  const famA = garde.familles.find(f => f.label === 'A');
  const famB = garde.familles.find(f => f.label === 'B');

  return (
    <SettingsClient
      gardeId={params.id}
      gardeNom={garde.nom ?? ''}
      moisUrl={moisUrl}
      famA={{ id: famA?.id ?? '', nomAffiche: famA?.nomAffiche ?? '', emailContact: famA?.emailContact ?? '' }}
      famB={{ id: famB?.id ?? '', nomAffiche: famB?.nomAffiche ?? '', emailContact: famB?.emailContact ?? '' }}
      nounou={garde.nounou ? { prenom: garde.nounou.prenom, nom: garde.nounou.nom ?? '', email: garde.nounou.email ?? '' } : null}
      modele={garde.modele ? {
        tauxHoraireNet:  garde.modele.tauxHoraireNet,
        hNormalesSemaine: garde.modele.hNormalesSemaine,
        hSup25Semaine:   garde.modele.hSup25Semaine,
        hSup50Semaine:   garde.modele.hSup50Semaine,
        navigoMontant:   garde.modele.navigoMontant,
        indemKm:         garde.modele.indemKm,
        indemEntretien:  garde.modele.indemEntretien,
      } : null}
    />
  );
}
