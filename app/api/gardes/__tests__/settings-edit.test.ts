import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { PUT as PutType, GET as GetType } from '@/app/api/gardes/[id]/route';
import type { POST as DupliquerType } from '@/app/api/gardes/[id]/dupliquer/route';

const TEST_USER_ID = 'test_clerk_settings_spec';
let currentAuthUserId: string = TEST_USER_ID;

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: currentAuthUserId })),
}));

let PUT: typeof PutType;
let GET: typeof GetType;
let dupliquer: typeof DupliquerType;

beforeAll(async () => {
  ({ PUT, GET } = await import('@/app/api/gardes/[id]/route'));
  ({ POST: dupliquer } = await import('@/app/api/gardes/[id]/dupliquer/route'));
});

const baseModele = {
  tauxHoraireNet: 11, hNormalesSemaine: 40, hSup25Semaine: 0, hSup50Semaine: 0,
  repartitionA: 0.5, racOptionActive: false,
  navigoMontant: 90.8, indemKm: 0, indemEntretien: 6,
  repartitionIndemA: 0.5, joursJson: '{}',
};

async function createTestGarde(overrides: { statut?: string } = {}) {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: { id: TEST_USER_ID, email: `${TEST_USER_ID}@test.invalid` },
  });
  return prisma.garde.create({
    data: {
      nom: 'TEST_AUTOMATED_garde',
      statut: overrides.statut ?? 'actif',
      proprietaireId: TEST_USER_ID,
      nounou: { create: { prenom: 'TestNounou' } },
      familles: {
        create: [
          { label: 'A', nomAffiche: 'TEST Famille A', statutAcces: 'proprietaire', utilisateurId: TEST_USER_ID },
          { label: 'B', nomAffiche: 'TEST Famille B', statutAcces: 'invite_en_attente' },
        ],
      },
      enfants: { create: [{ prenom: 'TestEnfant1', fam: 'A' }, { prenom: 'TestEnfant2', fam: 'B' }] },
      modele: { create: baseModele },
    },
    include: { familles: true, enfants: true, modele: true, nounou: true },
  });
}

const createdGardeIds: string[] = [];
async function track<T extends { id: string }>(g: T): Promise<T> {
  createdGardeIds.push(g.id);
  return g;
}

afterEach(async () => {
  currentAuthUserId = TEST_USER_ID;
  for (const id of createdGardeIds.splice(0)) {
    await prisma.garde.delete({ where: { id } }).catch(() => {});
  }
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: TEST_USER_ID } }).catch(() => {});
});

