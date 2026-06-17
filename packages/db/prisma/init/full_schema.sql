-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateurs_roles" (
    "utilisateur_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "utilisateurs_roles_pkey" PRIMARY KEY ("utilisateur_id","role_id")
);

-- CreateTable
CREATE TABLE "parametres" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "date_modification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moyens_paiement" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "moyens_paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "types_mouvement" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "types_mouvement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regroupements" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "depense" BOOLEAN NOT NULL DEFAULT false,
    "recette" BOOLEAN NOT NULL DEFAULT false,
    "tableau_bord" BOOLEAN NOT NULL DEFAULT false,
    "type_tableau_bord" TEXT,
    "type_categorie" TEXT,
    "type_budget" TEXT,

    CONSTRAINT "regroupements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "ancien_code" TEXT,
    "commentaire" TEXT,
    "synthese" BOOLEAN NOT NULL DEFAULT false,
    "tableau_bord" BOOLEAN NOT NULL DEFAULT false,
    "solde" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "solde_facture" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL,
    "regroupement_id" TEXT,
    "type_mouvement_id" TEXT,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "ancien_code" TEXT,
    "commentaire" TEXT,
    "depense" BOOLEAN NOT NULL DEFAULT false,
    "recette" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL,
    "regroupement_id" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiers" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "commentaire" TEXT,
    "ventilation" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "categorie_id" TEXT,
    "budget_id" TEXT,

    CONSTRAINT "tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "comptes" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "agence" TEXT,
    "guichet" TEXT,
    "numero" TEXT,
    "rib" TEXT,
    "url_banque" TEXT,
    "identifiant_banque" TEXT,
    "commentaire" TEXT,
    "date_cloture" TIMESTAMP(3),
    "solde_cloture" DECIMAL(15,2),
    "gere_pour_autrui" BOOLEAN NOT NULL DEFAULT false,
    "ferme" BOOLEAN NOT NULL DEFAULT false,
    "date_synchro" TIMESTAMP(3),
    "reference_dernier_releve" TEXT,
    "solde_depart" DECIMAL(15,2),
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comptes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "depense" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "recette" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "solde" DECIMAL(15,2),
    "date_operation" TIMESTAMP(3) NOT NULL,
    "date_echeance" TIMESTAMP(3),
    "date_integration" TIMESTAMP(3),
    "numero_piece" TEXT,
    "code_rapprochement" TEXT,
    "lettrage" TEXT,
    "type_operation" TEXT,
    "mode_saisie" TEXT,
    "operation_valide" TEXT,
    "verrouillee" BOOLEAN NOT NULL DEFAULT false,
    "cloturee" BOOLEAN NOT NULL DEFAULT false,
    "nouveau_montant_budget" DECIMAL(15,2),
    "reference_releve" TEXT,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL,
    "date_suppression" TIMESTAMP(3),
    "compte_id" TEXT NOT NULL,
    "budget_id" TEXT,
    "categorie_id" TEXT,
    "tiers_id" TEXT,
    "moyen_paiement_id" TEXT,
    "type_mouvement_id" TEXT,
    "abonnement_id" TEXT,
    "operation_origine_id" TEXT,
    "job_import_id" TEXT,

    CONSTRAINT "operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_ventilees" (
    "id" TEXT NOT NULL,
    "libelle" TEXT,
    "depense" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "recette" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "solde" DECIMAL(15,2),
    "date_periode" TIMESTAMP(3),
    "lettrage" TEXT,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL,
    "operation_id" TEXT NOT NULL,
    "budget_id" TEXT,
    "categorie_id" TEXT,

    CONSTRAINT "operations_ventilees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rapprochements_bancaires" (
    "id" TEXT NOT NULL,
    "reference" TEXT,
    "solde_depart" DECIMAL(15,2) NOT NULL,
    "solde_cible" DECIMAL(15,2) NOT NULL,
    "date_rapprochement" TIMESTAMP(3),
    "en_cours" BOOLEAN NOT NULL DEFAULT true,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "compte_id" TEXT NOT NULL,

    CONSTRAINT "rapprochements_bancaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_rapprochement_bancaire" (
    "id" TEXT NOT NULL,
    "date_rapprochement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rapprochement_id" TEXT NOT NULL,
    "operation_id" TEXT NOT NULL,

    CONSTRAINT "lignes_rapprochement_bancaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonnements" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "libelle_ecriture" TEXT,
    "depense" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "recette" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "periodicite" TEXT NOT NULL,
    "jour_periode" INTEGER,
    "type_abonnement" TEXT,
    "date_premiere_echeance" TIMESTAMP(3) NOT NULL,
    "date_prochaine_echeance" TIMESTAMP(3),
    "date_fin" TIMESTAMP(3),
    "date_derniere_generation" TIMESTAMP(3),
    "date_derniere_echeance_generee" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ventile" BOOLEAN NOT NULL DEFAULT false,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL,
    "compte_id" TEXT NOT NULL,
    "tiers_id" TEXT,
    "categorie_id" TEXT,
    "budget_id" TEXT,
    "type_mouvement_id" TEXT,
    "operation_generee_id" TEXT,

    CONSTRAINT "abonnements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "executions_abonnement" (
    "id" TEXT NOT NULL,
    "date_execution" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_reference" TIMESTAMP(3) NOT NULL,
    "nombre_genere" INTEGER NOT NULL DEFAULT 0,
    "abonnement_id" TEXT NOT NULL,

    CONSTRAINT "executions_abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonnements_ventiles" (
    "id" TEXT NOT NULL,
    "libelle" TEXT,
    "depense" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "recette" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "solde" DECIMAL(15,2),
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL,
    "abonnement_id" TEXT NOT NULL,
    "budget_id" TEXT,
    "categorie_id" TEXT,

    CONSTRAINT "abonnements_ventiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planning_abonnements" (
    "id" TEXT NOT NULL,
    "date_echeance" TIMESTAMP(3) NOT NULL,
    "date_generation" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'pending',
    "operation_id" TEXT,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abonnement_id" TEXT NOT NULL,

    CONSTRAINT "planning_abonnements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imports" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "nom_fichier" TEXT NOT NULL,
    "reference" TEXT,
    "date_import" TIMESTAMP(3),
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "compte_id" TEXT,

    CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs_import" (
    "id" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'pending',
    "nombre_lignes_total" INTEGER NOT NULL DEFAULT 0,
    "nombre_lignes_valides" INTEGER NOT NULL DEFAULT 0,
    "nombre_lignes_erreur" INTEGER NOT NULL DEFAULT 0,
    "nombre_lignes_integrees" INTEGER NOT NULL DEFAULT 0,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL,
    "import_id" TEXT NOT NULL,
    "masque_import_id" TEXT,

    CONSTRAINT "jobs_import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_job_import" (
    "id" TEXT NOT NULL,
    "numero_ligne" INTEGER NOT NULL,
    "donnees_brutes" JSONB NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'pending',
    "message_erreur" TEXT,
    "job_import_id" TEXT NOT NULL,

    CONSTRAINT "lignes_job_import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "masques_import_excel" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "nom_feuille" TEXT,
    "delimiteur" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "masques_import_excel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portefeuille_transactions" (
    "id" TEXT NOT NULL,
    "reference_operateur" TEXT,
    "produit" TEXT NOT NULL,
    "code_isin" TEXT,
    "code" TEXT,
    "date_mouvement" TIMESTAMP(3) NOT NULL,
    "quantite" DECIMAL(15,6) NOT NULL,
    "cours" DECIMAL(15,6) NOT NULL,
    "frais" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ttf" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "montant_brut" DECIMAL(15,2) NOT NULL,
    "montant_net" DECIMAL(15,2) NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'EUR',
    "type_mouvement" TEXT NOT NULL,
    "montant_dividende" DECIMAL(15,2),
    "reference_import" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'active',
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "import_id" TEXT,

    CONSTRAINT "portefeuille_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portefeuille_points" (
    "id" TEXT NOT NULL,
    "quantite_pointee" DECIMAL(15,6) NOT NULL,
    "transaction_achat_id" TEXT NOT NULL,
    "transaction_vente_id" TEXT NOT NULL,

    CONSTRAINT "portefeuille_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portefeuille_cours" (
    "id" TEXT NOT NULL,
    "code_isin" TEXT NOT NULL,
    "code" TEXT,
    "date_cours" TIMESTAMP(3) NOT NULL,
    "cours" DECIMAL(15,6) NOT NULL,
    "source" TEXT,

    CONSTRAINT "portefeuille_cours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portefeuille_libelles" (
    "code_isin" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "marche" TEXT,

    CONSTRAINT "portefeuille_libelles_pkey" PRIMARY KEY ("code_isin")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "filtres" JSONB,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses_details" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "date_detail" TIMESTAMP(3),
    "metadonnees" JSONB,
    "analyse_id" TEXT NOT NULL,

    CONSTRAINT "analyses_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journaux_audit" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entite_id" TEXT NOT NULL,
    "donnees" JSONB,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilisateur_id" TEXT,

    CONSTRAINT "journaux_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "parametres_cle_key" ON "parametres"("cle");

-- CreateIndex
CREATE INDEX "operations_compte_id_date_operation_idx" ON "operations"("compte_id", "date_operation");

-- CreateIndex
CREATE INDEX "operations_compte_id_categorie_id_idx" ON "operations"("compte_id", "categorie_id");

-- CreateIndex
CREATE INDEX "operations_compte_id_budget_id_idx" ON "operations"("compte_id", "budget_id");

-- CreateIndex
CREATE INDEX "operations_compte_id_tiers_id_idx" ON "operations"("compte_id", "tiers_id");

-- CreateIndex
CREATE UNIQUE INDEX "abonnements_operation_generee_id_key" ON "abonnements"("operation_generee_id");

-- CreateIndex
CREATE INDEX "planning_abonnements_abonnement_id_date_echeance_idx" ON "planning_abonnements"("abonnement_id", "date_echeance");

-- CreateIndex
CREATE UNIQUE INDEX "imports_reference_key" ON "imports"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "portefeuille_cours_code_isin_date_cours_key" ON "portefeuille_cours"("code_isin", "date_cours");

-- CreateIndex
CREATE INDEX "operations_ventilees_tiers_tiers_id_idx" ON "operations_ventilees_tiers"("tiers_id");

-- CreateIndex
CREATE INDEX "tiers_regles_matching_tiers_id_actif_priorite_idx" ON "tiers_regles_matching"("tiers_id", "actif", "priorite");

-- CreateIndex
CREATE INDEX "tiers_regles_matching_conditions_regle_id_position_idx" ON "tiers_regles_matching_conditions"("regle_id", "position");

-- CreateIndex
CREATE INDEX "journaux_audit_entite_entite_id_idx" ON "journaux_audit"("entite", "entite_id");

-- CreateIndex
CREATE INDEX "journaux_audit_date_creation_idx" ON "journaux_audit"("date_creation");

-- AddForeignKey
ALTER TABLE "utilisateurs_roles" ADD CONSTRAINT "utilisateurs_roles_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilisateurs_roles" ADD CONSTRAINT "utilisateurs_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_regroupement_id_fkey" FOREIGN KEY ("regroupement_id") REFERENCES "regroupements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_type_mouvement_id_fkey" FOREIGN KEY ("type_mouvement_id") REFERENCES "types_mouvement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_regroupement_id_fkey" FOREIGN KEY ("regroupement_id") REFERENCES "regroupements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_compte_id_fkey" FOREIGN KEY ("compte_id") REFERENCES "comptes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_tiers_id_fkey" FOREIGN KEY ("tiers_id") REFERENCES "tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_moyen_paiement_id_fkey" FOREIGN KEY ("moyen_paiement_id") REFERENCES "moyens_paiement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_type_mouvement_id_fkey" FOREIGN KEY ("type_mouvement_id") REFERENCES "types_mouvement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_abonnement_id_fkey" FOREIGN KEY ("abonnement_id") REFERENCES "abonnements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_operation_origine_id_fkey" FOREIGN KEY ("operation_origine_id") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_job_import_id_fkey" FOREIGN KEY ("job_import_id") REFERENCES "jobs_import"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_ventilees" ADD CONSTRAINT "operations_ventilees_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_ventilees" ADD CONSTRAINT "operations_ventilees_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_ventilees" ADD CONSTRAINT "operations_ventilees_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_ventilees_tiers" ADD CONSTRAINT "operations_ventilees_tiers_tiers_id_fkey" FOREIGN KEY ("tiers_id") REFERENCES "tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_ventilees_tiers" ADD CONSTRAINT "operations_ventilees_tiers_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_ventilees_tiers" ADD CONSTRAINT "operations_ventilees_tiers_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiers_regles_matching" ADD CONSTRAINT "tiers_regles_matching_tiers_id_fkey" FOREIGN KEY ("tiers_id") REFERENCES "tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiers_regles_matching_conditions" ADD CONSTRAINT "tiers_regles_matching_conditions_regle_id_fkey" FOREIGN KEY ("regle_id") REFERENCES "tiers_regles_matching"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapprochements_bancaires" ADD CONSTRAINT "rapprochements_bancaires_compte_id_fkey" FOREIGN KEY ("compte_id") REFERENCES "comptes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_rapprochement_bancaire" ADD CONSTRAINT "lignes_rapprochement_bancaire_rapprochement_id_fkey" FOREIGN KEY ("rapprochement_id") REFERENCES "rapprochements_bancaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_rapprochement_bancaire" ADD CONSTRAINT "lignes_rapprochement_bancaire_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_compte_id_fkey" FOREIGN KEY ("compte_id") REFERENCES "comptes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_tiers_id_fkey" FOREIGN KEY ("tiers_id") REFERENCES "tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_type_mouvement_id_fkey" FOREIGN KEY ("type_mouvement_id") REFERENCES "types_mouvement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_operation_generee_id_fkey" FOREIGN KEY ("operation_generee_id") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executions_abonnement" ADD CONSTRAINT "executions_abonnement_abonnement_id_fkey" FOREIGN KEY ("abonnement_id") REFERENCES "abonnements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements_ventiles" ADD CONSTRAINT "abonnements_ventiles_abonnement_id_fkey" FOREIGN KEY ("abonnement_id") REFERENCES "abonnements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements_ventiles" ADD CONSTRAINT "abonnements_ventiles_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements_ventiles" ADD CONSTRAINT "abonnements_ventiles_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning_abonnements" ADD CONSTRAINT "planning_abonnements_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning_abonnements" ADD CONSTRAINT "planning_abonnements_abonnement_id_fkey" FOREIGN KEY ("abonnement_id") REFERENCES "abonnements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imports" ADD CONSTRAINT "imports_compte_id_fkey" FOREIGN KEY ("compte_id") REFERENCES "comptes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs_import" ADD CONSTRAINT "jobs_import_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs_import" ADD CONSTRAINT "jobs_import_masque_import_id_fkey" FOREIGN KEY ("masque_import_id") REFERENCES "masques_import_excel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_job_import" ADD CONSTRAINT "lignes_job_import_job_import_id_fkey" FOREIGN KEY ("job_import_id") REFERENCES "jobs_import"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portefeuille_transactions" ADD CONSTRAINT "portefeuille_transactions_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portefeuille_points" ADD CONSTRAINT "portefeuille_points_transaction_achat_id_fkey" FOREIGN KEY ("transaction_achat_id") REFERENCES "portefeuille_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portefeuille_points" ADD CONSTRAINT "portefeuille_points_transaction_vente_id_fkey" FOREIGN KEY ("transaction_vente_id") REFERENCES "portefeuille_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses_details" ADD CONSTRAINT "analyses_details_analyse_id_fkey" FOREIGN KEY ("analyse_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journaux_audit" ADD CONSTRAINT "journaux_audit_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
