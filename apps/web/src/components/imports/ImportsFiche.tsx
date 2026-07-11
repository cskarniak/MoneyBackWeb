'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Code,
  FileInput,
  Grid,
  Group,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconBulb, IconDatabase, IconFileImport, IconTrash } from '@tabler/icons-react';
import { ImportSource, type BankCsvMappingDto, type CreateImportProfileDto } from '@moneyback/shared';
import {
  useCreateImportProfile,
  useImportProfile,
  usePreviewBankCsv,
  useUpdateImportProfile,
  type ImportProfile,
} from '@/hooks/useImportProfiles';
import { CRUD } from '@/lib/crud-tokens';
import { decodeTextFile } from '@/lib/text-file-decoder';

const formSchema = z.object({
  profileName: z.string().min(1, 'Le nom du masque est obligatoire'),
  delimiter: z.string().min(1).max(1),
  encoding: z.string().min(1),
  hasHeader: z.boolean(),
  startLine: z.coerce.number().int().min(1),
  dateFormat: z.enum(['dd/MM/yyyy', 'yyyy-MM-dd']),
  decimalSeparator: z.string().min(1).max(1),
  thousandsSeparator: z.string().max(1).optional().or(z.literal('')),
  csvContent: z.string().min(1, 'Le contenu CSV est obligatoire'),
});

type FormValues = z.infer<typeof formSchema>;
type ColumnField = 'ignore' | 'operationDate' | 'label' | 'comment' | 'pieceNumber' | 'amount' | 'expense' | 'income' | 'statementRef';
type ColumnType = 'text' | 'date' | 'decimal' | 'signedAmount';
type LearnedColumn = {
  sourceHeader: string;
  headerName: string;
  columnIndex: number;
  field: ColumnField;
  type: ColumnType;
  include: boolean;
  sampleValue: string;
  autoDetected: boolean;
};

const FIELD_OPTIONS: Array<{ value: ColumnField; label: string }> = [
  { value: 'ignore', label: 'Ignorer' },
  { value: 'operationDate', label: 'Date opération' },
  { value: 'label', label: 'Libellé' },
  { value: 'comment', label: 'Commentaire' },
  { value: 'pieceNumber', label: 'Numéro de pièce' },
  { value: 'amount', label: 'Montant signé' },
  { value: 'expense', label: 'Dépense' },
  { value: 'income', label: 'Recette' },
  { value: 'statementRef', label: 'Référence relevé' },
];

const TYPE_OPTIONS: Array<{ value: ColumnType; label: string }> = [
  { value: 'text', label: 'Texte' },
  { value: 'date', label: 'Date' },
  { value: 'decimal', label: 'Décimal' },
  { value: 'signedAmount', label: 'Montant signé' },
];

const PANEL_STYLE = {
  background: '#ffffff',
  border: `1px solid ${CRUD.couleurs.grilleTableau}`,
  borderRadius: 10,
  overflow: 'hidden' as const,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
};

const GRID_TEXT_SIZE = 12;
const GRID_ACTION_ICON_STYLE = {
  border: '1px solid #f1c7c7',
  background: '#fff8f8',
};

const defaultValues: FormValues = {
  profileName: '',
  delimiter: ';',
  encoding: 'utf-8',
  hasHeader: true,
  startLine: 2,
  dateFormat: 'dd/MM/yyyy',
  decimalSeparator: ',',
  thousandsSeparator: ' ',
  csvContent: '',
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function splitCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells.map(cell => cell.replace(/^"|"$/g, '').trim());
}

function parseCsvPreview(content: string, delimiter: string) {
  return content
    .split(/\n/)
    .map(line => line.replace(/\r/g, ''))
    .filter(line => line.trim() !== '')
    .map(line => splitCsvLine(line, delimiter));
}

function inferTypeFromField(field: ColumnField): ColumnType {
  switch (field) {
    case 'operationDate':
      return 'date';
    case 'amount':
      return 'signedAmount';
    case 'expense':
    case 'income':
      return 'decimal';
    default:
      return 'text';
  }
}

function normalizeHeaderKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function inferFieldFromHeader(headerName: string): ColumnField {
  const key = normalizeHeaderKey(headerName);

  if (
    key.includes('date operation') ||
    key === 'date' ||
    key.includes('date mouvement') ||
    key.includes('date comptable') ||
    key.includes('date valeur')
  ) {
    return 'operationDate';
  }

  if (
    key.includes('libelle') ||
    key.includes('label') ||
    key.includes('description') ||
    key.includes('motif') ||
    key.includes('intitule')
  ) {
    return 'label';
  }

  if (
    key.includes('commentaire') ||
    key.includes('comment') ||
    key.includes('memo') ||
    key.includes('note') ||
    key.includes('observation')
  ) {
    return 'comment';
  }

  if (
    key.includes('numero piece') ||
    key.includes('num piece') ||
    key.includes('piece') ||
    key.includes('numero cheque') ||
    key.includes('num cheque')
  ) {
    return 'pieceNumber';
  }

  if (
    key.includes('reference releve') ||
    key.includes('reference') ||
    key.includes('numero operation') ||
    key.includes('id operation')
  ) {
    return 'statementRef';
  }

  if (
    key.includes('debit') ||
    key.includes('depense') ||
    key.includes('sortie')
  ) {
    return 'expense';
  }

  if (
    key.includes('credit') ||
    key.includes('recette') ||
    key.includes('entree')
  ) {
    return 'income';
  }

  if (
    key.includes('montant') ||
    key.includes('amount') ||
    key.includes('solde')
  ) {
    return 'amount';
  }

  return 'ignore';
}

function applySuggestedLearning(columns: LearnedColumn[]) {
  return columns.map(column => {
    const suggestedField = inferFieldFromHeader(column.sourceHeader || column.headerName);
    return {
      ...column,
      field: suggestedField,
      type: inferTypeFromField(suggestedField),
      include: suggestedField !== 'ignore',
      autoDetected: suggestedField !== 'ignore',
    };
  });
}

function buildDefaultLearnedColumns(headers: string[]) {
  return headers.map((headerName, columnIndex) => ({
    sourceHeader: headerName,
    headerName,
    columnIndex,
    field: 'ignore' as const,
    type: 'text' as const,
    include: false,
    sampleValue: '',
    autoDetected: false,
  }));
}

function profileToFormValues(profile: ImportProfile): FormValues {
  const mapping = profile.mapping;

  return {
    profileName: profile.name,
    delimiter: mapping.file.delimiter,
    encoding: mapping.file.encoding,
    hasHeader: mapping.file.hasHeader,
    startLine: mapping.file.startLine,
    dateFormat: mapping.date.format as FormValues['dateFormat'],
    decimalSeparator: mapping.amount.decimalSeparator,
    thousandsSeparator: mapping.amount.thousandsSeparator ?? '',
    csvContent: '',
  };
}

