-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "prenom" TEXT,
    "nom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Garde" (
    "id" TEXT NOT NULL,
    "nom" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "proprietaireId" TEXT NOT NULL,
    "invitationTokenB" TEXT,
    "invitationTokenBExpiresAt" TIMESTAMP(3),
    "publicTokenNounou" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Garde_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nounou" (
    "id" TEXT NOT NULL,
    "gardeId" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Nounou_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Famille" (
    "id" TEXT NOT NULL,
    "gardeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "nomAffiche" TEXT,
    "emailContact" TEXT,
    "statutAcces" TEXT NOT NULL DEFAULT 'invite_en_attente',
    "utilisateurId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Famille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enfant" (
    "id" TEXT NOT NULL,
    "gardeId" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "fam" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enfant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modele" (
    "id" TEXT NOT NULL,
    "gardeId" TEXT NOT NULL,
    "hNormalesSemaine" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "hSup25Semaine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hSup50Semaine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "modeCalcul" TEXT NOT NULL DEFAULT 'A.1',
    "repartitionA" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "tauxHoraireNet" DOUBLE PRECISION NOT NULL DEFAULT 11,
    "navigoMontant" DOUBLE PRECISION NOT NULL DEFAULT 90.8,
    "indemKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "indemEntretien" DOUBLE PRECISION NOT NULL DEFAULT 6.0,
    "joursJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Modele_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mois" (
    "id" TEXT NOT NULL,
    "gardeId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ouvert',
    "evenementsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Mois_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
ALTER TABLE "Garde"   ADD CONSTRAINT "Garde_proprietaireId_fkey"  FOREIGN KEY ("proprietaireId")  REFERENCES "User"("id")  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Nounou"  ADD CONSTRAINT "Nounou_gardeId_fkey"         FOREIGN KEY ("gardeId")          REFERENCES "Garde"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "Famille" ADD CONSTRAINT "Famille_gardeId_fkey"        FOREIGN KEY ("gardeId")          REFERENCES "Garde"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "Famille" ADD CONSTRAINT "Famille_utilisateurId_fkey"  FOREIGN KEY ("utilisateurId")    REFERENCES "User"("id")  ON DELETE SET NULL  ON UPDATE CASCADE;
ALTER TABLE "Enfant"  ADD CONSTRAINT "Enfant_gardeId_fkey"         FOREIGN KEY ("gardeId")          REFERENCES "Garde"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "Modele"  ADD CONSTRAINT "Modele_gardeId_fkey"         FOREIGN KEY ("gardeId")          REFERENCES "Garde"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "Mois"    ADD CONSTRAINT "Mois_gardeId_fkey"           FOREIGN KEY ("gardeId")          REFERENCES "Garde"("id") ON DELETE CASCADE  ON UPDATE CASCADE;

-- Unique Indexes
CREATE UNIQUE INDEX "User_email_key"             ON "User"("email");
CREATE UNIQUE INDEX "Nounou_gardeId_key"          ON "Nounou"("gardeId");
CREATE UNIQUE INDEX "Famille_gardeId_label_key"   ON "Famille"("gardeId", "label");
CREATE UNIQUE INDEX "Modele_gardeId_key"          ON "Modele"("gardeId");
CREATE UNIQUE INDEX "Mois_gardeId_annee_mois_key" ON "Mois"("gardeId", "annee", "mois");
