import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

type Params = { params: { id: string } };

// POST → génère ou regénère le token d'invitation Famille B
export async function POST(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const garde = await prisma.garde.findFirst({
    where: { id: params.id, proprietaireId: userId },
    include: { familles: true },
  });
  if (!garde) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const famB = garde.familles.find(f => f.label === 'B');
  if (famB?.statutAcces === 'invite_actif') {
    return NextResponse.json({ error: 'Famille B a déjà un compte actif' }, { status: 409 });
  }

  const token   = crypto.randomBytes(24).toString('hex');
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours

  await prisma.garde.update({
    where: { id: params.id },
    data:  { invitationTokenB: token, invitationTokenBExpiresAt: expires },
  });

  return NextResponse.json({ token, expires });
}

// DELETE → révoque le token
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const garde = await prisma.garde.findFirst({
    where: { id: params.id, proprietaireId: userId },
  });
  if (!garde) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  await prisma.garde.update({
    where: { id: params.id },
    data:  { invitationTokenB: null, invitationTokenBExpiresAt: null },
  });

  return NextResponse.json({ ok: true });
}
