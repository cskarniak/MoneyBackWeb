ALTER TABLE "operations"
ADD COLUMN "operation_valide" TEXT;

UPDATE "operations"
SET "operation_valide" = 'V'
WHERE "mode_saisie" = 'E';
