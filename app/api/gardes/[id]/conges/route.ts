import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { calculSoldeCP, calculSoldeRepos, type CompteCP, type CompteRepos, type CongesJson } from '@/lib/calcul';

export type { CompteCP, CompteRepos, CongesJson };

function dateISO(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function finMoisISO(annee: number, mois: number): string {
  return dateISO(new Date(annee, mois, 0));
}

/** Lit congesJson en gérant l'ancien format plat (CompteCP au top-level, sans compte repos). */
function parseCongesJson(raw: string | null): { cp: CompteCP | null; repos: CompteRepos | null } {
  if (!raw) return { cp: null, repos: null };
  const parsed = JSON.parse(raw);
  if (parsed && typeof parsed === 'object' && 'cp' in parsed) {
    return { cp: parsed.cp ?? null, repos: parsed.repos ?? null };
  }
  // Ancien format : CompteCP directement à la racine (regle/nbSemaines/...).
  return { cp: parsed as CompteCP, repos: null };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const garde = await prisma.garde.findFirst({
    where: { id: params.id, familles: { some: { utilisateurId: userId } } },
    select: {
      congesJson: true,
      mois: { select: { annee: true, mois: true, evenementsJson: true } },
    },
  });
  if (!garde) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const { cp, repos } = parseCongesJson(garde.congesJson);
  if (!cp && !repos) return NextResponse.json({ config: null, cp: null, repos: null });

  const now = new Date();
  const todayISO = dateISO(now);
  const url = new URL(req.url);
  const targetAnnee = parseInt(url.searchParams.get('targetAnnee') ?? '0') || now.getFullYear();
  const targetMois  = parseInt(url.searchParams.get('targetMois')  ?? '0') || now.getMonth() + 1;
  const targetFinISO = finMoisISO(targetAnnee, targetMois);

  return NextResponse.json({
    config: { cp, repos },
    today: { annee: now.getFullYear(), mois: now.getMonth() + 1 },
    cp:    cp    ? calculSoldeCP(cp, garde.mois, todayISO, targetFinISO)    : null,
    repos: repos ? calculSoldeRepos(repos, garde.mois, todayISO, targetFinISO) : null,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const garde = await prisma.garde.findFirst({
    where: { id: params.id, familles: { some: { utilisateurId: userId } } },
  });
  if (!garde) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const { config } = await req.json();
  await prisma.garde.update({
    where: { id: params.id },
    data: { congesJson: config ? JSON.stringify(config) : null },
  });

  return NextResponse.json({ ok: true });
}
