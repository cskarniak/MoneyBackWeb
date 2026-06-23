'use client';

import { buildCrudFormCssVariables, CRUD } from '@/lib/crud-tokens';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
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
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconAlertCircle, IconGitBranch } from '@tabler/icons-react';
import { useAccountsAll } from '@/hooks/useAccounts';
import { useCategoriesAll } from '@/hooks/useCategories';
import { useEnveloppesAll } from '@/hooks/useEnveloppes';
import { useMovementTypesAll } from '@/hooks/useMovementTypes';
import { useThirdPartiesAll } from '@/hooks/useThirdParties';
import {
  useCreateSubscription,
  useDeleteSubscription,
  useSubscription,
  useUpdateSubscription,
  type SubscriptionPayload,
} from '@/hooks/useSubscriptions';
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

const schema = z.object({
  accountId: z.string().min(1, 'Le compte est obligatoire'),
  label: z.string().min(1, "Le libelle est obligatoire"),
  entryLabel: z.string().optional(),
  expense: z.string().optional(),
  income: z.string().optional(),
  periodicity: z.enum(['daily', 'weekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual']),
  dayOfPeriod: z.string().optional(),
  subscriptionType: z.enum(['real', 'simulation']),
  firstDueDate: z.string().min(1, 'La premiere echeance est obligatoire'),
  nextDueDate: z.string().optional(),
  endDate: z.string().optional(),
  active: z.boolean(),
  ventilated: z.boolean(),
  budgetId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  thirdPartyId: z.string().nullable().optional(),
  movementTypeId: z.string().nullable().optional(),
  splits: z.array(splitSchema),
});

type FormValues = z.infer<typeof schema>;
type Props = { id?: string };

function asNumber(value?: string) {
  const normalized = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : 0;
}

function isoDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function inputDate(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function toPayload(values: FormValues): SubscriptionPayload {
  return {
    accountId: values.accountId,
    label: values.label,
    entryLabel: values.entryLabel || null,
    expense: asNumber(values.expense),
    income: asNumber(values.income),
    periodicity: values.periodicity,
    dayOfPeriod: values.dayOfPeriod ? Number(values.dayOfPeriod) : null,
    subscriptionType: values.subscriptionType,
    firstDueDate: isoDate(values.firstDueDate),
    nextDueDate: values.nextDueDate ? isoDate(values.nextDueDate) : null,
    endDate: values.endDate ? isoDate(values.endDate) : null,
    active: values.active,
    budgetId: values.ventilated ? null : (values.budgetId || null),
    categoryId: values.ventilated ? null : (values.categoryId || null),
    thirdPartyId: values.thirdPartyId || null,
    movementTypeId: values.movementTypeId || null,
    splits: values.ventilated
      ? values.splits
          .map(split => ({
            label: split.label || null,
            expense: asNumber(split.expense),
            income: asNumber(split.income),
            categoryId: split.categoryId || null,
            budgetId: split.budgetId || null,
          }))
          .filter(split => split.label || split.categoryId || split.budgetId || split.expense > 0 || split.income > 0)
      : [],
  };
}

function getSplitError(splits: FormValues['splits']) {
  if (splits.length === 0) return 'Ajoutez au moins une ligne de ventilation pour un abonnement ventilé.';

  const hasInvalidRow = splits.some(split => {
    const expense = asNumber(split.expense);
    const income = asNumber(split.income);
    return (expense === 0 && income === 0) || (expense > 0 && income > 0);
  });

  return hasInvalidRow
    ? 'Chaque ligne de ventilation doit contenir soit une dépense, soit une recette.'
    : null;
}

export function SubscriptionsFiche({ id }: Props) {
  const router = useRouter();
  const isNew = !id;
  const formVars = buildCrudFormCssVariables('subscriptionsFiche');
  const [ventilationOpened, setVentilationOpened] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { data: subscription, isLoading: loadingSubscription } = useSubscription(id ?? '');
  const { data: accounts = [], isLoading: loadingAccounts } = useAccountsAll();
  const { data: categories = [], isLoading: loadingCategories } = useCategoriesAll();
  const { data: enveloppes = [], isLoading: loadingEnveloppes } = useEnveloppesAll();
  const { data: movementTypes = [], isLoading: loadingMovementTypes } = useMovementTypesAll();
  const { data: thirdParties = [], isLoading: loadingThirdParties } = useThirdPartiesAll();
  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();
  const deleteMutation = useDeleteSubscription();

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
      accountId: '',
      label: '',
      entryLabel: '',
      expense: '',
      income: '',
      periodicity: 'monthly',
      dayOfPeriod: '',
      subscriptionType: 'real',
      firstDueDate: new Date().toISOString().slice(0, 10),
      nextDueDate: '',
      endDate: '',
      active: true,
      ventilated: false,
      budgetId: null,
      categoryId: null,
      thirdPartyId: null,
      movementTypeId: null,
      splits: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'splits',
  });

  useEffect(() => {
    if (subscription) {
      reset({
        accountId: subscription.accountId,
        label: subscription.label,
        entryLabel: subscription.entryLabel ?? '',
        expense: subscription.expense,
        income: subscription.income,
        periodicity: subscription.periodicity as FormValues['periodicity'],
        dayOfPeriod: subscription.dayOfPeriod ? String(subscription.dayOfPeriod) : '',
        subscriptionType: (subscription.subscriptionType as 'real' | 'simulation' | null) ?? 'real',
        firstDueDate: inputDate(subscription.firstDueDate),
        nextDueDate: inputDate(subscription.nextDueDate),
        endDate: inputDate(subscription.endDate),
        active: subscription.active,
        ventilated: subscription.hasSplits,
        budgetId: subscription.budgetId,
        categoryId: subscription.categoryId,
        thirdPartyId: subscription.thirdPartyId,
        movementTypeId: subscription.movementTypeId,
        splits: subscription.splits.map(split => ({
          label: split.label ?? '',
          categoryId: split.categoryId,
          budgetId: split.budgetId,
          expense: split.expense,
          income: split.income,
        })),
      });
    }
  }, [subscription, reset]);

  const onSubmit = async (values: FormValues) => {
    const nextSplitError = values.ventilated ? getSplitError(values.splits) : null;
    if (nextSplitError) {
      setLocalError(nextSplitError);
      return;
    }

    try {
      setLocalError(null);
      const payload = toPayload(values);
      if (isNew) {
        const created = await createMutation.mutateAsync(payload);
        router.push(`/abonnements?highlight=${created.id}`);
      } else {
        await updateMutation.mutateAsync({ id: id!, ...payload });
        router.push(`/abonnements?highlight=${id}`);
      }
    } catch (err: unknown) {
      void err;
    }
  };

  const handleDelete = async () => {
    if (!id || !subscription) return;
    if (!window.confirm(`Supprimer l'abonnement "${subscription.label}" ?`)) return;
    await deleteMutation.mutateAsync(id);
    router.push('/abonnements');
  };

  const mutationError = (isNew ? createMutation.error : updateMutation.error)?.message ?? null;
  const watchedVentilated = watch('ventilated');
  const watchedSplits = watch('splits');
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
  const splitExpense = (watchedSplits ?? []).reduce((sum, split) => sum + asNumber(split.expense), 0);
  const splitIncome = (watchedSplits ?? []).reduce((sum, split) => sum + asNumber(split.income), 0);
  const splitError = useMemo(
    () => (watchedVentilated ? getSplitError(watchedSplits ?? []) : null),
    [watchedSplits, watchedVentilated],
  );
  const isLoading =
    (!isNew && loadingSubscription)
    || loadingAccounts
    || loadingCategories
    || loadingEnveloppes
    || loadingMovementTypes
    || loadingThirdParties;

  if (isLoading) {
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

  const fieldInputStyle = {
    background: FIELD_BG,
    height: 'var(--crud-field-height)',
    minHeight: 'var(--crud-field-height)',
    fontSize: 'var(--crud-field-font-size)',
  } as const;

  const topLabelStyle = {
    width: 'var(--crud-label-width)',
    flexShrink: 0,
    paddingTop: 6,
  } as const;

  const accountOptions = accounts.map(account => ({ value: account.id, label: account.name }));
  const categoryOptions = categories.map(category => ({ value: category.id, label: category.label }));
  const enveloppeOptions = enveloppes.map(enveloppe => ({ value: enveloppe.id, label: enveloppe.label }));
  const thirdPartyOptions = thirdParties.map(thirdParty => ({ value: thirdParty.id, label: thirdParty.name }));
  const movementTypeOptions = movementTypes.map(movementType => ({
    value: movementType.id,
    label: movementType.code?.trim()
      ? `${movementType.code} - ${movementType.label}`
      : movementType.label,
  }));

  return (
    <Box style={{ ...formVars, maxWidth: 'var(--crud-form-max-width)', margin: '0 auto' }}>
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
          Fiche abonnement
        </Box>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack
            gap="var(--crud-form-field-gap)"
            style={{
              padding:
                'var(--crud-form-body-padding-top) var(--crud-form-body-padding-x) var(--crud-form-body-padding-bottom)',
            }}
          >
            {(mutationError || localError) ? (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">{mutationError ?? localError}</Text>
              </Alert>
            ) : null}

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Libelle *
              </Text>
              <TextInput
                {...register('label')}
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                error={errors.label?.message}
                autoFocus
                styles={{ input: fieldInputStyle }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Libelle ecriture
              </Text>
              <TextInput
                {...register('entryLabel')}
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                styles={{ input: fieldInputStyle }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Compte *
              </Text>
              <Select
                value={watch('accountId')}
                onChange={value => setValue('accountId', value ?? '')}
                data={accountOptions}
                searchable
                styles={{ input: fieldInputStyle }}
                style={{ flex: 1 }}
                error={errors.accountId?.message}
              />
            </Group>

            <Group grow>
              <Group gap={0} align="center">
                <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                  Depense
                </Text>
                <TextInput {...register('expense')} size="sm" radius="md" style={{ flex: 1 }} styles={{ input: fieldInputStyle }} />
              </Group>
              <Group gap={0} align="center">
                <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                  Recette
                </Text>
                <TextInput {...register('income')} size="sm" radius="md" style={{ flex: 1 }} styles={{ input: fieldInputStyle }} />
              </Group>
            </Group>

            <Group grow>
              <Group gap={0} align="center">
                <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                  Periodicite
                </Text>
                <Select
                  value={watch('periodicity')}
                  onChange={value => setValue('periodicity', (value as FormValues['periodicity']) ?? 'monthly')}
                  data={[
                    { value: 'daily', label: 'Quotidienne' },
                    { value: 'weekly', label: 'Hebdomadaire' },
                    { value: 'monthly', label: 'Mensuelle' },
                    { value: 'bimonthly', label: 'Tous les 2 mois' },
                    { value: 'quarterly', label: 'Trimestrielle' },
                    { value: 'semiannual', label: 'Semestrielle' },
                    { value: 'annual', label: 'Annuelle' },
                  ]}
                  styles={{ input: fieldInputStyle }}
                  style={{ flex: 1 }}
                />
              </Group>
              <Group gap={0} align="center">
                <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                  Jour
                </Text>
                <TextInput {...register('dayOfPeriod')} size="sm" radius="md" style={{ flex: 1 }} styles={{ input: fieldInputStyle }} />
              </Group>
            </Group>

            <Group grow>
              <Group gap={0} align="center">
                <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                  Premiere echeance *
                </Text>
                <TextInput {...register('firstDueDate')} type="date" size="sm" radius="md" style={{ flex: 1 }} styles={{ input: fieldInputStyle }} />
              </Group>
              <Group gap={0} align="center">
                <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                  Prochaine echeance
                </Text>
                <TextInput {...register('nextDueDate')} type="date" size="sm" radius="md" style={{ flex: 1 }} styles={{ input: fieldInputStyle }} />
              </Group>
            </Group>

            <Group grow>
              <Group gap={0} align="center">
                <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                  Date fin
                </Text>
                <TextInput {...register('endDate')} type="date" size="sm" radius="md" style={{ flex: 1 }} styles={{ input: fieldInputStyle }} />
              </Group>
              <Group gap={0} align="center">
                <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                  Type abonnement
                </Text>
                <Select
                  value={watch('subscriptionType')}
                  onChange={value => setValue('subscriptionType', (value as 'real' | 'simulation') ?? 'real')}
                  data={[
                    { value: 'real', label: 'Réel' },
                    { value: 'simulation', label: 'Simulation' },
                  ]}
                  styles={{ input: fieldInputStyle }}
                  style={{ flex: 1 }}
                />
              </Group>
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Tiers
              </Text>
              <Select
                value={watch('thirdPartyId') ?? null}
                onChange={value => setValue('thirdPartyId', value)}
                data={thirdPartyOptions}
                searchable
                clearable
                styles={{ input: fieldInputStyle }}
                style={{ flex: 1 }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Categorie
              </Text>
              <Select
                value={watch('categoryId') ?? null}
                onChange={value => setValue('categoryId', value)}
                data={categoryOptions}
                searchable
                clearable
                disabled={loadingCategories || watchedVentilated}
                placeholder={watchedVentilated ? 'Désactivée pour un abonnement ventilé' : 'Aucune'}
                styles={{ input: fieldInputStyle }}
                style={{ flex: 1 }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Enveloppe
              </Text>
              <Select
                value={watch('budgetId') ?? null}
                onChange={value => setValue('budgetId', value)}
                data={enveloppeOptions}
                searchable
                clearable
                disabled={loadingEnveloppes || watchedVentilated}
                placeholder={watchedVentilated ? 'Désactivée pour un abonnement ventilé' : 'Aucune'}
                styles={{ input: fieldInputStyle }}
                style={{ flex: 1 }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Type mouvement
              </Text>
              <Select
                value={watch('movementTypeId') ?? null}
                onChange={value => setValue('movementTypeId', value)}
                data={movementTypeOptions}
                searchable
                clearable
                styles={{ input: fieldInputStyle }}
                style={{ flex: 1 }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Actif
              </Text>
              <Checkbox
                size="md"
                checked={watch('active')}
                onChange={event => setValue('active', event.currentTarget.checked)}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Écriture ventilée
              </Text>
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
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Ventilation type
              </Text>
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
                    : 'Activez "Écriture ventilée" pour définir les lignes de ventilation.'}
                </Text>
              </Group>
            </Group>

            {!isNew && subscription?.planning.length ? (
              <Stack gap="xs">
                <Text fw={600}>Planning récent</Text>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Echeance</Table.Th>
                      <Table.Th>Statut</Table.Th>
                      <Table.Th>Generation</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {subscription.planning.map(item => (
                      <Table.Tr key={item.id}>
                        <Table.Td>{inputDate(item.dueDate)}</Table.Td>
                        <Table.Td>{item.status}</Table.Td>
                        <Table.Td>{inputDate(item.generatedAt)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Stack>
            ) : null}

          </Stack>

          <Group
            justify="space-between"
            gap="var(--crud-form-footer-gap)"
            style={{
              padding:
                'var(--crud-form-footer-padding-y) var(--crud-form-footer-padding-x)',
              background: FIELD_BG,
            }}
          >
            <Group gap="var(--crud-form-footer-gap)">
              {!isNew && (
                <Button
                  size="xs"
                  radius="md"
                  variant="outline"
                  color="red"
                  onClick={handleDelete}
                  loading={deleteMutation.isPending}
                >
                  Supprimer
                </Button>
              )}
            </Group>

            <Group gap="var(--crud-form-footer-gap)">
              <Button size="sm" radius="md" variant="default" onClick={() => router.back()}>
                Annuler
              </Button>
              <Button size="sm" radius="md" type="submit" loading={isSubmitting}>
                Enregistrer
              </Button>
            </Group>
          </Group>
        </form>
      </Box>

      <OperationSplitModal
        opened={ventilationOpened}
        title="Ventilation de l'abonnement"
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
