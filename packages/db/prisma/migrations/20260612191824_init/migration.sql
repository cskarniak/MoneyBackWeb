-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movement_types" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "movement_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groupings" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "expense" BOOLEAN NOT NULL DEFAULT false,
    "income" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "groupings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "comment" TEXT,
    "summary" BOOLEAN NOT NULL DEFAULT false,
    "dashboard" BOOLEAN NOT NULL DEFAULT false,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "grouping_id" TEXT,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "comment" TEXT,
    "expense" BOOLEAN NOT NULL DEFAULT false,
    "income" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "grouping_id" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "third_parties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyword1" TEXT,
    "keyword2" TEXT,
    "keyword3" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "third_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agency" TEXT,
    "counter" TEXT,
    "number" TEXT,
    "rib" TEXT,
    "bank_url" TEXT,
    "bank_login" TEXT,
    "comment" TEXT,
    "closure_date" TIMESTAMP(3),
    "closure_balance" DECIMAL(15,2),
    "managed_for_other" BOOLEAN NOT NULL DEFAULT false,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "sync_date" TIMESTAMP(3),
    "last_statement_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "expense" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "operation_date" TIMESTAMP(3) NOT NULL,
    "integration_date" TIMESTAMP(3),
    "piece_number" TEXT,
    "reconciliation_code" TEXT,
    "lettering" TEXT,
    "operation_type" TEXT,
    "entry_mode" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "new_budget_amount" DECIMAL(15,2),
    "statement_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "account_id" TEXT NOT NULL,
    "budget_id" TEXT,
    "category_id" TEXT,
    "third_party_id" TEXT,
    "payment_method_id" TEXT,
    "movement_type_id" TEXT,
    "subscription_id" TEXT,
    "origin_id" TEXT,

    CONSTRAINT "operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_splits" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "expense" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "lettering" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "operation_id" TEXT NOT NULL,
    "budget_id" TEXT,
    "category_id" TEXT,

    CONSTRAINT "operation_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_reconciliations" (
    "id" TEXT NOT NULL,
    "reference" TEXT,
    "start_balance" DECIMAL(15,2) NOT NULL,
    "target_balance" DECIMAL(15,2) NOT NULL,
    "reconciled_at" TIMESTAMP(3),
    "in_progress" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "account_id" TEXT NOT NULL,

    CONSTRAINT "account_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_reconciliation_lines" (
    "id" TEXT NOT NULL,
    "reconciled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reconciliation_id" TEXT NOT NULL,
    "operation_id" TEXT NOT NULL,

    CONSTRAINT "account_reconciliation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "entry_label" TEXT,
    "expense" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "periodicity" TEXT NOT NULL,
    "day_of_period" INTEGER,
    "first_due_date" TIMESTAMP(3) NOT NULL,
    "next_due_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "last_generated_date" TIMESTAMP(3),
    "last_generated_due_date" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "has_splits" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "account_id" TEXT NOT NULL,
    "third_party_id" TEXT,
    "category_id" TEXT,
    "budget_id" TEXT,
    "movement_type_id" TEXT,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_runs" (
    "id" TEXT NOT NULL,
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_ref" TIMESTAMP(3) NOT NULL,
    "generated" INTEGER NOT NULL DEFAULT 0,
    "subscription_id" TEXT NOT NULL,

    CONSTRAINT "subscription_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imports" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_lines" INTEGER NOT NULL DEFAULT 0,
    "valid_lines" INTEGER NOT NULL DEFAULT 0,
    "error_lines" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "import_id" TEXT NOT NULL,
    "profile_id" TEXT,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_job_lines" (
    "id" TEXT NOT NULL,
    "line_num" INTEGER NOT NULL,
    "raw_data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_msg" TEXT,
    "job_id" TEXT NOT NULL,

    CONSTRAINT "import_job_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_transactions" (
    "id" TEXT NOT NULL,
    "operator_ref" TEXT,
    "product" TEXT NOT NULL,
    "isin" TEXT,
    "code" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(15,6) NOT NULL,
    "price" DECIMAL(15,6) NOT NULL,
    "fees" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ttf" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "gross_amount" DECIMAL(15,2) NOT NULL,
    "net_amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "movement_type" TEXT NOT NULL,
    "dividend_amount" DECIMAL(15,2),
    "import_ref" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_matchings" (
    "id" TEXT NOT NULL,
    "quantity_matched" DECIMAL(15,6) NOT NULL,
    "buy_transaction_id" TEXT NOT NULL,
    "sell_transaction_id" TEXT NOT NULL,

    CONSTRAINT "portfolio_matchings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_prices" (
    "id" TEXT NOT NULL,
    "isin" TEXT NOT NULL,
    "code" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(15,6) NOT NULL,
    "source" TEXT,

    CONSTRAINT "portfolio_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_labels" (
    "isin" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "market" TEXT,

    CONSTRAINT "portfolio_labels_pkey" PRIMARY KEY ("isin")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "operations_account_id_operation_date_idx" ON "operations"("account_id", "operation_date");

-- CreateIndex
CREATE INDEX "operations_account_id_category_id_idx" ON "operations"("account_id", "category_id");

-- CreateIndex
CREATE INDEX "operations_account_id_budget_id_idx" ON "operations"("account_id", "budget_id");

-- CreateIndex
CREATE INDEX "operations_account_id_third_party_id_idx" ON "operations"("account_id", "third_party_id");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_prices_isin_date_key" ON "portfolio_prices"("isin", "date");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_grouping_id_fkey" FOREIGN KEY ("grouping_id") REFERENCES "groupings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_grouping_id_fkey" FOREIGN KEY ("grouping_id") REFERENCES "groupings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_third_party_id_fkey" FOREIGN KEY ("third_party_id") REFERENCES "third_parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_movement_type_id_fkey" FOREIGN KEY ("movement_type_id") REFERENCES "movement_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_splits" ADD CONSTRAINT "operation_splits_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_splits" ADD CONSTRAINT "operation_splits_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_splits" ADD CONSTRAINT "operation_splits_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_reconciliations" ADD CONSTRAINT "account_reconciliations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_reconciliation_lines" ADD CONSTRAINT "account_reconciliation_lines_reconciliation_id_fkey" FOREIGN KEY ("reconciliation_id") REFERENCES "account_reconciliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_reconciliation_lines" ADD CONSTRAINT "account_reconciliation_lines_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_third_party_id_fkey" FOREIGN KEY ("third_party_id") REFERENCES "third_parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_movement_type_id_fkey" FOREIGN KEY ("movement_type_id") REFERENCES "movement_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_runs" ADD CONSTRAINT "subscription_runs_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "import_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_job_lines" ADD CONSTRAINT "import_job_lines_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_matchings" ADD CONSTRAINT "portfolio_matchings_buy_transaction_id_fkey" FOREIGN KEY ("buy_transaction_id") REFERENCES "portfolio_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_matchings" ADD CONSTRAINT "portfolio_matchings_sell_transaction_id_fkey" FOREIGN KEY ("sell_transaction_id") REFERENCES "portfolio_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
