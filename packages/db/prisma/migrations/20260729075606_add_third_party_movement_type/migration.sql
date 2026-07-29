-- AlterTable
ALTER TABLE "tiers" ADD COLUMN     "type_mouvement_id" TEXT;

-- CreateIndex
CREATE INDEX "tiers_type_mouvement_id_idx" ON "tiers"("type_mouvement_id");

-- AddForeignKey
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_type_mouvement_id_fkey" FOREIGN KEY ("type_mouvement_id") REFERENCES "types_mouvement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
