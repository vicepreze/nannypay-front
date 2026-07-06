import { auth } from '@clerk/nextjs/server';

import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { SettingsClient } from './SettingsClient';

type Props = { params: { id: string } };

export default async function SettingsPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const garde = await prisma.garde.findFirst({
    where: {
      id: params.id,
      OR: [{ familles: { some: { utilisateurId: userId } } }, { nounou: { utilisateurId: userId } }],
    },
    include: { familles: true, nounou: true, modele: true, enfants: true, archiveeVersGarde: { select: { id: true, nom: true } } },
  });
  if (!garde) redirect('/dashboard');

  const now     = new Date();
  const moisUrl = `/gardes/${params.id}/mois/${now.getFullYear()}/${now.getMonth() + 1}`;

  const famA = garde.familles.find(f => f.label === 'A');
  const famB = garde.familles.find(f => f.label === 'B');

  return (
    <SettingsClient
      gardeId={params.id}
      gardeNom={garde.nom ?? ''}
      moisUrl={moisUrl}
      statut={garde.statut}
      isProprietaire={garde.proprietaireId === userId}
      archiveeVersGarde={garde.archiveeVersGarde ? { id: garde.archiveeVersGarde.id, nom: garde.archiveeVersGarde.nom } : null}
      famA={{
        id:           famA?.id ?? '',
        nomAffiche:   famA?.nomAffiche ?? '',
        cmgCotisations:    famA?.cmgCotisations    ?? 0,
        cmgRemuneration:   famA?.cmgRemuneration   ?? 0,
        abattementCharges: famA?.abattementCharges ?? 0,
        aideVille:         famA?.aideVille         ?? 0,
        creditImpot:       famA?.creditImpot       ?? 0,
      }}
      famB={{
        id:           famB?.id ?? '',
        nomAffiche:   famB?.nomAffiche ?? '',
        cmgCotisations:    famB?.cmgCotisations    ?? 0,
        cmgRemuneration:   famB?.cmgRemuneration   ?? 0,
        abattementCharges: famB?.abattementCharges ?? 0,
        aideVille:         famB?.aideVille         ?? 0,
        creditImpot:       famB?.creditImpot       ?? 0,
      }}
      nounou={garde.nounou ? { prenom: garde.nounou.prenom, nom: garde.nounou.nom ?? '' } : null}
      modele={garde.modele ? {
        tauxHoraireNet:    garde.modele.tauxHoraireNet,
        hNormalesSemaine:  garde.modele.hNormalesSemaine,
        hSup25Semaine:     garde.modele.hSup25Semaine,
        hSup50Semaine:     garde.modele.hSup50Semaine,
        navigoMontant:     garde.modele.navigoMontant,
        indemKm:           garde.modele.indemKm,
        indemEntretien:    garde.modele.indemEntretien,
        repartitionA:      garde.modele.repartitionA,
        repartitionIndemA: garde.modele.repartitionIndemA,
        racOptionActive:   garde.modele.racOptionActive,
        joursJson:         garde.modele.joursJson,
      } : null}
      enfants={garde.enfants.map(e => ({ prenom: e.prenom, fam: e.fam }))}
    />
  );
}
