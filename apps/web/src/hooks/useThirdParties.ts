import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type ThirdParty = {
  id: string;
  name: string;
  keyword1: string | null;
  keyword2: string | null;
  keyword3: string | null;
  keywordMode: 'OR' | 'AND';
  affectationFormula: string | null;
  active: boolean;
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
  sortBy?: 'name' | 'keyword1' | 'keywordMode';
  sortOrder?: 'asc' | 'desc';
};

export type ThirdPartyPayload = {
  name: string;
  keyword1?: string | null;
  keyword2?: string | null;
  keyword3?: string | null;
  keywordMode: 'OR' | 'AND';
  affectationFormula?: string | null;
  active: boolean;
};

const KEY = 'third-parties';

export function useThirdParties(filters: ThirdPartyFilters) {
  return useQuery<ThirdPartiesResponse>({
    queryKey: [KEY, filters],
    queryFn: () => api.get('/third-parties', { params: filters }).then(r => r.data),
  });
}

export function useThirdPartiesAll() {
  return useQuery<ThirdParty[]>({
    queryKey: [KEY, 'all'],
    queryFn: () =>
      api.get('/third-parties', { params: { limit: 200, sortBy: 'name', sortOrder: 'asc' } }).then(r =>
        (r.data.items as ThirdParty[]),
      ),
    staleTime: 5 * 60_000,
  });
}

export function useThirdParty(id: string) {
  return useQuery<ThirdParty>({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/third-parties/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateThirdParty() {
  const qc = useQueryClient();
  return useMutation<ThirdParty, Error, ThirdPartyPayload>({
    mutationFn: payload => api.post('/third-parties', payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateThirdParty() {
  const qc = useQueryClient();
  return useMutation<ThirdParty, Error, { id: string } & Partial<ThirdPartyPayload>>({
    mutationFn: ({ id, ...payload }) => api.patch(`/third-parties/${id}`, payload).then(r => r.data),
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
