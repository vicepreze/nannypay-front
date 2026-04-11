-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "prenom" TEXT,
    "nom" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Garde" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "proprietaireId" TEXT NOT NULL,
    "invitationTokenB" TEXT,
    "invitationTokenBExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Garde_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Nounou" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gardeId" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Nounou_gardeId_fkey" FOREIGN KEY ("gardeId") REFERENCES "Garde" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Famille" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gardeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "nomAffiche" TEXT,
    "emailContact" TEXT,
    "statutAcces" TEXT NOT NULL DEFAULT 'invite_en_attente',
    "utilisateurId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Famille_gardeId_fkey" FOREIGN KEY ("gardeId") REFERENCES "Garde" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Famille_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Enfant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gardeId" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "fam" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enfant_gardeId_fkey" FOREIGN KEY ("gardeId") REFERENCES "Garde" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Modele" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gardeId" TEXT NOT NULL,
    "hNormalesSemaine" REAL NOT NULL DEFAULT 40,
    "hSupplementairesSemaine" REAL NOT NULL DEFAULT 8,
    "modeCalcul" TEXT NOT NULL DEFAULT 'A.1',
    "repartitionA" REAL NOT NULL DEFAULT 0.5,
    "tauxHoraireNet" REAL NOT NULL DEFAULT 11,
    "navigoMontant" REAL NOT NULL DEFAULT 90.80,
    "indemKm" REAL NOT NULL DEFAULT 0,
    "indemEntretien" REAL NOT NULL DEFAULT 6.0,
    "joursJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Modele_gardeId_fkey" FOREIGN KEY ("gardeId") REFERENCES "Garde" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mois" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gardeId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ouvert',
    "evenementsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mois_gardeId_fkey" FOREIGN KEY ("gardeId") REFERENCES "Garde" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Nounou_gardeId_key" ON "Nounou"("gardeId");

-- CreateIndex
CREATE UNIQUE INDEX "Famille_gardeId_label_key" ON "Famille"("gardeId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Modele_gardeId_key" ON "Modele"("gardeId");

-- CreateIndex
CREATE UNIQUE INDEX "Mois_gardeId_annee_mois_key" ON "Mois"("gardeId", "annee", "mois");
