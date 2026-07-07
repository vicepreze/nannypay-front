import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const garde = await prisma.garde.findFirst({
    where: {
      id: params.id,
      familles: { some: { utilisateurId: userId } },
    },
    include: { nounou: true, familles: true, enfants: true, modele: true },
  });

  if (!garde) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json({ garde });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const garde = await prisma.garde.findFirst({
    where: { id: params.id, proprietaireId: userId },
  });
  if (!garde) return NextResponse.json({ error: 'Introuvable ou non autorisé' }, { status: 404 });
  if (garde.statut === 'archivé') {
    return NextResponse.json({ error: 'Cette garde est archivée et ne peut plus être modifiée.' }, { status: 409 });
  }

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

  // Mise à jour prénoms des enfants — le prénom sert aussi de clé dans
  // Modele.joursJson (planning par enfant), donc on la renomme en même temps
  // pour ne pas orpheliner le planning déjà saisi.
  if (Array.isArray(body.enfants) && body.enfants.length > 0) {
    const existingEnfants = await prisma.enfant.findMany({ where: { gardeId: params.id } });
    const modeleRow = await prisma.modele.findUnique({ where: { gardeId: params.id } });
    let joursObj: Record<string, unknown> = {};
    try { joursObj = modeleRow ? JSON.parse(modeleRow.joursJson || '{}') : {}; } catch { joursObj = {}; }

    const ops = [];
    for (const item of body.enfants as { id?: unknown; prenom?: unknown }[]) {
      if (typeof item?.id !== 'string' || typeof item?.prenom !== 'string') continue;
      const prenom = item.prenom.trim();
      if (!prenom) continue;
      const existing = existingEnfants.find(e => e.id === item.id);
      if (!existing || existing.prenom === prenom) continue;

      ops.push(prisma.enfant.update({ where: { id: existing.id }, data: { prenom } }));
      if (Object.prototype.hasOwnProperty.call(joursObj, existing.prenom)) {
        joursObj[prenom] = joursObj[existing.prenom];
        delete joursObj[existing.prenom];
      }
    }
    if (ops.length > 0) {
      if (modeleRow) {
        ops.push(prisma.modele.update({ where: { gardeId: params.id }, data: { joursJson: JSON.stringify(joursObj) } }));
      }
      await prisma.$transaction(ops);
    }
  }

  const updated = await prisma.garde.findUnique({
    where: { id: params.id },
    include: { nounou: true, familles: true, enfants: true, modele: true },
  });
  return NextResponse.json({ garde: updated });
}
