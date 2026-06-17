CREATE TABLE "tiers_regles_matching" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "priorite" INTEGER NOT NULL DEFAULT 100,
    "score" INTEGER NOT NULL DEFAULT 100,
    "operateur" TEXT NOT NULL DEFAULT 'AND',
    "stop_si_match" BOOLEAN NOT NULL DEFAULT false,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL,
    "tiers_id" TEXT NOT NULL,

    CONSTRAINT "tiers_regles_matching_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tiers_regles_matching_conditions" (
    "id" TEXT NOT NULL,
    "champ" TEXT NOT NULL,
    "operateur" TEXT NOT NULL,
    "valeur_1" TEXT,
    "valeur_2" TEXT,
    "negation" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL,
    "regle_id" TEXT NOT NULL,

    CONSTRAINT "tiers_regles_matching_conditions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tiers_regles_matching_tiers_id_actif_priorite_idx" ON "tiers_regles_matching"("tiers_id", "actif", "priorite");
CREATE INDEX "tiers_regles_matching_conditions_regle_id_position_idx" ON "tiers_regles_matching_conditions"("regle_id", "position");

ALTER TABLE "tiers_regles_matching"
ADD CONSTRAINT "tiers_regles_matching_tiers_id_fkey" FOREIGN KEY ("tiers_id") REFERENCES "tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tiers_regles_matching_conditions"
ADD CONSTRAINT "tiers_regles_matching_conditions_regle_id_fkey" FOREIGN KEY ("regle_id") REFERENCES "tiers_regles_matching"("id") ON DELETE CASCADE ON UPDATE CASCADE;
