-- AlterTable
ALTER TABLE "comptes" ADD COLUMN     "date_reference_solde" TIMESTAMP(3),
ADD COLUMN     "solde" DECIMAL(15,2) NOT NULL DEFAULT 0;
