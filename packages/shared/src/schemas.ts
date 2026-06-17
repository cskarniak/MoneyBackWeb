import { z } from 'zod';
import {
  Periodicity,
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
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).default(1),
  limit: z.preprocess(v => Number(v ?? 20), z.number().int().min(1).max(200)).default(20),
  sortBy: z.enum(['name', 'agency', 'number']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type AccountFiltersDto = z.infer<typeof AccountFiltersSchema>;

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
  operationDate: z.string().datetime(),
  dueDate: z.string().datetime().optional().nullable(),
  budgetId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  thirdPartyId: z.string().uuid().optional(),
  lettering: z.string().optional(),
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
  reconciled: z.preprocess(
    v => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ),
  hideLocked: z.preprocess(
    v => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ),
  hideReconciled: z.preprocess(
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

// ─── Subscription ─────────────────────────────────────────────────────────────

export const CreateSubscriptionSchema = z.object({
  accountId: z.string().uuid(),
  label: z.string().min(1),
  entryLabel: z.string().optional(),
  expense: z.number().min(0).default(0),
  income: z.number().min(0).default(0),
  periodicity: z.enum([
    Periodicity.WEEKLY,
    Periodicity.MONTHLY,
    Periodicity.QUARTERLY,
    Periodicity.ANNUAL,
  ]),
  dayOfPeriod: z.number().int().min(1).max(31).optional(),
  firstDueDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  budgetId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  thirdPartyId: z.string().uuid().optional(),
});

export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionSchema>;

// ─── Category ─────────────────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
  label: z.string().min(1, 'Le libellé est obligatoire'),
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
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).default(1),
  limit: z.preprocess(v => Number(v ?? 20), z.number().int().min(1).max(200)).default(20),
  sortBy: z.enum(['label', 'regroupement']).default('label'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CategoryFiltersDto = z.infer<typeof CategoryFiltersSchema>;

// ─── Grouping ─────────────────────────────────────────────────────────────────

export const CreateGroupingSchema = z.object({
  label: z.string().min(1, 'Le libellé est obligatoire'),
  expense: z.boolean().default(false),
  income: z.boolean().default(false),
  dashboard: z.boolean().default(false),
});

export type CreateGroupingDto = z.infer<typeof CreateGroupingSchema>;

export const UpdateGroupingSchema = CreateGroupingSchema.partial();
export type UpdateGroupingDto = z.infer<typeof UpdateGroupingSchema>;

export const GroupingFiltersSchema = z.object({
  search: z.string().optional(),
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).default(1),
  limit: z.preprocess(v => Number(v ?? 10), z.number().int().min(1).max(200)).default(10),
  sortBy: z.enum(['label']).default('label'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type GroupingFiltersDto = z.infer<typeof GroupingFiltersSchema>;

// ─── Budget / Enveloppe ──────────────────────────────────────────────────────

export const CreateBudgetSchema = z.object({
  label: z.string().min(1, 'Le libellé est obligatoire'),
  legacyCode: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  summary: z.boolean().default(false),
  dashboard: z.boolean().default(false),
  active: z.boolean().default(true),
  regroupementId: z.string().uuid().optional().nullable(),
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
  page: z.preprocess(v => Number(v ?? 1), z.number().int().min(1)).default(1),
  limit: z.preprocess(v => Number(v ?? 20), z.number().int().min(1).max(200)).default(20),
  sortBy: z.enum(['label', 'regroupement']).default('label'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type BudgetFiltersDto = z.infer<typeof BudgetFiltersSchema>;

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
  priority: z.number().int().default(100),
  score: z.number().int().min(0).default(100),
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
  comment: z.string().optional().nullable(),
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