function learnedColumnsFromProfile(profile: ImportProfile): LearnedColumn[] {
  const mapping = profile.mapping;

  if (mapping.learnedColumns && mapping.learnedColumns.length > 0) {
    return mapping.learnedColumns.map(column => ({
      headerName: column.headerName,
      columnIndex: column.columnIndex,
      field: column.field,
      type: column.type,
      include: column.field !== 'ignore',
      sourceHeader: column.headerName,
      sampleValue: '',
      autoDetected: column.field !== 'ignore',
    }));
  }

  const columns: LearnedColumn[] = [];

  columns.push({
    headerName: mapping.date.column.headerName ?? 'Date',
    columnIndex: 0,
    field: 'operationDate',
    type: 'date',
    include: true,
    sourceHeader: mapping.date.column.headerName ?? 'Date',
    sampleValue: '',
    autoDetected: false,
  });

  columns.push({
    headerName: mapping.label.column.headerName ?? 'Libellé',
    columnIndex: 1,
    field: 'label',
    type: 'text',
    include: true,
    sourceHeader: mapping.label.column.headerName ?? 'Libellé',
    sampleValue: '',
    autoDetected: false,
  });

  if (mapping.statementRef?.column.headerName) {
    columns.push({
      headerName: mapping.statementRef.column.headerName,
      columnIndex: columns.length,
      field: 'statementRef',
      type: 'text',
      include: true,
      sourceHeader: mapping.statementRef.column.headerName,
      sampleValue: '',
      autoDetected: false,
    });
  }

  if (mapping.comment?.column.headerName) {
    columns.push({
      headerName: mapping.comment.column.headerName,
      columnIndex: columns.length,
      field: 'comment',
      type: 'text',
      include: true,
      sourceHeader: mapping.comment.column.headerName,
      sampleValue: '',
      autoDetected: false,
    });
  }

  if (mapping.pieceNumber?.column.headerName) {
    columns.push({
      headerName: mapping.pieceNumber.column.headerName,
      columnIndex: columns.length,
      field: 'pieceNumber',
      type: 'text',
      include: true,
      sourceHeader: mapping.pieceNumber.column.headerName,
      sampleValue: '',
      autoDetected: false,
    });
  }

  if (mapping.amount.mode === 'singleAmountSigned') {
    columns.push({
      headerName: mapping.amount.column.headerName ?? 'Montant',
      columnIndex: columns.length,
      field: 'amount',
      type: 'signedAmount',
      include: true,
      sourceHeader: mapping.amount.column.headerName ?? 'Montant',
      sampleValue: '',
      autoDetected: false,
    });
  } else {
    columns.push({
      headerName: mapping.amount.expenseColumn.headerName ?? 'Débit',
      columnIndex: columns.length,
      field: 'expense',
      type: 'decimal',
      include: true,
      sourceHeader: mapping.amount.expenseColumn.headerName ?? 'Débit',
      sampleValue: '',
      autoDetected: false,
    });
    columns.push({
      headerName: mapping.amount.incomeColumn.headerName ?? 'Crédit',
      columnIndex: columns.length,
      field: 'income',
      type: 'decimal',
      include: true,
      sourceHeader: mapping.amount.incomeColumn.headerName ?? 'Crédit',
      sampleValue: '',
      autoDetected: false,
    });
  }

  return columns;
}

