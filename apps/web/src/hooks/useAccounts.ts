import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type Account = {
  id: string;
  name: string;
  agency: string | null;
  number: string | null;
  rib: string | null;
  bankUrl: string | null;
  bankLogin: string | null;
  comment: string | null;
  openingBalance: string | null;
  managedForOther: boolean;
  closed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AccountsResponse = {
  items: Account[];
  total: number;
  page: number;
  limit: number;
};

export type AccountFilters = {
  search?: string;
  closed?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'agency' | 'number';
  sortOrder?: 'asc' | 'desc';
};

export type AccountPayload = {
  name: string;
  agency?: string | null;
  number?: string | null;
  rib?: string | null;
  bankUrl?: string | null;
  bankLogin?: string | null;
  comment?: string | null;
  openingBalance?: number | null;
  managedForOther: boolean;
  closed: boolean;
};

const KEY = 'accounts';

function normalizeAccount(account: Record<string, unknown>): Account {
  return {
    ...account,
    openingBalance:
      account.openingBalance === null || account.openingBalance === undefined
        ? null
        : String(account.openingBalance),
  } as Account;
}

export function useAccounts(filters: AccountFilters) {
  return useQuery<AccountsResponse>({
    queryKey: [KEY, filters],
    queryFn: () =>
      api.get('/accounts', { params: filters }).then(r => ({
        ...r.data,
        items: (r.data.items as Record<string, unknown>[]).map(normalizeAccount),
      })),
  });
}

export function useAccountsAll() {
  return useQuery<Account[]>({
    queryKey: [KEY, 'all'],
    queryFn: () =>
      api.get('/accounts', { params: { limit: 200, sortBy: 'name', sortOrder: 'asc' } }).then(r =>
        (r.data.items as Record<string, unknown>[]).map(normalizeAccount),
      ),
    staleTime: 5 * 60_000,
  });
}

export function useAccount(id: string) {
  return useQuery<Account>({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/accounts/${id}`).then(r => normalizeAccount(r.data)),
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation<Account, Error, AccountPayload>({
    mutationFn: payload => api.post('/accounts', payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation<Account, Error, { id: string } & Partial<AccountPayload>>({
    mutationFn: ({ id, ...payload }) => api.patch(`/accounts/${id}`, payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: id => api.delete(`/accounts/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
