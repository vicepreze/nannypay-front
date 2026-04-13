import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { acteurs, planning, paie } = await req.json();

  // Validation minimale
  if (!acteurs?.nounouPrenom || !acteurs?.famANom) {
    return NextResponse.json({ error: 'Données acteurs incomplètes' }, { status: 400 });
  }
  if (!paie?.taux || paie.taux <= 0) {
    return NextResponse.json({ error: 'Taux horaire invalide' }, { status: 400 });
  }

  // Calcul répartition selon le mode
  // A.1 / A.2 → moitié-moitié par défaut
  // B.1 / B.2 → proportionnel aux enfants (calculé à la volée dans le moteur)
  const nbEnfantsA = acteurs.enfants.filter((e: { fam: string }) => e.fam === 'A').length;
  const nbEnfantsB = acteurs.enfants.filter((e: { fam: string }) => e.fam === 'B').length;
  const nbTotal    = nbEnfantsA + nbEnfantsB || 2;
  const repartitionA = nbEnfantsA / nbTotal;

  // planning contient maintenant { planning, hNormalesSemaine, hSup25Semaine, hSup50Semaine }
  const planningData   = planning?.planning ?? planning;
  const hNormales      = planning?.hNormalesSemaine ?? 40;
  const hSup25         = planning?.hSup25Semaine    ?? 0;
  const hSup50         = planning?.hSup50Semaine    ?? 0;

  const garde = await prisma.garde.create({
    data: {
      nom: `Garde ${acteurs.famANom}${acteurs.famBNom ? ' & ' + acteurs.famBNom : ''}`,
      statut: 'actif',
      proprietaireId: session.user.id,

      nounou: {
        create: {
          prenom: acteurs.nounouPrenom,
          email:  acteurs.nounouEmail || null,
        },
      },

      familles: {
        create: [
          {
            label:        'A',
            nomAffiche:   acteurs.famANom,
            emailContact: acteurs.famAEmail || null,
            statutAcces:  'proprietaire',
            utilisateurId: session.user.id,
            ...(paie.aidesA ? {
              cmgCotisations:    paie.aidesA.cmgCotisations    ?? 0,
              cmgRemuneration:   paie.aidesA.cmgRemuneration   ?? 0,
              abattementCharges: paie.aidesA.abattementCharges ?? 0,
              aideVille:         paie.aidesA.aideVille         ?? 0,
              creditImpot:       paie.aidesA.creditImpot       ?? 0,
            } : {}),
          },
          {
            label:        'B',
            nomAffiche:   acteurs.famBNom   || null,
            emailContact: acteurs.famBEmail || null,
            statutAcces:  'invite_en_attente',
            ...(paie.aidesB ? {
              cmgCotisations:    paie.aidesB.cmgCotisations    ?? 0,
              cmgRemuneration:   paie.aidesB.cmgRemuneration   ?? 0,
              abattementCharges: paie.aidesB.abattementCharges ?? 0,
              aideVille:         paie.aidesB.aideVille         ?? 0,
              creditImpot:       paie.aidesB.creditImpot       ?? 0,
            } : {}),
          },
        ],
      },

      enfants: {
        create: acteurs.enfants.map((e: { prenom: string; fam: string }) => ({
          prenom: e.prenom,
          fam:    e.fam,
        })),
      },

      modele: {
        create: {
          tauxHoraireNet:          paie.taux,
          hNormalesSemaine: hNormales,
          hSup25Semaine:    hSup25,
          hSup50Semaine:    hSup50,
          modeCalcul:       paie.mode,
          repartitionA,
          navigoMontant:    paie.navigo,
          indemKm:          paie.indemKm,
          indemEntretien:   paie.indemEntretien,
          joursJson: JSON.stringify(planningData),
        },
      },
    },
  });

  return NextResponse.json({ garde: { id: garde.id, nom: garde.nom } }, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const gardes = await prisma.garde.findMany({
    where: { proprietaireId: session.user.id },
    include: {
      nounou:   true,
      familles: true,
      enfants:  true,
      modele:   true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ gardes });
}