function buildMapping(values: FormValues, learnedColumns: LearnedColumn[]): BankCsvMappingDto {
  const activeColumns = learnedColumns.filter(column => column.include && column.field !== 'ignore');
  const operationDateColumn = activeColumns.find(column => column.field === 'operationDate');
  const labelColumn = activeColumns.find(column => column.field === 'label');
  const commentColumn = activeColumns.find(column => column.field === 'comment');
  const pieceNumberColumn = activeColumns.find(column => column.field === 'pieceNumber');
  const statementRefColumn = activeColumns.find(column => column.field === 'statementRef');
  const signedAmountColumn = activeColumns.find(column => column.field === 'amount');
  const expenseColumn = activeColumns.find(column => column.field === 'expense');
  const incomeColumn = activeColumns.find(column => column.field === 'income');

  if (!operationDateColumn) {
    throw new Error('Une colonne doit être mappée sur la date opération.');
  }

  const amount =
    signedAmountColumn
      ? {
          mode: 'singleAmountSigned' as const,
          column: { headerName: signedAmountColumn.sourceHeader, columnIndex: signedAmountColumn.columnIndex },
          decimalSeparator: values.decimalSeparator,
          thousandsSeparator: values.thousandsSeparator || null,
          negativeIsExpense: true,
          positiveIsIncome: true,
        }
      : expenseColumn && incomeColumn
        ? {
            mode: 'separateExpenseIncome' as const,
            expenseColumn: { headerName: expenseColumn.sourceHeader, columnIndex: expenseColumn.columnIndex },
            incomeColumn: { headerName: incomeColumn.sourceHeader, columnIndex: incomeColumn.columnIndex },
            decimalSeparator: values.decimalSeparator,
            thousandsSeparator: values.thousandsSeparator || null,
          }
        : null;

  if (!amount) {
    throw new Error('Il faut soit une colonne montant signé, soit une colonne dépense et une colonne recette.');
  }

  return {
    version: 1,
    kind: 'bank-csv',
    bankKey: slugify(values.profileName) || 'simulation',
    bankLabel: values.profileName,
    file: {
      delimiter: values.delimiter,
      encoding: values.encoding,
      hasHeader: values.hasHeader,
      startLine: values.startLine,
    },
    date: {
      column: { headerName: operationDateColumn.sourceHeader, columnIndex: operationDateColumn.columnIndex },
      format: values.dateFormat,
    },
    label: {
      column: {
        headerName: labelColumn?.sourceHeader ?? operationDateColumn.sourceHeader,
        columnIndex: labelColumn?.columnIndex ?? operationDateColumn.columnIndex,
      },
    },
    comment: commentColumn
      ? {
          column: { headerName: commentColumn.sourceHeader, columnIndex: commentColumn.columnIndex },
        }
      : undefined,
    pieceNumber: pieceNumberColumn
      ? {
          column: { headerName: pieceNumberColumn.sourceHeader, columnIndex: pieceNumberColumn.columnIndex },
        }
      : undefined,
    statementRef: statementRefColumn
      ? {
          column: { headerName: statementRefColumn.sourceHeader, columnIndex: statementRefColumn.columnIndex },
        }
      : undefined,
    amount,
    dedupe: {
      strategy: 'account-date-amount-label',
      includeStatementRef: true,
    },
    learnedColumns: activeColumns.map(column => ({
      headerName: column.sourceHeader,
      columnIndex: column.columnIndex,
      field: column.field,
      type: column.type,
    })),
  };
}

type Props = { id?: string };

