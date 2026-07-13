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
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconGitBranch, IconMinus, IconPlus, IconX } from '@tabler/icons-react';
import { buildCrudFormCssVariables, CRUD } from '@/lib/crud-tokens';
import { PositioningSelect } from '@/components/common/PositioningSelect';
import { useCategoriesAll } from '@/hooks/useCategories';
import { useCreateOperation, useOperation, useUpdateOperation, type Operation, type OperationPayload } from '@/hooks/useOperations';
import { useEnveloppesAll } from '@/hooks/useEnveloppes';
import { useMovementTypesAll } from '@/hooks/useMovementTypes';
import { usePaymentMethodsAll } from '@/hooks/usePaymentMethods';
import { useThirdPartiesAll } from '@/hooks/useThirdParties';
import { OperationSplitModal } from './OperationSplitModal';
import { buildThirdPartySplitDrafts, sumSplitDrafts, type OperationSplitDraft } from './operationThirdPartyHelpers';

const FIELD_BG = '#fbfdff';
const ROW_BG = '#dbeafe';
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
  const [splitSuggestionModalOpened, setSplitSuggestionModalOpened] = useState(false);
  const [suggestedThirdPartyName, setSuggestedThirdPartyName] = useState<string | null>(null);
  const [suggestedSplits, setSuggestedSplits] = useState<OperationSplitDraft[]>([]);

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

  const { fields, append, remove, replace } = useFieldArray({
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
      setSuggestedSplits([]);
      setSuggestedThirdPartyName(null);
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
  const selectedThirdPartyId = watch('thirdPartyId');
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
  const selectedThirdParty = thirdParties.find(tiers => tiers.id === selectedThirdPartyId) ?? null;
  const suggestedTotals = sumSplitDrafts(suggestedSplits);

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
    color: '#101828',
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
    color: '#101828',
    fontSize: 'calc(var(--crud-field-font-size) - 1px)',
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 6,
    paddingRight: 6,
    resize: 'vertical' as const,
    // Mantine impose `min-height: var(--input-height)` (36px par défaut) sur
    // le textarea, même en multiline. On ne peut pas passer `minHeight` en
    // style (react-textarea-autosize lève une erreur), donc on réduit
    // directement la variable CSS sous-jacente.
    '--input-height': 'var(--crud-field-height)',
  } as React.CSSProperties;

  const inlineCellInputStyle = {
    ...fieldInputStyle,
  } as const;

  const inlineCellDateInputStyle = {
    ...inlineCellInputStyle,
    display: 'flex',
    alignItems: 'center',
  } as const;

  const inlineCellTdStyle = {
    padding: '6px 8px',
    borderRight: `1px solid ${CRUD.couleurs.grilleTableau}`,
    borderBottom: 'none',
    verticalAlign: 'middle' as const,
    background: ROW_BG,
  };

  useEffect(() => {
    if (dueDateValue || letteringValue || commentValue) {
      setDetailsOpened(true);
    }
  }, [commentValue, dueDateValue, letteringValue]);

  useEffect(() => {
    if (suggestedSplits.length > 0) {
      setDetailsOpened(true);
    }
  }, [suggestedSplits.length]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Les modales de ventilation gèrent déjà leur propre fermeture par Echap.
      if (splitModalOpened || splitSuggestionModalOpened) return;
      onCancel();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel, splitModalOpened, splitSuggestionModalOpened]);

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

    if (nextSuggestedSplits.length > 0) {
      setSplitSuggestionModalOpened(true);
    }
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
      <Table.Tr style={{ ...compactFormVars, background: ROW_BG, borderBottom: 'none' }}>
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
            styles={{ input: inlineCellDateInputStyle }}
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
          <PositioningSelect
            data={thirdPartyOptions}
            value={selectedThirdPartyId ?? null}
            onChange={handleThirdPartyChange}
            placeholder="Tiers"
            clearable
            styles={{ input: inlineCellInputStyle }}
          />
        </Table.Td>
        <Table.Td style={inlineCellTdStyle}>
          <PositioningSelect
            data={displayedCategoryOptions}
            value={hasSplitRows ? '__split__' : (watch('categoryId') ?? null)}
            onChange={val => setValue('categoryId', val, { shouldDirty: true })}
            placeholder="Catégorie"
            clearable={!hasSplitRows}
            disabled={hasSplitRows}
            styles={{ input: inlineCellInputStyle }}
          />
        </Table.Td>
        <Table.Td style={inlineCellTdStyle}>
          <PositioningSelect
            data={displayedEnveloppeOptions}
            value={hasSplitRows ? '__split__' : (watch('budgetId') ?? null)}
            onChange={val => setValue('budgetId', val, { shouldDirty: true })}
            placeholder="Enveloppe"
            clearable={!hasSplitRows}
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
            <ActionIcon
              size="md"
              radius="md"
              color="gray"
              variant="light"
              onClick={onCancel}
              title="Fermer sans enregistrer (Échap)"
            >
              <IconX size={14} />
            </ActionIcon>
          </Group>
        </Table.Td>
      </Table.Tr>

      {detailsOpened && (
        <Table.Tr style={{ ...compactFormVars, background: ROW_BG }}>
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
                    <ActionIcon
                      size="md"
                      radius="md"
                      color="gray"
                      variant="light"
                      onClick={() => setSplitSuggestionModalOpened(true)}
                      title="Voir / modifier la proposition"
                    >
                      <IconGitBranch size={14} />
                    </ActionIcon>
                    <ActionIcon
                      size="md"
                      radius="md"
                      color="blue"
                      variant="light"
                      onClick={applySuggestedSplits}
                      title="Générer la ventilation du tiers"
                    >
                      <IconPlus size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
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
                  styles={{ input: inlineCellDateInputStyle }}
                />
              </Group>
              <Group gap={6} wrap="nowrap">
                <Tooltip label="Type de mouvement">
                  <Text size="sm" c={INLINE_LABEL_COLOR} fw={500} style={{ cursor: 'help' }}>
                    TM
                  </Text>
                </Tooltip>
                <PositioningSelect<ShortCodeOption>
                  data={displayedMovementTypeOptions}
                  value={watch('movementTypeId') ?? null}
                  onChange={val => setValue('movementTypeId', val, { shouldDirty: true })}
                  clearable
                  w={SHORT_SELECT_WIDTH}
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
              </Group>
              <Group gap={6} wrap="nowrap">
                <Tooltip label="Moyen de paiement">
                  <Text size="sm" c={INLINE_LABEL_COLOR} fw={500} style={{ cursor: 'help' }}>
                    MP
                  </Text>
                </Tooltip>
                <PositioningSelect<ShortCodeOption>
                  data={displayedPaymentMethodOptions}
                  value={watch('paymentMethodId') ?? null}
                  onChange={val => setValue('paymentMethodId', val, { shouldDirty: true })}
                  clearable
                  w={SHORT_SELECT_WIDTH}
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
                  minRows={1}
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
        remainingBalance={remainingBalance}
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
    </>
  );
}
