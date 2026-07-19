import { auth } from '@clerk/nextjs/server';

import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { ArchiveButton } from '@/components/ArchiveButton';
import { PartageGardeButton } from '@/components/PartageGardeButton';
import { EditableEnfantsBadges } from '@/components/EditableEnfantsBadges';
import { familleLabel } from '@/lib/familleLabel';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const now   = new Date();
  const annee = now.getFullYear();
  const mois  = now.getMonth() + 1;

  const monAcces = { OR: [{ familles: { some: { utilisateurId: userId } } }, { nounou: { utilisateurId: userId } }] };

  const [actives, archivees] = await Promise.all([
    prisma.garde.findMany({
      where: { ...monAcces, statut: { not: 'archivé' } },
      include: {
        nounou:   { select: { prenom: true, utilisateurId: true } },
        familles: { select: { label: true, nomAffiche: true, statutAcces: true, utilisateurId: true } },
        enfants:  { select: { id: true, prenom: true, fam: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.garde.findMany({
      where: { ...monAcces, statut: 'archivé' },
      include: {
        familles: { select: { label: true, nomAffiche: true, utilisateurId: true } },
        archiveeVersGarde: { select: { id: true, nom: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <AppHeader
        rightExtra={
          <Link href="/demo" className="text-sm text-[var(--dust)] hover:text-[var(--ink)] transition-colors no-underline">Démo</Link>
        }
      />

      <div className="pt-14 max-w-3xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between pt-10 mb-8">
          <div>
            <h1 className="font-serif text-3xl text-[var(--ink)]">Mes gardes</h1>
            <p className="text-sm text-[var(--dust)] mt-1">
              {actives.length === 0 ? 'Aucune garde configurée' : `${actives.length} garde${actives.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <Link href="/nouvelle-garde/acteurs"
            className="px-4 py-2 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--sage-dark)] transition-colors no-underline">
            + Nouvelle garde
          </Link>
        </div>

        {actives.length === 0 ? (
          <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] p-12 text-center">
            <div className="text-4xl mb-4">👶</div>
            <p className="font-medium text-[var(--ink)] mb-2">Aucune garde pour l&apos;instant</p>
            <p className="text-sm text-[var(--dust)] mb-6">Configurez votre première garde partagée en quelques minutes.</p>
            <Link href="/nouvelle-garde/acteurs"
              className="px-5 py-2.5 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--sage-dark)] transition-colors no-underline">
              Créer ma première garde
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {actives.map(g => {
              const famA = g.familles.find(f => f.label === 'A');
              const famB = g.familles.find(f => f.label === 'B');
              const estMoiA = famA?.utilisateurId === userId;
              const famBActif = famB?.statutAcces === 'invite_actif';
              const nounouEligible = !!g.nounou && !g.nounou.utilisateurId;
              const peutPartager = !famBActif || nounouEligible;
              const tokenValide = g.invitationToken && g.invitationTokenExpiresAt && g.invitationTokenExpiresAt > now;
              return (
                <div key={g.id} className="bg-white border border-[var(--line)] rounded-[var(--radius)] p-5">
                  <div className="mb-3">
                    <p className="text-base font-medium text-[var(--ink)] mb-1">{g.nom ?? 'Garde sans nom'}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-[var(--dust)]">
                      {g.nounou && <span>👩 {g.nounou.prenom}</span>}
                      <span className="text-[var(--blue)]">{familleLabel(famA?.nomAffiche, estMoiA)}</span>
                      <span className={famBActif ? 'text-[var(--sage)]' : 'text-[var(--dust)]'}>
                        {familleLabel(famB?.nomAffiche, !estMoiA)}{!famBActif && ' · en attente'}
                      </span>
                    </div>
                    {g.enfants.length > 0 && (
                      <EditableEnfantsBadges gardeId={g.id} enfants={g.enfants} editable={g.proprietaireId === userId} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-[var(--line)]">
                    <Link href={`/gardes/${g.id}/mois/${annee}/${mois}`}
                      className="px-4 py-2 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--sage-dark)] transition-colors no-underline">
                      Voir →
                    </Link>
                    <Link href={`/gardes/${g.id}/settings`}
                      className="px-4 py-2 border border-[var(--line)] text-[var(--ink)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] bg-white transition-colors no-underline">
                      Paramètres
                    </Link>
                    {peutPartager && (
                      <PartageGardeButton gardeId={g.id} initialToken={tokenValide ? g.invitationToken : null} />
                    )}
                    <ArchiveButton gardeId={g.id}
                      className="ml-auto text-xs text-[var(--dust)] hover:text-[var(--red)] transition-colors px-2 py-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {archivees.length > 0 && (
          <details className="mt-8 group">
            <summary className="text-xs text-[var(--dust)] hover:text-[var(--ink)] cursor-pointer select-none list-none flex items-center gap-1.5">
              <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
              {archivees.length} garde{archivees.length > 1 ? 's' : ''} archivée{archivees.length > 1 ? 's' : ''}
            </summary>
            <div className="mt-3 space-y-2">
              {archivees.map(g => {
                const famA = g.familles.find(f => f.label === 'A');
                const famB = g.familles.find(f => f.label === 'B');
                const estMoiA = famA?.utilisateurId === userId;
                return (
                  <div key={g.id} className="bg-white border border-[var(--line)] rounded-[var(--radius)] px-4 py-3 flex items-center justify-between opacity-60">
                    <div>
                      <p className="text-sm font-medium text-[var(--ink)]">{g.nom ?? 'Garde sans nom'}</p>
                      <p className="text-xs text-[var(--dust)]">{familleLabel(famA?.nomAffiche, estMoiA)} · {familleLabel(famB?.nomAffiche, !estMoiA)}</p>
                    </div>
                    {g.archiveeVersGarde ? (
                      <Link href={`/gardes/${g.archiveeVersGarde.id}/settings`} className="text-xs text-[var(--sage)] underline no-underline hover:underline">
                        → {g.archiveeVersGarde.nom ?? 'nouvelle garde'}
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--dust)]">archivée</span>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        )}

        <div className="mt-10 pt-4 border-t border-[var(--line)]">
          <a href="/api/auth/me/export" download
            className="text-xs text-[var(--dust)] hover:text-[var(--ink)] transition-colors no-underline">
            Exporter mes données (JSON)
          </a>
        </div>
      </div>
    </div>
  );
}
