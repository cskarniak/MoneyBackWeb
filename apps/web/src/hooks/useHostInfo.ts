import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type HostInfo = {
  hostname: string;
  platform: string;
  arch: string;
  release: string;
  cpuModel: string | null;
  cpuCount: number;
  totalMemGB: number;
};

export function useHostInfo() {
  return useQuery<HostInfo>({
    queryKey: ['host-info', 'web'],
    queryFn: () => fetch('/api/host-info').then(r => r.json()),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useApiHostInfo() {
  return useQuery<HostInfo>({
    queryKey: ['host-info', 'api'],
    queryFn: () => api.get('/app-settings/host-info').then(r => r.data),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
