import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: { token: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const garde = await prisma.garde.findFirst({
    where: { publicTokenNounou: params.token },
    include: {
      nounou:   true,
      familles: { select: { label: true, nomAffiche: true } },
      enfants:  true,
      modele:   true,
      mois:     { orderBy: [{ annee: 'desc' }, { mois: 'desc' }], take: 6 },
    },
  });

  if (!garde) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 });

  return NextResponse.json({ garde });
}
