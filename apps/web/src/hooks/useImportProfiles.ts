import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ImportSource, type BankCsvConfirmDto, type BankCsvMappingDto, type CreateImportProfileDto } from '@moneyback/shared';

export type ImportProfile = {
  id: string;
  name: string;
  source: string;
  active: boolean;
  delimiter: string | null;
  bankKey: string;
  bankLabel: string;
  mapping: BankCsvMappingDto;
  createdAt: string;
  updatedAt: string;
};

export type ImportProfilesResponse = {
  items: ImportProfile[];
  total: number;
  page: number;
  limit: number;
};

export type ImportProfileFilters = {
  source?: string;
  bankKey?: string;
  active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
};

export type BankCsvPreviewPayload = {
  profileId?: string;
  mapping?: BankCsvMappingDto;
  csvContent: string;
  accountId?: string;
  integrationDate?: string;
  reference?: string | null;
};

export type BankCsvPreviewResponse = {
  profileId: string | null;
  bankKey: string;
  bankLabel: string;
  accountId: string | null;
  reference: string | null;
  integrationDate: string | null;
  totalLines: number;
  validLines: number;
  duplicateLines: number;
  errorLines: number;
  lines: Array<{
    lineNum: number;
    status: 'valid' | 'error' | 'duplicate';
    operationDate: string | null;
    label: string | null;
    comment: string | null;
    pieceNumber: string | null;
    expense: string | null;
    income: string | null;
    statementRef: string | null;
    errors: string[];
    duplicateInFile: boolean;
    alreadyInOperations: boolean;
    duplicateOperationId: string | null;
    rawData: Record<string, string>;
  }>;
};

export type BankCsvConfirmResponse = {
  requestedCount: number;
  importedCount: number;
  skippedCount: number;
  skippedLineNums: number[];
  importedOperationIds: string[];
};

const KEY = 'import-profiles';

function normalizeProfile(profile: Record<string, unknown>): ImportProfile {
  return profile as unknown as ImportProfile;
}

export function useImportProfiles(filters: ImportProfileFilters) {
  return useQuery<ImportProfilesResponse>({
    queryKey: [KEY, filters],
    queryFn: () =>
      api.get('/import-profiles', { params: filters }).then(response => ({
        ...response.data,
        items: (response.data.items as Record<string, unknown>[]).map(normalizeProfile),
      })),
  });
}

export function useImportProfilesAll() {
  return useImportProfiles({
    source: ImportSource.BANK_FILE,
    active: true,
    limit: 200,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });
}

export function useImportProfile(id: string) {
  return useQuery<ImportProfile>({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/import-profiles/${id}`).then(response => normalizeProfile(response.data)),
    enabled: !!id,
  });
}

export function useCreateImportProfile() {
  const queryClient = useQueryClient();
  return useMutation<ImportProfile, Error, CreateImportProfileDto>({
    mutationFn: payload => api.post('/import-profiles', payload).then(response => normalizeProfile(response.data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export function useUpdateImportProfile() {
  const queryClient = useQueryClient();
  return useMutation<ImportProfile, Error, { id: string; payload: Partial<CreateImportProfileDto> }>({
    mutationFn: ({ id, payload }) =>
      api.patch(`/import-profiles/${id}`, payload).then(response => normalizeProfile(response.data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export function useDeleteImportProfile() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: id => api.delete(`/import-profiles/${id}`).then(response => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export function usePreviewBankCsv() {
  return useMutation<BankCsvPreviewResponse, Error, BankCsvPreviewPayload>({
    mutationFn: payload => api.post('/import-profiles/preview-bank-csv', payload).then(response => response.data),
  });
}

export function useConfirmBankCsv() {
  const queryClient = useQueryClient();
  return useMutation<BankCsvConfirmResponse, Error, BankCsvConfirmDto>({
    mutationFn: payload => api.post('/import-profiles/confirm-bank-csv', payload).then(response => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