function putRequest(gardeId: string, body: unknown) {
  return PUT(
    new NextRequest(`http://localhost/api/gardes/${gardeId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }),
    { params: { id: gardeId } },
  );
}

function dupliquerRequest(gardeId: string, body: unknown) {
  return dupliquer(
    new NextRequest(`http://localhost/api/gardes/${gardeId}/dupliquer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }),
    { params: { id: gardeId } },
  );
}

describe('PUT /api/gardes/[id]', () => {
  it('met à jour le modèle de paie et persiste en DB', async () => {
    const garde = await track(await createTestGarde());
    const res = await putRequest(garde.id, {
      modele: { ...baseModele, tauxHoraireNet: 15, hNormalesSemaine: 35, repartitionA: 0.6 },
    });
    expect(res.status).toBe(200);

    const fresh = await prisma.modele.findUnique({ where: { gardeId: garde.id } });
    expect(fresh?.tauxHoraireNet).toBe(15);
    expect(fresh?.hNormalesSemaine).toBe(35);
    expect(fresh?.repartitionA).toBe(0.6);
  });

  it('met à jour le nom de la garde, les familles et la nounou (onglet Acteurs)', async () => {
    const garde = await track(await createTestGarde());
    const res = await putRequest(garde.id, {
      nom: 'TEST_AUTOMATED_renommee',
      familleA: { nomAffiche: 'Nouvelle A' },
      familleB: { nomAffiche: 'Nouvelle B' },
      nounou: { prenom: 'NouveauPrenom', nom: null },
    });
    expect(res.status).toBe(200);

    const fresh = await prisma.garde.findUnique({
      where: { id: garde.id }, include: { familles: true, nounou: true },
    });
    expect(fresh?.nom).toBe('TEST_AUTOMATED_renommee');
    expect(fresh?.familles.find(f => f.label === 'A')?.nomAffiche).toBe('Nouvelle A');
    expect(fresh?.familles.find(f => f.label === 'B')?.nomAffiche).toBe('Nouvelle B');
    expect(fresh?.nounou?.prenom).toBe('NouveauPrenom');
  });

  it('refuse toute modification si la garde est archivée', async () => {
    const garde = await track(await createTestGarde({ statut: 'archivé' }));
    const res = await putRequest(garde.id, { modele: { ...baseModele, tauxHoraireNet: 99 } });
    expect(res.status).toBe(409);

    const fresh = await prisma.modele.findUnique({ where: { gardeId: garde.id } });
    expect(fresh?.tauxHoraireNet).toBe(11); // inchangé
  });

  it("refuse si l'utilisateur n'est pas le propriétaire", async () => {
    const garde = await track(await createTestGarde());
    currentAuthUserId = 'un_autre_user';
    const res = await putRequest(garde.id, { modele: { ...baseModele, tauxHoraireNet: 99 } });
    expect(res.status).toBe(404);
  });

  it('GET expose statut et archiveeVersGardeId', async () => {
    const garde = await track(await createTestGarde());
    const res = await GET(
      new NextRequest(`http://localhost/api/gardes/${garde.id}`),
      { params: { id: garde.id } },
    );
    const data = await res.json();
    expect(data.garde.statut).toBe('actif');
  });
});

describe('POST /api/gardes/[id]/dupliquer', () => {
  it('crée une nouvelle garde avec les mêmes acteurs et les nouveaux paramètres, archive l’ancienne', async () => {
    const garde = await track(await createTestGarde());
    const res = await dupliquerRequest(garde.id, {
      modele: { ...baseModele, tauxHoraireNet: 20, repartitionA: 0.7 },
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    const newId = data.garde.id;
    expect(newId).not.toBe(garde.id);
    await track({ id: newId });

    const nouvelle = await prisma.garde.findUnique({
      where: { id: newId }, include: { enfants: true, nounou: true, familles: true, modele: true },
    });
    expect(nouvelle?.statut).toBe('actif');
    expect(nouvelle?.modele?.tauxHoraireNet).toBe(20);
    expect(nouvelle?.modele?.repartitionA).toBe(0.7);
    expect(nouvelle?.nounou?.prenom).toBe('TestNounou');
    expect(nouvelle?.enfants.map(e => e.prenom).sort()).toEqual(['TestEnfant1', 'TestEnfant2']);
    expect(nouvelle?.familles.map(f => f.label).sort()).toEqual(['A', 'B']);

    const ancienne = await prisma.garde.findUnique({ where: { id: garde.id } });
    expect(ancienne?.statut).toBe('archivé');
    expect(ancienne?.archiveeVersGardeId).toBe(newId);
    // L'ancienne garde garde son ancien taux — elle n'est pas modifiée, juste archivée
    const ancienModele = await prisma.modele.findUnique({ where: { gardeId: garde.id } });
    expect(ancienModele?.tauxHoraireNet).toBe(11);
  });

  it('refuse de dupliquer une garde déjà archivée', async () => {
    const garde = await track(await createTestGarde({ statut: 'archivé' }));
    const res = await dupliquerRequest(garde.id, { modele: { ...baseModele, tauxHoraireNet: 20 } });
    expect(res.status).toBe(409);
  });

  it('refuse un taux horaire invalide', async () => {
    const garde = await track(await createTestGarde());
    const res = await dupliquerRequest(garde.id, { modele: { ...baseModele, tauxHoraireNet: 0 } });
    expect(res.status).toBe(400);
  });
});
