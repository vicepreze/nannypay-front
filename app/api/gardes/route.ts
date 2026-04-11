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

  // Calcul heures semaine depuis le planning
  const joursActifs: Array<{ num: number; hDebut: string; hFin: string }> = Object.entries(planning || {})
    .filter(([, v]: [string, unknown]) => (v as { actif: boolean }).actif)
    .map(([num, v]) => ({
      num: parseInt(num),
      hDebut: (v as { hDebut: string }).hDebut,
      hFin: (v as { hFin: string }).hFin,
    }));

  const heuresSemaine = joursActifs.reduce((acc, j) => {
    const [h1, m1] = j.hDebut.split(':').map(Number);
    const [h2, m2] = j.hFin.split(':').map(Number);
    return acc + (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
  }, 0);
  const hNormales = Math.min(heuresSemaine, 40);
  const hSup      = Math.max(0, heuresSemaine - 40);

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
          },
          {
            label:        'B',
            nomAffiche:   acteurs.famBNom   || null,
            emailContact: acteurs.famBEmail || null,
            statutAcces:  'invite_en_attente',
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
          hNormalesSemaine:        hNormales,
          hSupplementairesSemaine: hSup,
          modeCalcul:              paie.mode,
          repartitionA,
          navigoMontant:  paie.navigo,
          indemKm:        paie.indemKm,
          indemEntretien: paie.indemEntretien,
          joursJson: JSON.stringify(planning),
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
