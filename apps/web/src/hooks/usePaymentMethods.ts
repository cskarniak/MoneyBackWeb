import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type PaymentMethod = {
  id: string;
  label: string;
  code: string | null;
  idSource: string | null;
  active: boolean;
};

export type PaymentMethodsResponse = {
  items: PaymentMethod[];
  total: number;
  page: number;
  limit: number;
};

export type PaymentMethodFilters = {
  search?: string;
  active?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'label' | 'code';
  sortOrder?: 'asc' | 'desc';
};

export type PaymentMethodPayload = {
  label: string;
  code?: string | null;
  idSource?: string | null;
  active: boolean;
};

export type PaymentMethodDeleteResult = {
  status: 'deleted' | 'deactivated';
  item: PaymentMethod;
};

const KEY = 'payment-methods';

export function usePaymentMethods(filters: PaymentMethodFilters) {
  return useQuery<PaymentMethodsResponse>({
    queryKey: [KEY, filters],
    queryFn: () => api.get('/payment-methods', { params: filters }).then(r => r.data),
  });
}

export function usePaymentMethodsAll() {
  return useQuery<PaymentMethod[]>({
    queryKey: [KEY, 'all'],
    queryFn: () =>
      api.get('/payment-methods', { params: { active: true, limit: 200, sortBy: 'label', sortOrder: 'asc' } }).then(r => r.data.items),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function usePaymentMethod(id: string) {
  return useQuery<PaymentMethod>({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/payment-methods/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation<PaymentMethod, Error, PaymentMethodPayload>({
    mutationFn: payload => api.post('/payment-methods', payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation<PaymentMethod, Error, { id: string } & Partial<PaymentMethodPayload>>({
    mutationFn: ({ id, ...payload }) => api.patch(`/payment-methods/${id}`, payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation<PaymentMethodDeleteResult, Error, string>({
    mutationFn: id => api.delete(`/payment-methods/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
