import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: { token: string; annee: string; mois: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const anneeNum = parseInt(params.annee);
  const moisNum  = parseInt(params.mois);

  const garde = await prisma.garde.findFirst({
    where: { publicTokenNounou: params.token },
    include: {
      nounou:   { select: { prenom: true } },
      familles: { select: { label: true, nomAffiche: true } },
      enfants:  { select: { prenom: true, fam: true } },
      modele:   true,
    },
  });

  if (!garde) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 });

  const moisRec = await prisma.mois.findUnique({
    where: { gardeId_annee_mois: { gardeId: garde.id, annee: anneeNum, mois: moisNum } },
    select: { annee: true, mois: true, statut: true, evenementsJson: true },
  });

  return NextResponse.json({
    garde: {
      nom:      garde.nom,
      nounou:   garde.nounou,
      familles: garde.familles,
      enfants:  garde.enfants,
      modele:   garde.modele ? {
        tauxHoraireNet:   garde.modele.tauxHoraireNet,
        hNormalesSemaine: garde.modele.hNormalesSemaine,
        hSup25Semaine:    garde.modele.hSup25Semaine,
        hSup50Semaine:    garde.modele.hSup50Semaine,
        repartitionA:     garde.modele.repartitionA,
        navigoMontant:    garde.modele.navigoMontant,
        indemEntretien:   garde.modele.indemEntretien,
        indemKm:          garde.modele.indemKm,
        joursJson:        garde.modele.joursJson,
      } : null,
    },
    moisRec,
  });
}
