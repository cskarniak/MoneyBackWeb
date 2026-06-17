ALTER TABLE "tiers"
ADD COLUMN "formule_activee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "commentaire" TEXT,
ADD COLUMN "ventilation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "categorie_id" TEXT,
ADD COLUMN "budget_id" TEXT;

CREATE TABLE "operations_ventilees_tiers" (
    "id" TEXT NOT NULL,
    "libelle" TEXT,
    "depense" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "recette" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "solde" DECIMAL(15,2),
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL,
    "tiers_id" TEXT NOT NULL,
    "budget_id" TEXT,
    "categorie_id" TEXT,

    CONSTRAINT "operations_ventilees_tiers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operations_ventilees_tiers_tiers_id_idx" ON "operations_ventilees_tiers"("tiers_id");

ALTER TABLE "tiers"
ADD CONSTRAINT "tiers_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tiers"
ADD CONSTRAINT "tiers_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operations_ventilees_tiers"
ADD CONSTRAINT "operations_ventilees_tiers_tiers_id_fkey" FOREIGN KEY ("tiers_id") REFERENCES "tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "operations_ventilees_tiers"
ADD CONSTRAINT "operations_ventilees_tiers_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operations_ventilees_tiers"
ADD CONSTRAINT "operations_ventilees_tiers_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
