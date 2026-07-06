import { auth } from '@clerk/nextjs/server';

import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';

type Props = { params: { id: string } };

export default async function GardePage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const garde = await prisma.garde.findFirst({
    where: {
      id: params.id,
      OR: [{ familles: { some: { utilisateurId: userId } } }, { nounou: { utilisateurId: userId } }],
    },
    select: { id: true },
  });
  if (!garde) redirect('/dashboard');

  const now   = new Date();
  const annee = now.getFullYear();
  const mois  = now.getMonth() + 1;
  redirect(`/gardes/${params.id}/mois/${annee}/${mois}`);
}
