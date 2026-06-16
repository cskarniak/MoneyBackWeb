'use client';

import { CRUD } from '@/lib/crud-tokens';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ActionIcon,
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
import { IconAlertCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import { useAccountsAll } from '@/hooks/useAccounts';
import { useCategoriesAll } from '@/hooks/useCategories';
import { useCreateOperation, useDeleteOperation, useOperation, useUpdateOperation, type OperationPayload } from '@/hooks/useOperations';
import { useEnveloppesAll } from '@/hooks/useEnveloppes';
import { useThirdPartiesAll } from '@/hooks/useThirdParties';

const GRAY_BORDER = '#dee2e6';
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
  label: z.string().min(1, 'Le libellé est obligatoire'),
  operationDate: z.string().min(1, 'La date est obligatoire'),
  dueDate: z.string().optional(),
  expense: z.string().optional(),
  income: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  budgetId: z.string().nullable().optional(),
  thirdPartyId: z.string().nullable().optional(),
  pieceNumber: z.string().optional(),
  statementRef: z.string().optional(),
  operationValidated: z.boolean(),
  locked: z.boolean(),
  closed: z.boolean(),
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

function buildPayload(values: FormValues): OperationPayload {
  return {
    accountId: values.accountId,
    label: values.label,
    operationDate: isoDate(values.operationDate),
    dueDate: values.dueDate ? isoDate(values.dueDate) : null,
    expense: asNumber(values.expense),
    income: asNumber(values.income),
    categoryId: values.categoryId || null,
    budgetId: values.budgetId || null,
    thirdPartyId: values.thirdPartyId || null,
    pieceNumber: values.pieceNumber || null,
    statementRef: values.statementRef || null,
    operationValidated: values.operationValidated ? 'V' : null,
    locked: values.locked,
    closed: values.closed,
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

export function OperationsFiche({ id }: Props) {
  const router = useRouter();
  const isNew = !id;

  const { data: operation, isLoading: loadingOperation } = useOperation(id ?? '');
  const { data: accounts = [], isLoading: loadingAccounts } = useAccountsAll();
  const { data: categories = [], isLoading: loadingCategories } = useCategoriesAll();
  const { data: enveloppes = [], isLoading: loadingEnveloppes } = useEnveloppesAll();
  const { data: thirdParties = [], isLoading: loadingThirdParties } = useThirdPartiesAll();
  const createMutation = useCreateOperation();
  const updateMutation = useUpdateOperation();
  const deleteMutation = useDeleteOperation();

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
      operationDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      expense: '',
      income: '',
      categoryId: null,
      budgetId: null,
      thirdPartyId: null,
      pieceNumber: '',
      statementRef: '',
      operationValidated: true,
      locked: false,
      closed: false,
      splits: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'splits',
  });

  useEffect(() => {
    if (operation) {
      reset({
        accountId: operation.accountId,
        label: operation.label,
        operationDate: inputDate(operation.operationDate),
        dueDate: inputDate(operation.dueDate),
        expense: operation.expense,
        income: operation.income,
        categoryId: operation.categoryId,
        budgetId: operation.budgetId,
        thirdPartyId: operation.thirdPartyId,
        pieceNumber: operation.pieceNumber ?? '',
        statementRef: operation.statementRef ?? '',
        operationValidated: operation.operationValidated === 'V',
        locked: operation.locked,
        closed: operation.closed,
        splits: operation.splits.map(split => ({
          label: split.label ?? '',
          categoryId: split.categoryId,
          budgetId: split.budgetId,
          expense: split.expense,
          income: split.income,
        })),
      });
    }
  }, [operation, reset]);

  const accountOptions = accounts.map(account => ({ value: account.id, label: account.name }));
  const categoryOptions = categories.map(category => ({ value: category.id, label: category.label }));
  const enveloppeOptions = enveloppes.map(enveloppe => ({ value: enveloppe.id, label: enveloppe.label }));
  const thirdPartyOptions = thirdParties.map(tiers => ({ value: tiers.id, label: tiers.name }));

  const watchSplits = watch('splits');
  const expense = asNumber(watch('expense'));
  const income = asNumber(watch('income'));
  const splitExpense = watchSplits.reduce((sum, split) => sum + asNumber(split.expense), 0);
  const splitIncome = watchSplits.reduce((sum, split) => sum + asNumber(split.income), 0);

  const mutationError = (isNew ? createMutation.error : updateMutation.error)?.message ?? null;
  const splitError =
    watchSplits.length > 0 && (expense !== splitExpense || income !== splitIncome)
      ? `La ventilation doit totaliser ${expense.toFixed(2)} en dépense et ${income.toFixed(2)} en recette. Actuel: ${splitExpense.toFixed(2)} / ${splitIncome.toFixed(2)}.`
      : null;

  const isLoading = (!isNew && loadingOperation) || loadingAccounts || loadingCategories || loadingEnveloppes || loadingThirdParties;

  if (isLoading) {
    return (
      <Center style={{ minHeight: 200 }}>
        <Loader size="sm" />
      </Center>
    );
  }

  const fieldInputStyle = {
    background: FIELD_BG,
    height: 'var(--crud-field-height)',
    minHeight: 'var(--crud-field-height)',
    fontSize: 'var(--crud-field-font-size)',
  } as const;

  const onSubmit = async (values: FormValues) => {
    if (splitError) return;
    try {
      const payload = buildPayload(values);
      if (isNew) {
        const created = await createMutation.mutateAsync(payload);
        router.push(`/operations?highlight=${created.id}`);
      } else {
        await updateMutation.mutateAsync({ id: id!, ...payload });
        router.push(`/operations?highlight=${id}`);
      }
    } catch (err: unknown) {
      void err;
    }
  };

  return (
    <Box style={{ maxWidth: 'var(--crud-list-max-width)', margin: '0 auto' }}>
      <Box
        style={{
          background: PANEL_BG,
          border: `1px solid ${GRAY_BORDER}`,
          borderRadius: 'var(--crud-list-panel-radius)',
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
          Saisie opération
        </Box>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack
            gap={12}
            style={{
              padding:
                'var(--crud-form-body-padding-top) var(--crud-form-body-padding-x) var(--crud-form-body-padding-bottom)',
            }}
          >
            {mutationError && (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">{mutationError}</Text>
              </Alert>
            )}
            {splitError && (
              <Alert color="orange" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">{splitError}</Text>
              </Alert>
            )}

            <Group justify="space-between" align="center">
              <Text fw={700} c={LABEL_COLOR}>
                {isNew ? 'Nouvelle opération' : `Modification: ${operation?.label ?? ''}`}
              </Text>
              <Group gap={8}>
                <Button variant="default" radius="md" onClick={() => reset()}>
                  RAZ
                </Button>
                <Button
                  variant="default"
                  radius="md"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => append({ label: '', categoryId: null, budgetId: null, expense: '', income: '' })}
                >
                  Ventiler
                </Button>
              </Group>
            </Group>

            <Box>
              <Box style={{ border: `1px solid ${GRAY_BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                <Table withTableBorder={false} withColumnBorders={false} style={{ tableLayout: 'fixed' }}>
                  <Table.Thead>
                    <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                      <Table.Th>Compte</Table.Th>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Echéance</Table.Th>
                      <Table.Th>Libellé</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Dépense</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Recette</Table.Th>
                      <Table.Th>Tiers</Table.Th>
                      <Table.Th>Catégorie</Table.Th>
                      <Table.Th>Enveloppe</Table.Th>
                      <Table.Th>No pièce</Table.Th>
                      <Table.Th>Réf. relevé</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    <Table.Tr>
                      <Table.Td>
                        <Select data={accountOptions} value={watch('accountId')} onChange={val => setValue('accountId', val ?? '')} searchable styles={{ input: fieldInputStyle }} />
                      </Table.Td>
                      <Table.Td>
                        <TextInput {...register('operationDate')} type="date" error={errors.operationDate?.message} styles={{ input: fieldInputStyle }} />
                      </Table.Td>
                      <Table.Td>
                        <TextInput {...register('dueDate')} type="date" styles={{ input: fieldInputStyle }} />
                      </Table.Td>
                      <Table.Td>
                        <TextInput {...register('label')} error={errors.label?.message} styles={{ input: fieldInputStyle }} />
                      </Table.Td>
                      <Table.Td>
                        <TextInput {...register('expense')} inputMode="decimal" styles={{ input: { ...fieldInputStyle, textAlign: 'right' } }} />
                      </Table.Td>
                      <Table.Td>
                        <TextInput {...register('income')} inputMode="decimal" styles={{ input: { ...fieldInputStyle, textAlign: 'right' } }} />
                      </Table.Td>
                      <Table.Td>
                        <Select data={thirdPartyOptions} value={watch('thirdPartyId') ?? null} onChange={val => setValue('thirdPartyId', val)} clearable searchable styles={{ input: fieldInputStyle }} />
                      </Table.Td>
                      <Table.Td>
                        <Select data={categoryOptions} value={watch('categoryId') ?? null} onChange={val => setValue('categoryId', val)} clearable searchable styles={{ input: fieldInputStyle }} />
                      </Table.Td>
                      <Table.Td>
                        <Select data={enveloppeOptions} value={watch('budgetId') ?? null} onChange={val => setValue('budgetId', val)} clearable searchable styles={{ input: fieldInputStyle }} />
                      </Table.Td>
                      <Table.Td>
                        <TextInput {...register('pieceNumber')} styles={{ input: fieldInputStyle }} />
                      </Table.Td>
                      <Table.Td>
                        <TextInput {...register('statementRef')} styles={{ input: fieldInputStyle }} />
                      </Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
              </Box>

              <Group justify="space-between" mt={10} gap={20}>
                <Group gap={24}>
                  {!isNew && (
                    <Checkbox label="Validée" checked={watch('operationValidated')} onChange={e => setValue('operationValidated', e.currentTarget.checked)} />
                  )}
                  <Checkbox label="Verrouillée" checked={watch('locked')} onChange={e => setValue('locked', e.currentTarget.checked)} />
                  <Checkbox label="Clôturée" checked={watch('closed')} onChange={e => setValue('closed', e.currentTarget.checked)} />
                </Group>
                <Group gap={20}>
                  <Text size="sm">Dépense: <strong>{expense.toFixed(2)}</strong></Text>
                  <Text size="sm">Recette: <strong>{income.toFixed(2)}</strong></Text>
                </Group>
              </Group>
            </Box>

            <Box>
              <Group justify="space-between" mb={10}>
                <Box>
                  <Text fw={700}>Ventilation</Text>
                  <Text size="sm" c="dimmed">Saisie par lignes pour répartir l&apos;opération.</Text>
                </Box>
              </Group>

              <Box style={{ border: `1px solid ${GRAY_BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                <Table withTableBorder={false} withColumnBorders={false} style={{ tableLayout: 'fixed' }}>
                  <Table.Thead>
                    <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                      <Table.Th>Libellé</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Dépense</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Recette</Table.Th>
                      <Table.Th>Enveloppe</Table.Th>
                      <Table.Th>Catégorie</Table.Th>
                      <Table.Th style={{ width: 56 }} />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {watchSplits.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Text size="sm" c="dimmed">Aucune ligne de ventilation.</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      fields.map((field, index) => {
                        const split = watchSplits[index];
                        return (
                          <Table.Tr key={field.id}>
                            <Table.Td>
                              <TextInput {...register(`splits.${index}.label`)} styles={{ input: { background: FIELD_BG } }} />
                            </Table.Td>
                            <Table.Td>
                              <TextInput {...register(`splits.${index}.expense`)} inputMode="decimal" styles={{ input: { background: FIELD_BG, textAlign: 'right' } }} />
                            </Table.Td>
                            <Table.Td>
                              <TextInput {...register(`splits.${index}.income`)} inputMode="decimal" styles={{ input: { background: FIELD_BG, textAlign: 'right' } }} />
                            </Table.Td>
                            <Table.Td>
                              <Select data={enveloppeOptions} value={split.budgetId ?? null} onChange={val => setValue(`splits.${index}.budgetId`, val)} clearable searchable styles={{ input: { background: FIELD_BG } }} />
                            </Table.Td>
                            <Table.Td>
                              <Select data={categoryOptions} value={split.categoryId ?? null} onChange={val => setValue(`splits.${index}.categoryId`, val)} clearable searchable styles={{ input: { background: FIELD_BG } }} />
                            </Table.Td>
                            <Table.Td>
                              <ActionIcon color="red" variant="subtle" onClick={() => remove(index)}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })
                    )}
                  </Table.Tbody>
                </Table>
              </Box>

              <Group justify="space-between" mt={10}>
                <Button variant="default" leftSection={<IconPlus size={14} />} onClick={() => append({ label: '', categoryId: null, budgetId: null, expense: '', income: '' })}>
                  Ajouter une ligne
                </Button>
                <Group gap={20}>
                  <Text size="sm">Total ventilé dépense: <strong>{splitExpense.toFixed(2)}</strong></Text>
                  <Text size="sm">Total ventilé recette: <strong>{splitIncome.toFixed(2)}</strong></Text>
                </Group>
              </Group>
            </Box>
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
                  size="xs"
                  radius="md"
                  color="red"
                  variant="light"
                  loading={deleteMutation.isPending}
                  onClick={async () => {
                    if (!window.confirm(`Supprimer l'opération "${operation?.label}" ?`)) return;
                    try {
                      await deleteMutation.mutateAsync(id!);
                      router.push('/operations');
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
              <Button variant="default" radius="md" onClick={() => router.push('/operations')}>
                Retour
              </Button>
              <Button type="submit" radius="md" loading={isSubmitting} disabled={!!splitError}>
                Enregistrer
              </Button>
            </Group>
          </Group>
        </form>
      </Box>
    </Box>
  );
}
