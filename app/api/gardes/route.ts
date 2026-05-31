import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { calcBModeRepartition } from '@/lib/calcul';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Garantir que l'utilisateur existe en DB (le webhook peut ne pas avoir encore tiré)
  try {
    await prisma.user.upsert({
      where:  { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@clerk.placeholder` },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/gardes] upsert user failed:', msg);
    return NextResponse.json({ error: `Erreur profil: ${msg}` }, { status: 500 });
  }

  const { acteurs, planning, paie } = await req.json();

  if (!paie?.taux || paie.taux <= 0) {
    return NextResponse.json({ error: 'Taux horaire invalide' }, { status: 400 });
  }

  const nounouPrenom = acteurs?.nounouPrenom || 'Notre nounou';
  const famANom      = acteurs?.famANom      || 'Famille A';
  const famBNom      = acteurs?.famBNom      || null;

  // Calcul de repartitionA selon le mode
  const planningData = planning?.planning ?? planning;
  const joursJson    = JSON.stringify(planningData);
  const enfants: { prenom: string; fam: string }[] = acteurs?.enfants ?? [];

  let repartitionA: number;
  if (typeof paie.repartitionA === 'number') {
    // Nouvelle UX : valeur directe du slider (0..1)
    repartitionA = Math.min(1, Math.max(0, paie.repartitionA));
  } else if (paie.mode?.startsWith('C')) {
    repartitionA = Math.min(1, Math.max(0, (paie.pourcentA ?? 50) / 100));
  } else if (paie.mode?.startsWith('B')) {
    repartitionA = calcBModeRepartition(joursJson, enfants);
  } else {
    const nbA    = enfants.filter(e => e.fam === 'A').length;
    const nbTot  = enfants.length || 2;
    repartitionA = nbA / nbTot;
  }

  const racOptionActive = typeof paie.racOptionActive === 'boolean'
    ? paie.racOptionActive
    : (typeof paie.mode === 'string' && paie.mode.endsWith('.2'));

  const hNormales      = planning?.hNormalesSemaine ?? 40;
  const hSup25         = planning?.hSup25Semaine    ?? 0;
  const hSup50         = planning?.hSup50Semaine    ?? 0;

  try {
    const garde = await prisma.garde.create({
      data: {
        nom: `Garde ${famANom}${famBNom ? ' & ' + famBNom : ''}`,
        statut: 'actif',
        proprietaireId: userId,

        nounou: {
          create: {
            prenom: nounouPrenom,
            email:  acteurs?.nounouEmail || null,
          },
        },

        familles: {
          create: [
            {
              label:        'A',
              nomAffiche:   famANom,
              emailContact: acteurs?.famAEmail || null,
              statutAcces:  'proprietaire',
              utilisateurId: userId,
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
              nomAffiche:   famBNom,
              emailContact: acteurs?.famBEmail || null,
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
          create: (acteurs.enfants ?? []).map((e: { prenom: string; fam: string }) => ({
            prenom: e.prenom,
            fam:    e.fam,
          })),
        },

        modele: {
          create: {
            tauxHoraireNet:   paie.taux,
            hNormalesSemaine: hNormales,
            hSup25Semaine:    hSup25,
            hSup50Semaine:    hSup50,
            modeCalcul:       paie.mode ?? 'A.1',
            repartitionA,
            racOptionActive,
            navigoMontant:     paie.navigo,
            indemKm:           paie.indemKm,
            indemEntretien:    paie.indemEntretien,
            repartitionIndemA: typeof paie.repartitionIndemA === 'number' ? Math.min(1, Math.max(0, paie.repartitionIndemA)) : 0.5,
            joursJson: JSON.stringify(planningData),
          },
        },
      },
    });

    return NextResponse.json({ garde: { id: garde.id, nom: garde.nom } }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/gardes]', err);
    const msg = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const gardes = await prisma.garde.findMany({
    where: { proprietaireId: userId },
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
