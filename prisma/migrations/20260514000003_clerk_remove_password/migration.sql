-- AlterTable : supprime le champ password (auth déléguée à Clerk)
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";
