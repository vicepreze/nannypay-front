import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

type Params = { params: { id: string } };

// POST → génère (ou régénère) le token public nounou
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const garde = await prisma.garde.findFirst({
    where: { id: params.id, proprietaireId: session.user.id },
  });
  if (!garde) return NextResponse.json({ error: 'Introuvable ou non autorisé' }, { status: 404 });

  const token = crypto.randomBytes(24).toString('hex');
  await prisma.garde.update({
    where: { id: params.id },
    data:  { publicTokenNounou: token },
  });

  return NextResponse.json({ token });
}

// DELETE → révoque le token
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const garde = await prisma.garde.findFirst({
    where: { id: params.id, proprietaireId: session.user.id },
  });
  if (!garde) return NextResponse.json({ error: 'Introuvable ou non autorisé' }, { status: 404 });

  await prisma.garde.update({
    where: { id: params.id },
    data:  { publicTokenNounou: null },
  });

  return NextResponse.json({ ok: true });
}
