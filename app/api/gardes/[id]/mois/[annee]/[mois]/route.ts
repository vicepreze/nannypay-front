import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';

type Params = { params: { id: string; annee: string; mois: string } };

// GET → charge (ou crée) le mois
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const annee = parseInt(params.annee);
  const mois  = parseInt(params.mois);

  // Vérifie accès (Famille A/B ou nounou rattachée)
  const garde = await prisma.garde.findFirst({
    where: {
      id: params.id,
      OR: [{ familles: { some: { utilisateurId: userId } } }, { nounou: { utilisateurId: userId } }],
    },
    include: { familles: true, modele: true, enfants: true, nounou: { select: { prenom: true } } },
  });
  if (!garde) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  // Upsert le mois
  const rec = await prisma.mois.upsert({
    where:  { gardeId_annee_mois: { gardeId: params.id, annee, mois } },
    update: {},
    create: { gardeId: params.id, annee, mois, statut: 'ouvert', evenementsJson: '[]' },
  });

  return NextResponse.json({ mois: rec, garde });
}

// PUT → met à jour événements et/ou valide
export async function PUT(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const annee = parseInt(params.annee);
  const mois  = parseInt(params.mois);

  const garde = await prisma.garde.findFirst({
    where: {
      id: params.id,
      OR: [{ familles: { some: { utilisateurId: userId } } }, { nounou: { utilisateurId: userId } }],
    },
    include: { familles: true },
  });
  if (!garde) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const rec = await prisma.mois.findUnique({
    where: { gardeId_annee_mois: { gardeId: params.id, annee, mois } },
  });
  if (!rec) return NextResponse.json({ error: 'Mois non initialisé' }, { status: 404 });

  // Refus si déjà validé par les deux
  if (rec.statut === 'valide_ab') {
    return NextResponse.json({ error: 'Ce mois est déjà validé par les deux familles' }, { status: 409 });
  }

  const body = await req.json();
  const monLabel = garde.familles.find(f => f.utilisateurId === userId)?.label; // undefined = nounou

  const data: Record<string, unknown> = {};

  // Mise à jour des événements (seulement si pas encore validé par mon côté)
  if (body.evenements !== undefined) {
    data.evenementsJson = JSON.stringify(body.evenements);
  }

  // Validation — réservée aux familles, la nounou ne valide pas un mois
  if (body.valider) {
    if (!monLabel) {
      return NextResponse.json({ error: 'Seules les familles peuvent valider un mois' }, { status: 403 });
    }
    if (monLabel === 'A') {
      data.statut = rec.statut === 'valide_b' ? 'valide_ab' : 'valide_a';
    } else {
      data.statut = rec.statut === 'valide_a' ? 'valide_ab' : 'valide_b';
    }
  }

  const updated = await prisma.mois.update({
    where: { gardeId_annee_mois: { gardeId: params.id, annee, mois } },
    data,
  });

  return NextResponse.json({ mois: updated });
}
