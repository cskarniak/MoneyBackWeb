'use client';

import { buildCrudFormCssVariables, CRUD } from '@/lib/crud-tokens';
import { PositioningSelect } from '@/components/common/PositioningSelect';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconAlertCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import { useAccountsAll } from '@/hooks/useAccounts';
import { useCategoriesAll } from '@/hooks/useCategories';
import { useCreateOperation, useDeleteOperation, useOperation, useUpdateOperation, type OperationPayload } from '@/hooks/useOperations';
import { useEnveloppesAll } from '@/hooks/useEnveloppes';
import { useMovementTypesAll } from '@/hooks/useMovementTypes';
import { usePaymentMethodsAll } from '@/hooks/usePaymentMethods';
import { useThirdPartiesAll } from '@/hooks/useThirdParties';
import { filterActiveOptions } from '@/lib/activeOptions';
import { OperationSplitModal } from './OperationSplitModal';
import { buildThirdPartySplitDrafts, sumSplitDrafts, type OperationSplitDraft } from './operationThirdPartyHelpers';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const FIELD_BG = '#fbfdff';
const LABEL_COLOR = '#1f2937';
const SHORT_SELECT_WIDTH = 92;
const SHORT_SELECT_DROPDOWN_WIDTH = 260;
const SPLIT_TOLERANCE = 0.011;

type ShortCodeOption = {
  value: string;
  label: string;
  fullLabel: string;
};

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
  paymentMethodId: z.string().nullable().optional(),
  movementTypeId: z.string().nullable().optional(),
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

function amountsMatch(left: number, right: number) {
  return Math.abs(left - right) < SPLIT_TOLERANCE;
}

function isoDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function inputDate(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function buildShortCodeOption(id: string, code: string | null | undefined, label: string): ShortCodeOption {
  const trimmedCode = code?.trim();
  return {
    value: id,
    label: trimmedCode || label,
    fullLabel: label,
  };
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
    paymentMethodId: values.paymentMethodId || null,
    movementTypeId: values.movementTypeId || null,
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
  const compactFormVars = buildCrudFormCssVariables('operationsFiche');
  const [splitSuggestionModalOpened, setSplitSuggestionModalOpened] = useState(false);
  const [suggestedThirdPartyName, setSuggestedThirdPartyName] = useState<string | null>(null);
  const [suggestedSplits, setSuggestedSplits] = useState<OperationSplitDraft[]>([]);

  const { data: operation, isLoading: loadingOperation } = useOperation(id ?? '');
  const { data: accounts = [], isLoading: loadingAccounts } = useAccountsAll();
  const { data: categories = [], isLoading: loadingCategories } = useCategoriesAll();
  const { data: enveloppes = [], isLoading: loadingEnveloppes } = useEnveloppesAll();
  const { data: paymentMethods = [], isLoading: loadingPaymentMethods } = usePaymentMethodsAll();
  const { data: movementTypes = [], isLoading: loadingMovementTypes } = useMovementTypesAll();
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
      paymentMethodId: null,
      movementTypeId: null,
      pieceNumber: '',
      statementRef: '',
      operationValidated: true,
      locked: false,
      closed: false,
      splits: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
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
        paymentMethodId: operation.paymentMethodId,
        movementTypeId: operation.movementTypeId,
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
      setSuggestedSplits([]);
      setSuggestedThirdPartyName(null);
    }
  }, [operation, reset]);

  const watchSplits = watch('splits');
  const selectedThirdPartyId = watch('thirdPartyId');

  const accountOptions = filterActiveOptions(
    accounts.map(account => ({ value: account.id, label: account.name })),
    value => !accounts.find(account => account.id === value)?.closed,
    [operation?.accountId],
  );
  const categoryOptions = filterActiveOptions(
    categories.map(category => ({ value: category.id, label: category.label })),
    value => !!categories.find(category => category.id === value)?.active,
    [operation?.categoryId, ...watchSplits.map(split => split.categoryId)],
  );
  const enveloppeOptions = filterActiveOptions(
    enveloppes.map(enveloppe => ({ value: enveloppe.id, label: enveloppe.label })),
    value => !!enveloppes.find(enveloppe => enveloppe.id === value)?.active,
    [operation?.budgetId, ...watchSplits.map(split => split.budgetId)],
  );
  const thirdPartyOptions = filterActiveOptions(
    thirdParties.map(tiers => ({ value: tiers.id, label: tiers.name })),
    value => !!thirdParties.find(tiers => tiers.id === value)?.active,
    [operation?.thirdPartyId],
  );
  const paymentMethodOptions = paymentMethods.map(paymentMethod =>
    buildShortCodeOption(paymentMethod.id, paymentMethod.code, paymentMethod.label));
  const movementTypeOptions = movementTypes.map(movementType =>
    buildShortCodeOption(movementType.id, movementType.code, movementType.label));
  const currentPaymentMethodOption =
    operation?.moyenPaiement && !paymentMethodOptions.some(option => option.value === operation.moyenPaiement?.id)
      ? [{
          value: operation.moyenPaiement.id,
          label: operation.moyenPaiement.code || operation.moyenPaiement.label,
          fullLabel: operation.moyenPaiement.label,
        }]
      : [];
  const currentMovementTypeOption =
    operation?.typeMouvement && !movementTypeOptions.some(option => option.value === operation.typeMouvement?.id)
      ? [{
          value: operation.typeMouvement.id,
          label: operation.typeMouvement.code || operation.typeMouvement.label,
          fullLabel: operation.typeMouvement.label,
        }]
      : [];
  const displayedPaymentMethodOptions = [...currentPaymentMethodOption, ...paymentMethodOptions];
  const displayedMovementTypeOptions = [...currentMovementTypeOption, ...movementTypeOptions];

  const currentLabel = watch('label');
  const hasSplitRows = watchSplits.length > 0;
  const expense = asNumber(watch('expense'));
  const income = asNumber(watch('income'));
  const splitExpense = watchSplits.reduce((sum, split) => sum + asNumber(split.expense), 0);
  const splitIncome = watchSplits.reduce((sum, split) => sum + asNumber(split.income), 0);
  const displayedCategoryOptions = hasSplitRows
    ? [{ value: '__split__', label: 'Ventilé' }]
    : categoryOptions;
  const displayedEnveloppeOptions = hasSplitRows
    ? [{ value: '__split__', label: 'Ventilé' }]
    : enveloppeOptions;
  const selectedThirdParty = thirdParties.find(tiers => tiers.id === selectedThirdPartyId) ?? null;
  const suggestedTotals = sumSplitDrafts(suggestedSplits);

  const mutationError = (isNew ? createMutation.error : updateMutation.error)?.message ?? null;
  const splitError =
    watchSplits.length > 0 && (!amountsMatch(expense, splitExpense) || !amountsMatch(income, splitIncome))
      ? `La ventilation doit totaliser ${expense.toFixed(2)} en dépense et ${income.toFixed(2)} en recette. Actuel: ${splitExpense.toFixed(2)} / ${splitIncome.toFixed(2)}.`
      : null;
  const originalLabel = operation?.label?.trim() ?? '';
  const currentNormalizedLabel = currentLabel?.trim() ?? '';
  const isElectronicImportedOperation = !isNew && operation?.entryMode === 'E';
  const isImportedLabelModified =
    isElectronicImportedOperation
    && originalLabel.length > 0
    && currentNormalizedLabel.length > 0
    && currentNormalizedLabel !== originalLabel;

  const isLoading =
    (!isNew && loadingOperation)
    || loadingAccounts
    || loadingCategories
    || loadingEnveloppes
    || loadingPaymentMethods
    || loadingMovementTypes
    || loadingThirdParties;

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

  const handleThirdPartyChange = (thirdPartyId: string | null) => {
    setValue('thirdPartyId', thirdPartyId, { shouldDirty: true });

    if (!thirdPartyId) {
      setSuggestedSplits([]);
      setSuggestedThirdPartyName(null);
      return;
    }

    const thirdParty = thirdParties.find(tiers => tiers.id === thirdPartyId);
    if (!thirdParty) {
      setSuggestedSplits([]);
      setSuggestedThirdPartyName(null);
      return;
    }

    setValue('categoryId', thirdParty.categoryId, { shouldDirty: true });
    setValue('budgetId', thirdParty.budgetId, { shouldDirty: true });

    const nextSuggestedSplits = buildThirdPartySplitDrafts(thirdParty, watch('label'));
    setSuggestedSplits(nextSuggestedSplits);
    setSuggestedThirdPartyName(nextSuggestedSplits.length > 0 ? thirdParty.name : null);
  };

  const applySuggestedSplits = () => {
    if (suggestedSplits.length === 0) {
      return;
    }

    if (
      watchSplits.length > 0
      && !window.confirm('Cette opération contient déjà une ventilation. La nouvelle ventilation du tiers va la remplacer. Continuer ?')
    ) {
      return;
    }

    replace(suggestedSplits);
    setValue('categoryId', null, { shouldDirty: true });
    setValue('budgetId', null, { shouldDirty: true });
    setSplitSuggestionModalOpened(false);
  };

  return (
    <Box style={{ ...compactFormVars, maxWidth: 2534, margin: '0 auto' }}>
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
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text inherit fw={700}>Saisie opération</Text>
            <Button variant="subtle" size="xs" color="rgba(255,255,255,0.92)" onClick={() => router.push('/operations')}>
              Fermer
            </Button>
          </Group>
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
            {isImportedLabelModified && (
              <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">
                  Cette écriture a été importée électroniquement (`mode de saisie = E`).
                  Modifier son libellé peut empêcher la détection de doublon lors d&apos;un prochain import.
                  Si tu as besoin d&apos;ajouter une précision, préfère le champ commentaire.
                </Text>
              </Alert>
            )}

            {!isNew && (
              <Group gap={0} align="center">
                <Text
                  fz="var(--crud-font-size)"
                  fw={600}
                  c={LABEL_COLOR}
                  style={{ width: 120, flexShrink: 0 }}
                >
                  Id source
                </Text>
                <TextInput
                  value={operation?.idSource ?? ''}
                  size="sm"
                  radius="md"
                  style={{ flex: 1 }}
                  tabIndex={-1}
                  readOnly
                  styles={{ input: { ...fieldInputStyle, background: '#f1f3f5', color: '#495057' } }}
                />
              </Group>
            )}

            <Group justify="space-between" align="center">
              <Text
                fw={700}
                c={LABEL_COLOR}
                style={{
                  maxWidth: '60%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
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
                      <Table.Th style={{ width: SHORT_SELECT_WIDTH }}>
                        <Tooltip label="Type de mouvement">
                          <Text inherit span style={{ cursor: 'help' }}>TM</Text>
                        </Tooltip>
                      </Table.Th>
                      <Table.Th style={{ width: SHORT_SELECT_WIDTH }}>
                        <Tooltip label="Moyen de paiement">
                          <Text inherit span style={{ cursor: 'help' }}>MP</Text>
                        </Tooltip>
                      </Table.Th>
                      <Table.Th>Libellé</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Dépense</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Recette</Table.Th>
                      <Table.Th>Tiers</Table.Th>
                      <Table.Th>Catégorie</Table.Th>
                      <Table.Th>Enveloppe</Table.Th>
                      <Table.Th style={{ width: 160 }}>Numéro de pièce</Table.Th>
                      <Table.Th style={{ width: 140 }}>Réf. relevé</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    <Table.Tr>
                      <Table.Td>
                        <PositioningSelect data={accountOptions} value={watch('accountId')} onChange={val => setValue('accountId', val ?? '')} styles={{ input: fieldInputStyle }} />
                      </Table.Td>
                      <Table.Td>
                        <TextInput {...register('operationDate')} type="date" error={errors.operationDate?.message} styles={{ input: fieldInputStyle }} />
                      </Table.Td>
                      <Table.Td>
                        <TextInput {...register('dueDate')} type="date" styles={{ input: fieldInputStyle }} />
                      </Table.Td>
                      <Table.Td style={{ width: SHORT_SELECT_WIDTH }}>
                        <PositioningSelect<ShortCodeOption>
                          data={displayedMovementTypeOptions}
                          value={watch('movementTypeId') ?? null}
                          onChange={val => setValue('movementTypeId', val)}
                          clearable
                          dropdownWidth={SHORT_SELECT_DROPDOWN_WIDTH}
                          getSearchText={option => [option.label, option.fullLabel]}
                          renderOption={option => (
                            <Group justify="space-between" gap={8} wrap="nowrap">
                              <Text size="sm" fw={600}>{option.label}</Text>
                              <Text size="xs" c="dimmed" truncate>{option.fullLabel}</Text>
                            </Group>
                          )}
                          styles={{ input: fieldInputStyle }}
                        />
                      </Table.Td>
                      <Table.Td style={{ width: SHORT_SELECT_WIDTH }}>
                        <PositioningSelect<ShortCodeOption>
                          data={displayedPaymentMethodOptions}
                          value={watch('paymentMethodId') ?? null}
                          onChange={val => setValue('paymentMethodId', val)}
                          clearable
                          dropdownWidth={SHORT_SELECT_DROPDOWN_WIDTH}
                          getSearchText={option => [option.label, option.fullLabel]}
                          renderOption={option => (
                            <Group justify="space-between" gap={8} wrap="nowrap">
                              <Text size="sm" fw={600}>{option.label}</Text>
                              <Text size="xs" c="dimmed" truncate>{option.fullLabel}</Text>
                            </Group>
                          )}
                          styles={{ input: fieldInputStyle }}
                        />
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
                        <PositioningSelect
                          data={thirdPartyOptions}
                          value={selectedThirdPartyId ?? null}
                          onChange={handleThirdPartyChange}
                          clearable
                          styles={{ input: fieldInputStyle }}
                        />
                      </Table.Td>
                      <Table.Td>
                        <PositioningSelect
                          data={displayedCategoryOptions}
                          value={hasSplitRows ? '__split__' : (watch('categoryId') ?? null)}
                          onChange={val => setValue('categoryId', val)}
                          placeholder="Catégorie"
                          clearable={!hasSplitRows}
                          disabled={hasSplitRows}
                          styles={{ input: fieldInputStyle }}
                        />
                      </Table.Td>
                      <Table.Td>
                        <PositioningSelect
                          data={displayedEnveloppeOptions}
                          value={hasSplitRows ? '__split__' : (watch('budgetId') ?? null)}
                          onChange={val => setValue('budgetId', val)}
                          placeholder="Enveloppe"
                          clearable={!hasSplitRows}
                          disabled={hasSplitRows}
                          styles={{ input: fieldInputStyle }}
                        />
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
                <Group gap={20}>
                  <Text size="sm">Dépense: <strong>{expense.toFixed(2)}</strong></Text>
                  <Text size="sm">Recette: <strong>{income.toFixed(2)}</strong></Text>
                </Group>
              </Group>
            </Box>

            {selectedThirdParty?.ventilated && suggestedSplits.length > 0 && (
              <Alert color="blue" icon={<IconAlertCircle size={16} />}>
                <Group justify="space-between" align="center" wrap="wrap">
                  <Box>
                    <Text size="sm" fw={600}>
                      Le tiers {suggestedThirdPartyName ?? selectedThirdParty.name} propose une ventilation de {suggestedSplits.length} ligne(s).
                    </Text>
                    <Text size="sm">
                      Totaux proposés : {suggestedTotals.expense.toFixed(2)} en dépense et {suggestedTotals.income.toFixed(2)} en recette.
                    </Text>
                  </Box>
                  <Group gap={8}>
                    <Button variant="default" size="xs" onClick={() => setSplitSuggestionModalOpened(true)}>
                      Voir / modifier
                    </Button>
                    <Button size="xs" onClick={applySuggestedSplits}>
                      Générer
                    </Button>
                  </Group>
                </Group>
              </Alert>
            )}

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
                              <TextInput {...register(`splits.${index}.label`)} styles={{ input: fieldInputStyle }} />
                            </Table.Td>
                            <Table.Td>
                              <TextInput {...register(`splits.${index}.expense`)} inputMode="decimal" styles={{ input: { ...fieldInputStyle, textAlign: 'right' } }} />
                            </Table.Td>
                            <Table.Td>
                              <TextInput {...register(`splits.${index}.income`)} inputMode="decimal" styles={{ input: { ...fieldInputStyle, textAlign: 'right' } }} />
                            </Table.Td>
                            <Table.Td>
                              <PositioningSelect data={enveloppeOptions} value={split.budgetId ?? null} onChange={val => setValue(`splits.${index}.budgetId`, val)} clearable styles={{ input: fieldInputStyle }} />
                            </Table.Td>
                            <Table.Td>
                              <PositioningSelect data={categoryOptions} value={split.categoryId ?? null} onChange={val => setValue(`splits.${index}.categoryId`, val)} clearable styles={{ input: fieldInputStyle }} />
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

      <OperationSplitModal
        opened={splitSuggestionModalOpened}
        onClose={() => setSplitSuggestionModalOpened(false)}
        title={suggestedThirdPartyName ? `Ventilation proposée - ${suggestedThirdPartyName}` : "Ventilation proposée"}
        editable
        rows={suggestedSplits.map((split, index) => ({
          id: `suggested-${index}`,
          label: split.label,
          expense: split.expense,
          income: split.income,
          budgetId: split.budgetId,
          categoryId: split.categoryId,
        }))}
        remainingBalance={(income - expense) - (suggestedTotals.income - suggestedTotals.expense)}
        splitExpense={suggestedTotals.expense}
        splitIncome={suggestedTotals.income}
        enveloppeOptions={enveloppeOptions}
        categoryOptions={categoryOptions}
        onAddRow={() => setSuggestedSplits(current => [
          ...current,
          { label: '', categoryId: null, budgetId: null, expense: '', income: '' },
        ])}
        onRemoveRow={index => setSuggestedSplits(current => current.filter((_, currentIndex) => currentIndex !== index))}
        onChangeRow={(index, field, value) => {
          setSuggestedSplits(current => current.map((split, currentIndex) => {
            if (currentIndex !== index) return split;

            if (field === 'budgetId' || field === 'categoryId') {
              return { ...split, [field]: value };
            }

            return { ...split, [field]: value ?? '' };
          }));
        }}
      />
    </Box>
  );
}
