-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "date_migration" TIMESTAMP(3),
ADD COLUMN     "migre_vers_id" TEXT,
ADD COLUMN     "rapport_migration" TEXT;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "date_migration" TIMESTAMP(3),
ADD COLUMN     "migre_vers_id" TEXT,
ADD COLUMN     "rapport_migration" TEXT;

-- AlterTable
ALTER TABLE "tiers" ADD COLUMN     "date_migration" TIMESTAMP(3),
ADD COLUMN     "migre_vers_id" TEXT,
ADD COLUMN     "rapport_migration" TEXT;

-- CreateIndex
CREATE INDEX "budgets_migre_vers_id_idx" ON "budgets"("migre_vers_id");

-- CreateIndex
CREATE INDEX "categories_migre_vers_id_idx" ON "categories"("migre_vers_id");

-- CreateIndex
CREATE INDEX "tiers_migre_vers_id_idx" ON "tiers"("migre_vers_id");

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_migre_vers_id_fkey" FOREIGN KEY ("migre_vers_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_migre_vers_id_fkey" FOREIGN KEY ("migre_vers_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_migre_vers_id_fkey" FOREIGN KEY ("migre_vers_id") REFERENCES "tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
