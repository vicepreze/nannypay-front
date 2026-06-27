-- AlterTable
ALTER TABLE "Garde" ADD COLUMN "archiveeVersGardeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Garde_archiveeVersGardeId_key" ON "Garde"("archiveeVersGardeId");

-- AddForeignKey
ALTER TABLE "Garde" ADD CONSTRAINT "Garde_archiveeVersGardeId_fkey" FOREIGN KEY ("archiveeVersGardeId") REFERENCES "Garde"("id") ON DELETE SET NULL ON UPDATE CASCADE;
