import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

const KEY = 'database-backups';

export type DatabaseBackup = {
  filename: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
};

export type DatabaseBackupsResponse = {
  directory: string;
  items: DatabaseBackup[];
};

export type CreateDatabaseBackupResponse = {
  filename: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
  message: string;
};

export function useDatabaseBackups() {
  return useQuery<DatabaseBackupsResponse>({
    queryKey: [KEY],
    queryFn: () => api.get('/database-backups').then(r => r.data),
  });
}

export function useCreateDatabaseBackup() {
  const qc = useQueryClient();
  return useMutation<CreateDatabaseBackupResponse, Error>({
    mutationFn: () => api.post('/database-backups').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export type RestoreDatabaseBackupResponse = {
  filename: string;
  message: string;
};

export function useRestoreDatabaseBackup() {
  const qc = useQueryClient();
  return useMutation<RestoreDatabaseBackupResponse, Error, string>({
    mutationFn: (filename: string) =>
      api.post(`/database-backups/${encodeURIComponent(filename)}/restore`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}
