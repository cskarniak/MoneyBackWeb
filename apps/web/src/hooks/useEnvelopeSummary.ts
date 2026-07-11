import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type EnvelopeSummaryFilters = {
  accountId?: string;
  referenceDate?: string;
  useDueDate?: boolean;
};

export type EnvelopeSummaryItem = {
  budgetId: string;
  budgetLabel: string;
  budgetActive: boolean;
  budgetGroupingId: string | null;
  budgetGroupingLabel: string | null;
  totalExpense: string;
  totalIncome: string;
  totalBalance: string;
  operationCount: number;
  lastEffectiveDate: string | null;
};

export type EnvelopeSummaryResponse = {
  referenceDate: string;
  items: EnvelopeSummaryItem[];
};

const KEY = 'envelope-summary';

function normalizeItem(item: Record<string, unknown>): EnvelopeSummaryItem {
  return {
    budgetId: String(item.budgetId),
    budgetLabel: String(item.budgetLabel),
    budgetActive: Boolean(item.budgetActive),
    budgetGroupingId: item.budgetGroupingId ? String(item.budgetGroupingId) : null,
    budgetGroupingLabel: item.budgetGroupingLabel ? String(item.budgetGroupingLabel) : null,
    totalExpense: String(item.totalExpense ?? '0'),
    totalIncome: String(item.totalIncome ?? '0'),
    totalBalance: String(item.totalBalance ?? '0'),
    operationCount: Number(item.operationCount ?? 0),
    lastEffectiveDate: item.lastEffectiveDate ? String(item.lastEffectiveDate) : null,
  };
}

export function useEnvelopeSummary(filters: EnvelopeSummaryFilters | null) {
  return useQuery<EnvelopeSummaryResponse>({
    queryKey: [KEY, filters],
    queryFn: () =>
      api.get('/statistics/envelope-summary', { params: filters ?? {} }).then(response => ({
        referenceDate: String(response.data.referenceDate),
        items: (response.data.items as Record<string, unknown>[]).map(normalizeItem),
      })),
    enabled: filters !== null,
  });
}
