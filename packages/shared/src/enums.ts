export const OperationType = {
  STANDARD: 'standard',
  SPLIT: 'V',
  PARTIAL: 'P',
  TRANSFER: 'T',
} as const;

export const Periodicity = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUAL: 'annual',
} as const;

export const ImportSource = {
  EXCEL: 'excel',
  BANK_FILE: 'bank-file',
  DEGIRO: 'degiro',
  ABC_BOURSE: 'abc-bourse',
} as const;

export const ImportJobStatus = {
  PENDING: 'pending',
  PARSING: 'parsing',
  PREVIEW: 'preview',
  CONFIRMED: 'confirmed',
  DONE: 'done',
  ERROR: 'error',
} as const;

export const PortfolioMovementType = {
  BUY: 'buy',
  SELL: 'sell',
  DIVIDEND: 'dividend',
} as const;

export const UserRole = {
  ADMIN: 'admin',
  GESTION: 'gestion',
  CONSULTATION: 'consultation',
} as const;

export const AuditAction = {
  DELETE: 'delete',
  IMPORT: 'import',
  RECONCILE: 'reconcile',
  RECALCULATE: 'recalculate',
  ADMIN: 'admin',
} as const;