export function ImportsFiche({ id }: Props) {
  const router = useRouter();
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [learnedColumns, setLearnedColumns] = useState<LearnedColumn[]>([]);
  const [hasAutoSuggested, setHasAutoSuggested] = useState(false);
  const isNew = !id;
  const { data: profile } = useImportProfile(id ?? '');
  const createProfile = useCreateImportProfile();
  const updateProfile = useUpdateImportProfile();
  const previewMutation = usePreviewBankCsv();

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const csvContent = watch('csvContent');
  const delimiter = watch('delimiter');
  const hasHeader = watch('hasHeader');
  const encoding = watch('encoding');
  const preview = previewMutation.data;

  const parsedRows = useMemo(() => parseCsvPreview(csvContent, delimiter), [csvContent, delimiter]);

  const headers = useMemo(() => {
    if (parsedRows.length === 0) return [];
    if (hasHeader) {
      return parsedRows[0]!.map((cell, index) => cell || `Colonne ${index + 1}`);
    }
    const longestRowLength = Math.max(...parsedRows.map(row => row.length), 0);
    return Array.from({ length: longestRowLength }, (_, index) => `Colonne ${index + 1}`);
  }, [hasHeader, parsedRows]);

  const sampleRows = useMemo(() => {
    const rows = hasHeader ? parsedRows.slice(1) : parsedRows;
    return rows.slice(0, 8);
  }, [hasHeader, parsedRows]);

  const firstDataRow = useMemo(() => sampleRows[0] ?? [], [sampleRows]);

  useEffect(() => {
    if (headers.length === 0) {
      if (!profile && !csvContent.trim()) {
        setLearnedColumns([]);
      }
      setHasAutoSuggested(false);
      return;
    }

    setLearnedColumns(current => {
      if (current.length === headers.length) {
        return current.map((column, index) => ({
          ...column,
          headerName: headers[index] ?? column.headerName,
          columnIndex: index,
        }));
      }

      const base = buildDefaultLearnedColumns(headers);
      const nextColumns = base.map(column => {
        const existing = current.find(item => item.headerName === column.headerName || item.columnIndex === column.columnIndex);
        return existing
          ? {
              ...existing,
              sourceHeader: column.headerName,
              headerName: column.headerName,
              columnIndex: column.columnIndex,
              sampleValue: firstDataRow[column.columnIndex] ?? '',
              autoDetected: existing.autoDetected,
            }
          : {
              ...column,
              sampleValue: firstDataRow[column.columnIndex] ?? '',
            };
      });

      return applySuggestedLearning(nextColumns);
    });
    setHasAutoSuggested(true);
  }, [csvContent, firstDataRow, headers, profile]);

  const learningIssues = useMemo(() => {
    const operationDateCount = learnedColumns.filter(column => column.field === 'operationDate').length;
    const activeColumns = learnedColumns.filter(column => column.include);
    const amountCount = activeColumns.filter(column => column.field === 'amount').length;
    const expenseCount = activeColumns.filter(column => column.field === 'expense').length;
    const incomeCount = activeColumns.filter(column => column.field === 'income').length;

    const issues: string[] = [];

    if (activeColumns.filter(column => column.field === 'operationDate').length !== 1) {
      issues.push('Il faut exactement une colonne "Date opération".');
    }

    const hasSignedAmount = amountCount === 1 && expenseCount === 0 && incomeCount === 0;
    const hasSplitAmounts = amountCount === 0 && expenseCount === 1 && incomeCount === 1;

    if (!hasSignedAmount && !hasSplitAmounts) {
      issues.push('Il faut soit une colonne "Montant signé", soit une paire "Dépense" + "Recette".');
    }

    return issues;
  }, [learnedColumns]);

  const autoDetectedCount = useMemo(
    () => learnedColumns.filter(column => column.autoDetected && column.include && column.field !== 'ignore').length,
    [learnedColumns],
  );

  useEffect(() => {
    if (!profile) return;
    reset(profileToFormValues(profile));
    setLearnedColumns(learnedColumnsFromProfile(profile));
    setSelectedFileName(null);
    setHasAutoSuggested(true);
  }, [profile, reset]);

  const handleFileSelected = (file: File | null) => {
    if (!file) return;

    setSelectedFileName(file.name);

    void decodeTextFile(file, encoding)
      .then(content => {
        setValue('csvContent', content, { shouldDirty: true, shouldValidate: true });
        setHasAutoSuggested(false);
      })
      .catch(() => {
        notifications.show({ message: 'Impossible de lire le fichier sélectionné.', color: 'red' });
      });
  };

  const applySuggestions = () => {
    setLearnedColumns(current => applySuggestedLearning(current));
    setHasAutoSuggested(true);
    notifications.show({ message: 'Suggestions automatiques appliquées.', color: 'blue' });
  };

  const updateColumnField = (columnIndex: number, nextField: ColumnField) => {
    setLearnedColumns(current =>
      current.map(column =>
        column.columnIndex === columnIndex
          ? {
              ...column,
              field: nextField,
              type: inferTypeFromField(nextField),
              include: nextField !== 'ignore',
              autoDetected: false,
            }
          : column,
      ),
    );
  };

  const updateColumnType = (columnIndex: number, nextType: ColumnType) => {
    setLearnedColumns(current =>
      current.map(column =>
        column.columnIndex === columnIndex
          ? { ...column, type: nextType, autoDetected: false }
          : column,
      ),
    );
  };

  const updateColumnInclude = (columnIndex: number, include: boolean) => {
    setLearnedColumns(current =>
      current.map(column =>
        column.columnIndex === columnIndex
          ? {
              ...column,
              include,
              field: include ? column.field : 'ignore',
              type: include ? column.type : 'text',
              autoDetected: false,
            }
          : column,
      ),
    );
  };

  const clearColumn = (columnIndex: number) => {
    setLearnedColumns(current =>
      current.map(column =>
        column.columnIndex === columnIndex
          ? { ...column, include: false, field: 'ignore', type: 'text', autoDetected: false }
          : column,
      ),
    );
  };

  const saveProfile = async (values: FormValues) => {
    const payload: CreateImportProfileDto = {
      name: values.profileName,
      source: ImportSource.BANK_FILE,
      active: true,
      mapping: buildMapping(values, learnedColumns),
    };

    if (!isNew && id) {
      await updateProfile.mutateAsync({
        id,
        payload,
      });
      notifications.show({ message: 'Masque mis à jour.', color: 'green' });
      router.push(`/imports?highlight=${id}`);
      return;
    }

    const created = await createProfile.mutateAsync(payload);
    notifications.show({ message: 'Masque enregistré.', color: 'green' });
    router.push(`/imports?highlight=${created.id}`);
  };

  const runPreview = async (values: FormValues) => {
    await previewMutation.mutateAsync({
      profileId: id,
      mapping: buildMapping(values, learnedColumns),
      csvContent: values.csvContent,
    });
  };

  const onPreviewClick = handleSubmit(async values => {
    if (learnedColumns.length === 0) {
      notifications.show({ message: 'Charge un fichier CSV avant de lancer la preview.', color: 'orange' });
      return;
    }

    if (learningIssues.length > 0) {
      notifications.show({ message: learningIssues[0]!, color: 'orange' });
      return;
    }

    try {
      await runPreview(values);
    } catch (error) {
      notifications.show({
        message: error instanceof Error ? error.message : 'La prévisualisation a échoué.',
        color: 'red',
      });
    }
  });

  const onSaveClick = handleSubmit(async values => {
    if (learnedColumns.length === 0) {
      notifications.show({ message: 'Charge un fichier CSV avant d’enregistrer le masque.', color: 'orange' });
      return;
    }

    if (learningIssues.length > 0) {
      notifications.show({ message: learningIssues[0]!, color: 'orange' });
      return;
    }

    try {
      await saveProfile(values);
    } catch (error) {
      notifications.show({
        message: error instanceof Error ? error.message : "Impossible d'enregistrer le masque.",
        color: 'red',
      });
    }
  });

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Stack gap={18} style={{ maxWidth: 1480, margin: '0 auto' }}>
        <Group justify="space-between" align="flex-end">
          <Box>
            <Text fw={700} fz={22}>Fiche masque d&apos;import</Text>
            <Text c="dimmed" fz="sm">
              Commence par lire le fichier, puis mappe chaque colonne avec un champ métier et un type de champ pour simuler le résultat.
            </Text>
          </Box>
          <Group gap="sm" align="center">
            <Badge variant="light" color="blue">Apprentissage colonne par colonne</Badge>
            <Button variant="default" size="xs" onClick={() => router.push('/imports')}>
              Fermer
            </Button>
          </Group>
        </Group>

        <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />}>
          Le délimiteur pilote la lecture du fichier. Les choix `champ` et `type` sont placés au-dessus de chaque colonne
          pour construire le masque à partir de l’export réel.
        </Alert>

        <Grid gutter="lg" align="start">
          <Grid.Col span={{ base: 12, lg: 2 }}>
            <Paper style={PANEL_STYLE}>
              <Box
                style={{
                  background: CRUD.couleurs.fondBandeau,
                  color: CRUD.couleurs.texteBandeau,
                  padding: '9px 16px',
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                Paramètres du masque
              </Box>

              <Stack gap="md" p="lg">
                <TextInput label="Nom du masque" error={errors.profileName?.message} {...register('profileName')} />
                <TextInput label="Délimiteur" maxLength={1} error={errors.delimiter?.message} {...register('delimiter')} />
                <TextInput label="Encodage" error={errors.encoding?.message} {...register('encoding')} />
                <TextInput label="Ligne de début" error={errors.startLine?.message} {...register('startLine')} />

                <Controller
                  control={control}
                  name="hasHeader"
                  render={({ field }) => (
                    <Switch
                      label="Le fichier contient une ligne d'en-tête"
                      checked={field.value}
                      onChange={event => field.onChange(event.currentTarget.checked)}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="dateFormat"
                  render={({ field }) => (
                    <Select
                      label="Format date"
                      data={[
                        { value: 'dd/MM/yyyy', label: 'dd/MM/yyyy' },
                        { value: 'yyyy-MM-dd', label: 'yyyy-MM-dd' },
                      ]}
                      value={field.value}
                      onChange={value => field.onChange(value ?? 'dd/MM/yyyy')}
                    />
                  )}
                />
                <TextInput label="Séparateur décimal" maxLength={1} error={errors.decimalSeparator?.message} {...register('decimalSeparator')} />
                <TextInput label="Séparateur milliers" maxLength={1} error={errors.thousandsSeparator?.message} {...register('thousandsSeparator')} />

                <Group justify="flex-start" mt="sm">
                  <Button
                    variant="default"
                    leftSection={<IconDatabase size={15} />}
                    onClick={onSaveClick}
                    loading={createProfile.isPending || updateProfile.isPending}
                  >
                    Enregistrer le masque
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 10 }}>
            <Paper style={PANEL_STYLE}>
              <Box
                style={{
                  background: CRUD.couleurs.fondBandeau,
                  color: CRUD.couleurs.texteBandeau,
                  padding: '9px 16px',
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                Lecture du fichier et apprentissage
              </Box>

              <Stack gap="md" p="lg">
                <FileInput
                  label="Fichier CSV"
                  placeholder="Choisis un fichier CSV"
                  accept=".csv,text/csv"
                  value={null}
                  onChange={handleFileSelected}
                  leftSection={<IconFileImport size={15} />}
                />

                {selectedFileName ? (
                  <Text size="sm" c="dimmed">
                    Fichier chargé : <Code>{selectedFileName}</Code>
                  </Text>
                ) : null}

                {learningIssues.length > 0 ? (
                  <Alert color="yellow" variant="light">
                    <Stack gap={4}>
                      {learningIssues.map(issue => (
                        <Text key={issue} size="sm">{issue}</Text>
                      ))}
                    </Stack>
                  </Alert>
                ) : null}

                <Group justify="space-between">
                  <Group gap="sm">
                    <Text size="sm" c="dimmed">
                      Les colonnes peuvent être pré-remplies automatiquement à partir de leur en-tête.
                    </Text>
                    {learnedColumns.length > 0 ? (
                      <Badge variant="light" color={autoDetectedCount > 0 ? 'teal' : 'gray'}>
                        {autoDetectedCount} colonne(s) reconnue(s) sur {learnedColumns.length}
                      </Badge>
                    ) : null}
                  </Group>
                  <Button size="xs" variant="light" onClick={applySuggestions} disabled={learnedColumns.length === 0}>
                    {hasAutoSuggested ? 'Réappliquer les suggestions' : 'Appliquer les suggestions'}
                  </Button>
                </Group>

                {learnedColumns.length > 0 ? (
                  <ScrollArea>
                    <Table withTableBorder striped>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th w={70}>Col</Table.Th>
                          <Table.Th w={320}>Valeur</Table.Th>
                          <Table.Th w={320}>Champ</Table.Th>
                          <Table.Th w={180}>Type</Table.Th>
                          <Table.Th w={90}>Inclure</Table.Th>
                          <Table.Th w={70}>Effacer</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {learnedColumns.map(column => (
                          <Table.Tr key={`column-${column.columnIndex}`}>
                            <Table.Td>
                              <Text fz={GRID_TEXT_SIZE}>{column.columnIndex + 1}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Tooltip
                                label={column.sampleValue || '—'}
                                disabled={!column.sampleValue || column.sampleValue.length < 40}
                                withArrow
                                multiline
                                maw={420}
                              >
                                <Text
                                  fz={GRID_TEXT_SIZE}
                                  style={{
                                    maxWidth: 320,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {column.sampleValue || '—'}
                                </Text>
                              </Tooltip>
                            </Table.Td>
                            <Table.Td>
                              <Select
                                size="xs"
                                data={FIELD_OPTIONS}
                                value={column.field}
                                onChange={value => updateColumnField(column.columnIndex, (value as ColumnField | null) ?? 'ignore')}
                                leftSection={
                                  column.autoDetected ? <IconBulb size={12} color="#0f766e" /> : undefined
                                }
                              />
                            </Table.Td>
                            <Table.Td>
                              <Select
                                size="xs"
                                data={TYPE_OPTIONS}
                                value={column.type}
                                onChange={value => updateColumnType(column.columnIndex, (value as ColumnType | null) ?? 'text')}
                              />
                            </Table.Td>
                            <Table.Td>
                              <Switch
                                checked={column.include}
                                onChange={event => updateColumnInclude(column.columnIndex, event.currentTarget.checked)}
                              />
                            </Table.Td>
                            <Table.Td>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                size="sm"
                                onClick={() => clearColumn(column.columnIndex)}
                                title="Effacer"
                                style={GRID_ACTION_ICON_STYLE}
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <Text size="sm" c="dimmed">
                    Charge un CSV pour créer un nouveau masque, ou ouvre un masque existant pour modifier ses affectations.
                  </Text>
                )}
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {preview ? (
          <Paper style={PANEL_STYLE}>
            <Box
              style={{
                background: CRUD.couleurs.fondBandeau,
                color: CRUD.couleurs.texteBandeau,
                padding: '9px 16px',
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              Résultat de prévisualisation
            </Box>

            <Stack gap="md" p="lg">
              <Group gap="sm">
                <Badge color="green" variant="light">{preview.validLines} valides</Badge>
                <Badge color="yellow" variant="light">{preview.duplicateLines} doublons</Badge>
                <Badge color="red" variant="light">{preview.errorLines} erreurs</Badge>
                <Badge color="blue" variant="light">{preview.totalLines} lignes</Badge>
              </Group>
              <ScrollArea>
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Ligne</Table.Th>
                      <Table.Th>Statut</Table.Th>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Libellé</Table.Th>
                      <Table.Th>Commentaire</Table.Th>
                      <Table.Th>Pièce</Table.Th>
                      <Table.Th>Dépense</Table.Th>
                      <Table.Th>Recette</Table.Th>
                      <Table.Th>Référence</Table.Th>
                      <Table.Th>Erreurs</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {preview.lines.map(line => (
                      <Table.Tr key={`${line.lineNum}-${line.label ?? 'empty'}`}>
                        <Table.Td>{line.lineNum}</Table.Td>
                        <Table.Td>
                          <Badge
                            size="sm"
                            color={line.status === 'valid' ? 'green' : line.status === 'duplicate' ? 'yellow' : 'red'}
                            variant="light"
                          >
                            {line.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{line.operationDate ? new Date(line.operationDate).toLocaleDateString('fr-FR') : '—'}</Table.Td>
                        <Table.Td>{line.label ?? '—'}</Table.Td>
                        <Table.Td>{line.comment ?? '—'}</Table.Td>
                        <Table.Td>{line.pieceNumber ?? '—'}</Table.Td>
                        <Table.Td>{line.expense ?? '—'}</Table.Td>
                        <Table.Td>{line.income ?? '—'}</Table.Td>
                        <Table.Td>{line.statementRef ?? '—'}</Table.Td>
                        <Table.Td>
                          {line.errors.length > 0 ? (
                            <Stack gap={4}>
                              {line.errors.map(error => (
                                <Text key={error} size="xs" c="red">{error}</Text>
                              ))}
                            </Stack>
                          ) : line.duplicateOperationId ? (
                            <Text size="xs" c="yellow.8">Déjà importée</Text>
                          ) : (
                            '—'
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Stack>
          </Paper>
        ) : null}
      </Stack>
    </Box>
  );
}
