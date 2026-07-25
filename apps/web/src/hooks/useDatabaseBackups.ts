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

export type SendDatabaseBackupToICloudResponse = {
  filename: string;
  path: string;
  message: string;
};

export function useSendDatabaseBackupToICloud() {
  return useMutation<SendDatabaseBackupToICloudResponse, Error, string>({
    mutationFn: (filename: string) =>
      api.post(`/database-backups/${encodeURIComponent(filename)}/icloud`).then(r => r.data),
  });
}

export type DatabaseBackupStorageSettings = {
  backupsDir: string;
  backupsDirIsDefault: boolean;
  icloudDir: string | null;
};

const SETTINGS_KEY = 'database-backups-settings';

export function useDatabaseBackupStorageSettings() {
  return useQuery<DatabaseBackupStorageSettings>({
    queryKey: [SETTINGS_KEY],
    queryFn: () => api.get('/database-backups/settings').then(r => r.data),
  });
}

export function useUpdateDatabaseBackupStorageSettings() {
  const qc = useQueryClient();
  return useMutation<
    DatabaseBackupStorageSettings,
    Error,
    { backupsDir?: string | null; icloudDir?: string | null }
  >({
    mutationFn: input => api.put('/database-backups/settings', input).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SETTINGS_KEY] });
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
}
