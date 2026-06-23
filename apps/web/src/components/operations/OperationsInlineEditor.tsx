'use client';

import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ActionIcon,
  Alert,
  Box,
  Checkbox,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconGitBranch, IconMinus, IconPlus, IconX } from '@tabler/icons-react';
import { buildCrudFormCssVariables, CRUD } from '@/lib/crud-tokens';
import { useCategoriesAll } from '@/hooks/useCategories';
import { useCreateOperation, useOperation, useUpdateOperation, type Operation, type OperationPayload } from '@/hooks/useOperations';
import { useEnveloppesAll } from '@/hooks/useEnveloppes';
import { useMovementTypesAll } from '@/hooks/useMovementTypes';
import { usePaymentMethodsAll } from '@/hooks/usePaymentMethods';
import { useThirdPartiesAll } from '@/hooks/useThirdParties';
import { OperationSplitModal } from './OperationSplitModal';

const FIELD_BG = '#fbfdff';
const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const INLINE_LABEL_COLOR = '#667085';
const SHORT_SELECT_WIDTH = 60;
const SHORT_SELECT_DROPDOWN_WIDTH = 260;
const DUE_DATE_WIDTH = 120;
const LETTERING_WIDTH = 40;
const PIECE_NUMBER_WIDTH = 78;

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
  lettering: z.string().max(4, 'Le lettrage doit contenir au maximum 4 caractères').optional(),
  comment: z.string().optional(),
  pieceNumber: z.string().optional(),
  statementRef: z.string().optional(),
  operationValidated: z.boolean(),
  locked: z.boolean(),
  closed: z.boolean(),
  splits: z.array(splitSchema),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  id?: string;
  columnsCount: number;
  initialOperation?: Operation;
  selectedAccountId?: string;
  selectedAccountLabel?: string;
  onDraftChange?: (draft: { id?: string; accountId: string; expense: number; income: number } | null) => void;
  onCancel: () => void;
  onSuccess: (id: string) => void;
};

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

function buildShortCodeOption(id: string, code: string | null | undefined, label: string): ShortCodeOption {
  const trimmedCode = code?.trim();
  return {
    value: id,
    label: trimmedCode || label,
    fullLabel: label,
  };
}

