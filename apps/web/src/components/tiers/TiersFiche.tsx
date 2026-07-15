'use client';

import { CRUD } from '@/lib/crud-tokens';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, type Control, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Box,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconAlertCircle, IconGitBranch } from '@tabler/icons-react';
import { PositioningSelect } from '@/components/common/PositioningSelect';
import { useCategoriesAll } from '@/hooks/useCategories';
import { useEnveloppesAll } from '@/hooks/useEnveloppes';
import { filterActiveOptions } from '@/lib/activeOptions';
import {
  useCreateThirdParty,
  useDeleteThirdParty,
  useThirdParty,
  useUpdateThirdParty,
  type ThirdPartyPayload,
} from '@/hooks/useThirdParties';
import { OperationSplitModal } from '../operations/OperationSplitModal';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const FIELD_BG = '#fbfdff';
const LABEL_COLOR = '#1f2937';

const splitSchema = z.object({
  label: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  budgetId: z.string().nullable().optional(),
  expense: z.string().optional(),
  income: z.string().optional(),
});

const matchingConditionSchema = z.object({
  field: z.string(),
  matcher: z.string(),
  value: z.string().optional(),
  value2: z.string().optional(),
  negate: z.boolean(),
  position: z.number().int().min(0),
});

const matchingRuleSchema = z.object({
  label: z.string().min(1, 'Le libellé est obligatoire'),
  description: z.string().optional(),
  active: z.boolean(),
  operator: z.enum(['AND', 'OR']),
  stopOnMatch: z.boolean(),
  conditions: z.array(matchingConditionSchema),
});

const schema = z.object({
  name: z.string().min(1, 'Le nom est obligatoire'),
  comment: z.string().optional(),
  budgetBearer: z.boolean(),
  ventilated: z.boolean(),
  categoryId: z.string().nullable().optional(),
  budgetId: z.string().nullable().optional(),
  active: z.boolean(),
  matchingRules: z.array(matchingRuleSchema),
  splits: z.array(splitSchema),
});

type FormValues = z.infer<typeof schema>;

type Props = { id?: string };

function asNumber(value?: string) {
  const normalized = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : 0;
}

const MATCHING_FIELD_OPTIONS = [
  { value: 'label', label: 'Libellé brut' },
  { value: 'normalizedLabel', label: 'Libellé normalisé' },
  { value: 'amount', label: 'Montant' },
  { value: 'direction', label: 'Sens' },
  { value: 'accountId', label: 'Compte' },
  { value: 'statementRef', label: 'Référence relevé' },
  { value: 'counterpartyName', label: 'Contrepartie' },
  { value: 'memo', label: 'Mémo' },
  { value: 'dayOfMonth', label: 'Jour du mois' },
];

const MATCHING_MATCHER_OPTIONS = [
  { value: 'contains', label: 'Contient' },
  { value: 'equals', label: 'Égal à' },
  { value: 'startsWith', label: 'Commence par' },
  { value: 'endsWith', label: 'Finit par' },
  { value: 'regex', label: 'Regex' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'between', label: 'Entre' },
  { value: 'in', label: 'Dans la liste' },
];

