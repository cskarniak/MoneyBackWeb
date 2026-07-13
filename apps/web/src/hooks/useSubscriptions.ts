import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

const KEY = 'subscriptions';
const OPERATIONS_KEY = 'operations';
const ACCOUNTS_KEY = 'accounts';

export type SubscriptionSplit = {
  id?: string;
  label: string | null;
  expense: string;
  income: string;
  balance: string | null;
  categoryId: string | null;
  budgetId: string | null;
  categorie: { id: string; label: string } | null;
  enveloppe: { id: string; label: string } | null;
};

export type SubscriptionPlanning = {
  id: string;
  dueDate: string;
  generatedAt: string | null;
  status: string;
  operationId: string | null;
  createdAt: string;
};

export type Subscription = {
  id: string;
  label: string;
  entryLabel: string | null;
  expense: string;
  income: string;
  periodicity: string;
  dayOfPeriod: number | null;
  subscriptionType: string | null;
  firstDueDate: string;
  nextDueDate: string | null;
  endDate: string | null;
  lastGeneratedDate: string | null;
  lastGeneratedDueDate: string | null;
  active: boolean;
  hasSplits: boolean;
  accountId: string;
  thirdPartyId: string | null;
  categoryId: string | null;
  budgetId: string | null;
  movementTypeId: string | null;
  lastGeneratedOperationId: string | null;
  compte: { id: string; name: string } | null;
  tiers: { id: string; name: string } | null;
  categorie: { id: string; label: string } | null;
  enveloppe: { id: string; label: string } | null;
  typeMouvement: { id: string; label: string; code: string | null } | null;
  operationGeneree: { id: string; label: string; operationDate: string } | null;
  planning: SubscriptionPlanning[];
  splits: SubscriptionSplit[];
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionFilters = {
  search?: string;
  active?: boolean;
  periodicity?: 'daily' | 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';
  page?: number;
  limit?: number;
  sortBy?: 'label' | 'nextDueDate' | 'firstDueDate' | 'periodicity';
  sortOrder?: 'asc' | 'desc';
  highlightId?: string;
};

export type SubscriptionsResponse = {
  items: Subscription[];
  total: number;
  page: number;
  limit: number;
  highlightIndex: number | null;
};

export type SubscriptionSplitPayload = {
  label?: string | null;
  expense: number;
  income: number;
  categoryId?: string | null;
  budgetId?: string | null;
};

export type SubscriptionPayload = {
  accountId: string;
  label: string;
  entryLabel?: string | null;
  expense: number;
  income: number;
  periodicity: 'daily' | 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';
  dayOfPeriod?: number | null;
  subscriptionType: 'real' | 'simulation';
  firstDueDate: string;
  nextDueDate?: string | null;
  endDate?: string | null;
  active: boolean;
  budgetId?: string | null;
  categoryId?: string | null;
  thirdPartyId?: string | null;
  movementTypeId?: string | null;
  splits?: SubscriptionSplitPayload[];
};

export type GenerateSubscriptionsResult = {
  dateRef: string;
  subscriptionsProcessed: number;
  generatedOperations: number;
  items: Array<{
    id: string;
    label: string;
    generated: number;
    lastDueDate: string | null;
    nextDueDate: string | null;
  }>;
};

export type EligibleSubscriptionForGeneration = {
  id: string;
  label: string;
  entryLabel: string | null;
  subscriptionType: string | null;
  nextDueDate: string | null;
  endDate: string | null;
  periodicity: string;
  account: { id: string; name: string };
  thirdParty: { id: string; name: string } | null;
  hasSplits: boolean;
  splitCount: number;
};

export type PreviewSubscriptionsGenerationResult = {
  dateRef: string;
  totalEligible: number;
  items: EligibleSubscriptionForGeneration[];
};

function normalizeSplit(split: Record<string, unknown>): SubscriptionSplit {
  return {
    ...split,
    label: (split.label as string | null | undefined) ?? null,
    expense: String(split.expense ?? '0'),
    income: String(split.income ?? '0'),
    balance:
      split.balance === null || split.balance === undefined
        ? null
        : String(split.balance),
    categoryId: (split.categoryId as string | null | undefined) ?? null,
    budgetId: (split.budgetId as string | null | undefined) ?? null,
    categorie: (split.categorie as { id: string; label: string } | null | undefined) ?? null,
    enveloppe: (split.enveloppe as { id: string; label: string } | null | undefined) ?? null,
  };
}

function normalizeSubscription(subscription: Record<string, unknown>): Subscription {
  return {
    ...subscription,
    entryLabel: (subscription.entryLabel as string | null | undefined) ?? null,
    expense: String(subscription.expense ?? '0'),
    income: String(subscription.income ?? '0'),
    dayOfPeriod: (subscription.dayOfPeriod as number | null | undefined) ?? null,
    subscriptionType: (subscription.subscriptionType as string | null | undefined) ?? null,
    nextDueDate: (subscription.nextDueDate as string | null | undefined) ?? null,
    endDate: (subscription.endDate as string | null | undefined) ?? null,
    lastGeneratedDate: (subscription.lastGeneratedDate as string | null | undefined) ?? null,
    lastGeneratedDueDate: (subscription.lastGeneratedDueDate as string | null | undefined) ?? null,
    thirdPartyId: (subscription.thirdPartyId as string | null | undefined) ?? null,
    categoryId: (subscription.categoryId as string | null | undefined) ?? null,
    budgetId: (subscription.budgetId as string | null | undefined) ?? null,
    movementTypeId: (subscription.movementTypeId as string | null | undefined) ?? null,
    lastGeneratedOperationId:
      (subscription.lastGeneratedOperationId as string | null | undefined) ?? null,
    compte: (subscription.compte as { id: string; name: string } | null | undefined) ?? null,
    tiers: (subscription.tiers as { id: string; name: string } | null | undefined) ?? null,
    categorie:
      (subscription.categorie as { id: string; label: string } | null | undefined) ?? null,
    enveloppe:
      (subscription.enveloppe as { id: string; label: string } | null | undefined) ?? null,
    typeMouvement:
      (subscription.typeMouvement as {
        id: string;
        label: string;
        code: string | null;
      } | null | undefined) ?? null,
    operationGeneree:
      (subscription.operationGeneree as {
        id: string;
        label: string;
        operationDate: string;
      } | null | undefined) ?? null,
    planning: ((subscription.planning as Record<string, unknown>[] | undefined) ?? []).map(
      item => ({
        ...item,
        generatedAt: (item.generatedAt as string | null | undefined) ?? null,
        operationId: (item.operationId as string | null | undefined) ?? null,
      }),
    ) as SubscriptionPlanning[],
    splits: ((subscription.splits as Record<string, unknown>[] | undefined) ?? []).map(normalizeSplit),
  } as Subscription;
}

export function useSubscriptions(filters: SubscriptionFilters) {
  return useQuery<SubscriptionsResponse>({
    queryKey: [KEY, filters],
    queryFn: () =>
      api.get('/subscriptions', { params: filters }).then(r => ({
        ...r.data,
        items: (r.data.items as Record<string, unknown>[]).map(normalizeSubscription),
      })),
  });
}

export function useSubscription(id: string) {
  return useQuery<Subscription>({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/subscriptions/${id}`).then(r => normalizeSubscription(r.data)),
    enabled: !!id,
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation<Subscription, Error, SubscriptionPayload>({
    mutationFn: payload =>
      api.post('/subscriptions', payload).then(r => normalizeSubscription(r.data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation<Subscription, Error, { id: string } & Partial<SubscriptionPayload>>({
    mutationFn: ({ id, ...payload }) =>
      api.patch(`/subscriptions/${id}`, payload).then(r => normalizeSubscription(r.data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: id => api.delete(`/subscriptions/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useGenerateSubscriptions() {
  const qc = useQueryClient();
  return useMutation<GenerateSubscriptionsResult, Error, { dateRef: string; subscriptionIds: string[] }>({
    mutationFn: payload => api.post('/subscriptions/generate', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [OPERATIONS_KEY] });
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
    },
  });
}

export function usePreviewSubscriptionsGeneration() {
  return useMutation<PreviewSubscriptionsGenerationResult, Error, { dateRef: string }>({
    mutationFn: payload => api.post('/subscriptions/generate/eligible', payload).then(r => r.data),
  });
}
