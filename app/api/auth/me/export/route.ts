import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// Export complet des données personnelles de l'utilisateur (droit à la
// portabilité RGPD, art. 20) : son profil et toutes les gardes auxquelles
// il est rattaché, en tant que propriétaire, membre d'une famille ou nounou.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const utilisateur = await prisma.user.findUnique({ where: { id: userId } });
  if (!utilisateur) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const gardes = await prisma.garde.findMany({
    where: {
      OR: [
        { proprietaireId: userId },
        { familles: { some: { utilisateurId: userId } } },
        { nounou: { utilisateurId: userId } },
      ],
    },
    include: { nounou: true, familles: true, enfants: true, modele: true, mois: true },
  });

  return NextResponse.json(
    { exporteLe: new Date().toISOString(), utilisateur, gardes },
    { headers: { 'Content-Disposition': `attachment; filename="nounoulink-donnees-${userId}.json"` } },
  );
}
