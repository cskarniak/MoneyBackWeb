DROP INDEX IF EXISTS "tiers_regles_matching_tiers_id_actif_priorite_idx";

ALTER TABLE "tiers_regles_matching"
DROP COLUMN "priorite",
DROP COLUMN "score";

CREATE INDEX "tiers_regles_matching_tiers_id_actif_idx"
ON "tiers_regles_matching"("tiers_id", "actif");
