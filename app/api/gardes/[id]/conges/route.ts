import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export type CongesConfig = {
  regle: 'semaines' | 'jours_par_mois';
  nbSemaines: number;    // used when regle=semaines, default 5
  cycleDebut: string;    // "YYYY-MM-DD" first day of CP year, used when regle=semaines
  joursParMois: number;  // used when regle=jours_par_mois, default 2.5
  debutSuivi: string;    // "YYYY-MM-DD" start of tracking, used when regle=jours_par_mois
  decompteDepart: {
    annee: number;
    mois: number;
    jousConso: number;   // total days consumed through end of this reference month
  };
};

function cpDaysInMonth(
  evts: { type: string; debut: string; fin: string }[],
  annee: number,
  mois: number,
): number {
  return evts
    .filter(e => e.type === 'conge_paye')
    .reduce((acc, e) => {
      const [y1, m1, d1] = e.debut.split('-').map(Number);
      const [y2, m2, d2] = e.fin.split('-').map(Number);
      const dD = new Date(y1, m1 - 1, d1), dF = new Date(y2, m2 - 1, d2);
      const dMD = new Date(annee, mois - 1, 1), dMF = new Date(annee, mois, 0);
      const start = dD > dMD ? dD : dMD;
      const end   = dF < dMF ? dF : dMF;
      let nb = 0;
      const cur = new Date(start);
      while (cur <= end) {
        if (cur.getDay() >= 1 && cur.getDay() <= 5) nb++;
        cur.setDate(cur.getDate() + 1);
      }
      return acc + nb;
    }, 0);
}

function monthN(y: number, m: number) { return y * 12 + m; }

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const garde = await prisma.garde.findFirst({
    where: { id: params.id, familles: { some: { utilisateurId: session.user.id } } },
    select: {
      congesJson: true,
      mois: { select: { annee: true, mois: true, evenementsJson: true } },
    },
  });
  if (!garde) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const config: CongesConfig | null = garde.congesJson ? JSON.parse(garde.congesJson) : null;
  if (!config) return NextResponse.json({ config: null, summary: null });

  const now = new Date();
  const nowY = now.getFullYear(), nowM = now.getMonth() + 1;

  // Jours cumulés depuis le début du cycle / du suivi
  let joursCumules = 0;
  if (config.regle === 'semaines' && config.cycleDebut) {
    const [cy, cm] = config.cycleDebut.split('-').map(Number);
    const total   = (config.nbSemaines ?? 5) * 5;
    const elapsed = Math.max(1, monthN(nowY, nowM) - monthN(cy, cm) + 1);
    joursCumules  = Math.min(total, elapsed * (total / 12));
  } else if (config.regle === 'jours_par_mois' && config.debutSuivi) {
    const [sy, sm] = config.debutSuivi.split('-').map(Number);
    const elapsed  = Math.max(1, monthN(nowY, nowM) - monthN(sy, sm) + 1);
    joursCumules   = elapsed * (config.joursParMois ?? 2.5);
  }

  // Jours CP depuis le mois de décompte (exclu) jusqu'à maintenant
  const dep = config.decompteDepart;
  let joursConsoSinceDepart = 0;
  for (const moisRec of garde.mois) {
    if (monthN(moisRec.annee, moisRec.mois) > monthN(dep.annee, dep.mois)) {
      const evts = JSON.parse(moisRec.evenementsJson || '[]');
      joursConsoSinceDepart += cpDaysInMonth(evts, moisRec.annee, moisRec.mois);
    }
  }
  const joursConsoTotal = dep.jousConso + joursConsoSinceDepart;
  const joursRestants   = Math.max(0, joursCumules - joursConsoTotal);

  return NextResponse.json({
    config,
    summary: {
      joursCumules:   Math.round(joursCumules   * 10) / 10,
      joursConsoTotal: Math.round(joursConsoTotal * 10) / 10,
      joursRestants:  Math.round(joursRestants   * 10) / 10,
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const garde = await prisma.garde.findFirst({
    where: { id: params.id, familles: { some: { utilisateurId: session.user.id } } },
  });
  if (!garde) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const { config } = await req.json();
  await prisma.garde.update({
    where: { id: params.id },
    data: { congesJson: config ? JSON.stringify(config) : null },
  });

  return NextResponse.json({ ok: true });
}
