import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type SimpleRef = { id: string; label?: string; name?: string };

export type OperationSplit = {
  id?: string;
  label: string | null;
  expense: string;
  income: string;
  categoryId: string | null;
  budgetId: string | null;
  categorie: { id: string; label: string } | null;
  enveloppe: { id: string; label: string } | null;
};

export type Operation = {
  id: string;
  label: string;
  expense: string;
  income: string;
  balance: string | null;
  operationDate: string;
  dueDate: string | null;
  integrationDate: string | null;
  pieceNumber: string | null;
  lettering: string | null;
  comment: string | null;
  statementRef: string | null;
  operationType: string | null;
  operationValidated: string | null;
  locked: boolean;
  closed: boolean;
  accountId: string;
  budgetId: string | null;
  categoryId: string | null;
  thirdPartyId: string | null;
  compte: { id: string; name: string } | null;
  enveloppe: { id: string; label: string } | null;
  categorie: { id: string; label: string } | null;
  tiers: { id: string; name: string } | null;
  splits: OperationSplit[];
  createdAt: string;
  updatedAt: string;
};

export type OperationsResponse = {
  items: Operation[];
  total: number;
  page: number;
  limit: number;
};

export type OperationFilters = {
  search?: string;
  accountId?: string;
  hideLocked?: boolean;
  hideReconciled?: boolean;
  emptyEnvelopeOnly?: boolean;
  unvalidatedOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'operationDate' | 'label' | 'expense' | 'income';
  sortOrder?: 'asc' | 'desc';
};

export type OperationSplitPayload = {
  label?: string | null;
  expense: number;
  income: number;
  categoryId?: string | null;
  budgetId?: string | null;
};

export type OperationPayload = {
  accountId: string;
  label: string;
  expense: number;
  income: number;
  operationDate: string;
  dueDate?: string | null;
  budgetId?: string | null;
  categoryId?: string | null;
  thirdPartyId?: string | null;
  lettering?: string | null;
  comment?: string | null;
  pieceNumber?: string | null;
  statementRef?: string | null;
  operationValidated?: string | null;
  locked?: boolean;
  closed?: boolean;
  splits?: OperationSplitPayload[];
};

const KEY = 'operations';

function normalizeOperationSplit(split: Record<string, unknown>): OperationSplit {
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

function normalizeOperation(operation: Record<string, unknown>): Operation {
  return {
    ...operation,
    expense: String(operation.expense ?? '0'),
    income: String(operation.income ?? '0'),
    balance:
      operation.balance === null || operation.balance === undefined
        ? null
        : String(operation.balance),
    lettering: (operation.lettering as string | null | undefined) ?? null,
    comment: (operation.comment as string | null | undefined) ?? null,
    operationValidated: (operation.operationValidated as string | null | undefined) ?? null,
    budgetId: (operation.budgetId as string | null | undefined) ?? null,
    categoryId: (operation.categoryId as string | null | undefined) ?? null,
    thirdPartyId: (operation.thirdPartyId as string | null | undefined) ?? null,
    compte: (operation.compte as { id: string; name: string } | null | undefined) ?? null,
    enveloppe: (operation.enveloppe as { id: string; label: string } | null | undefined) ?? null,
    categorie: (operation.categorie as { id: string; label: string } | null | undefined) ?? null,
    tiers: (operation.tiers as { id: string; name: string } | null | undefined) ?? null,
    splits: ((operation.splits as Record<string, unknown>[] | undefined) ?? []).map(normalizeOperationSplit),
  } as Operation;
}

export function useOperations(filters: OperationFilters) {
  return useQuery<OperationsResponse>({
    queryKey: [KEY, filters],
    queryFn: () =>
      api.get('/operations', { params: filters }).then(r => ({
        ...r.data,
        items: (r.data.items as Record<string, unknown>[]).map(normalizeOperation),
      })),
  });
}

export function useOperation(id: string) {
  return useQuery<Operation>({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/operations/${id}`).then(r => normalizeOperation(r.data)),
    enabled: !!id,
  });
}

export function useCreateOperation() {
  const qc = useQueryClient();
  return useMutation<Operation, Error, OperationPayload>({
    mutationFn: payload => api.post('/operations', payload).then(r => normalizeOperation(r.data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateOperation() {
  const qc = useQueryClient();
  return useMutation<Operation, Error, { id: string } & Partial<OperationPayload>>({
    mutationFn: ({ id, ...payload }) =>
      api.patch(`/operations/${id}`, payload).then(r => normalizeOperation(r.data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteOperation() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: id => api.delete(`/operations/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
