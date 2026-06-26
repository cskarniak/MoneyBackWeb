import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type AutoAssignOperationThirdPartiesPayload = {
  accountId?: string;
  operationDateFrom?: string;
  operationDateTo?: string;
  onlyWithoutBudget: boolean;
  applyChanges: boolean;
};

export type AutoAssignOperationThirdPartiesResult = {
  onlyWithoutBudget: boolean;
  applyChanges: boolean;
  scannedCount: number;
  matchedCount: number;
  updatedCount: number;
  details: Array<{
    operationId: string;
    operationDate: string;
    label: string;
    previousThirdPartyName: string | null;
    previousBudgetLabel: string | null;
    thirdPartyName: string;
    nextBudgetLabel: string | null;
    matchedRuleLabel: string;
    updated: boolean;
  }>;
};

export function useAutoAssignOperationThirdParties() {
  const qc = useQueryClient();

  return useMutation<AutoAssignOperationThirdPartiesResult, Error, AutoAssignOperationThirdPartiesPayload>({
    mutationFn: payload => api.post('/operations/auto-assign-third-parties', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
