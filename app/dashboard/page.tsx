import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { SignOutButton } from '@/components/SignOutButton';
import { ArchiveButton } from '@/components/ArchiveButton';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const now   = new Date();
  const annee = now.getFullYear();
  const mois  = now.getMonth() + 1;

  const [actives, archivees] = await Promise.all([
    prisma.garde.findMany({
      where: {
        familles: { some: { utilisateurId: session.user.id } },
        statut: { not: 'archivé' },
      },
      include: {
        nounou:   { select: { prenom: true } },
        familles: { select: { label: true, nomAffiche: true, statutAcces: true } },
        enfants:  { select: { prenom: true, fam: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.garde.findMany({
      where: {
        familles: { some: { utilisateurId: session.user.id } },
        statut: 'archivé',
      },
      include: {
        familles: { select: { label: true, nomAffiche: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center justify-between px-6 z-50">
        <a href="/" className="font-serif text-[19px] tracking-tight text-[var(--ink)] no-underline">
          nounoulink<em className="text-[var(--sage)] not-italic">.</em>
        </a>
        <div className="flex items-center gap-4">
          <Link href="/demo" className="text-sm text-[var(--dust)] hover:text-[var(--ink)] transition-colors no-underline">Démo</Link>
          <SignOutButton />
        </div>
      </header>

      <div className="pt-14 max-w-3xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between pt-10 mb-8">
          <div>
            <h1 className="font-serif text-3xl text-[var(--ink)]">Mes gardes</h1>
            <p className="text-sm text-[var(--dust)] mt-1">
              {actives.length === 0 ? 'Aucune garde configurée' : `${actives.length} garde${actives.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <Link href="/nouvelle-garde/acteurs"
            className="px-4 py-2 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors no-underline">
            + Nouvelle garde
          </Link>
        </div>

        {actives.length === 0 ? (
          <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] p-12 text-center">
            <div className="text-4xl mb-4">👶</div>
            <p className="font-medium text-[var(--ink)] mb-2">Aucune garde pour l&apos;instant</p>
            <p className="text-sm text-[var(--dust)] mb-6">Configurez votre première garde partagée en quelques minutes.</p>
            <Link href="/nouvelle-garde/acteurs"
              className="px-5 py-2.5 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors no-underline">
              Créer ma première garde
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {actives.map(g => {
              const famA = g.familles.find(f => f.label === 'A');
              const famB = g.familles.find(f => f.label === 'B');
              const famBActif = famB?.statutAcces === 'invite_actif';
              return (
                <div key={g.id} className="bg-white border border-[var(--line)] rounded-[var(--radius)] p-5">
                  <div className="mb-3">
                    <p className="text-base font-medium text-[var(--ink)] mb-1">{g.nom ?? 'Garde sans nom'}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-[var(--dust)]">
                      {g.nounou && <span>👩 {g.nounou.prenom}</span>}
                      <span className="text-[var(--blue)]">Fam. A : {famA?.nomAffiche ?? '—'}</span>
                      <span className={famBActif ? 'text-[var(--sage)]' : 'text-[var(--dust)]'}>
                        Fam. B : {famB?.nomAffiche ?? '—'}{!famBActif && ' · en attente'}
                      </span>
                    </div>
                    {g.enfants.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {g.enfants.map((e, i) => (
                          <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${e.fam === 'A' ? 'bg-[var(--blue-light)] text-[var(--blue)]' : 'bg-[var(--sage-light)] text-[var(--sage)]'}`}>
                            {e.prenom}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-[var(--line)]">
                    <Link href={`/gardes/${g.id}/mois/${annee}/${mois}`}
                      className="px-4 py-2 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors no-underline">
                      Voir →
                    </Link>
                    <Link href={`/gardes/${g.id}/settings`}
                      className="px-4 py-2 border border-[var(--line)] text-[var(--ink)] rounded-[var(--radius)] text-sm font-medium hover:border-[var(--ink)] bg-white transition-colors no-underline">
                      Paramètres
                    </Link>
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
                return (
                  <div key={g.id} className="bg-white border border-[var(--line)] rounded-[var(--radius)] px-4 py-3 flex items-center justify-between opacity-60">
                    <div>
                      <p className="text-sm font-medium text-[var(--ink)]">{g.nom ?? 'Garde sans nom'}</p>
                      <p className="text-xs text-[var(--dust)]">{famA?.nomAffiche ?? '—'} · {famB?.nomAffiche ?? '—'}</p>
                    </div>
                    <span className="text-xs text-[var(--dust)]">archivée</span>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
