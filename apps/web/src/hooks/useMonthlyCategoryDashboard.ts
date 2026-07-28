import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type MonthlyCategoryDashboardFilters = {
  accountId?: string;
  monthFrom: string;
  monthTo: string;
};

export type MonthlyAmount = {
  totalExpense: string;
  totalIncome: string;
};

export type MonthlyCategoryDashboardItem = {
  groupingId: string | null;
  groupingLabel: string;
  kind: 'expense' | 'income';
  monthly: Record<string, MonthlyAmount>;
};

export type MonthlyCategoryDashboardResponse = {
  months: string[];
  items: MonthlyCategoryDashboardItem[];
};

const KEY = 'monthly-category-dashboard';

export function useMonthlyCategoryDashboard(filters: MonthlyCategoryDashboardFilters | null) {
  return useQuery<MonthlyCategoryDashboardResponse>({
    queryKey: [KEY, filters],
    queryFn: () =>
      api.get('/statistics/monthly-category-dashboard', { params: filters ?? {} }).then(r => r.data),
    enabled: filters !== null,
  });
}
