-- AlterTable
ALTER TABLE "operations" ADD COLUMN     "regle_affectation_libelle" TEXT;

-- CreateIndex
CREATE INDEX "operations_regle_affectation_libelle_idx" ON "operations"("regle_affectation_libelle");
