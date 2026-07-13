import { z } from 'zod';
import {
  ImportSource,
  Periodicity,
  SubscriptionType,
  ThirdPartyMatchingField,
  ThirdPartyMatchingMatcher,
  ThirdPartyMatchingOperator,
} from './enums';

// ─── Account ──────────────────────────────────────────────────────────────────

export const CreateAccountSchema = z.object({
  name: z.string().min(1, 'Le nom est obligatoire'),
  agency: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  rib: z.string().optional().nullable(),
  bankUrl: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  bankLogin: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  openingBalance: z.number().optional().nullable(),
  managedForOther: z.boolean().default(false),
  showOnHome: z.boolean().default(false),
  closed: z.boolean().default(false),
});

export type CreateAccountDto = z.infer<typeof CreateAccountSchema>;

export const UpdateAccountSchema = CreateAccountSchema.partial();
export type UpdateAccountDto = z.infer<typeof UpdateAccountSchema>;

export const AccountFiltersSchema = z.object({
  search: z.string().optional(),
  closed: z.preprocess(
    v => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ),
  highlightId: z.string().uuid().optional(),
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).default(1),
  limit: z.preprocess(v => Number(v ?? 20), z.number().int().min(1).max(200)).default(20),
  sortBy: z.enum(['name', 'agency', 'number']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type AccountFiltersDto = z.infer<typeof AccountFiltersSchema>;

export const RebuildAccountBalancesSchema = z.object({
  referenceDate: z.string().datetime().optional(),
});

export type RebuildAccountBalancesDto = z.infer<typeof RebuildAccountBalancesSchema>;

// ─── Operation ────────────────────────────────────────────────────────────────

export const CreateOperationSplitSchema = z.object({
  label: z.string().optional().nullable(),
  expense: z.number().min(0).default(0),
  income: z.number().min(0).default(0),
  categoryId: z.string().uuid().optional().nullable(),
  budgetId: z.string().uuid().optional().nullable(),
});

export type CreateOperationSplitDto = z.infer<typeof CreateOperationSplitSchema>;

export const CreateOperationSchema = z.object({
  accountId: z.string().uuid(),
  label: z.string().min(1),
  expense: z.number().min(0).default(0),
  income: z.number().min(0).default(0),
  simulation: z.boolean().optional().default(false),
  operationDate: z.string().datetime(),
  dueDate: z.string().datetime().optional().nullable(),
  budgetId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  thirdPartyId: z.string().uuid().optional(),
  lettering: z.string().max(4, 'Le lettrage doit contenir au maximum 4 caractères').optional(),
  comment: z.string().optional(),
  paymentMethodId: z.string().uuid().optional(),
  movementTypeId: z.string().uuid().optional(),
  pieceNumber: z.string().optional(),
  statementRef: z.string().optional(),
  operationValidated: z.enum(['V']).optional().nullable(),
  locked: z.boolean().optional().default(false),
  closed: z.boolean().optional().default(false),
  splits: z.array(CreateOperationSplitSchema).default([]),
});

export type CreateOperationDto = z.infer<typeof CreateOperationSchema>;

export const UpdateOperationSchema = CreateOperationSchema.partial();
export type UpdateOperationDto = z.infer<typeof UpdateOperationSchema>;

export const OperationFiltersSchema = z.object({
  operationId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  budgetId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  thirdPartyId: z.string().uuid().optional(),
  statementRef: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  locked: z.preprocess(
    v => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ),
  hideLocked: z.preprocess(
    v => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ),
  emptyEnvelopeOnly: z.preprocess(
    v => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ),
  unvalidatedOnly: z.preprocess(
    v => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ),
  search: z.string().optional(),
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).default(1),
  limit: z.preprocess(v => Number(v ?? 100), z.number().int().min(1).max(500)).default(100),
  sortBy: z.enum(['operationDate', 'label', 'expense', 'income']).default('operationDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type OperationFiltersDto = z.infer<typeof OperationFiltersSchema>;

export const AutoAssignOperationThirdPartiesSchema = z.object({
  accountId: z.string().uuid().optional(),
  operationDateFrom: z.string().datetime().optional(),
  operationDateTo: z.string().datetime().optional(),
  onlyWithoutBudget: z.boolean().default(true),
  applyChanges: z.boolean().default(false),
});

export type AutoAssignOperationThirdPartiesDto = z.infer<typeof AutoAssignOperationThirdPartiesSchema>;

export const DeleteStatementImportSchema = z.object({
  accountId: z.string().uuid(),
  statementRef: z.string().trim().min(1, 'La référence du relevé est obligatoire'),
});

export type DeleteStatementImportDto = z.infer<typeof DeleteStatementImportSchema>;

export const DetailedStatisticsFiltersSchema = z.object({
  accountId: z.string().uuid().optional(),
  budgetId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  thirdPartyId: z.string().uuid().optional(),
  categoryGroupingId: z.string().uuid().optional(),
  budgetGroupingId: z.string().uuid().optional(),
  pieceNumber: z.string().optional(),
  operationDateFrom: z.string().datetime().optional(),
  operationDateTo: z.string().datetime().optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  sortByDueDate: z.preprocess(
    v => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ).default(true),
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).default(1),
  limit: z.preprocess(v => Number(v ?? 20), z.number().int().min(1).max(1000)).default(20),
  sortKey: z.enum([
    'accountName',
    'operationDate',
    'effectiveDueDate',
    'pieceNumber',
    'label',
    'balance',
    'thirdPartyName',
    'budgetLabel',
    'categoryLabel',
  ]).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});

export type DetailedStatisticsFiltersDto = z.infer<typeof DetailedStatisticsFiltersSchema>;

export const EnvelopeSummaryFiltersSchema = z.object({
  accountId: z.string().uuid().optional(),
  referenceDate: z.string().datetime().optional(),
  useDueDate: z.preprocess(
    value => (value === undefined ? true : value === 'true' || value === true),
    z.boolean(),
  ).default(true),
});

export type EnvelopeSummaryFiltersDto = z.infer<typeof EnvelopeSummaryFiltersSchema>;

// ─── Subscription ─────────────────────────────────────────────────────────────

export const CreateSubscriptionSplitSchema = z.object({
  label: z.string().optional().nullable(),
  expense: z.number().min(0).default(0),
  income: z.number().min(0).default(0),
  categoryId: z.string().uuid().optional().nullable(),
  budgetId: z.string().uuid().optional().nullable(),
});

export type CreateSubscriptionSplitDto = z.infer<typeof CreateSubscriptionSplitSchema>;

export const CreateSubscriptionSchema = z.object({
  accountId: z.string().uuid(),
  label: z.string().min(1),
  entryLabel: z.string().optional().nullable(),
  expense: z.number().min(0).default(0),
  income: z.number().min(0).default(0),
  periodicity: z.enum([
    Periodicity.DAILY,
    Periodicity.WEEKLY,
    Periodicity.MONTHLY,
    Periodicity.BIMONTHLY,
    Periodicity.QUARTERLY,
    Periodicity.SEMIANNUAL,
    Periodicity.ANNUAL,
  ]),
  dayOfPeriod: z.number().int().min(1).max(31).optional().nullable(),
  subscriptionType: z.enum([
    SubscriptionType.REAL,
    SubscriptionType.SIMULATION,
  ]).default(SubscriptionType.REAL),
  firstDueDate: z.string().datetime(),
  nextDueDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  active: z.boolean().default(true),
  budgetId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  thirdPartyId: z.string().uuid().optional().nullable(),
  movementTypeId: z.string().uuid().optional().nullable(),
  splits: z.array(CreateSubscriptionSplitSchema).default([]),
});

export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionSchema>;

export const UpdateSubscriptionSchema = CreateSubscriptionSchema.partial();
export type UpdateSubscriptionDto = z.infer<typeof UpdateSubscriptionSchema>;

export const SubscriptionFiltersSchema = z.object({
  search: z.string().optional(),
  active: z.preprocess(
    v => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ),
  periodicity: z.enum([
    Periodicity.DAILY,
    Periodicity.WEEKLY,
    Periodicity.MONTHLY,
    Periodicity.BIMONTHLY,
    Periodicity.QUARTERLY,
    Periodicity.SEMIANNUAL,
    Periodicity.ANNUAL,
  ]).optional(),
  highlightId: z.string().uuid().optional(),
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).default(1),
  limit: z.preprocess(v => Number(v ?? 20), z.number().int().min(1).max(200)).default(20),
  sortBy: z.enum(['label', 'nextDueDate', 'firstDueDate', 'periodicity']).default('nextDueDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type SubscriptionFiltersDto = z.infer<typeof SubscriptionFiltersSchema>;

export const GenerateSubscriptionsSchema = z.object({
  dateRef: z.string().datetime(),
  subscriptionIds: z.array(z.string().uuid()).default([]),
});

export type GenerateSubscriptionsDto = z.infer<typeof GenerateSubscriptionsSchema>;

export const PreviewSubscriptionsGenerationSchema = z.object({
  dateRef: z.string().datetime(),
});

export type PreviewSubscriptionsGenerationDto = z.infer<typeof PreviewSubscriptionsGenerationSchema>;

// ─── Category ─────────────────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
  label: z.string().min(1, 'Le libellé est obligatoire'),
  idSource: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  expense: z.boolean().default(false),
  income: z.boolean().default(false),
  active: z.boolean().default(true),
  regroupementId: z.string().uuid().optional().nullable(),
});

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = CreateCategorySchema.partial();
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;

export const CategoryFiltersSchema = z.object({
  search: z.string().optional(),
  active: z.preprocess(
    v => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ),
  regroupementId: z.string().uuid().optional(),
  highlightId: z.string().uuid().optional(),
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).default(1),
  limit: z.preprocess(v => Number(v ?? 20), z.number().int().min(1).max(200)).default(20),
  sortBy: z.enum(['label', 'regroupement']).default('label'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CategoryFiltersDto = z.infer<typeof CategoryFiltersSchema>;

// ─── Grouping ─────────────────────────────────────────────────────────────────

export const CreateGroupingSchema = z.object({
  label: z.string().min(1, 'Le libellé est obligatoire'),
  idSource: z.string().optional().nullable(),
  expense: z.boolean().default(false),
  income: z.boolean().default(false),
  dashboard: z.boolean().default(false),
});

export type CreateGroupingDto = z.infer<typeof CreateGroupingSchema>;

export const UpdateGroupingSchema = CreateGroupingSchema.partial();
export type UpdateGroupingDto = z.infer<typeof UpdateGroupingSchema>;

export const GroupingFiltersSchema = z.object({
  search: z.string().optional(),
  highlightId: z.string().uuid().optional(),
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).default(1),
  limit: z.preprocess(v => Number(v ?? 20), z.number().int().min(1).max(200)).default(20),
  sortBy: z.enum(['label']).default('label'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type GroupingFiltersDto = z.infer<typeof GroupingFiltersSchema>;

// ─── Payment Method / Moyen de paiement ─────────────────────────────────────

export const CreatePaymentMethodSchema = z.object({
  label: z.string().min(1, 'Le libellé est obligatoire'),
  code: z.string().max(3, 'Le code doit contenir au maximum 3 caractères').optional().nullable(),
  idSource: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

export type CreatePaymentMethodDto = z.infer<typeof CreatePaymentMethodSchema>;

export const UpdatePaymentMethodSchema = CreatePaymentMethodSchema.partial();
export type UpdatePaymentMethodDto = z.infer<typeof UpdatePaymentMethodSchema>;

export const PaymentMethodFiltersSchema = z.object({
  search: z.string().optional(),
  active: z.preprocess(
    v => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ),
  highlightId: z.string().uuid().optional(),
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).default(1),
  limit: z.preprocess(v => Number(v ?? 20), z.number().int().min(1).max(200)).default(20),
  sortBy: z.enum(['label', 'code']).default('label'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type PaymentMethodFiltersDto = z.infer<typeof PaymentMethodFiltersSchema>;

// ─── Movement Type / Type de mouvement ──────────────────────────────────────

export const CreateMovementTypeSchema = z.object({
  label: z.string().min(1, 'Le libellé est obligatoire'),
  code: z.string().max(3, 'Le code doit contenir au maximum 3 caractères').optional().nullable(),
  idSource: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

export type CreateMovementTypeDto = z.infer<typeof CreateMovementTypeSchema>;

export const UpdateMovementTypeSchema = CreateMovementTypeSchema.partial();
export type UpdateMovementTypeDto = z.infer<typeof UpdateMovementTypeSchema>;

export const MovementTypeFiltersSchema = z.object({
  search: z.string().optional(),
  active: z.preprocess(
    v => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ),
  highlightId: z.string().uuid().optional(),
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).default(1),
  limit: z.preprocess(v => Number(v ?? 20), z.number().int().min(1).max(200)).default(20),
  sortBy: z.enum(['label', 'code']).default('label'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type MovementTypeFiltersDto = z.infer<typeof MovementTypeFiltersSchema>;

// ─── Budget / Enveloppe ──────────────────────────────────────────────────────

export const CreateBudgetSchema = z.object({
  label: z.string().min(1, 'Le libellé est obligatoire'),
  idSource: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  summary: z.boolean().default(false),
  dashboard: z.boolean().default(false),
  active: z.boolean().default(true),
  regroupementId: z.string().uuid().optional().nullable(),
  regroupementTableauDeBordId: z.string().uuid().optional().nullable(),
  movementTypeId: z.string().uuid().optional().nullable(),
});

export type CreateBudgetDto = z.infer<typeof CreateBudgetSchema>;

export const UpdateBudgetSchema = CreateBudgetSchema.partial();
export type UpdateBudgetDto = z.infer<typeof UpdateBudgetSchema>;

export const BudgetFiltersSchema = z.object({
  search: z.string().optional(),
  active: z.preprocess(
    v => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ),
  regroupementId: z.string().uuid().optional(),
  highlightId: z.string().uuid().optional(),
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).default(1),
  limit: z.preprocess(v => Number(v ?? 20), z.number().int().min(1).max(200)).default(20),
  sortBy: z.enum(['label', 'regroupement']).default('label'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type BudgetFiltersDto = z.infer<typeof BudgetFiltersSchema>;

export const RebuildBudgetBalancesSchema = z.object({
  referenceDate: z.string().datetime().optional(),
});

export type RebuildBudgetBalancesDto = z.infer<typeof RebuildBudgetBalancesSchema>;

// ─── Third Party / Tiers ─────────────────────────────────────────────────────

export const ThirdPartyMatchingConditionSchema = z.object({
  field: z.enum([
    ThirdPartyMatchingField.LABEL,
    ThirdPartyMatchingField.NORMALIZED_LABEL,
    ThirdPartyMatchingField.AMOUNT,
    ThirdPartyMatchingField.DIRECTION,
    ThirdPartyMatchingField.ACCOUNT_ID,
    ThirdPartyMatchingField.STATEMENT_REF,
    ThirdPartyMatchingField.COUNTERPARTY_NAME,
    ThirdPartyMatchingField.MEMO,
    ThirdPartyMatchingField.DAY_OF_MONTH,
  ]),
  matcher: z.enum([
    ThirdPartyMatchingMatcher.CONTAINS,
    ThirdPartyMatchingMatcher.EQUALS,
    ThirdPartyMatchingMatcher.STARTS_WITH,
    ThirdPartyMatchingMatcher.ENDS_WITH,
    ThirdPartyMatchingMatcher.REGEX,
    ThirdPartyMatchingMatcher.GT,
    ThirdPartyMatchingMatcher.GTE,
    ThirdPartyMatchingMatcher.LT,
    ThirdPartyMatchingMatcher.LTE,
    ThirdPartyMatchingMatcher.BETWEEN,
    ThirdPartyMatchingMatcher.IN,
  ]),
  value: z.string().optional().nullable(),
  value2: z.string().optional().nullable(),
  negate: z.boolean().default(false),
  position: z.number().int().min(0).default(0),
});

export type ThirdPartyMatchingConditionDto = z.infer<typeof ThirdPartyMatchingConditionSchema>;

export const ThirdPartyMatchingRuleSchema = z.object({
  label: z.string().min(1, 'Le libellé est obligatoire'),
  description: z.string().optional().nullable(),
  active: z.boolean().default(true),
  operator: z.enum([ThirdPartyMatchingOperator.AND, ThirdPartyMatchingOperator.OR]).default(ThirdPartyMatchingOperator.AND),
  stopOnMatch: z.boolean().default(false),
  conditions: z.array(ThirdPartyMatchingConditionSchema).default([]),
});

export type ThirdPartyMatchingRuleDto = z.infer<typeof ThirdPartyMatchingRuleSchema>;

export const ThirdPartyMatchingCandidateSchema = z.object({
  label: z.string().default(''),
  normalizedLabel: z.string().optional(),
  amount: z.number(),
  direction: z.enum(['expense', 'income']),
  accountId: z.string().uuid().optional().nullable(),
  statementRef: z.string().optional().nullable(),
  counterpartyName: z.string().optional().nullable(),
  memo: z.string().optional().nullable(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
});

export type ThirdPartyMatchingCandidateDto = z.infer<typeof ThirdPartyMatchingCandidateSchema>;

export const CreateThirdPartySchema = z.object({
  name: z.string().min(1, 'Le nom est obligatoire'),
  idSource: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  budgetBearer: z.boolean().default(false),
  ventilated: z.boolean().default(false),
  categoryId: z.string().uuid().optional().nullable(),
  budgetId: z.string().uuid().optional().nullable(),
  active: z.boolean().default(true),
  splits: z.array(z.object({
    label: z.string().optional().nullable(),
    expense: z.number().min(0).default(0),
    income: z.number().min(0).default(0),
    categoryId: z.string().uuid().optional().nullable(),
    budgetId: z.string().uuid().optional().nullable(),
  })).default([]),
  matchingRules: z.array(ThirdPartyMatchingRuleSchema).default([]),
});

export type CreateThirdPartyDto = z.infer<typeof CreateThirdPartySchema>;

export const UpdateThirdPartySchema = CreateThirdPartySchema.partial();
export type UpdateThirdPartyDto = z.infer<typeof UpdateThirdPartySchema>;

export const ThirdPartyFiltersSchema = z.object({
  search: z.string().optional(),
  active: z.preprocess(
    v => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ),
  highlightId: z.string().uuid().optional(),
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).default(1),
  limit: z.preprocess(v => Number(v ?? 20), z.number().int().min(1).max(200)).default(20),
  sortBy: z.enum(['name', 'comment', 'ventilated']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ThirdPartyFiltersDto = z.infer<typeof ThirdPartyFiltersSchema>;

// ─── Statistics ───────────────────────────────────────────────────────────────

export const StatisticsFiltersSchema = z.object({
  accountId: z.string().uuid().optional(),
  budgetId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  thirdPartyId: z.string().uuid().optional(),
  regroupementId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  includeClosedAccounts: z.boolean().default(false),
  includeManagedAccounts: z.boolean().default(false),
});

export type StatisticsFiltersDto = z.infer<typeof StatisticsFiltersSchema>;

// ─── Import Profiles ─────────────────────────────────────────────────────────

const CsvColumnSelectorSchema = z.object({
  headerName: z.string().min(1).optional(),
  columnIndex: z.number().int().min(0).optional(),
}).refine(
  value => value.headerName !== undefined || value.columnIndex !== undefined,
  'Un selecteur de colonne doit definir headerName ou columnIndex',
);

const LearnedBankCsvColumnSchema = z.object({
  headerName: z.string().min(1),
  columnIndex: z.number().int().min(0),
  field: z.enum([
    'ignore',
    'operationDate',
    'label',
    'comment',
    'pieceNumber',
    'amount',
    'expense',
    'income',
    'statementRef',
  ]),
  type: z.enum(['text', 'date', 'decimal', 'signedAmount']),
});

const BankCsvFileConfigSchema = z.object({
  delimiter: z.string().min(1).max(1),
  encoding: z.string().min(1).default('utf-8'),
  hasHeader: z.boolean().default(true),
  startLine: z.number().int().min(1).default(2),
});

const BankCsvDateMappingSchema = z.object({
  column: CsvColumnSelectorSchema,
  format: z.string().min(1),
});

const BankCsvLabelMappingSchema = z.object({
  column: CsvColumnSelectorSchema,
});

const BankCsvCommentMappingSchema = z.object({
  column: CsvColumnSelectorSchema,
}).optional();

const BankCsvPieceNumberMappingSchema = z.object({
  column: CsvColumnSelectorSchema,
}).optional();

const BankCsvStatementRefMappingSchema = z.object({
  column: CsvColumnSelectorSchema,
}).optional();

const BankCsvSingleAmountMappingSchema = z.object({
  mode: z.literal('singleAmountSigned'),
  column: CsvColumnSelectorSchema,
  decimalSeparator: z.string().min(1).max(1).default(','),
  thousandsSeparator: z.string().max(1).nullable().optional(),
  negativeIsExpense: z.boolean().default(true),
  positiveIsIncome: z.boolean().default(true),
});

const BankCsvSeparateAmountMappingSchema = z.object({
  mode: z.literal('separateExpenseIncome'),
  expenseColumn: CsvColumnSelectorSchema,
  incomeColumn: CsvColumnSelectorSchema,
  decimalSeparator: z.string().min(1).max(1).default(','),
  thousandsSeparator: z.string().max(1).nullable().optional(),
});

const BankCsvAmountMappingSchema = z.discriminatedUnion('mode', [
  BankCsvSingleAmountMappingSchema,
  BankCsvSeparateAmountMappingSchema,
]);

const BankCsvDedupeSchema = z.object({
  strategy: z.enum(['account-date-amount-label']).default('account-date-amount-label'),
  includeStatementRef: z.boolean().default(true),
});

export const BankCsvMappingSchema = z.object({
  version: z.literal(1).default(1),
  kind: z.literal('bank-csv'),
  bankKey: z.string().min(1),
  bankLabel: z.string().min(1),
  file: BankCsvFileConfigSchema,
  date: BankCsvDateMappingSchema,
  label: BankCsvLabelMappingSchema,
  comment: BankCsvCommentMappingSchema,
  pieceNumber: BankCsvPieceNumberMappingSchema,
  statementRef: BankCsvStatementRefMappingSchema,
  amount: BankCsvAmountMappingSchema,
  dedupe: BankCsvDedupeSchema.default({
    strategy: 'account-date-amount-label',
    includeStatementRef: true,
  }),
  learnedColumns: z.array(LearnedBankCsvColumnSchema).optional(),
});

export type BankCsvMappingDto = z.infer<typeof BankCsvMappingSchema>;

export const CreateImportProfileSchema = z.object({
  name: z.string().min(1, 'Le nom du masque est obligatoire'),
  source: z.literal(ImportSource.BANK_FILE).default(ImportSource.BANK_FILE),
  mapping: BankCsvMappingSchema,
  active: z.boolean().default(true),
});

export type CreateImportProfileDto = z.infer<typeof CreateImportProfileSchema>;

export const UpdateImportProfileSchema = CreateImportProfileSchema.partial();
export type UpdateImportProfileDto = z.infer<typeof UpdateImportProfileSchema>;

export const ImportProfileFiltersSchema = z.object({
  source: z.enum([ImportSource.BANK_FILE]).optional(),
  bankKey: z.string().optional(),
  active: z.preprocess(
    v => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ),
  search: z.string().optional(),
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).default(1),
  limit: z.preprocess(v => Number(v ?? 20), z.number().int().min(1).max(200)).default(20),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ImportProfileFiltersDto = z.infer<typeof ImportProfileFiltersSchema>;

export const BankCsvPreviewSchema = z.object({
  profileId: z.string().uuid().optional(),
  mapping: BankCsvMappingSchema.optional(),
  csvContent: z.string().min(1, 'Le contenu CSV est obligatoire'),
  accountId: z.string().uuid().optional().nullable(),
  integrationDate: z.string().datetime().optional(),
  reference: z.string().optional().nullable(),
}).refine(
  value => value.profileId !== undefined || value.mapping !== undefined,
  'Un profileId ou un mapping inline est obligatoire',
);

export type BankCsvPreviewDto = z.infer<typeof BankCsvPreviewSchema>;

export const BankCsvConfirmLineSchema = z.object({
  lineNum: z.number().int().min(1),
  operationDate: z.string().datetime(),
  label: z.string().min(1),
  comment: z.string().nullable().optional(),
  pieceNumber: z.string().nullable().optional(),
  expense: z.string().nullable().optional(),
  income: z.string().nullable().optional(),
  statementRef: z.string().nullable().optional(),
});

export type BankCsvConfirmLineDto = z.infer<typeof BankCsvConfirmLineSchema>;

export const BankCsvConfirmSchema = z.object({
  accountId: z.string().uuid(),
  profileId: z.string().uuid().optional(),
  integrationDate: z.string().datetime(),
  reference: z.string().trim().length(9, 'Le numéro de lot doit contenir exactement 9 caractères'),
  lines: z.array(BankCsvConfirmLineSchema).min(1, 'Au moins une ligne doit être sélectionnée'),
});

export type BankCsvConfirmDto = z.infer<typeof BankCsvConfirmSchema>;
