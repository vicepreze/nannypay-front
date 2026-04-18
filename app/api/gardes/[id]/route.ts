import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const garde = await prisma.garde.findFirst({
    where: {
      id: params.id,
      familles: { some: { utilisateurId: session.user.id } },
    },
    include: { nounou: true, familles: true, enfants: true, modele: true },
  });

  if (!garde) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json({ garde });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const garde = await prisma.garde.findFirst({
    where: { id: params.id, proprietaireId: session.user.id },
  });
  if (!garde) return NextResponse.json({ error: 'Introuvable ou non autorisé' }, { status: 404 });

  const body = await req.json();

  // Mise à jour garde
  if (body.nom !== undefined || body.statut !== undefined) {
    await prisma.garde.update({
      where: { id: params.id },
      data: {
        ...(body.nom    !== undefined ? { nom:    body.nom    } : {}),
        ...(body.statut !== undefined ? { statut: body.statut } : {}),
      },
    });
  }

  // Mise à jour nounou
  if (body.nounou) {
    await prisma.nounou.upsert({
      where:  { gardeId: params.id },
      update: body.nounou,
      create: { ...body.nounou, gardeId: params.id },
    });
  }

  // Mise à jour familles (nom / email / aides CAF)
  const famFields = (src: Record<string, unknown>) => {
    const d: Record<string, unknown> = {};
    for (const k of ['nomAffiche', 'emailContact', 'cmgCotisations', 'cmgRemuneration', 'abattementCharges', 'aideVille', 'creditImpot']) {
      if (src[k] !== undefined) d[k] = src[k];
    }
    return d;
  };
  if (body.familleA) {
    await prisma.famille.updateMany({
      where: { gardeId: params.id, label: 'A' },
      data:  famFields(body.familleA),
    });
  }
  if (body.familleB) {
    await prisma.famille.updateMany({
      where: { gardeId: params.id, label: 'B' },
      data:  famFields(body.familleB),
    });
  }

  // Mise à jour modèle
  if (body.modele) {
    await prisma.modele.update({ where: { gardeId: params.id }, data: body.modele });
  }

  const updated = await prisma.garde.findUnique({
    where: { id: params.id },
    include: { nounou: true, familles: true, enfants: true, modele: true },
  });
  return NextResponse.json({ garde: updated });
}
