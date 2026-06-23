import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type MovementType = {
  id: string;
  label: string;
  code: string | null;
  idSource: string | null;
  active: boolean;
};

export type MovementTypesResponse = {
  items: MovementType[];
  total: number;
  page: number;
  limit: number;
};

export type MovementTypeFilters = {
  search?: string;
  active?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'label' | 'code';
  sortOrder?: 'asc' | 'desc';
};

export type MovementTypePayload = {
  label: string;
  code?: string | null;
  idSource?: string | null;
  active: boolean;
};

export type MovementTypeDeleteResult = {
  status: 'deleted' | 'deactivated';
  item: MovementType;
};

const KEY = 'movement-types';

export function useMovementTypes(filters: MovementTypeFilters) {
  return useQuery<MovementTypesResponse>({
    queryKey: [KEY, filters],
    queryFn: () => api.get('/movement-types', { params: filters }).then(r => r.data),
  });
}

export function useMovementTypesAll() {
  return useQuery<MovementType[]>({
    queryKey: [KEY, 'all'],
    queryFn: () =>
      api.get('/movement-types', { params: { active: true, limit: 200, sortBy: 'label', sortOrder: 'asc' } }).then(r => r.data.items),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useMovementType(id: string) {
  return useQuery<MovementType>({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/movement-types/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateMovementType() {
  const qc = useQueryClient();
  return useMutation<MovementType, Error, MovementTypePayload>({
    mutationFn: payload => api.post('/movement-types', payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateMovementType() {
  const qc = useQueryClient();
  return useMutation<MovementType, Error, { id: string } & Partial<MovementTypePayload>>({
    mutationFn: ({ id, ...payload }) => api.patch(`/movement-types/${id}`, payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteMovementType() {
  const qc = useQueryClient();
  return useMutation<MovementTypeDeleteResult, Error, string>({
    mutationFn: id => api.delete(`/movement-types/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
