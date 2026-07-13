import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type Regroupement = {
  id: string;
  label: string;
  idSource: string | null;
  expense: boolean;
  income: boolean;
  dashboard: boolean;
};

export type RegroupementsResponse = {
  items: Regroupement[];
  total: number;
  page: number;
  limit: number;
  highlightIndex: number | null;
};

export type RegroupementFilters = {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'label';
  sortOrder?: 'asc' | 'desc';
  highlightId?: string;
};

export type RegroupementPayload = {
  label: string;
  idSource?: string | null;
  expense: boolean;
  income: boolean;
  dashboard: boolean;
};

const KEY = 'regroupements';

export function useRegroupements(filters?: RegroupementFilters) {
  return useQuery<RegroupementsResponse>({
    queryKey: [KEY, filters ?? {}],
    queryFn: () => api.get('/regroupements', { params: filters }).then(r => r.data),
    staleTime: 30_000,
  });
}

export function useRegroupementsAll() {
  return useQuery<Regroupement[]>({
    queryKey: [KEY, 'all'],
    queryFn: () =>
      api.get('/regroupements', { params: { limit: 200 } }).then(r =>
        (r.data as RegroupementsResponse).items,
      ),
    staleTime: 5 * 60_000,
  });
}

export function useRegroupement(id: string) {
  return useQuery<Regroupement>({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/regroupements/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateRegroupement() {
  const qc = useQueryClient();
  return useMutation<Regroupement, Error, RegroupementPayload>({
    mutationFn: payload => api.post('/regroupements', payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateRegroupement() {
  const qc = useQueryClient();
  return useMutation<Regroupement, Error, { id: string } & Partial<RegroupementPayload>>({
    mutationFn: ({ id, ...payload }) =>
      api.patch(`/regroupements/${id}`, payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteRegroupement() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: id => api.delete(`/regroupements/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export type Grouping = Regroupement;
export type GroupingsResponse = RegroupementsResponse;
export type GroupingFilters = RegroupementFilters;
export type GroupingPayload = RegroupementPayload;
export const useGroupings = useRegroupements;
export const useGroupingsAll = useRegroupementsAll;
export const useGrouping = useRegroupement;
export const useCreateGrouping = useCreateRegroupement;
export const useUpdateGrouping = useUpdateRegroupement;
export const useDeleteGrouping = useDeleteRegroupement;
