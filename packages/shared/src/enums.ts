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

export const ThirdPartyMatchingOperator = {
  AND: 'AND',
  OR: 'OR',
} as const;

export const ThirdPartyMatchingField = {
  LABEL: 'label',
  NORMALIZED_LABEL: 'normalizedLabel',
  AMOUNT: 'amount',
  DIRECTION: 'direction',
  ACCOUNT_ID: 'accountId',
  STATEMENT_REF: 'statementRef',
  COUNTERPARTY_NAME: 'counterpartyName',
  MEMO: 'memo',
  DAY_OF_MONTH: 'dayOfMonth',
} as const;

export const ThirdPartyMatchingMatcher = {
  CONTAINS: 'contains',
  EQUALS: 'equals',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith',
  REGEX: 'regex',
  GT: 'gt',
  GTE: 'gte',
  LT: 'lt',
  LTE: 'lte',
  BETWEEN: 'between',
  IN: 'in',
} as const;
