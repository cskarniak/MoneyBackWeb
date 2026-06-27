import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

const ACCOUNTS_KEY = 'accounts';
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
  idSource: string | null;
  label: string;
  expense: string;
  income: string;
  balance: string | null;
  simulation: boolean;
  operationDate: string;
  dueDate: string | null;
  integrationDate: string | null;
  pieceNumber: string | null;
  lettering: string | null;
  comment: string | null;
  statementRef: string | null;
  operationType: string | null;
  entryMode: string | null;
  operationValidated: string | null;
  locked: boolean;
  closed: boolean;
  accountId: string;
  budgetId: string | null;
  categoryId: string | null;
  thirdPartyId: string | null;
  paymentMethodId: string | null;
  movementTypeId: string | null;
  compte: { id: string; name: string } | null;
  enveloppe: { id: string; label: string } | null;
  categorie: { id: string; label: string } | null;
  tiers: { id: string; name: string } | null;
  moyenPaiement: { id: string; label: string; code: string | null } | null;
  typeMouvement: { id: string; label: string; code: string | null } | null;
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
  operationId?: string;
  search?: string;
  accountId?: string;
  statementRef?: string;
  hideLocked?: boolean;
  emptyEnvelopeOnly?: boolean;
  unvalidatedOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'operationDate' | 'label' | 'expense' | 'income';
  sortOrder?: 'asc' | 'desc';
};

type UseOperationsOptions = {
  enabled?: boolean;
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
  simulation?: boolean;
  operationDate: string;
  dueDate?: string | null;
  budgetId?: string | null;
  categoryId?: string | null;
  thirdPartyId?: string | null;
  paymentMethodId?: string | null;
  movementTypeId?: string | null;
  lettering?: string | null;
  comment?: string | null;
  pieceNumber?: string | null;
  statementRef?: string | null;
  operationValidated?: string | null;
  locked?: boolean;
  closed?: boolean;
  splits?: OperationSplitPayload[];
};

export type DeleteStatementImportPayload = {
  accountId: string;
  statementRef: string;
};

export type DeleteStatementImportResult = {
  accountId: string;
  statementRef: string;
  deletedCount: number;
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
    simulation: Boolean(operation.simulation),
    lettering: (operation.lettering as string | null | undefined) ?? null,
    comment: (operation.comment as string | null | undefined) ?? null,
    entryMode: (operation.entryMode as string | null | undefined) ?? null,
    operationValidated: (operation.operationValidated as string | null | undefined) ?? null,
    budgetId: (operation.budgetId as string | null | undefined) ?? null,
    categoryId: (operation.categoryId as string | null | undefined) ?? null,
    thirdPartyId: (operation.thirdPartyId as string | null | undefined) ?? null,
    paymentMethodId: (operation.paymentMethodId as string | null | undefined) ?? null,
    movementTypeId: (operation.movementTypeId as string | null | undefined) ?? null,
    compte: (operation.compte as { id: string; name: string } | null | undefined) ?? null,
    enveloppe: (operation.enveloppe as { id: string; label: string } | null | undefined) ?? null,
    categorie: (operation.categorie as { id: string; label: string } | null | undefined) ?? null,
    tiers: (operation.tiers as { id: string; name: string } | null | undefined) ?? null,
    moyenPaiement: (operation.moyenPaiement as { id: string; label: string; code: string | null } | null | undefined) ?? null,
    typeMouvement: (operation.typeMouvement as { id: string; label: string; code: string | null } | null | undefined) ?? null,
    splits: ((operation.splits as Record<string, unknown>[] | undefined) ?? []).map(normalizeOperationSplit),
  } as Operation;
}

export function useOperations(filters: OperationFilters, options?: UseOperationsOptions) {
  return useQuery<OperationsResponse>({
    queryKey: [KEY, filters],
    queryFn: () =>
      api.get('/operations', { params: filters }).then(r => ({
        ...r.data,
        items: (r.data.items as Record<string, unknown>[]).map(normalizeOperation),
      })),
    enabled: options?.enabled ?? true,
  });
}

export function useOperation(id: string) {
  return useQuery<Operation>({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/operations/${id}`).then(r => normalizeOperation(r.data)),
    enabled: !!id,
  });
}

export function useOperationStatementRefs(accountId?: string) {
  return useQuery<string[]>({
    queryKey: [KEY, 'statement-refs', accountId ?? 'all'],
    queryFn: () =>
      api.get('/operations/statement-refs', {
        params: accountId ? { accountId } : undefined,
      }).then(r => r.data as string[]),
    enabled: !!accountId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useCreateOperation() {
  const qc = useQueryClient();
  return useMutation<Operation, Error, OperationPayload>({
    mutationFn: payload => api.post('/operations', payload).then(r => normalizeOperation(r.data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
    },
  });
}

export function useUpdateOperation() {
  const qc = useQueryClient();
  return useMutation<Operation, Error, { id: string } & Partial<OperationPayload>>({
    mutationFn: ({ id, ...payload }) =>
      api.patch(`/operations/${id}`, payload).then(r => normalizeOperation(r.data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
    },
  });
}

export function useDeleteOperation() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: id => api.delete(`/operations/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
    },
  });
}

export function useDeleteStatementImport() {
  const qc = useQueryClient();
  return useMutation<DeleteStatementImportResult, Error, DeleteStatementImportPayload>({
    mutationFn: payload =>
      api.delete('/operations/statement-import', { data: payload }).then(r => r.data as DeleteStatementImportResult),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
    },
  });
}
