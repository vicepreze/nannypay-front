-- Remplace hSupplementairesSemaine par deux colonnes distinctes
ALTER TABLE "Modele" ADD COLUMN "hSup25Semaine" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Modele" ADD COLUMN "hSup50Semaine" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Migrer les données existantes : hSup = min(old, 8) → 25%, max(0, old-8) → 50%
UPDATE "Modele" SET
  "hSup25Semaine" = LEAST("hSupplementairesSemaine", 8),
  "hSup50Semaine" = GREATEST("hSupplementairesSemaine" - 8, 0);

ALTER TABLE "Modele" DROP COLUMN "hSupplementairesSemaine";
