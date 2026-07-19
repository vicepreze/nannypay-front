-- Permet la suppression d'un User propriétaire d'une Garde (droit à l'effacement RGPD).
-- Sans ce changement, ON DELETE RESTRICT faisait échouer le webhook Clerk `user.deleted`
-- (prisma.user.deleteMany) dès que l'utilisateur possédait au moins une garde.
ALTER TABLE "Garde" DROP CONSTRAINT "Garde_proprietaireId_fkey";
ALTER TABLE "Garde" ADD CONSTRAINT "Garde_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