function filterShortCodeOptions({
  options,
  search,
}: {
  options: ShortCodeOption[];
  search: string;
}) {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return options;

  return options.filter(option =>
    option.label.toLowerCase().includes(normalizedSearch)
    || option.fullLabel.toLowerCase().includes(normalizedSearch),
  );
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
    lettering: values.lettering || null,
    comment: values.comment || null,
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

export function OperationsInlineEditor({
  id,
  columnsCount,
  initialOperation,
  selectedAccountId,
  selectedAccountLabel,
  onDraftChange,
  onCancel,
  onSuccess,
}: Props) {
  const compactFormVars = buildCrudFormCssVariables('operationsInline');
  const [splitModalOpened, setSplitModalOpened] = useState(false);
  const [detailsOpened, setDetailsOpened] = useState(false);

  const isNew = !id;
  const { data: operation, isLoading: loadingOperation } = useOperation(id ?? '');
  const resolvedOperation = operation ?? initialOperation;
  const { data: categories = [], isLoading: loadingCategories } = useCategoriesAll();
  const { data: enveloppes = [], isLoading: loadingEnveloppes } = useEnveloppesAll();
  const { data: paymentMethods = [], isLoading: loadingPaymentMethods } = usePaymentMethodsAll();
  const { data: movementTypes = [], isLoading: loadingMovementTypes } = useMovementTypesAll();
  const { data: thirdParties = [], isLoading: loadingThirdParties } = useThirdPartiesAll();
  const createMutation = useCreateOperation();
  const updateMutation = useUpdateOperation();

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountId: selectedAccountId ?? '',
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
      lettering: '',
      comment: '',
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
    if (resolvedOperation) {
      reset({
        accountId: resolvedOperation.accountId,
        label: resolvedOperation.label,
        operationDate: inputDate(resolvedOperation.operationDate),
        dueDate: inputDate(resolvedOperation.dueDate),
        expense: resolvedOperation.expense,
        income: resolvedOperation.income,
        categoryId: resolvedOperation.categoryId,
        budgetId: resolvedOperation.budgetId,
        thirdPartyId: resolvedOperation.thirdPartyId,
        paymentMethodId: resolvedOperation.paymentMethodId,
        movementTypeId: resolvedOperation.movementTypeId,
        lettering: resolvedOperation.lettering ?? '',
        comment: resolvedOperation.comment ?? '',
        pieceNumber: resolvedOperation.pieceNumber ?? '',
        statementRef: resolvedOperation.statementRef ?? '',
        operationValidated: resolvedOperation.operationValidated === 'V',
        locked: resolvedOperation.locked,
        closed: resolvedOperation.closed,
        splits: resolvedOperation.splits.map(split => ({
          label: split.label ?? '',
          categoryId: split.categoryId,
          budgetId: split.budgetId,
          expense: split.expense,
          income: split.income,
        })),
      });
      return;
    }

    if (isNew) {
      reset({
        accountId: selectedAccountId ?? '',
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
        lettering: '',
        comment: '',
        pieceNumber: '',
        statementRef: '',
        operationValidated: true,
        locked: false,
        closed: false,
        splits: [],
      });
    }
  }, [isNew, reset, resolvedOperation, selectedAccountId]);

  const categoryOptions = categories.map(category => ({ value: category.id, label: category.label }));
  const enveloppeOptions = enveloppes.map(enveloppe => ({ value: enveloppe.id, label: enveloppe.label }));
  const thirdPartyOptions = thirdParties.map(tiers => ({ value: tiers.id, label: tiers.name }));
  const paymentMethodOptions = paymentMethods.map(paymentMethod =>
    buildShortCodeOption(paymentMethod.id, paymentMethod.code, paymentMethod.label));
  const movementTypeOptions = movementTypes.map(movementType =>
    buildShortCodeOption(movementType.id, movementType.code, movementType.label));
  const currentPaymentMethodOption =
    resolvedOperation?.moyenPaiement && !paymentMethodOptions.some(option => option.value === resolvedOperation.moyenPaiement?.id)
      ? [{
          value: resolvedOperation.moyenPaiement.id,
          label: resolvedOperation.moyenPaiement.code || resolvedOperation.moyenPaiement.label,
          fullLabel: resolvedOperation.moyenPaiement.label,
        }]
      : [];
  const currentMovementTypeOption =
    resolvedOperation?.typeMouvement && !movementTypeOptions.some(option => option.value === resolvedOperation.typeMouvement?.id)
      ? [{
          value: resolvedOperation.typeMouvement.id,
          label: resolvedOperation.typeMouvement.code || resolvedOperation.typeMouvement.label,
          fullLabel: resolvedOperation.typeMouvement.label,
        }]
      : [];
  const displayedPaymentMethodOptions = [...currentPaymentMethodOption, ...paymentMethodOptions];
  const displayedMovementTypeOptions = [...currentMovementTypeOption, ...movementTypeOptions];

  const watchSplits = watch('splits');
  const hasSplitRows = watchSplits.length > 0;
  const accountValue = watch('accountId');
  const dueDateValue = watch('dueDate');
  const letteringValue = watch('lettering');
  const commentValue = watch('comment');
  const expense = asNumber(watch('expense'));
  const income = asNumber(watch('income'));
  const splitExpense = watchSplits.reduce((sum, split) => sum + asNumber(split.expense), 0);
  const splitIncome = watchSplits.reduce((sum, split) => sum + asNumber(split.income), 0);
  const remainingBalance = (income - expense) - (splitIncome - splitExpense);
  const displayedCategoryOptions = hasSplitRows
    ? [{ value: '__split__', label: 'Ventilé' }]
    : categoryOptions;
  const displayedEnveloppeOptions = hasSplitRows
    ? [{ value: '__split__', label: 'Ventilé' }]
    : enveloppeOptions;

  const mutationError = (isNew ? createMutation.error : updateMutation.error)?.message ?? null;
  const splitError =
    watchSplits.length > 0 && (expense !== splitExpense || income !== splitIncome)
      ? `Solde à ventiler : ${remainingBalance.toFixed(2)}`
      : null;

  const isLoading =
    (!isNew && !resolvedOperation && loadingOperation)
    || loadingCategories
    || loadingEnveloppes
    || loadingPaymentMethods
    || loadingMovementTypes
    || loadingThirdParties;

  const fieldInputStyle = {
    background: FIELD_BG,
    height: 'var(--crud-field-height)',
    minHeight: 'var(--crud-field-height)',
    fontSize: 'calc(var(--crud-field-font-size) - 1px)',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 6,
    paddingRight: 6,
  } as const;

  const memoInputStyle = {
    background: FIELD_BG,
    fontSize: 'var(--crud-field-font-size)',
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 6,
    paddingRight: 6,
    resize: 'vertical' as const,
  };

  const inlineCellInputStyle = {
    ...fieldInputStyle,
  } as const;

  const inlineCellTdStyle = {
    padding: '6px 8px',
    borderRight: `1px solid ${CRUD.couleurs.grilleTableau}`,
    borderBottom: 'none',
    verticalAlign: 'middle' as const,
    background: '#f7fbff',
  };

  useEffect(() => {
    if (dueDateValue || letteringValue || commentValue) {
      setDetailsOpened(true);
    }
  }, [commentValue, dueDateValue, letteringValue]);

  useEffect(() => {
    onDraftChange?.({
      id,
      accountId: accountValue || selectedAccountId || '',
      expense,
      income,
    });

    return () => {
      onDraftChange?.(null);
    };
  }, [accountValue, expense, id, income, onDraftChange, selectedAccountId]);

  const onSubmit = async (values: FormValues) => {
    if (isNew && !selectedAccountId) return;

    const payload = buildPayload(values);

    if (isNew) {
      const created = await createMutation.mutateAsync(payload);
      onSuccess(created.id);
      return;
    }

    const updated = await updateMutation.mutateAsync({ id: id!, ...payload });
    onSuccess(updated.id);
  };

  const openSplitModal = () => {
    if (watchSplits.length === 0) {
      append({ label: '', categoryId: null, budgetId: null, expense: '', income: '' });
    }
    setSplitModalOpened(true);
  };

  const appendSplitRow = () => {
    append({ label: '', categoryId: null, budgetId: null, expense: '', income: '' });
  };

  const handleSplitRowEnter = (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    if (index === watchSplits.length - 1) {
      appendSplitRow();
      return;
    }
  };

  if (isLoading) {
    return (
      <Table.Tr>
        <Table.Td colSpan={columnsCount} style={{ padding: 18 }}>
          <Group justify="center">
            <Loader size="sm" />
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  }

  return (
    <>
      <Table.Tr style={{ ...compactFormVars, background: '#f7fbff', borderBottom: 'none' }}>
        <Table.Td style={{ ...inlineCellTdStyle, width: 22 }}>
          <Text fz={11} fw={700} lh={1} ta="center" c="#4c73f0">
            ▶
          </Text>
        </Table.Td>
        <Table.Td style={{ ...inlineCellTdStyle, width: 104 }}>
          <TextInput
            {...register('operationDate')}
            type="date"
            error={errors.operationDate?.message}
            placeholder="Date"
            styles={{ input: inlineCellInputStyle }}
          />
        </Table.Td>
        <Table.Td style={{ ...inlineCellTdStyle, width: '28%' }}>
          <TextInput
            {...register('label')}
            error={errors.label?.message}
            placeholder="Libellé"
            styles={{ input: inlineCellInputStyle }}
          />
        </Table.Td>
        <Table.Td style={inlineCellTdStyle}>
          <Select
            data={thirdPartyOptions}
            value={watch('thirdPartyId') ?? null}
            onChange={val => setValue('thirdPartyId', val, { shouldDirty: true })}
            placeholder="Tiers"
            clearable
            searchable
            styles={{ input: inlineCellInputStyle }}
          />
        </Table.Td>
        <Table.Td style={inlineCellTdStyle}>
          <Select
            data={displayedCategoryOptions}
            value={hasSplitRows ? '__split__' : (watch('categoryId') ?? null)}
            onChange={val => setValue('categoryId', val, { shouldDirty: true })}
            placeholder="Catégorie"
            clearable={!hasSplitRows}
            searchable={!hasSplitRows}
            disabled={hasSplitRows}
            styles={{ input: inlineCellInputStyle }}
          />
        </Table.Td>
        <Table.Td style={inlineCellTdStyle}>
          <Select
            data={displayedEnveloppeOptions}
            value={hasSplitRows ? '__split__' : (watch('budgetId') ?? null)}
            onChange={val => setValue('budgetId', val, { shouldDirty: true })}
            placeholder="Enveloppe"
            clearable={!hasSplitRows}
            searchable={!hasSplitRows}
            disabled={hasSplitRows}
            styles={{ input: inlineCellInputStyle }}
          />
        </Table.Td>
        <Table.Td style={{ ...inlineCellTdStyle, width: 96 }}>
          <TextInput
            {...register('expense')}
            inputMode="decimal"
            placeholder="0,00"
            styles={{ input: { ...inlineCellInputStyle, textAlign: 'right' } }}
          />
        </Table.Td>
        <Table.Td style={{ ...inlineCellTdStyle, width: 96 }}>
          <TextInput
            {...register('income')}
            inputMode="decimal"
            placeholder="0,00"
            styles={{ input: { ...inlineCellInputStyle, textAlign: 'right' } }}
          />
        </Table.Td>
        <Table.Td style={{ ...inlineCellTdStyle, borderRight: 'none' }}>
          <Group gap={6} wrap="nowrap" justify="center">
            <ActionIcon
              size="md"
              radius="md"
              color={detailsOpened ? 'blue' : 'gray'}
              variant="light"
              onClick={() => setDetailsOpened(open => !open)}
              title={detailsOpened ? 'Masquer détails' : 'Afficher détails'}
            >
              {detailsOpened ? <IconMinus size={14} /> : <IconPlus size={14} />}
            </ActionIcon>
            <ActionIcon
              size="md"
              radius="md"
              color={watchSplits.length > 0 ? 'blue' : 'gray'}
              variant="light"
              onClick={openSplitModal}
              title="Ventiler"
            >
              <IconGitBranch size={14} />
            </ActionIcon>
            <ActionIcon
              size="md"
              radius="md"
              color="green"
              variant="light"
              onClick={handleSubmit(onSubmit)}
              disabled={isNew && !selectedAccountId}
              loading={isSubmitting}
              title="Enregistrer"
            >
              <IconCheck size={14} />
            </ActionIcon>
            <ActionIcon size="md" radius="md" color="gray" variant="light" onClick={onCancel} title="Annuler">
              <IconX size={14} />
            </ActionIcon>
          </Group>
        </Table.Td>
      </Table.Tr>

      {detailsOpened && (
        <Table.Tr style={{ ...compactFormVars, background: '#f7fbff' }}>
        <Table.Td style={{ ...inlineCellTdStyle, borderBottom: 'none' }} />
        <Table.Td colSpan={columnsCount - 2} style={{ padding: '0 16px 16px', borderTop: 'none' }}>
          <Stack gap={12}>
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

            <Group align="flex-start" wrap="nowrap">
              <Group gap={6} wrap="nowrap">
                <Text size="sm" c={INLINE_LABEL_COLOR} fw={500}>
                  Echeance
                </Text>
                <TextInput
                  {...register('dueDate')}
                  type="date"
                  w={DUE_DATE_WIDTH}
                  styles={{ input: fieldInputStyle }}
                />
              </Group>
              <Group gap={6} wrap="nowrap">
                <Tooltip label="Type de mouvement">
                  <Text size="sm" c={INLINE_LABEL_COLOR} fw={500} style={{ cursor: 'help' }}>
                    TM
                  </Text>
                </Tooltip>
                <Select
                  data={displayedMovementTypeOptions}
                  value={watch('movementTypeId') ?? null}
                  onChange={val => setValue('movementTypeId', val, { shouldDirty: true })}
                  clearable
                  searchable
                  w={SHORT_SELECT_WIDTH}
                  comboboxProps={{ width: SHORT_SELECT_DROPDOWN_WIDTH }}
                  filter={({ options, search }) => filterShortCodeOptions({ options: options as ShortCodeOption[], search })}
                  renderOption={({ option }) => (
                    <Group justify="space-between" gap={8} wrap="nowrap">
                      <Text size="sm" fw={600}>{option.label}</Text>
                      <Text size="xs" c="dimmed" truncate>{(option as ShortCodeOption).fullLabel}</Text>
                    </Group>
                  )}
                  styles={{ input: fieldInputStyle }}
                />
              </Group>
              <Group gap={6} wrap="nowrap">
                <Tooltip label="Moyen de paiement">
                  <Text size="sm" c={INLINE_LABEL_COLOR} fw={500} style={{ cursor: 'help' }}>
                    MP
                  </Text>
                </Tooltip>
                <Select
                  data={displayedPaymentMethodOptions}
                  value={watch('paymentMethodId') ?? null}
                  onChange={val => setValue('paymentMethodId', val, { shouldDirty: true })}
                  clearable
                  searchable
                  w={SHORT_SELECT_WIDTH}
                  comboboxProps={{ width: SHORT_SELECT_DROPDOWN_WIDTH }}
                  filter={({ options, search }) => filterShortCodeOptions({ options: options as ShortCodeOption[], search })}
                  renderOption={({ option }) => (
                    <Group justify="space-between" gap={8} wrap="nowrap">
                      <Text size="sm" fw={600}>{option.label}</Text>
                      <Text size="xs" c="dimmed" truncate>{(option as ShortCodeOption).fullLabel}</Text>
                    </Group>
                  )}
                  styles={{ input: fieldInputStyle }}
                />
              </Group>
              <Group gap={6} wrap="nowrap">
                <Text size="sm" c={INLINE_LABEL_COLOR} fw={500}>
                  Lettrage
                </Text>
                <TextInput
                  {...register('lettering')}
                  w={LETTERING_WIDTH}
                  maxLength={4}
                  styles={{ input: fieldInputStyle }}
                />
              </Group>
              <Group gap={6} wrap="nowrap" style={{ flex: 1.5, minWidth: 360 }}>
                <Text size="sm" c={INLINE_LABEL_COLOR} fw={500}>
                  Commentaire
                </Text>
                <Textarea
                  {...register('comment')}
                  autosize
                  minRows={2}
                  maxRows={8}
                  style={{ flex: 1, minWidth: 0 }}
                  styles={{ input: memoInputStyle }}
                />
              </Group>
              <Group gap={6} wrap="nowrap">
                <Text size="sm" c={INLINE_LABEL_COLOR} fw={500}>
                  Pièce
                </Text>
                <TextInput
                  {...register('pieceNumber')}
                  w={PIECE_NUMBER_WIDTH}
                  styles={{ input: fieldInputStyle }}
                />
              </Group>
            </Group>
          </Stack>
        </Table.Td>
        <Table.Td style={{ borderTop: 'none', borderBottom: 'none' }} />
        </Table.Tr>
      )}

      <OperationSplitModal
        opened={splitModalOpened}
        onClose={() => setSplitModalOpened(false)}
        title="Ventilation de l'écriture"
        editable
        rows={fields.map((field, index) => {
          const split = watchSplits[index];
          return {
            id: field.id,
            label: split?.label ?? '',
            expense: split?.expense ?? '',
            income: split?.income ?? '',
            budgetId: split?.budgetId ?? null,
            categoryId: split?.categoryId ?? null,
          };
        })}
        splitError={splitError}
        remainingBalance={remainingBalance}
        showSaveHint={isDirty}
        splitExpense={splitExpense}
        splitIncome={splitIncome}
        enveloppeOptions={enveloppeOptions}
        categoryOptions={categoryOptions}
        onAddRow={appendSplitRow}
        onRemoveRow={remove}
        onChangeRow={(index, field, value) => {
          if (field === 'budgetId' || field === 'categoryId') {
            setValue(`splits.${index}.${field}`, value, { shouldDirty: true });
            return;
          }

          setValue(`splits.${index}.${field}`, value ?? '', { shouldDirty: true });
        }}
        onRowEnter={handleSplitRowEnter}
      />
    </>
  );
}
