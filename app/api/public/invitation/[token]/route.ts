import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: { token: string } };

// GET → valide le token, retourne les infos publiques + les rôles encore libres
export async function GET(_req: NextRequest, { params }: Params) {
  const garde = await prisma.garde.findFirst({
    where: {
      invitationToken: params.token,
      invitationTokenExpiresAt: { gt: new Date() },
    },
    select: {
      id: true, nom: true,
      familles: { select: { label: true, statutAcces: true } },
      nounou:   { select: { utilisateurId: true } },
    },
  });

  if (!garde) {
    return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
  }

  const famB = garde.familles.find(f => f.label === 'B');

  return NextResponse.json({
    garde: { id: garde.id, nom: garde.nom },
    famBDisponible: famB?.statutAcces !== 'invite_actif',
    nounouDisponible: !!garde.nounou && !garde.nounou.utilisateurId,
  });
}

// POST → Famille B ou la nounou rejoint la garde (authentifié), selon le rôle déclaré
export async function POST(req: NextRequest, { params }: Params) {
  // TEMP DEBUG (à retirer une fois le bug de jointure confirmé résolu)
  console.log('[POST /api/public/invitation] appel reçu, token=', params.token.slice(0, 8) + '…');

  try {
    const body = await req.json();
    const { userId, role, nomAffiche, emailContact } = body;
    console.log('[POST /api/public/invitation] body:', { userId, role });

    if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 });
    if (role !== 'B' && role !== 'nounou') {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    }

    // Garantir que l'utilisateur existe en DB (le webhook Clerk peut ne pas avoir encore tiré)
    await prisma.user.upsert({
      where:  { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@clerk.placeholder` },
    });

    const garde = await prisma.garde.findFirst({
      where: {
        invitationToken: params.token,
        invitationTokenExpiresAt: { gt: new Date() },
      },
      include: { familles: true, nounou: true },
    });

    if (!garde) {
      console.log('[POST /api/public/invitation] token invalide ou expiré');
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    if (role === 'B') {
      const famB = garde.familles.find(f => f.label === 'B');
      if (!famB) return NextResponse.json({ error: 'Famille B introuvable' }, { status: 500 });
      if (famB.statutAcces === 'invite_actif') {
        return NextResponse.json({ error: 'Famille B a déjà un compte' }, { status: 409 });
      }

      await prisma.famille.update({
        where: { id: famB.id },
        data: {
          utilisateurId: userId,
          nomAffiche:    nomAffiche   || famB.nomAffiche,
          emailContact:  emailContact || famB.emailContact,
          statutAcces:   'invite_actif',
        },
      });
    } else {
      if (!garde.nounou) return NextResponse.json({ error: 'Aucune nounou configurée sur cette garde' }, { status: 404 });
      if (garde.nounou.utilisateurId) {
        return NextResponse.json({ error: 'La nounou a déjà un compte' }, { status: 409 });
      }

      await prisma.nounou.update({
        where: { id: garde.nounou.id },
        data:  { utilisateurId: userId },
      });
    }

    // Le lien reste actif : il peut encore servir à l'autre rôle (Famille B / nounou).
    console.log('[POST /api/public/invitation] rattachement réussi, role=', role);
    return NextResponse.json({ gardeId: garde.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/public/invitation] erreur inattendue:', msg);
    return NextResponse.json({ error: `Erreur serveur: ${msg}` }, { status: 500 });
  }
}
