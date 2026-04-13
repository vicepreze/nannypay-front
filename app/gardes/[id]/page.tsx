import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Props = { params: { id: string } };

export default async function GardePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const famille = await prisma.famille.findFirst({
    where: { gardeId: params.id, utilisateurId: session.user.id },
  });
  if (!famille) redirect('/dashboard');

  const now   = new Date();
  const annee = now.getFullYear();
  const mois  = now.getMonth() + 1;
  redirect(`/gardes/${params.id}/mois/${annee}/${mois}`);
}
