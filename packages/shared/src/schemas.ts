import { z } from 'zod';
import { Periodicity } from './enums';

// ─── Account ──────────────────────────────────────────────────────────────────

export const CreateAccountSchema = z.object({
  name: z.string().min(1),
  agency: z.string().optional(),
  number: z.string().optional(),
  rib: z.string().optional(),
  bankUrl: z.string().url().optional(),
  bankLogin: z.string().optional(),
  comment: z.string().optional(),
  managedForOther: z.boolean().default(false),
});

export type CreateAccountDto = z.infer<typeof CreateAccountSchema>;

// ─── Operation ────────────────────────────────────────────────────────────────

export const CreateOperationSchema = z.object({
  accountId: z.string().uuid(),
  label: z.string().min(1),
  expense: z.number().min(0).default(0),
  income: z.number().min(0).default(0),
  operationDate: z.string().datetime(),
  budgetId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  thirdPartyId: z.string().uuid().optional(),
  paymentMethodId: z.string().uuid().optional(),
  movementTypeId: z.string().uuid().optional(),
  pieceNumber: z.string().optional(),
  statementRef: z.string().optional(),
});

export type CreateOperationDto = z.infer<typeof CreateOperationSchema>;

export const OperationFiltersSchema = z.object({
  accountId: z.string().uuid().optional(),
  budgetId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  thirdPartyId: z.string().uuid().optional(),
  statementRef: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  locked: z.boolean().optional(),
  reconciled: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(500).default(100),
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

// ─── Statistics ───────────────────────────────────────────────────────────────

export const StatisticsFiltersSchema = z.object({
  accountId: z.string().uuid().optional(),
  budgetId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  thirdPartyId: z.string().uuid().optional(),
  groupingId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  includeClosedAccounts: z.boolean().default(false),
  includeManagedAccounts: z.boolean().default(false),
});

export type StatisticsFiltersDto = z.infer<typeof StatisticsFiltersSchema>;