function MatchingRuleEditor({
  ruleIndex,
  control,
  watch,
  setValue,
}: {
  ruleIndex: number;
  control: Control<FormValues>;
  watch: UseFormWatch<FormValues>;
  setValue: UseFormSetValue<FormValues>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `matchingRules.${ruleIndex}.conditions`,
  });

  const conditions = watch(`matchingRules.${ruleIndex}.conditions`) ?? [];
  const rule = watch(`matchingRules.${ruleIndex}`);

  return (
    <Box style={{ border: '1px solid #d9e3f0', borderRadius: 10, padding: 12, background: '#fcfdff' }}>
      <Stack gap={10}>
        <Group grow align="flex-end">
          <TextInput
            label="Libellé"
            value={rule?.label ?? ''}
            onChange={event => setValue(`matchingRules.${ruleIndex}.label`, event.currentTarget.value, { shouldDirty: true })}
          />
          <Select
            label="Opérateur"
            data={[
              { value: 'AND', label: 'ET' },
              { value: 'OR', label: 'OU' },
            ]}
            value={rule?.operator ?? 'AND'}
            onChange={value => setValue(`matchingRules.${ruleIndex}.operator`, (value as 'AND' | 'OR') ?? 'AND', { shouldDirty: true })}
          />
        </Group>

        <Textarea
          label="Description"
          value={rule?.description ?? ''}
          onChange={event => setValue(`matchingRules.${ruleIndex}.description`, event.currentTarget.value, { shouldDirty: true })}
          rows={2}
        />

        <Group gap={20}>
          <Checkbox
            label="Règle active"
            checked={rule?.active ?? true}
            onChange={event => setValue(`matchingRules.${ruleIndex}.active`, event.currentTarget.checked, { shouldDirty: true })}
          />
          <Checkbox
            label="Stopper sur match"
            checked={rule?.stopOnMatch ?? false}
            onChange={event => setValue(`matchingRules.${ruleIndex}.stopOnMatch`, event.currentTarget.checked, { shouldDirty: true })}
          />
        </Group>

        <Box style={{ borderTop: '1px solid #e9eef5', paddingTop: 10 }}>
          <Group justify="space-between" align="center" mb={8}>
            <Text fw={600} size="sm">Conditions</Text>
            <Button
              type="button"
              variant="light"
              size="xs"
              onClick={() => append({ field: 'normalizedLabel', matcher: 'contains', value: '', value2: '', negate: false, position: fields.length })}
            >
              Ajouter une condition
            </Button>
          </Group>

          <Stack gap={8}>
            {fields.length === 0 && <Text size="sm" c="dimmed">Aucune condition.</Text>}
            {fields.map((field, conditionIndex) => {
              const condition = conditions[conditionIndex];
              const matcher = condition?.matcher ?? 'contains';
              const showSecondValue = matcher === 'between';

              return (
                <Box key={field.id} style={{ border: '1px solid #edf2f7', borderRadius: 8, padding: 10, background: '#fff' }}>
                  <Stack gap={8}>
                    <Group grow align="flex-end">
                      <Select
                        label="Champ"
                        data={MATCHING_FIELD_OPTIONS}
                        value={condition?.field ?? 'normalizedLabel'}
                        onChange={value => setValue(`matchingRules.${ruleIndex}.conditions.${conditionIndex}.field`, value ?? 'normalizedLabel', { shouldDirty: true })}
                      />
                      <Select
                        label="Test"
                        data={MATCHING_MATCHER_OPTIONS}
                        value={matcher}
                        onChange={value => setValue(`matchingRules.${ruleIndex}.conditions.${conditionIndex}.matcher`, value ?? 'contains', { shouldDirty: true })}
                      />
                      <TextInput
                        label="Valeur 1"
                        value={condition?.value ?? ''}
                        onChange={event => setValue(`matchingRules.${ruleIndex}.conditions.${conditionIndex}.value`, event.currentTarget.value, { shouldDirty: true })}
                      />
                      {showSecondValue && (
                        <TextInput
                          label="Valeur 2"
                          value={condition?.value2 ?? ''}
                          onChange={event => setValue(`matchingRules.${ruleIndex}.conditions.${conditionIndex}.value2`, event.currentTarget.value, { shouldDirty: true })}
                        />
                      )}
                    </Group>

                    <Group justify="space-between">
                      <Checkbox
                        label="Négation"
                        checked={condition?.negate ?? false}
                        onChange={event => setValue(`matchingRules.${ruleIndex}.conditions.${conditionIndex}.negate`, event.currentTarget.checked, { shouldDirty: true })}
                      />
                      <Button
                        type="button"
                        color="red"
                        variant="subtle"
                        size="xs"
                        onClick={() => {
                          remove(conditionIndex);
                          const nextConditions = (watch(`matchingRules.${ruleIndex}.conditions`) ?? []).filter((_, index) => index !== conditionIndex);
                          nextConditions.forEach((_, index) => {
                            setValue(`matchingRules.${ruleIndex}.conditions.${index}.position`, index, { shouldDirty: true });
                          });
                        }}
                      >
                        Supprimer la condition
                      </Button>
                    </Group>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

function toPayload(values: FormValues): ThirdPartyPayload {
  return {
    name: values.name,
    comment: values.comment || null,
    budgetBearer: values.budgetBearer,
    ventilated: values.ventilated,
    categoryId: values.categoryId || null,
    budgetId: values.budgetId || null,
    active: values.active,
    matchingRules: values.matchingRules
      .map(rule => ({
        label: rule.label.trim(),
        description: rule.description?.trim() || null,
        active: rule.active,
        operator: rule.operator,
        stopOnMatch: rule.stopOnMatch,
        conditions: rule.conditions.map((condition, index) => ({
          field: condition.field,
          matcher: condition.matcher,
          value: condition.value?.trim() || null,
          value2: condition.value2?.trim() || null,
          negate: condition.negate,
          position: index,
        })),
      }))
      .filter(rule => rule.label.length > 0),
    splits: values.splits
      .map(split => ({
        label: split.label || null,
        categoryId: split.categoryId || null,
        budgetId: split.budgetId || null,
        expense: asNumber(split.expense),
        income: asNumber(split.income),
      }))
      .filter(split => split.label || split.categoryId || split.budgetId || split.expense > 0 || split.income > 0),
  };
}

function getSplitError(ventilated: boolean, splits: FormValues['splits']) {
  if (!ventilated) return null;
  if (splits.length === 0) return 'Ajoutez au moins une ligne de ventilation pour un tiers ventilé.';

  const hasInvalidRow = splits.some(split => {
    const expense = asNumber(split.expense);
    const income = asNumber(split.income);
    return (expense === 0 && income === 0) || (expense > 0 && income > 0);
  });

  return hasInvalidRow
    ? 'Chaque ligne de ventilation doit contenir soit une dépense, soit une recette.'
    : null;
}

function getMatchingRulesError(matchingRules: FormValues['matchingRules']) {
  const invalidRule = matchingRules.find(rule => {
    if (!rule.label.trim()) return true;
    if ((rule.conditions ?? []).length === 0) return true;
    return rule.conditions.some(condition => !condition.field || !condition.matcher || !(condition.value ?? '').trim());
  });

  return invalidRule
    ? 'Chaque règle de matching doit avoir un libellé et au moins une condition avec une valeur.'
    : null;
}

export function TiersFiche({ id }: Props) {
  const router = useRouter();
  const isNew = !id;
  const [ventilationOpened, setVentilationOpened] = useState(false);
  const [expandedRuleIndex, setExpandedRuleIndex] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const { data: tiers, isLoading } = useThirdParty(id ?? '');
  const { data: categories = [], isLoading: loadingCategories } = useCategoriesAll();
  const { data: enveloppes = [], isLoading: loadingEnveloppes } = useEnveloppesAll();
  const createMutation = useCreateThirdParty();
  const updateMutation = useUpdateThirdParty();
  const deleteMutation = useDeleteThirdParty();

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      comment: '',
      budgetBearer: false,
      ventilated: false,
      categoryId: null,
      budgetId: null,
      active: true,
      matchingRules: [],
      splits: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'splits',
  });
  const {
    fields: matchingRuleFields,
    append: appendMatchingRule,
    remove: removeMatchingRule,
  } = useFieldArray({
    control,
    name: 'matchingRules',
  });

  useEffect(() => {
    if (!tiers) return;

    reset({
      name: tiers.name,
      comment: tiers.comment ?? '',
      budgetBearer: tiers.budgetBearer,
      ventilated: tiers.ventilated,
      categoryId: tiers.categoryId,
      budgetId: tiers.budgetId,
      active: tiers.active,
      matchingRules: tiers.matchingRules.map(rule => ({
        label: rule.label,
        description: rule.description ?? '',
        active: rule.active,
        operator: rule.operator,
        stopOnMatch: rule.stopOnMatch,
        conditions: rule.conditions.map(condition => ({
          field: condition.field,
          matcher: condition.matcher,
          value: condition.value ?? '',
          value2: condition.value2 ?? '',
          negate: condition.negate,
          position: condition.position,
        })),
      })),
      splits: tiers.splits.map(split => ({
        label: split.label ?? '',
        categoryId: split.categoryId,
        budgetId: split.budgetId,
        expense: split.expense,
        income: split.income,
      })),
    });
  }, [tiers, reset]);

  const watchedVentilated = watch('ventilated');
  const watchedSplits = watch('splits');
  const watchedMatchingRules = watch('matchingRules');
  const watchedCategoryId = watch('categoryId');
  const watchedBudgetId = watch('budgetId');

  const categoryOptions = useMemo(
    () =>
      filterActiveOptions(
        categories.map(category => ({ value: category.id, label: category.label })),
        value => !!categories.find(category => category.id === value)?.active,
        [tiers?.categoryId, watchedCategoryId, ...(watchedSplits ?? []).map(split => split.categoryId)],
      ),
    [categories, tiers, watchedCategoryId, watchedSplits],
  );
  const enveloppeOptions = useMemo(
    () =>
      filterActiveOptions(
        enveloppes.map(enveloppe => ({ value: enveloppe.id, label: enveloppe.label })),
        value => !!enveloppes.find(enveloppe => enveloppe.id === value)?.active,
        [tiers?.budgetId, watchedBudgetId, ...(watchedSplits ?? []).map(split => split.budgetId)],
      ),
    [enveloppes, tiers, watchedBudgetId, watchedSplits],
  );

  const splitExpense = (watchedSplits ?? []).reduce((sum, split) => sum + asNumber(split.expense), 0);
  const splitIncome = (watchedSplits ?? []).reduce((sum, split) => sum + asNumber(split.income), 0);
  const splitRows = fields.map((field, index) => ({
    id: field.id,
    label: watchedSplits?.[index]?.label ?? '',
    expense: watchedSplits?.[index]?.expense ?? '',
    income: watchedSplits?.[index]?.income ?? '',
    budgetId: watchedSplits?.[index]?.budgetId ?? null,
    categoryId: watchedSplits?.[index]?.categoryId ?? null,
    enveloppeLabel: enveloppes.find(enveloppe => enveloppe.id === watchedSplits?.[index]?.budgetId)?.label ?? null,
    categorieLabel: categories.find(category => category.id === watchedSplits?.[index]?.categoryId)?.label ?? null,
  }));

  const splitError = useMemo(() => getSplitError(watchedVentilated, watchedSplits ?? []), [watchedSplits, watchedVentilated]);

  const matchingRulesError = useMemo(() => getMatchingRulesError(watchedMatchingRules ?? []), [watchedMatchingRules]);

  const onSubmit = async (values: FormValues) => {
    const nextSplitError = getSplitError(values.ventilated, values.splits);
    const nextMatchingRulesError = getMatchingRulesError(values.matchingRules);

    if (nextSplitError) {
      setLocalError(nextSplitError);
      return;
    }
    if (nextMatchingRulesError) {
      setLocalError(nextMatchingRulesError);
      return;
    }

    try {
      setLocalError(null);
      const payload = toPayload(values);
      if (isNew) {
        const created = await createMutation.mutateAsync(payload);
        router.push(`/referentiels/tiers?highlight=${created.id}`);
      } else {
        await updateMutation.mutateAsync({ id: id!, ...payload });
        router.push(`/referentiels/tiers?highlight=${id}`);
      }
    } catch (err: unknown) {
      void err;
    }
  };

  const mutationError = (isNew ? createMutation.error : updateMutation.error)?.message ?? null;

  if (!isNew && isLoading) {
    return (
      <Center style={{ minHeight: 200 }}>
        <Loader size="sm" />
      </Center>
    );
  }

  const labelStyle = {
    width: 'var(--crud-label-width)',
    minHeight: 'var(--crud-label-height)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  } as const;

  const topLabelStyle = {
    width: 'var(--crud-label-width)',
    flexShrink: 0,
    paddingTop: 6,
  } as const;

  const fieldInputStyle = {
    background: FIELD_BG,
    height: 'var(--crud-field-height)',
    minHeight: 'var(--crud-field-height)',
    fontSize: 'var(--crud-field-font-size)',
  } as const;

  return (
    <Box style={{ maxWidth: 'var(--crud-form-max-width)', margin: '0 auto' }}>
      <Box
        style={{
          background: PANEL_BG,
          border: `1px solid ${GRAY_BORDER}`,
          borderRadius: 'var(--crud-form-panel-radius)',
          overflow: 'hidden',
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
        }}
      >
        <Box
          style={{
            background: CRUD.couleurs.fondBandeau,
            color: CRUD.couleurs.texteBandeau,
            padding: '8px 18px',
            fontWeight: 700,
            fontSize: 'var(--crud-header-font-size)',
          }}
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text inherit fw={700}>Fiche tiers</Text>
            <Button variant="subtle" size="xs" color="rgba(255,255,255,0.92)" onClick={() => router.push('/referentiels/tiers')}>
              Fermer
            </Button>
          </Group>
        </Box>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack
            gap="var(--crud-form-field-gap)"
            style={{
              padding:
                'var(--crud-form-body-padding-top) var(--crud-form-body-padding-x) var(--crud-form-body-padding-bottom)',
            }}
          >
            {(mutationError || localError) && (
              <Alert color="red" icon={<IconAlertCircle size={16} />} style={{ background: '#fff5f5', border: '1px solid #ffc9c9' }}>
                <Text size="sm">{mutationError ?? localError}</Text>
              </Alert>
            )}

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Nom <span style={{ color: 'red' }}>*</span>
              </Text>
              <TextInput {...register('name')} size="sm" radius="md" style={{ flex: 1 }} error={errors.name?.message} autoFocus styles={{ input: fieldInputStyle }} />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Id source</Text>
              <TextInput
                value={tiers?.idSource ?? ''}
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                disabled
                styles={{ input: fieldInputStyle }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Enveloppe habituelle</Text>
              <PositioningSelect
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                data={enveloppeOptions}
                value={watchedBudgetId ?? null}
                clearable
                disabled={loadingEnveloppes || watchedVentilated}
                placeholder={watchedVentilated ? 'Désactivée pour un tiers ventilé' : 'Aucune'}
                onChange={value => setValue('budgetId', value, { shouldDirty: true })}
                styles={{ input: fieldInputStyle }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Catégorie habituelle</Text>
              <PositioningSelect
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                data={categoryOptions}
                value={watchedCategoryId ?? null}
                clearable
                disabled={loadingCategories || watchedVentilated}
                placeholder={watchedVentilated ? 'Désactivée pour un tiers ventilé' : 'Aucune'}
                onChange={value => setValue('categoryId', value, { shouldDirty: true })}
                styles={{ input: fieldInputStyle }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Porte budget</Text>
              <Checkbox
                size="md"
                checked={watch('budgetBearer')}
                onChange={event => setValue('budgetBearer', event.currentTarget.checked, { shouldDirty: true })}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Tiers ventilé</Text>
              <Checkbox
                size="md"
                checked={watchedVentilated}
                onChange={event => {
                  const nextValue = event.currentTarget.checked;
                  setValue('ventilated', nextValue, { shouldDirty: true });
                  if (nextValue) {
                    setValue('budgetId', null, { shouldDirty: true });
                    setValue('categoryId', null, { shouldDirty: true });
                  }
                }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Ventilation type</Text>
              <Group gap={12} style={{ flex: 1 }}>
                <Button
                  type="button"
                  variant="default"
                  radius="md"
                  leftSection={<IconGitBranch size={14} />}
                  disabled={!watchedVentilated}
                  onClick={() => setVentilationOpened(true)}
                >
                  Éditer la ventilation
                </Button>
                <Text size="sm" c="dimmed">
                  {watchedVentilated
                    ? `${splitRows.length} ligne(s) configurée(s)`
                    : 'Activez "Tiers ventilé" pour définir les lignes de ventilation.'}
                </Text>
              </Group>
            </Group>

            <Group gap={0} align="flex-start">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={topLabelStyle}>Bloc note</Text>
              <Textarea
                {...register('comment')}
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                rows={5}
                placeholder="Notes et commentaires..."
                styles={{ input: { background: FIELD_BG, fontSize: 'var(--crud-field-font-size)' } }}
              />
            </Group>

            <Group gap={0} align="flex-start">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={topLabelStyle}>Règles de matching</Text>
              <Box style={{ flex: 1 }}>
                <Stack gap={10}>
                  <Group justify="space-between" align="center">
                    <Text size="sm" c="dimmed">
                      Définissez les critères de pré-affectation de ce tiers.
                    </Text>
                    <Button
                      type="button"
                      variant="light"
                      size="xs"
                      onClick={() => {
                        appendMatchingRule({
                          label: '',
                          description: '',
                          active: true,
                          operator: 'AND',
                          stopOnMatch: false,
                          conditions: [{ field: 'normalizedLabel', matcher: 'contains', value: '', value2: '', negate: false, position: 0 }],
                        });
                        setExpandedRuleIndex(matchingRuleFields.length);
                      }}
                    >
                      Ajouter une règle
                    </Button>
                  </Group>
                  {matchingRuleFields.length === 0 && (
                    <Text size="sm" c="dimmed">Aucune règle de matching.</Text>
                  )}
                  {matchingRuleFields.map((ruleField, ruleIndex) => (
                    <Box
                      key={ruleField.id}
                      style={{ border: '1px solid #d9e3f0', borderRadius: 10, padding: 12, background: '#fcfdff' }}
                    >
                      <Group justify="space-between" align="flex-start" gap={12}>
                        <Box style={{ flex: 1 }}>
                          <Text fw={600} size="sm">
                            {watchedMatchingRules?.[ruleIndex]?.label?.trim() || `Règle ${ruleIndex + 1}`}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {`${watchedMatchingRules?.[ruleIndex]?.conditions?.length ?? 0} condition(s)`}
                            {watchedMatchingRules?.[ruleIndex]?.description?.trim()
                              ? ` • ${watchedMatchingRules[ruleIndex]?.description?.trim()}`
                              : ''}
                          </Text>
                        </Box>
                        <Group gap={8}>
                          <Button
                            type="button"
                            variant="default"
                            size="xs"
                            onClick={() => setExpandedRuleIndex(current => current === ruleIndex ? null : ruleIndex)}
                          >
                            {expandedRuleIndex === ruleIndex ? 'Masquer le détail' : 'Éditer'}
                          </Button>
                          <Button
                            type="button"
                            color="red"
                            variant="light"
                            size="xs"
                            onClick={() => {
                              removeMatchingRule(ruleIndex);
                              setExpandedRuleIndex(current => {
                                if (current === null) return null;
                                if (current === ruleIndex) return null;
                                return current > ruleIndex ? current - 1 : current;
                              });
                            }}
                          >
                            Supprimer
                          </Button>
                        </Group>
                      </Group>

                      {expandedRuleIndex === ruleIndex && (
                        <Box mt={12}>
                          <MatchingRuleEditor
                            ruleIndex={ruleIndex}
                            control={control}
                            watch={watch}
                            setValue={setValue}
                          />
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Actif</Text>
              <Checkbox size="md" checked={watch('active')} onChange={event => setValue('active', event.currentTarget.checked, { shouldDirty: true })} />
            </Group>
          </Stack>

          <Group
            justify="space-between"
            gap="var(--crud-form-footer-gap)"
            style={{
              padding: 'var(--crud-form-footer-padding-y) var(--crud-form-footer-padding-x)',
              background: FIELD_BG,
            }}
          >
            <Box>
              {!isNew && (
                <Button
                  type="button"
                  size="xs"
                  radius="md"
                  color="red"
                  variant="light"
                  loading={deleteMutation.isPending}
                  onClick={async () => {
                    if (!window.confirm(`Supprimer le tiers "${tiers?.name}" ?`)) return;
                    try {
                      await deleteMutation.mutateAsync(id!);
                      router.push('/referentiels/tiers');
                    } catch {
                      void 0;
                    }
                  }}
                >
                  Supprimer
                </Button>
              )}
            </Box>

            <Group gap="var(--crud-form-footer-gap)">
              <Button type="button" variant="default" radius="md" onClick={() => router.push('/referentiels/tiers')}>
                Retour
              </Button>
              <Button type="submit" radius="md" loading={isSubmitting}>
                Enregistrer
              </Button>
            </Group>
          </Group>
        </form>
      </Box>

      <OperationSplitModal
        opened={ventilationOpened}
        title="Ventilation du tiers"
        editable
        rows={splitRows}
        splitError={splitError}
        remainingBalance={null}
        showSaveHint
        splitExpense={splitExpense}
        splitIncome={splitIncome}
        enveloppeOptions={enveloppeOptions}
        categoryOptions={categoryOptions}
        onClose={() => setVentilationOpened(false)}
        onAddRow={() => append({ label: '', expense: '', income: '', budgetId: null, categoryId: null })}
        onRemoveRow={index => remove(index)}
        onChangeRow={(index, field, value) => {
          setValue(`splits.${index}.${field}`, value as never, { shouldDirty: true });
          setLocalError(null);
        }}
        onRowEnter={index => event => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          if (index === splitRows.length - 1) {
            append({ label: '', expense: '', income: '', budgetId: null, categoryId: null });
          }
        }}
      />
    </Box>
  );
}
