import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

const KEY = 'current-month';

export function useCurrentMonth() {
  return useQuery<{ currentMonth: string }>({
    queryKey: [KEY],
    queryFn: () => api.get('/app-settings/current-month').then(r => r.data),
    staleTime: 60_000,
  });
}

export function useUpdateCurrentMonth() {
  const qc = useQueryClient();
  return useMutation<{ currentMonth: string }, Error, string>({
    mutationFn: currentMonth =>
      api.patch('/app-settings/current-month', { currentMonth }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
