import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { SignOutButton } from '@/components/SignOutButton';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const now = new Date();
  const annee = now.getFullYear();
  const mois  = now.getMonth() + 1;

  const gardes = await prisma.garde.findMany({
    where: {
      familles: { some: { utilisateurId: session.user.id } },
    },
    include: {
      nounou:   { select: { prenom: true } },
      familles: { select: { label: true, nomAffiche: true, statutAcces: true } },
      enfants:  { select: { prenom: true, fam: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--line)] flex items-center justify-between px-6 z-50">
        <a href="/" className="font-serif text-[19px] tracking-tight text-[var(--ink)] no-underline">
          nounoulink<em className="text-[var(--sage)] not-italic">.</em>
        </a>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--dust)] hidden sm:block">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <div className="pt-14 max-w-3xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between pt-10 mb-8">
          <div>
            <h1 className="font-serif text-3xl text-[var(--ink)]">Mes gardes</h1>
            <p className="text-sm text-[var(--dust)] mt-1">
              {gardes.length === 0 ? 'Aucune garde configurée' : `${gardes.length} garde${gardes.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <Link
            href="/nouvelle-garde/acteurs"
            className="px-4 py-2 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors no-underline"
          >
            + Nouvelle garde
          </Link>
        </div>

        {gardes.length === 0 ? (
          <div className="bg-white border border-[var(--line)] rounded-[var(--radius)] p-12 text-center">
            <div className="text-4xl mb-4">👶</div>
            <p className="font-medium text-[var(--ink)] mb-2">Aucune garde pour l&apos;instant</p>
            <p className="text-sm text-[var(--dust)] mb-6">Configurez votre première garde partagée en quelques minutes.</p>
            <Link
              href="/nouvelle-garde/acteurs"
              className="px-5 py-2.5 bg-[var(--sage)] text-white rounded-[var(--radius)] text-sm font-medium hover:bg-[#3a5431] transition-colors no-underline"
            >
              Créer ma première garde
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {gardes.map(g => {
              const famA = g.familles.find(f => f.label === 'A');
              const famB = g.familles.find(f => f.label === 'B');
              const famBActif = famB?.statutAcces === 'invite_actif';
              return (
                <div
                  key={g.id}
                  className="relative bg-white border border-[var(--line)] rounded-[var(--radius)] p-5 hover:border-[var(--sage-mid)] hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Link href={`/gardes/${g.id}`} className="text-base font-medium text-[var(--ink)] group-hover:text-[var(--sage)] transition-colors no-underline">
                          {g.nom ?? 'Garde sans nom'}
                        </Link>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${g.statut === 'actif' ? 'bg-[var(--sage-light)] text-[var(--sage)]' : 'bg-[var(--paper)] text-[var(--dust)]'}`}>
                          {g.statut}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-[var(--dust)]">
                        {g.nounou && (
                          <span>👩 {g.nounou.prenom}</span>
                        )}
                        <span className="text-[var(--blue)]">
                          Fam. A : {famA?.nomAffiche ?? '—'}
                        </span>
                        <span className={famBActif ? 'text-[var(--sage)]' : 'text-[var(--dust)]'}>
                          Fam. B : {famB?.nomAffiche ?? '—'} {!famBActif && '· en attente'}
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
                    <div className="flex flex-col items-end gap-2">
                      <Link href={`/gardes/${g.id}`} className="text-[var(--dust)] group-hover:text-[var(--sage)] transition-colors text-lg mt-0.5 no-underline">→</Link>
                      <Link
                        href={`/gardes/${g.id}/mois/${annee}/${mois}`}
                        className="text-[11px] px-2.5 py-1 border border-[var(--line)] rounded-lg text-[var(--dust)] hover:border-[var(--sage)] hover:text-[var(--sage)] transition-colors no-underline whitespace-nowrap"
                      >
                        Mois en cours
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
