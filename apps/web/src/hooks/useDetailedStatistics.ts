import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type DetailedStatisticsFilters = {
  accountId?: string;
  budgetId?: string;
  categoryId?: string;
  thirdPartyId?: string;
  categoryGroupingId?: string;
  budgetGroupingId?: string;
  pieceNumber?: string;
  operationDateFrom?: string;
  operationDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  sortByDueDate?: boolean;
  page?: number;
  limit?: number;
  sortKey?: 'accountName' | 'operationDate' | 'effectiveDueDate' | 'pieceNumber' | 'label' | 'balance' | 'thirdPartyName' | 'budgetLabel' | 'categoryLabel';
  sortDirection?: 'asc' | 'desc';
};

export type DetailedStatisticsItem = {
  operationId: string;
  splitId: string | null;
  accountId: string;
  accountName: string;
  operationDate: string;
  dueDate: string | null;
  effectiveDueDate: string;
  pieceNumber: string | null;
  label: string;
  expense: string;
  income: string;
  balance: string;
  runningBalance: string;
  thirdPartyId: string | null;
  thirdPartyName: string | null;
  budgetId: string | null;
  budgetLabel: string | null;
  categoryId: string | null;
  categoryLabel: string | null;
  categoryGroupingId: string | null;
  categoryGroupingLabel: string | null;
  budgetGroupingId: string | null;
  budgetGroupingLabel: string | null;
  operationType: string | null;
  lettering: string | null;
};

export type DetailedStatisticsResponse = {
  total: number;
  page: number;
  limit: number;
  totalBalance: string;
  items: DetailedStatisticsItem[];
};

const KEY = 'detailed-statistics';

function normalizeItem(item: Record<string, unknown>): DetailedStatisticsItem {
  return {
    operationId: String(item.operationId),
    splitId: item.splitId ? String(item.splitId) : null,
    accountId: String(item.accountId),
    accountName: String(item.accountName),
    operationDate: String(item.operationDate),
    dueDate: item.dueDate ? String(item.dueDate) : null,
    effectiveDueDate: String(item.effectiveDueDate),
    pieceNumber: item.pieceNumber ? String(item.pieceNumber) : null,
    label: String(item.label),
    expense: String(item.expense ?? '0'),
    income: String(item.income ?? '0'),
    balance: String(item.balance ?? '0'),
    runningBalance: String(item.runningBalance ?? '0'),
    thirdPartyId: item.thirdPartyId ? String(item.thirdPartyId) : null,
    thirdPartyName: item.thirdPartyName ? String(item.thirdPartyName) : null,
    budgetId: item.budgetId ? String(item.budgetId) : null,
    budgetLabel: item.budgetLabel ? String(item.budgetLabel) : null,
    categoryId: item.categoryId ? String(item.categoryId) : null,
    categoryLabel: item.categoryLabel ? String(item.categoryLabel) : null,
    categoryGroupingId: item.categoryGroupingId ? String(item.categoryGroupingId) : null,
    categoryGroupingLabel: item.categoryGroupingLabel ? String(item.categoryGroupingLabel) : null,
    budgetGroupingId: item.budgetGroupingId ? String(item.budgetGroupingId) : null,
    budgetGroupingLabel: item.budgetGroupingLabel ? String(item.budgetGroupingLabel) : null,
    operationType: item.operationType ? String(item.operationType) : null,
    lettering: item.lettering ? String(item.lettering) : null,
  };
}

export function useDetailedStatistics(filters: DetailedStatisticsFilters | null) {
  return useQuery<DetailedStatisticsResponse>({
    queryKey: [KEY, filters],
    queryFn: () =>
      api.get('/statistics/detailed', { params: filters ?? {} }).then(response => ({
        total: Number(response.data.total ?? 0),
        page: Number(response.data.page ?? 1),
        limit: Number(response.data.limit ?? 20),
        totalBalance: String(response.data.totalBalance ?? '0'),
        items: (response.data.items as Record<string, unknown>[]).map(normalizeItem),
      })),
    enabled: filters !== null,
  });
}
