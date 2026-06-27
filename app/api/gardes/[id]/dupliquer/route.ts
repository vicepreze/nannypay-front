import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';

type Params = { params: { id: string } };

// POST → duplique la garde avec de nouveaux paramètres de paie/planning,
// et archive l'ancienne (utilisé quand une mise à jour de Modele aurait
// des conséquences rétroactives sur des mois déjà validés).
export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const oldGarde = await prisma.garde.findFirst({
    where: { id: params.id, proprietaireId: userId },
    include: { nounou: true, familles: true, enfants: true, modele: true },
  });
  if (!oldGarde) return NextResponse.json({ error: 'Introuvable ou non autorisé' }, { status: 404 });
  if (oldGarde.statut === 'archivé') {
    return NextResponse.json({ error: 'Cette garde est déjà archivée' }, { status: 409 });
  }

  const body = await req.json();
  const modele = body.modele;
  if (!modele || !modele.tauxHoraireNet || modele.tauxHoraireNet <= 0) {
    return NextResponse.json({ error: 'Taux horaire invalide' }, { status: 400 });
  }

  const famA = oldGarde.familles.find(f => f.label === 'A');
  const famB = oldGarde.familles.find(f => f.label === 'B');

  const aidesAFields = body.aidesA ?? {
    cmgCotisations: famA?.cmgCotisations ?? 0, cmgRemuneration: famA?.cmgRemuneration ?? 0,
    abattementCharges: famA?.abattementCharges ?? 0, aideVille: famA?.aideVille ?? 0, creditImpot: famA?.creditImpot ?? 0,
  };
  const aidesBFields = body.aidesB ?? {
    cmgCotisations: famB?.cmgCotisations ?? 0, cmgRemuneration: famB?.cmgRemuneration ?? 0,
    abattementCharges: famB?.abattementCharges ?? 0, aideVille: famB?.aideVille ?? 0, creditImpot: famB?.creditImpot ?? 0,
  };

  // Famille B pas encore active → on lui génère une nouvelle invitation pour la nouvelle garde
  const famBPending = !famB?.utilisateurId;
  const newInvitationToken  = famBPending ? crypto.randomBytes(24).toString('hex') : null;
  const newInvitationExpiry = famBPending ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

  try {
    const newGarde = await prisma.$transaction(async (tx) => {
      const created = await tx.garde.create({
        data: {
          nom: oldGarde.nom,
          statut: 'actif',
          proprietaireId: oldGarde.proprietaireId,
          invitationTokenB: newInvitationToken,
          invitationTokenBExpiresAt: newInvitationExpiry,
          congesJson: oldGarde.congesJson,

          nounou: oldGarde.nounou ? {
            create: {
              prenom: oldGarde.nounou.prenom,
              nom:    oldGarde.nounou.nom,
              email:  oldGarde.nounou.email,
            },
          } : undefined,

          familles: {
            create: [
              {
                label: 'A',
                nomAffiche:   famA?.nomAffiche ?? 'Famille A',
                emailContact: famA?.emailContact ?? null,
                statutAcces:  famA?.statutAcces ?? 'proprietaire',
                utilisateurId: famA?.utilisateurId ?? null,
                ...aidesAFields,
              },
              {
                label: 'B',
                nomAffiche:   famB?.nomAffiche ?? null,
                emailContact: famB?.emailContact ?? null,
                statutAcces:  famB?.statutAcces ?? 'invite_en_attente',
                utilisateurId: famB?.utilisateurId ?? null,
                ...aidesBFields,
              },
            ],
          },

          enfants: {
            create: oldGarde.enfants.map(e => ({ prenom: e.prenom, fam: e.fam })),
          },

          modele: {
            create: {
              tauxHoraireNet:    modele.tauxHoraireNet,
              hNormalesSemaine:  modele.hNormalesSemaine ?? 40,
              hSup25Semaine:     modele.hSup25Semaine    ?? 0,
              hSup50Semaine:     modele.hSup50Semaine    ?? 0,
              repartitionA:      modele.repartitionA      ?? 0.5,
              racOptionActive:   modele.racOptionActive   ?? false,
              navigoMontant:     modele.navigoMontant     ?? 90.80,
              indemKm:           modele.indemKm            ?? 0,
              indemEntretien:    modele.indemEntretien     ?? 6.0,
              repartitionIndemA: modele.repartitionIndemA  ?? 0.5,
              joursJson:         modele.joursJson          ?? '{}',
            },
          },
        },
      });

      await tx.garde.update({
        where: { id: oldGarde.id },
        data:  { statut: 'archivé', archiveeVersGardeId: created.id },
      });

      return created;
    });

    return NextResponse.json({ garde: { id: newGarde.id } }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/gardes/[id]/dupliquer]', err);
    const msg = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
