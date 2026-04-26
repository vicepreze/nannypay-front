import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SettingsClient } from './SettingsClient';

type Props = { params: { id: string } };

export default async function SettingsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const garde = await prisma.garde.findFirst({
    where: { id: params.id, familles: { some: { utilisateurId: session.user.id } } },
    include: { familles: true, nounou: true, modele: true, enfants: true },
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
        racOptionActive:   garde.modele.racOptionActive,
        joursJson:         garde.modele.joursJson,
      } : null}
      enfants={garde.enfants.map(e => ({ prenom: e.prenom, fam: e.fam }))}
    />
  );
}
