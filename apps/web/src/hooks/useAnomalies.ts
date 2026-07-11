import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Date d'échéance manquante ───────────────────────────────────────────────

export type MissingDueDateItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  expense: number;
  income: number;
};

export type MissingDueDateResult = {
  check: 'missing-due-date';
  scannedCount: number;
  anomalyCount: number;
  fixedCount: number;
  applied: boolean;
  items: MissingDueDateItem[];
};

export type CheckMissingDueDateParams = {
  accountId?: string;
  dateFrom?: string;
  applyFix: boolean;
};

export function useCheckMissingDueDate() {
  return useMutation<MissingDueDateResult, Error, CheckMissingDueDateParams>({
    mutationFn: (params) =>
      api.post('/anomalies/missing-due-date', params).then(r => r.data),
  });
}

// ─── Ventilation absente ─────────────────────────────────────────────────────

export type MissingSplitsItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  expense: number;
  income: number;
};

export type MissingSplitsResult = {
  check: 'missing-splits';
  scannedCount: number;
  anomalyCount: number;
  items: MissingSplitsItem[];
};

export type CheckMissingSplitsParams = {
  accountId?: string;
  dateFrom?: string;
};

export function useCheckMissingSplits() {
  return useMutation<MissingSplitsResult, Error, CheckMissingSplitsParams>({
    mutationFn: (params) =>
      api.post('/anomalies/missing-splits', params).then(r => r.data),
  });
}

// ─── Ventilation inattendue ───────────────────────────────────────────────────

export type UnexpectedSplitsItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  operationType: string | null;
  splitCount: number;
};

export type UnexpectedSplitsResult = {
  check: 'unexpected-splits';
  scannedCount: number;
  anomalyCount: number;
  items: UnexpectedSplitsItem[];
};

export type CheckUnexpectedSplitsParams = {
  accountId?: string;
  dateFrom?: string;
};

export function useCheckUnexpectedSplits() {
  return useMutation<UnexpectedSplitsResult, Error, CheckUnexpectedSplitsParams>({
    mutationFn: (params) =>
      api.post('/anomalies/unexpected-splits', params).then(r => r.data),
  });
}

// ─── Doublons ────────────────────────────────────────────────────────────────

export type DuplicateOperationItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  expense: number;
  income: number;
  comment: string | null;
  duplicateCount: number;
};

export type DuplicateOperationResult = {
  check: 'duplicate-operations';
  scannedCount: number;
  anomalyCount: number;
  fixedCount: number;
  applied: boolean;
  items: DuplicateOperationItem[];
};

export type CheckDuplicateOperationsParams = {
  accountId?: string;
  dateFrom?: string;
  applyFix: boolean;
};

export function useCheckDuplicateOperations() {
  return useMutation<DuplicateOperationResult, Error, CheckDuplicateOperationsParams>({
    mutationFn: (params) =>
      api.post('/anomalies/duplicate-operations', params).then(r => r.data),
  });
}

// ─── Références orphelines ────────────────────────────────────────────────────

export type OrphanReferenceItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  source: 'operation' | 'ventilation';
  referenceType: 'enveloppe' | 'tiers' | 'categorie';
  referenceId: string;
};

export type OrphanReferenceResult = {
  check: 'orphan-references';
  scannedCount: number;
  anomalyCount: number;
  items: OrphanReferenceItem[];
};

export type CheckOrphanReferencesParams = {
  accountId?: string;
  dateFrom?: string;
};

export function useCheckOrphanReferences() {
  return useMutation<OrphanReferenceResult, Error, CheckOrphanReferencesParams>({
    mutationFn: (params) =>
      api.post('/anomalies/orphan-references', params).then(r => r.data),
  });
}

// ─── Montant à zéro ──────────────────────────────────────────────────────────

export type ZeroAmountItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
};

export type ZeroAmountResult = {
  check: 'zero-amount';
  scannedCount: number;
  anomalyCount: number;
  items: ZeroAmountItem[];
};

export type CheckZeroAmountParams = {
  accountId?: string;
  dateFrom?: string;
};

export function useCheckZeroAmount() {
  return useMutation<ZeroAmountResult, Error, CheckZeroAmountParams>({
    mutationFn: (params) =>
      api.post('/anomalies/zero-amount', params).then(r => r.data),
  });
}

// ─── Ventilation partielle non marquée ───────────────────────────────────────

export type PartialSplitItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  operationType: string | null;
  operationBalance: number;
  splitsBalance: number;
};

export type PartialSplitResult = {
  check: 'partial-split-unmarked';
  scannedCount: number;
  anomalyCount: number;
  items: PartialSplitItem[];
};

export type CheckPartialSplitParams = {
  accountId?: string;
  dateFrom?: string;
};

export function useCheckPartialSplit() {
  return useMutation<PartialSplitResult, Error, CheckPartialSplitParams>({
    mutationFn: (params) =>
      api.post('/anomalies/partial-split-unmarked', params).then(r => r.data),
  });
}

// ─── Écart ventilation ───────────────────────────────────────────────────────

export type SplitMismatchItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  operationBalance: number;
  splitsBalance: number;
  diff: number;
};

export type SplitMismatchResult = {
  check: 'split-mismatch';
  scannedCount: number;
  anomalyCount: number;
  items: SplitMismatchItem[];
};

export type CheckSplitMismatchParams = {
  accountId?: string;
  dateFrom?: string;
};

export function useCheckSplitMismatch() {
  return useMutation<SplitMismatchResult, Error, CheckSplitMismatchParams>({
    mutationFn: (params) =>
      api.post('/anomalies/split-mismatch', params).then(r => r.data),
  });
}

// ─── Champ solde incohérent ──────────────────────────────────────────────────

export type BalanceFieldItem = {
  id: string;
  operationId: string;
  source: 'operation' | 'ventilation';
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  expense: number;
  income: number;
  storedBalance: number;
  expectedBalance: number;
  diff: number;
};

export type BalanceFieldResult = {
  check: 'balance-field';
  scannedCount: number;
  anomalyCount: number;
  fixedCount: number;
  applied: boolean;
  items: BalanceFieldItem[];
};

export type CheckBalanceFieldParams = {
  accountId?: string;
  dateFrom?: string;
  applyFix: boolean;
};

export function useCheckBalanceField() {
  return useMutation<BalanceFieldResult, Error, CheckBalanceFieldParams>({
    mutationFn: (params) =>
      api.post('/anomalies/balance-field', params).then(r => r.data),
  });
}
