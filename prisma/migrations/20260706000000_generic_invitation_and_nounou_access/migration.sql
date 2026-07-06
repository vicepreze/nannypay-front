-- Renomme les colonnes d'invitation Famille B en lien de partage générique
-- (RENAME préserve les données existantes, contrairement au DROP+ADD généré par défaut)
ALTER TABLE "Garde" RENAME COLUMN "invitationTokenB" TO "invitationToken";
ALTER TABLE "Garde" RENAME COLUMN "invitationTokenBExpiresAt" TO "invitationTokenExpiresAt";

-- La nounou peut désormais rejoindre la garde via un compte
ALTER TABLE "Nounou" ADD COLUMN "utilisateurId" TEXT;
ALTER TABLE "Nounou" ADD CONSTRAINT "Nounou_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
