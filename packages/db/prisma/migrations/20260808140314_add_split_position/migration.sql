-- AlterTable
ALTER TABLE "abonnements_ventiles" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "operations_ventilees" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "operations_ventilees_tiers" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill : préserve l'ordre existant (createdAt, puis id en repli si égalité)
-- avant que le tri ne repose exclusivement sur "position".
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY abonnement_id ORDER BY date_creation ASC, id ASC) - 1 AS rn
  FROM "abonnements_ventiles"
)
UPDATE "abonnements_ventiles" AS s
SET position = ranked.rn
FROM ranked
WHERE s.id = ranked.id;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY operation_id ORDER BY date_creation ASC, id ASC) - 1 AS rn
  FROM "operations_ventilees"
)
UPDATE "operations_ventilees" AS s
SET position = ranked.rn
FROM ranked
WHERE s.id = ranked.id;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tiers_id ORDER BY date_creation ASC, id ASC) - 1 AS rn
  FROM "operations_ventilees_tiers"
)
UPDATE "operations_ventilees_tiers" AS s
SET position = ranked.rn
FROM ranked
WHERE s.id = ranked.id;
