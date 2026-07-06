import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

type Params = { params: { id: string } };

// POST → génère (ou régénère) le lien de partage générique de la garde.
// Le même lien peut être utilisé par Famille B et/ou la nounou : chacun
// se déclare sur /rejoindre, indépendamment l'un de l'autre.
export async function POST(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const garde = await prisma.garde.findFirst({
    where: { id: params.id, proprietaireId: userId },
  });
  if (!garde) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const token   = crypto.randomBytes(24).toString('hex');
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours

  await prisma.garde.update({
    where: { id: params.id },
    data:  { invitationToken: token, invitationTokenExpiresAt: expires },
  });

  return NextResponse.json({ token, expires });
}

// DELETE → révoque le lien
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const garde = await prisma.garde.findFirst({
    where: { id: params.id, proprietaireId: userId },
  });
  if (!garde) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  await prisma.garde.update({
    where: { id: params.id },
    data:  { invitationToken: null, invitationTokenExpiresAt: null },
  });

  return NextResponse.json({ ok: true });
}
