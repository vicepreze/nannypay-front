import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GardeDetail } from '@/components/GardeDetail';

type Props = { params: { id: string } };

export default async function GardePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const garde = await prisma.garde.findFirst({
    where: {
      id: params.id,
      familles: { some: { utilisateurId: session.user.id } },
    },
    include: { nounou: true, familles: true, enfants: true, modele: true },
  });

  if (!garde) notFound();

  // Détermine le rôle de l'utilisateur
  const monRole = garde.familles.find(f => f.utilisateurId === session.user.id)?.label ?? 'A';

  const now   = new Date();
  const annee = now.getFullYear();
  const mois  = now.getMonth() + 1;

  return <GardeDetail garde={garde as Parameters<typeof GardeDetail>[0]['garde']} monRole={monRole} moisUrl={`/gardes/${params.id}/mois/${annee}/${mois}`} />;
}
