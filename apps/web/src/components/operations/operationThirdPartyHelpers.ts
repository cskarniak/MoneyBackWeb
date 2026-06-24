type ThirdPartyLike = {
  categoryId: string | null;
  budgetId: string | null;
  ventilated: boolean;
  splits: Array<{
    label: string | null;
    expense: string;
    income: string;
    categoryId: string | null;
    budgetId: string | null;
  }>;
};

export type OperationSplitDraft = {
  label: string;
  categoryId: string | null;
  budgetId: string | null;
  expense: string;
  income: string;
};

export function buildThirdPartySplitDrafts(
  thirdParty: ThirdPartyLike | null | undefined,
  fallbackLabel?: string,
): OperationSplitDraft[] {
  if (!thirdParty?.ventilated) {
    return [];
  }

  return thirdParty.splits.map(split => ({
    label: split.label?.trim() || fallbackLabel?.trim() || '',
    categoryId: split.categoryId,
    budgetId: split.budgetId,
    expense: split.expense,
    income: split.income,
  }));
}

export function sumSplitDrafts(splits: OperationSplitDraft[]) {
  const toNumber = (value: string) => {
    const numericValue = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(numericValue) ? numericValue : 0;
  };

  return splits.reduce(
    (totals, split) => ({
      expense: totals.expense + toNumber(split.expense),
      income: totals.income + toNumber(split.income),
    }),
    { expense: 0, income: 0 },
  );
}
