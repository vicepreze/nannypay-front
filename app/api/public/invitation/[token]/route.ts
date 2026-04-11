import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: { token: string } };

// GET → valide le token et retourne les infos publiques de la garde
export async function GET(_req: NextRequest, { params }: Params) {
  const garde = await prisma.garde.findFirst({
    where: {
      invitationTokenB: params.token,
      invitationTokenBExpiresAt: { gt: new Date() },
    },
    select: { id: true, nom: true },
  });

  if (!garde) {
    return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
  }

  return NextResponse.json({ garde });
}

// POST → Famille B rejoint la garde (authentifiée)
export async function POST(req: NextRequest, { params }: Params) {
  const body = await req.json();
  const { userId, nomAffiche, emailContact } = body;

  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 });

  const garde = await prisma.garde.findFirst({
    where: {
      invitationTokenB: params.token,
      invitationTokenBExpiresAt: { gt: new Date() },
    },
    include: { familles: true },
  });

  if (!garde) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });

  const famB = garde.familles.find(f => f.label === 'B');
  if (!famB) return NextResponse.json({ error: 'Famille B introuvable' }, { status: 500 });

  if (famB.statutAcces === 'invite_actif') {
    return NextResponse.json({ error: 'Famille B a déjà un compte' }, { status: 409 });
  }

  await prisma.famille.update({
    where: { id: famB.id },
    data: {
      utilisateurId: userId,
      nomAffiche:    nomAffiche   || famB.nomAffiche,
      emailContact:  emailContact || famB.emailContact,
      statutAcces:   'invite_actif',
    },
  });

  // Invalider le token
  await prisma.garde.update({
    where: { id: garde.id },
    data:  { invitationTokenB: null, invitationTokenBExpiresAt: null },
  });

  return NextResponse.json({ gardeId: garde.id });
}
