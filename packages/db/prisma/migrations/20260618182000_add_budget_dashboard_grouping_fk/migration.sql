ALTER TABLE "budgets"
ADD CONSTRAINT "budgets_regroupement_tableau_bord_id_fkey"
FOREIGN KEY ("regroupement_tableau_bord_id")
REFERENCES "regroupements"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
