ALTER TABLE "abonnements"
ADD COLUMN "id_source" TEXT;

CREATE INDEX "abonnements_id_source_idx" ON "abonnements"("id_source");

ALTER TABLE "abonnements_ventiles"
ADD COLUMN "id_source" TEXT;

CREATE INDEX "abonnements_ventiles_id_source_idx" ON "abonnements_ventiles"("id_source");
