import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type Regroupement = {
  id: string;
  label: string;
  expense: boolean;
  income: boolean;
  dashboard: boolean;
};

export type TypeMouvement = {
  id: string;
  label: string;
  code: string | null;
};

export type Enveloppe = {
  id: string;
  label: string;
  idSource: string | null;
  comment: string | null;
  summary: boolean;
  dashboard: boolean;
  active: boolean;
  balance: string;
  invoiceBalance: string;
  balanceReferenceDate: string | null;
  regroupementId: string | null;
  regroupement: Regroupement | null;
  regroupementTableauDeBordId: string | null;
  regroupementTableauDeBord: Regroupement | null;
  movementTypeId: string | null;
  typeMouvement: TypeMouvement | null;
  createdAt: string;
  updatedAt: string;
};

export type EnveloppesResponse = {
  items: Enveloppe[];
  total: number;
  page: number;
  limit: number;
  highlightIndex: number | null;
};

export type EnveloppeFilters = {
  search?: string;
  active?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'label' | 'regroupement';
  sortOrder?: 'asc' | 'desc';
  highlightId?: string;
};

export type EnveloppePayload = {
  label: string;
  idSource?: string | null;
  comment?: string | null;
  summary: boolean;
  dashboard: boolean;
  active: boolean;
  regroupementId?: string | null;
  regroupementTableauDeBordId?: string | null;
  movementTypeId?: string | null;
};

const KEY = 'enveloppes';

function normalizeEnveloppe(enveloppe: Record<string, unknown>): Enveloppe {
  const regroupement =
    (enveloppe.regroupement as Regroupement | null | undefined) ??
    (enveloppe.grouping as Regroupement | null | undefined) ??
    null;
  const regroupementTableauDeBord =
    (enveloppe.regroupementTableauDeBord as Regroupement | null | undefined) ??
    (enveloppe.dashboardGrouping as Regroupement | null | undefined) ??
    null;
  const typeMouvement =
    (enveloppe.typeMouvement as TypeMouvement | null | undefined) ??
    (enveloppe.movementType as TypeMouvement | null | undefined) ??
    null;

  return {
    ...enveloppe,
    balance: String(enveloppe.balance ?? '0'),
    invoiceBalance: String(enveloppe.invoiceBalance ?? '0'),
    regroupementId:
      (enveloppe.regroupementId as string | null | undefined) ??
      (enveloppe.groupingId as string | null | undefined) ??
      null,
    regroupement,
    regroupementTableauDeBordId:
      (enveloppe.regroupementTableauDeBordId as string | null | undefined) ??
      (enveloppe.dashboardGroupingId as string | null | undefined) ??
      null,
    regroupementTableauDeBord,
    movementTypeId:
      (enveloppe.movementTypeId as string | null | undefined) ?? null,
    typeMouvement,
  } as Enveloppe;
}

export function useEnveloppes(filters: EnveloppeFilters) {
  return useQuery<EnveloppesResponse>({
    queryKey: [KEY, filters],
    queryFn: () =>
      api.get('/budgets', { params: filters }).then(r => ({
        ...r.data,
        items: (r.data.items as Record<string, unknown>[]).map(normalizeEnveloppe),
      })),
  });
}

export function useEnveloppesAll() {
  return useQuery<Enveloppe[]>({
    queryKey: [KEY, 'all'],
    queryFn: () =>
      api.get('/budgets', { params: { limit: 200, sortBy: 'label', sortOrder: 'asc' } }).then(r =>
        (r.data.items as Record<string, unknown>[]).map(normalizeEnveloppe),
      ),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useEnveloppe(id: string) {
  return useQuery<Enveloppe>({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/budgets/${id}`).then(r => normalizeEnveloppe(r.data)),
    enabled: !!id,
  });
}

export function useCreateEnveloppe() {
  const qc = useQueryClient();
  return useMutation<Enveloppe, Error, EnveloppePayload>({
    mutationFn: payload => api.post('/budgets', payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateEnveloppe() {
  const qc = useQueryClient();
  return useMutation<Enveloppe, Error, { id: string } & Partial<EnveloppePayload>>({
    mutationFn: ({ id, ...payload }) => api.patch(`/budgets/${id}`, payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteEnveloppe() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: id => api.delete(`/budgets/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export type RebuildBudgetBalancesResult = {
  updatedCount: number;
  referenceDate: string;
};

export function useRebuildBudgetBalances() {
  const qc = useQueryClient();
  return useMutation<RebuildBudgetBalancesResult, Error, { referenceDate?: string } | void>({
    mutationFn: payload => api.post('/budgets/rebuild-balances', payload ?? {}).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
