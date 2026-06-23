/*
  Warnings:

  - You are about to drop the column `code_rapprochement` on the `operations` table. All the data in the column will be lost.
  - You are about to drop the `lignes_rapprochement_bancaire` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rapprochements_bancaires` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "lignes_rapprochement_bancaire" DROP CONSTRAINT "lignes_rapprochement_bancaire_operation_id_fkey";

-- DropForeignKey
ALTER TABLE "lignes_rapprochement_bancaire" DROP CONSTRAINT "lignes_rapprochement_bancaire_rapprochement_id_fkey";

-- DropForeignKey
ALTER TABLE "rapprochements_bancaires" DROP CONSTRAINT "rapprochements_bancaires_compte_id_fkey";

-- AlterTable
ALTER TABLE "operations" DROP COLUMN "code_rapprochement";

-- DropTable
DROP TABLE "lignes_rapprochement_bancaire";

-- DropTable
DROP TABLE "rapprochements_bancaires";

-- CreateIndex
CREATE INDEX "abonnements_compte_id_idx" ON "abonnements"("compte_id");

-- CreateIndex
CREATE INDEX "abonnements_tiers_id_idx" ON "abonnements"("tiers_id");

-- CreateIndex
CREATE INDEX "abonnements_categorie_id_idx" ON "abonnements"("categorie_id");

-- CreateIndex
CREATE INDEX "abonnements_budget_id_idx" ON "abonnements"("budget_id");

-- CreateIndex
CREATE INDEX "abonnements_actif_date_prochaine_echeance_idx" ON "abonnements"("actif", "date_prochaine_echeance");

-- CreateIndex
CREATE INDEX "abonnements_ventiles_abonnement_id_idx" ON "abonnements_ventiles"("abonnement_id");

-- CreateIndex
CREATE INDEX "analyses_details_analyse_id_idx" ON "analyses_details"("analyse_id");

-- CreateIndex
CREATE INDEX "budgets_regroupement_id_idx" ON "budgets"("regroupement_id");

-- CreateIndex
CREATE INDEX "budgets_regroupement_tableau_bord_id_idx" ON "budgets"("regroupement_tableau_bord_id");

-- CreateIndex
CREATE INDEX "budgets_type_mouvement_id_idx" ON "budgets"("type_mouvement_id");

-- CreateIndex
CREATE INDEX "budgets_actif_idx" ON "budgets"("actif");

-- CreateIndex
CREATE INDEX "categories_regroupement_id_idx" ON "categories"("regroupement_id");

-- CreateIndex
CREATE INDEX "categories_actif_idx" ON "categories"("actif");

-- CreateIndex
CREATE INDEX "executions_abonnement_abonnement_id_idx" ON "executions_abonnement"("abonnement_id");

-- CreateIndex
CREATE INDEX "imports_compte_id_idx" ON "imports"("compte_id");

-- CreateIndex
CREATE INDEX "jobs_import_import_id_idx" ON "jobs_import"("import_id");

-- CreateIndex
CREATE INDEX "jobs_import_statut_idx" ON "jobs_import"("statut");

-- CreateIndex
CREATE INDEX "lignes_job_import_job_import_id_idx" ON "lignes_job_import"("job_import_id");

-- CreateIndex
CREATE INDEX "operations_date_operation_idx" ON "operations"("date_operation");

-- CreateIndex
CREATE INDEX "operations_budget_id_idx" ON "operations"("budget_id");

-- CreateIndex
CREATE INDEX "operations_categorie_id_idx" ON "operations"("categorie_id");

-- CreateIndex
CREATE INDEX "operations_tiers_id_idx" ON "operations"("tiers_id");

-- CreateIndex
CREATE INDEX "operations_moyen_paiement_id_idx" ON "operations"("moyen_paiement_id");

-- CreateIndex
CREATE INDEX "operations_type_mouvement_id_idx" ON "operations"("type_mouvement_id");

-- CreateIndex
CREATE INDEX "operations_abonnement_id_idx" ON "operations"("abonnement_id");

-- CreateIndex
CREATE INDEX "operations_job_import_id_idx" ON "operations"("job_import_id");

-- CreateIndex
CREATE INDEX "operations_cloturee_idx" ON "operations"("cloturee");

-- CreateIndex
CREATE INDEX "operations_verrouillee_idx" ON "operations"("verrouillee");

-- CreateIndex
CREATE INDEX "operations_date_suppression_idx" ON "operations"("date_suppression");

-- CreateIndex
CREATE INDEX "operations_reference_releve_idx" ON "operations"("reference_releve");

-- CreateIndex
CREATE INDEX "operations_ventilees_budget_id_idx" ON "operations_ventilees"("budget_id");

-- CreateIndex
CREATE INDEX "operations_ventilees_categorie_id_idx" ON "operations_ventilees"("categorie_id");

-- CreateIndex
CREATE INDEX "operations_ventilees_tiers_budget_id_idx" ON "operations_ventilees_tiers"("budget_id");

-- CreateIndex
CREATE INDEX "operations_ventilees_tiers_categorie_id_idx" ON "operations_ventilees_tiers"("categorie_id");

-- CreateIndex
CREATE INDEX "portefeuille_points_transaction_achat_id_idx" ON "portefeuille_points"("transaction_achat_id");

-- CreateIndex
CREATE INDEX "portefeuille_points_transaction_vente_id_idx" ON "portefeuille_points"("transaction_vente_id");

-- CreateIndex
CREATE INDEX "portefeuille_transactions_import_id_idx" ON "portefeuille_transactions"("import_id");

-- CreateIndex
CREATE INDEX "portefeuille_transactions_code_isin_idx" ON "portefeuille_transactions"("code_isin");

-- CreateIndex
CREATE INDEX "portefeuille_transactions_date_mouvement_idx" ON "portefeuille_transactions"("date_mouvement");

-- CreateIndex
CREATE INDEX "portefeuille_transactions_produit_date_mouvement_idx" ON "portefeuille_transactions"("produit", "date_mouvement");

-- CreateIndex
CREATE INDEX "tiers_categorie_id_idx" ON "tiers"("categorie_id");

-- CreateIndex
CREATE INDEX "tiers_budget_id_idx" ON "tiers"("budget_id");

-- CreateIndex
CREATE INDEX "tiers_actif_idx" ON "tiers"("actif");

-- CreateIndex
CREATE INDEX "tiers_nom_idx" ON "tiers"("nom");
