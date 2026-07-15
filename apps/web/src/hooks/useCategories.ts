import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type Regroupement = { id: string; label: string; expense: boolean; income: boolean };

export type Category = {
  id: string;
  label: string;
  idSource: string | null;
  comment: string | null;
  expense: boolean;
  income: boolean;
  active: boolean;
  regroupementId: string | null;
  regroupement: Regroupement | null;
  createdAt: string;
  updatedAt: string;
};

export type CategoriesResponse = {
  items: Category[];
  total: number;
  page: number;
  limit: number;
  highlightIndex: number | null;
};

export type CategoryFilters = {
  search?: string;
  active?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'label' | 'regroupement';
  sortOrder?: 'asc' | 'desc';
  highlightId?: string;
};

export type CategoryPayload = {
  label: string;
  idSource?: string | null;
  comment?: string | null;
  expense: boolean;
  income: boolean;
  active: boolean;
  regroupementId?: string | null;
};

const KEY = 'categories';

function normalizeCategory(category: Record<string, unknown>): Category {
  const regroupement =
    (category.regroupement as Regroupement | null | undefined) ??
    (category.grouping as Regroupement | null | undefined) ??
    null;

  return {
    ...category,
    regroupementId:
      (category.regroupementId as string | null | undefined) ??
      (category.groupingId as string | null | undefined) ??
      null,
    regroupement,
  } as Category;
}

export function useCategories(filters: CategoryFilters) {
  return useQuery<CategoriesResponse>({
    queryKey: [KEY, filters],
    queryFn: () =>
      api.get('/categories', { params: filters }).then(r => ({
        ...r.data,
        items: (r.data.items as Record<string, unknown>[]).map(normalizeCategory),
      })),
  });
}

export function useCategoriesAll() {
  return useQuery<Category[]>({
    queryKey: [KEY, 'all'],
    queryFn: () =>
      api.get('/categories', { params: { limit: 200, sortBy: 'label', sortOrder: 'asc' } }).then(r =>
        (r.data.items as Record<string, unknown>[]).map(normalizeCategory),
      ),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCategory(id: string) {
  return useQuery<Category>({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/categories/${id}`).then(r => normalizeCategory(r.data)),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation<Category, Error, CategoryPayload>({
    mutationFn: payload => api.post('/categories', payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation<Category, Error, { id: string } & Partial<CategoryPayload>>({
    mutationFn: ({ id, ...payload }) =>
      api.patch(`/categories/${id}`, payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: id => api.delete(`/categories/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
