-- AlterTable
ALTER TABLE "groupings" ADD COLUMN     "budget_type" TEXT,
ADD COLUMN     "category_type" TEXT,
ADD COLUMN     "dashboard_type" TEXT;

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "invoice_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "legacy_code" TEXT,
ADD COLUMN     "movement_type_id" TEXT;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "legacy_code" TEXT;

-- AlterTable
ALTER TABLE "third_parties" ADD COLUMN     "affectation_formula" TEXT,
ADD COLUMN     "keyword_mode" TEXT NOT NULL DEFAULT 'OR';

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "opening_balance" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "operations" ADD COLUMN     "balance" DECIMAL(15,2),
ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "import_job_id" TEXT;

-- AlterTable
ALTER TABLE "operation_splits" ADD COLUMN     "balance" DECIMAL(15,2),
ADD COLUMN     "period_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "last_generated_operation_id" TEXT,
ADD COLUMN     "subscription_type" TEXT;

-- AlterTable
ALTER TABLE "imports" ADD COLUMN     "account_id" TEXT,
ADD COLUMN     "imported_at" TIMESTAMP(3),
ADD COLUMN     "reference" TEXT;

-- AlterTable
ALTER TABLE "import_jobs" ADD COLUMN     "integrated_lines" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "import_profiles" ADD COLUMN     "delimiter" TEXT,
ADD COLUMN     "sheet_name" TEXT;

-- AlterTable
ALTER TABLE "portfolio_transactions" ADD COLUMN     "import_id" TEXT;

-- CreateTable
CREATE TABLE "subscription_splits" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "expense" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "budget_id" TEXT,
    "category_id" TEXT,

    CONSTRAINT "subscription_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_planning" (
    "id" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "generated_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "operation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscription_id" TEXT NOT NULL,

    CONSTRAINT "subscription_planning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_details" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "detail_date" TIMESTAMP(3),
    "metadata" JSONB,
    "analysis_id" TEXT NOT NULL,

    CONSTRAINT "analysis_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_planning_subscription_id_due_date_idx" ON "subscription_planning"("subscription_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_last_generated_operation_id_key" ON "subscriptions"("last_generated_operation_id");

-- CreateIndex
CREATE UNIQUE INDEX "imports_reference_key" ON "imports"("reference");

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_movement_type_id_fkey" FOREIGN KEY ("movement_type_id") REFERENCES "movement_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_origin_id_fkey" FOREIGN KEY ("origin_id") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_last_generated_operation_id_fkey" FOREIGN KEY ("last_generated_operation_id") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_splits" ADD CONSTRAINT "subscription_splits_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_splits" ADD CONSTRAINT "subscription_splits_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_splits" ADD CONSTRAINT "subscription_splits_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_planning" ADD CONSTRAINT "subscription_planning_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_planning" ADD CONSTRAINT "subscription_planning_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imports" ADD CONSTRAINT "imports_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_transactions" ADD CONSTRAINT "portfolio_transactions_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_details" ADD CONSTRAINT "analysis_details_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

