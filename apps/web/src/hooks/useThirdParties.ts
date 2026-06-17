import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type ThirdParty = {
  id: string;
  name: string;
  comment: string | null;
  ventilated: boolean;
  categoryId: string | null;
  budgetId: string | null;
  categorie: { id: string; label: string } | null;
  enveloppe: { id: string; label: string } | null;
  active: boolean;
  matchingRules: ThirdPartyMatchingRule[];
  splits: ThirdPartySplit[];
};

export type ThirdPartyMatchingCondition = {
  id?: string;
  field: string;
  matcher: string;
  value: string | null;
  value2: string | null;
  negate: boolean;
  position: number;
};

export type ThirdPartyMatchingRule = {
  id?: string;
  label: string;
  description: string | null;
  active: boolean;
  priority: number;
  score: number;
  operator: 'AND' | 'OR';
  stopOnMatch: boolean;
  conditions: ThirdPartyMatchingCondition[];
};

export type ThirdPartySplit = {
  id?: string;
  label: string | null;
  expense: string;
  income: string;
  categoryId: string | null;
  budgetId: string | null;
  categorie: { id: string; label: string } | null;
  enveloppe: { id: string; label: string } | null;
};

export type ThirdPartiesResponse = {
  items: ThirdParty[];
  total: number;
  page: number;
  limit: number;
};

export type ThirdPartyFilters = {
  search?: string;
  active?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'comment' | 'ventilated';
  sortOrder?: 'asc' | 'desc';
};

export type ThirdPartyPayload = {
  name: string;
  comment?: string | null;
  ventilated: boolean;
  categoryId?: string | null;
  budgetId?: string | null;
  active: boolean;
  matchingRules?: Array<{
    label: string;
    description?: string | null;
    active: boolean;
    priority: number;
    score: number;
    operator: 'AND' | 'OR';
    stopOnMatch: boolean;
    conditions: Array<{
      field: string;
      matcher: string;
      value?: string | null;
      value2?: string | null;
      negate: boolean;
      position: number;
    }>;
  }>;
  splits?: Array<{
    label?: string | null;
    expense: number;
    income: number;
    categoryId?: string | null;
    budgetId?: string | null;
  }>;
};

const KEY = 'third-parties';

function normalizeThirdPartySplit(split: Record<string, unknown>): ThirdPartySplit {
  return {
    ...split,
    label: (split.label as string | null | undefined) ?? null,
    expense: String(split.expense ?? '0'),
    income: String(split.income ?? '0'),
    categoryId: (split.categoryId as string | null | undefined) ?? null,
    budgetId: (split.budgetId as string | null | undefined) ?? null,
    categorie: (split.categorie as { id: string; label: string } | null | undefined) ?? null,
    enveloppe: (split.enveloppe as { id: string; label: string } | null | undefined) ?? null,
  };
}

function normalizeThirdParty(thirdParty: Record<string, unknown>): ThirdParty {
  return {
    ...thirdParty,
    comment: (thirdParty.comment as string | null | undefined) ?? null,
    categoryId: (thirdParty.categoryId as string | null | undefined) ?? null,
    budgetId: (thirdParty.budgetId as string | null | undefined) ?? null,
    categorie: (thirdParty.categorie as { id: string; label: string } | null | undefined) ?? null,
    enveloppe: (thirdParty.enveloppe as { id: string; label: string } | null | undefined) ?? null,
    matchingRules: ((thirdParty.matchingRules as Record<string, unknown>[] | undefined) ?? []).map(rule => ({
      ...rule,
      description: (rule.description as string | null | undefined) ?? null,
      operator: ((rule.operator as 'AND' | 'OR' | undefined) ?? 'AND'),
      conditions: ((rule.conditions as Record<string, unknown>[] | undefined) ?? []).map(condition => ({
        ...condition,
        value: (condition.value as string | null | undefined) ?? null,
        value2: (condition.value2 as string | null | undefined) ?? null,
        position: Number(condition.position ?? 0),
      })),
    })) as ThirdPartyMatchingRule[],
    splits: ((thirdParty.splits as Record<string, unknown>[] | undefined) ?? []).map(normalizeThirdPartySplit),
  } as ThirdParty;
}

export function useThirdParties(filters: ThirdPartyFilters) {
  return useQuery<ThirdPartiesResponse>({
    queryKey: [KEY, filters],
    queryFn: () =>
      api.get('/third-parties', { params: filters }).then(r => ({
        ...r.data,
        items: (r.data.items as Record<string, unknown>[]).map(normalizeThirdParty),
      })),
  });
}

export function useThirdPartiesAll() {
  return useQuery<ThirdParty[]>({
    queryKey: [KEY, 'all'],
    queryFn: () =>
      api.get('/third-parties', { params: { limit: 200, sortBy: 'name', sortOrder: 'asc' } }).then(r =>
        (r.data.items as Record<string, unknown>[]).map(normalizeThirdParty),
      ),
    staleTime: 5 * 60_000,
  });
}

export function useThirdParty(id: string) {
  return useQuery<ThirdParty>({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/third-parties/${id}`).then(r => normalizeThirdParty(r.data)),
    enabled: !!id,
  });
}

export function useCreateThirdParty() {
  const qc = useQueryClient();
  return useMutation<ThirdParty, Error, ThirdPartyPayload>({
    mutationFn: payload => api.post('/third-parties', payload).then(r => normalizeThirdParty(r.data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateThirdParty() {
  const qc = useQueryClient();
  return useMutation<ThirdParty, Error, { id: string } & Partial<ThirdPartyPayload>>({
    mutationFn: ({ id, ...payload }) => api.patch(`/third-parties/${id}`, payload).then(r => normalizeThirdParty(r.data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteThirdParty() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: id => api.delete(`/third-parties/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
