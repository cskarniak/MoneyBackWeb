import { PrismaClient } from '@moneyback/db';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { OperationType } from '@moneyback/shared';

type Mode = 'preview' | 'apply';

type CliOptions = {
  operationsFile: string;
  splitsFile: string;
  mode: Mode;
};

type LegacyOperationRow = {
  line: number;
  idSource: string | null;
  operationDate: Date | null;
  label: string | null;
  expense: string | null;
  income: string | null;
  pieceNumber: string | null;
  integrationDate: Date | null;
  operationType: string | null;
  entryMode: string | null;
  budgetSourceId: string | null;
  categorySourceId: string | null;
  thirdPartySourceId: string | null;
  accountSourceId: string | null;
  originSourceId: string | null;
  subscriptionSourceId: string | null;
  splitCode: string | null;
  closed: boolean | null;
  locked: boolean | null;
  statementRef: string | null;
  balance: string | null;
  movementTypeSourceId: string | null;
  paymentMethodSourceId: string | null;
  dueDate: Date | null;
  lettering: string | null;
  comment: string | null;
  newBudgetAmount: string | null;
  budgetAmountChanged: boolean | null;
  linkedOperation: string | null;
  nonKeyId: string | null;
};

type LegacySplitRow = {
  line: number;
  idSource: string | null;
  label: string | null;
  expense: string | null;
  income: string | null;
  budgetSourceId: string | null;
  categorySourceId: string | null;
  operationOriginSourceId: string | null;
  balance: string | null;
  splitType: string | null;
  periodDate: Date | null;
  lettering: string | null;
};

type ResolvedOperationRow = {
  idSource: string;
  action: 'create' | 'update';
  accountId: string;
  accountSourceId: string;
  label: string;
  expense: string | null;
  income: string | null;
  balance: string | null;
  operationDate: Date;
  dueDate: Date | null;
  integrationDate: Date | null;
  pieceNumber: string | null;
  lettering: string | null;
  comment: string | null;
  operationType: string | null;
  entryMode: string | null;
  operationValidated: string | null;
  locked: boolean;
  closed: boolean;
  newBudgetAmount: string | null;
  statementRef: string | null;
  budgetId: string | null;
  categoryId: string | null;
  thirdPartyId: string | null;
  paymentMethodId: string | null;
  movementTypeId: string | null;
};

type ResolvedSplitRow = {
  idSource: string;
  action: 'create' | 'replace';
  operationSourceId: string;
  label: string | null;
  expense: string | null;
  income: string | null;
  balance: string | null;
  periodDate: Date | null;
  lettering: string | null;
  budgetId: string | null;
  categoryId: string | null;
};

type PreviewOperationItem = {
  line: number;
  operationIdSource: string;
  label: string;
  action: 'create' | 'update';
  accountSourceId: string;
  budgetSourceId: string | null;
  categorySourceId: string | null;
  thirdPartySourceId: string | null;
  splitCount: number;
  operationType: string | null;
};

type ImportReport = {
  operationsFile: string;
  splitsFile: string;
  mode: Mode;
  totalOperations: number;
  validOperations: number;
  errorOperations: number;
  createOperationCount: number;
  updateOperationCount: number;
  totalSplits: number;
  validSplits: number;
  errorSplits: number;
  previewItems: PreviewOperationItem[];
  warnings: string[];
  errors: string[];
};

const DEFAULT_OPERATIONS_FILE = 'migration windev/export_operations.csv';
const DEFAULT_SPLITS_FILE = 'migration windev/export_operations_ventilees.csv';

const EXPECTED_OPERATIONS_HEADER = [
  'OPE_ID',
  'OPE_DATE',
  'OPE_LIBELLE',
  'OPE_DEPENSE',
  'OPE_RECETTE',
  'OPE_NuméroPièce',
  'OPE_DateIntégration',
  'OPE_Type',
  'OPE_ModeSaisie',
  'BUD_ID',
  'CAT_ID',
  'TIE_ID',
  'CPT_ID',
  'OPE_OPERATION_ORIGINE',
  'ABO_ID',
  'OPE_CodeVentilation',
  'OPE_Cloture',
  'OPE_Verrouillage',
  'OPE_Réference_telechargement',
  'OPE_Code_Rapprochement',
  'OPE_SOLDE',
  'OPE_TYPE_MOUVEMENT',
  'MOP_ID',
  'OPE_DATE_ECHEANCE',
  'OVI_ID',
  'OPE_LETTRAGE',
  'OPE_MEMO',
  'OPE_NouveauMontantBudget',
  'OPE_ChangementMontantBudget',
  'OPE_LienOperation',
  'OPE_IdNonCle',
] as const;

const EXPECTED_SPLITS_HEADER = [
  'OPV_ID',
  'OPV_LIBELLE',
  'OPV_DEPENSE',
  'OPV_RECETTE',
  'OPV_BUD_ID',
  'OPV_CAT_ID',
  'OPV_OPERATION_ORIGINE',
  'OPV_SOLDE',
  'OPV_TYPE',
  'OPV_PERIODE',
  'OPV_LETTRAGE',
] as const;

function parseArgs(argv: string[]): CliOptions {
  let operationsFile = DEFAULT_OPERATIONS_FILE;
  let splitsFile = DEFAULT_SPLITS_FILE;
  let mode: Mode = 'preview';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--operations-file') {
      operationsFile = argv[i + 1] ?? operationsFile;
      i += 1;
      continue;
    }
    if (arg === '--splits-file') {
      splitsFile = argv[i + 1] ?? splitsFile;
      i += 1;
      continue;
    }
    if (arg === '--mode') {
      const candidate = argv[i + 1];
      if (candidate === 'preview' || candidate === 'apply') mode = candidate;
      i += 1;
    }
  }

  return { operationsFile, splitsFile, mode };
}

function resolveInputFile(file: string): string {
  if (isAbsolute(file)) return file;
  const candidates = [
    resolve(process.cwd(), file),
    resolve(process.cwd(), '..', file),
    resolve(process.cwd(), '..', '..', file),
  ];
  const match = candidates.find(candidate => existsSync(candidate));
  return match ?? resolve(process.cwd(), file);
}

function parseSemicolonCsv(content: string) {
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ';' && !inQuotes) {
      currentRow.push(currentField.replace(/\r/g, '').trim());
      currentField = '';
      continue;
    }

    if (char === '\n' && !inQuotes) {
      currentRow.push(currentField.replace(/\r/g, '').trim());
      if (currentRow.some(value => value !== '')) rows.push(currentRow);
      currentField = '';
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.replace(/\r/g, '').trim());
    if (currentRow.some(value => value !== '')) rows.push(currentRow);
  }

  return rows;
}

function validateHeader(header: string[], expected: readonly string[]) {
  const sameLength = header.length === expected.length;
  const sameValues = sameLength && header.every((value, index) => value === expected[index]);
  if (!sameValues) {
    throw new Error(`En-tête inattendu. Reçu: ${JSON.stringify(header)}`);
  }
}

function normalizeText(value: string | undefined) {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

function normalizeSourceDigits(value: string | null) {
  if (value === null) return null;
  return value.replace(/\s+/g, '');
}

function parseLegacySourceId(value: string | null, { zeroIsNull = true }: { zeroIsNull?: boolean } = {}) {
  if (value === null) return null;
  const normalized = normalizeSourceDigits(value);
  if (!normalized) return null;
  if (zeroIsNull && normalized === '0') return null;
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`identifiant source illisible: "${value}"`);
  }
  return normalized;
}

function parseBoolean01(value: string | null) {
  if (value === null || value === '') return null;
  if (value === '1') return true;
  if (value === '0') return false;
  throw new Error(`booléen illisible: "${value}"`);
}

function parseLooseBoolean(value: string | null) {
  if (value === null || value === '') return false;
  if (value === '1') return true;
  if (value === '0') return false;
  return true;
}

function parseDecimal(value: string | null) {
  if (value === null) return null;
  const normalized = value.replace(/\s+/g, '').replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error(`décimal illisible: "${value}"`);
  }
  return normalized;
}

function parseDateFr(value: string | null) {
  if (value === null) return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) throw new Error(`date illisible: "${value}"`);
  const [, day, month, year] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function normalizeOperationRow(values: string[], line: number): LegacyOperationRow {
  return {
    line,
    idSource: parseLegacySourceId(normalizeText(values[0]), { zeroIsNull: false }),
    operationDate: parseDateFr(normalizeText(values[1])),
    label: normalizeText(values[2]),
    expense: parseDecimal(normalizeText(values[3])),
    income: parseDecimal(normalizeText(values[4])),
    pieceNumber: normalizeText(values[5]),
    integrationDate: parseDateFr(normalizeText(values[6])),
    operationType: normalizeText(values[7]),
    entryMode: (() => {
      const value = normalizeText(values[8]);
      return value === '0' ? null : value;
    })(),
    budgetSourceId: parseLegacySourceId(normalizeText(values[9])),
    categorySourceId: parseLegacySourceId(normalizeText(values[10])),
    thirdPartySourceId: parseLegacySourceId(normalizeText(values[11])),
    accountSourceId: parseLegacySourceId(normalizeText(values[12]), { zeroIsNull: false }),
    originSourceId: parseLegacySourceId(normalizeText(values[13])),
    subscriptionSourceId: parseLegacySourceId(normalizeText(values[14])),
    splitCode: normalizeText(values[15]),
    closed: parseBoolean01(normalizeText(values[16])),
    locked: parseBoolean01(normalizeText(values[17])),
    statementRef: normalizeText(values[18]),
    balance: parseDecimal(normalizeText(values[20])),
    movementTypeSourceId: parseLegacySourceId(normalizeText(values[21])),
    paymentMethodSourceId: parseLegacySourceId(normalizeText(values[22])),
    dueDate: parseDateFr(normalizeText(values[23])),
    lettering: normalizeText(values[25]),
    comment: normalizeText(values[26]),
    newBudgetAmount: parseDecimal(normalizeText(values[27])),
    budgetAmountChanged: parseBoolean01(normalizeText(values[28])),
    linkedOperation: normalizeText(values[29]),
    nonKeyId: normalizeText(values[30]),
  };
}

function normalizeSplitRow(values: string[], line: number): LegacySplitRow {
  return {
    line,
    idSource: parseLegacySourceId(normalizeText(values[0]), { zeroIsNull: false }),
    label: normalizeText(values[1]),
    expense: parseDecimal(normalizeText(values[2])),
    income: parseDecimal(normalizeText(values[3])),
    budgetSourceId: parseLegacySourceId(normalizeText(values[4])),
    categorySourceId: parseLegacySourceId(normalizeText(values[5])),
    operationOriginSourceId: parseLegacySourceId(normalizeText(values[6]), { zeroIsNull: false }),
    balance: parseDecimal(normalizeText(values[7])),
    splitType: normalizeText(values[8]),
    periodDate: parseDateFr(normalizeText(values[9])),
    lettering: normalizeText(values[10]),
  };
}

function buildMap<T extends { id: string; idSource: string | null }>(items: T[]) {
  return new Map(
    items
      .filter((item): item is T & { idSource: string } => item.idSource !== null)
      .map(item => [item.idSource, item.id]),
  );
}

function inferOperationType(
  row: LegacyOperationRow,
  splitRows: LegacySplitRow[],
) {
  if (row.operationType) return row.operationType;
  if (splitRows.length === 0) return null;

  const total = splitRows.reduce(
    (sum, split) => sum + Number(split.income ?? 0) + Number(split.expense ?? 0),
    0,
  );
  const operationAmount = Number(row.income ?? 0) + Number(row.expense ?? 0);

  return Math.abs(total - operationAmount) < 0.005
    ? OperationType.SPLIT
    : OperationType.PARTIAL;
}

function inferOperationValidated(entryMode: string | null) {
  return entryMode === 'T' ? null : 'V';
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function buildReport(prisma: PrismaClient, options: CliOptions): Promise<ImportReport> {
  const operationsPath = resolveInputFile(options.operationsFile);
  const splitsPath = resolveInputFile(options.splitsFile);

  const [operationsContent, splitsContent] = await Promise.all([
    readFile(operationsPath, { encoding: 'latin1' }),
    readFile(splitsPath, { encoding: 'latin1' }),
  ]);

  const operationRows = parseSemicolonCsv(operationsContent);
  const splitRowsRaw = parseSemicolonCsv(splitsContent);
  const [operationHeader = [], ...operationDataRows] = operationRows;
  const [splitHeader = [], ...splitDataRows] = splitRowsRaw;
  validateHeader(operationHeader, EXPECTED_OPERATIONS_HEADER);
  validateHeader(splitHeader, EXPECTED_SPLITS_HEADER);

  const [
    accounts,
    budgets,
    categories,
    thirdParties,
    paymentMethods,
    movementTypes,
  ] = await Promise.all([
    prisma.account.findMany({ select: { id: true, idSource: true } }),
    prisma.budget.findMany({ select: { id: true, idSource: true } }),
    prisma.category.findMany({ select: { id: true, idSource: true } }),
    prisma.thirdParty.findMany({ select: { id: true, idSource: true } }),
    prisma.paymentMethod.findMany({ select: { id: true, idSource: true } }),
    prisma.movementType.findMany({ select: { id: true, idSource: true } }),
  ]);

  const existingOperations = await prisma.$queryRaw<Array<{ id: string; id_source: string | null }>>`
    SELECT id, id_source FROM operations
  `;

  const accountMap = buildMap(accounts);
  const budgetMap = buildMap(budgets);
  const categoryMap = buildMap(categories);
  const thirdPartyMap = buildMap(thirdParties);
  const paymentMethodMap = buildMap(paymentMethods);
  const movementTypeMap = buildMap(movementTypes);
  const existingOperationMap = new Map(
    existingOperations
      .filter((item): item is { id: string; id_source: string } => item.id_source !== null)
      .map(item => [item.id_source, item.id]),
  );

  const splitRowsByOrigin = new Map<string, LegacySplitRow[]>();
  const warnings: string[] = [];
  const errors: string[] = [];

  for (let index = 0; index < splitDataRows.length; index += 1) {
    const line = index + 2;
    const values = splitDataRows[index] ?? [];
    if (!values.some(value => value !== '')) continue;

    try {
      const row = normalizeSplitRow(values, line);
      if (!row.idSource) throw new Error('OPV_ID obligatoire');
      if (!row.operationOriginSourceId) throw new Error('OPV_OPERATION_ORIGINE obligatoire');
      const bucket = splitRowsByOrigin.get(row.operationOriginSourceId) ?? [];
      bucket.push(row);
      splitRowsByOrigin.set(row.operationOriginSourceId, bucket);
    } catch (error) {
      errors.push(`split ligne ${line}: ${(error as Error).message}`);
    }
  }

  const resolvedOperations: ResolvedOperationRow[] = [];
  const resolvedSplitsByOperationSource = new Map<string, ResolvedSplitRow[]>();
  const previewItems: PreviewOperationItem[] = [];

  for (let index = 0; index < operationDataRows.length; index += 1) {
    const line = index + 2;
    const values = operationDataRows[index] ?? [];
    if (!values.some(value => value !== '')) continue;

    try {
      const row = normalizeOperationRow(values, line);
      if (!row.idSource) throw new Error('OPE_ID obligatoire');
      if (!row.operationDate) throw new Error('OPE_DATE obligatoire');
      if (!row.accountSourceId) throw new Error('CPT_ID obligatoire');

      const accountId = accountMap.get(row.accountSourceId);
      if (!accountId) throw new Error(`compte introuvable pour CPT_ID=${row.accountSourceId}`);

      const budgetId = row.budgetSourceId ? budgetMap.get(row.budgetSourceId) : null;
      if (row.budgetSourceId && !budgetId) throw new Error(`budget introuvable pour BUD_ID=${row.budgetSourceId}`);

      const categoryId = row.categorySourceId ? categoryMap.get(row.categorySourceId) : null;
      if (row.categorySourceId && !categoryId) throw new Error(`catégorie introuvable pour CAT_ID=${row.categorySourceId}`);

      const thirdPartyId = row.thirdPartySourceId ? thirdPartyMap.get(row.thirdPartySourceId) : null;
      if (row.thirdPartySourceId && !thirdPartyId) throw new Error(`tiers introuvable pour TIE_ID=${row.thirdPartySourceId}`);

      const paymentMethodId = row.paymentMethodSourceId ? paymentMethodMap.get(row.paymentMethodSourceId) : null;
      if (row.paymentMethodSourceId && !paymentMethodId) throw new Error(`moyen de paiement introuvable pour MOP_ID=${row.paymentMethodSourceId}`);

      const movementTypeId = row.movementTypeSourceId ? movementTypeMap.get(row.movementTypeSourceId) : null;
      if (row.movementTypeSourceId && !movementTypeId) throw new Error(`type de mouvement introuvable pour OPE_TYPE_MOUVEMENT=${row.movementTypeSourceId}`);

      if (row.originSourceId) {
        warnings.push(`opération ligne ${line}: OPE_OPERATION_ORIGINE=${row.originSourceId} ignoré en V1`);
      }
      if (row.subscriptionSourceId) {
        warnings.push(`opération ligne ${line}: ABO_ID=${row.subscriptionSourceId} ignoré en V1`);
      }
      if (row.linkedOperation && row.linkedOperation !== '0') {
        warnings.push(`opération ligne ${line}: OPE_LienOperation=${row.linkedOperation} ignoré en V1`);
      }
      if (row.nonKeyId && row.nonKeyId !== '0') {
        warnings.push(`opération ligne ${line}: OPE_IdNonCle=${row.nonKeyId} ignoré en V1`);
      }

      const legacySplits = splitRowsByOrigin.get(row.idSource) ?? [];
      const resolvedSplits: ResolvedSplitRow[] = legacySplits.map(split => {
        const splitBudgetId = split.budgetSourceId ? budgetMap.get(split.budgetSourceId) : null;
        if (split.budgetSourceId && !splitBudgetId) {
          throw new Error(`budget introuvable pour OPV_BUD_ID=${split.budgetSourceId}`);
        }

        const splitCategoryId = split.categorySourceId ? categoryMap.get(split.categorySourceId) : null;
        if (split.categorySourceId && !splitCategoryId) {
          throw new Error(`catégorie introuvable pour OPV_CAT_ID=${split.categorySourceId}`);
        }

        if (split.splitType && split.splitType !== 'D') {
          warnings.push(`split ligne ${split.line}: OPV_TYPE=${split.splitType} ignoré en V1`);
        }

        return {
          idSource: split.idSource as string,
          action: 'replace',
          operationSourceId: row.idSource as string,
          label: split.label,
          expense: split.expense,
          income: split.income,
          balance: split.balance,
          periodDate: split.periodDate,
          lettering: split.lettering,
          budgetId: splitBudgetId ?? null,
          categoryId: splitCategoryId ?? null,
        };
      });

      const resolvedOperation: ResolvedOperationRow = {
        idSource: row.idSource,
        action: existingOperationMap.has(row.idSource) ? 'update' : 'create',
        accountId,
        accountSourceId: row.accountSourceId,
        label: row.label ?? '',
        expense: row.expense,
        income: row.income,
        balance: row.balance,
        operationDate: row.operationDate,
        dueDate: row.dueDate,
        integrationDate: row.integrationDate,
        pieceNumber: row.pieceNumber,
        lettering: row.lettering,
        comment: row.comment,
        operationType: inferOperationType(row, legacySplits),
        entryMode: row.entryMode,
        operationValidated: inferOperationValidated(row.entryMode),
        locked: row.locked ?? false,
        closed: row.closed ?? false,
        newBudgetAmount: row.budgetAmountChanged ? row.newBudgetAmount : null,
        statementRef: row.statementRef,
        budgetId: budgetId ?? null,
        categoryId: categoryId ?? null,
        thirdPartyId: thirdPartyId ?? null,
        paymentMethodId: paymentMethodId ?? null,
        movementTypeId: movementTypeId ?? null,
      };

      resolvedOperations.push(resolvedOperation);
      resolvedSplitsByOperationSource.set(row.idSource, resolvedSplits);
      previewItems.push({
        line,
        operationIdSource: row.idSource,
        label: resolvedOperation.label,
        action: resolvedOperation.action,
        accountSourceId: row.accountSourceId,
        budgetSourceId: row.budgetSourceId,
        categorySourceId: row.categorySourceId,
        thirdPartySourceId: row.thirdPartySourceId,
        splitCount: resolvedSplits.length,
        operationType: resolvedOperation.operationType,
      });
    } catch (error) {
      errors.push(`opération ligne ${line}: ${(error as Error).message}`);
    }
  }

  if (options.mode === 'apply' && errors.length === 0) {
    const operationPayloads = resolvedOperations.map(row => ({
      idSource: row.idSource,
      label: row.label,
      expense: row.expense ?? '0',
      income: row.income ?? '0',
      balance: row.balance,
      operationDate: row.operationDate,
      dueDate: row.dueDate,
      integrationDate: row.integrationDate,
      pieceNumber: row.pieceNumber,
      lettering: row.lettering,
      comment: row.comment,
      operationType: row.operationType,
      entryMode: row.entryMode,
      operationValidated: row.operationValidated,
      locked: row.locked,
      closed: row.closed,
      newBudgetAmount: row.newBudgetAmount,
      statementRef: row.statementRef,
      accountId: row.accountId,
      budgetId: row.budgetId,
      categoryId: row.categoryId,
      thirdPartyId: row.thirdPartyId,
      paymentMethodId: row.paymentMethodId,
      movementTypeId: row.movementTypeId,
    }));

    if (resolvedOperations.every(row => row.action === 'create')) {
      for (const chunk of chunkArray(operationPayloads, 500)) {
        await (prisma.operation as any).createMany({ data: chunk });
      }
    } else {
      for (let index = 0; index < resolvedOperations.length; index += 1) {
        const row = resolvedOperations[index]!;
        const data = operationPayloads[index]!;
        const existingId = existingOperationMap.get(row.idSource);
        if (existingId) {
          await (prisma.operation as any).update({ where: { id: existingId }, data });
        } else {
          await (prisma.operation as any).create({ data });
        }
      }
    }

    const persistedOperations = await prisma.$queryRaw<Array<{ id: string; id_source: string | null }>>`
      SELECT id, id_source FROM operations WHERE id_source IS NOT NULL
    `;

    const persistedOperationMap = new Map(
      persistedOperations
        .filter((item): item is { id: string; id_source: string } => item.id_source !== null)
        .map(item => [item.id_source, item.id]),
    );

    const importedOperationIds = resolvedOperations
      .map(row => persistedOperationMap.get(row.idSource))
      .filter((value): value is string => Boolean(value));

    if (importedOperationIds.length > 0) {
      await prisma.operationSplit.deleteMany({
        where: { operationId: { in: importedOperationIds } },
      });
    }

    const splitCreates = Array.from(resolvedSplitsByOperationSource.entries()).flatMap(([operationSourceId, splits]) => {
      const operationId = persistedOperationMap.get(operationSourceId);
      if (!operationId) return [];
      return splits.map(split => ({
        idSource: split.idSource,
        label: split.label,
        expense: split.expense ?? '0',
        income: split.income ?? '0',
        balance: split.balance,
        periodDate: split.periodDate,
        lettering: split.lettering,
        operationId,
        budgetId: split.budgetId,
        categoryId: split.categoryId,
      }));
    });

    for (const chunk of chunkArray(splitCreates, 1000)) {
      if (chunk.length === 0) continue;
      await (prisma.operationSplit as any).createMany({ data: chunk });
    }
  }

  return {
    operationsFile: operationsPath,
    splitsFile: splitsPath,
    mode: options.mode,
    totalOperations: operationDataRows.filter(row => row.some(value => value !== '')).length,
    validOperations: resolvedOperations.length,
    errorOperations: errors.filter(item => item.startsWith('opération')).length,
    createOperationCount: resolvedOperations.filter(item => item.action === 'create').length,
    updateOperationCount: resolvedOperations.filter(item => item.action === 'update').length,
    totalSplits: splitDataRows.filter(row => row.some(value => value !== '')).length,
    validSplits: Array.from(resolvedSplitsByOperationSource.values()).reduce((sum, items) => sum + items.length, 0),
    errorSplits: errors.filter(item => item.startsWith('split')).length,
    previewItems,
    warnings,
    errors,
  };
}

function printReport(report: ImportReport) {
  console.log('');
  console.log('Import operations legacy');
  console.log(`- fichier opérations: ${report.operationsFile}`);
  console.log(`- fichier ventilations: ${report.splitsFile}`);
  console.log(`- mode: ${report.mode}`);
  console.log(`- opérations lues: ${report.totalOperations}`);
  console.log(`- opérations valides: ${report.validOperations}`);
  console.log(`- opérations en erreur: ${report.errorOperations}`);
  console.log(`- créations opérations: ${report.createOperationCount}`);
  console.log(`- mises à jour opérations: ${report.updateOperationCount}`);
  console.log(`- ventilations lues: ${report.totalSplits}`);
  console.log(`- ventilations valides: ${report.validSplits}`);
  console.log(`- ventilations en erreur: ${report.errorSplits}`);

  if (report.previewItems.length > 0) {
    console.log('');
    console.log('Aperçu');
    for (const item of report.previewItems.slice(0, 15)) {
      console.log(
        `- ligne ${item.line}: ${item.action} opération ${item.operationIdSource} "${item.label}"` +
        ` | compte=${item.accountSourceId}` +
        ` | budget=${item.budgetSourceId ?? '—'}` +
        ` | catégorie=${item.categorySourceId ?? '—'}` +
        ` | tiers=${item.thirdPartySourceId ?? '—'}` +
        ` | type=${item.operationType ?? '—'}` +
        ` | ventilations=${item.splitCount}`,
      );
    }
    if (report.previewItems.length > 15) {
      console.log(`- ... ${report.previewItems.length - 15} lignes supplémentaires`);
    }
  }

  if (report.warnings.length > 0) {
    console.log('');
    console.log('Warnings');
    for (const warning of report.warnings.slice(0, 20)) {
      console.log(`- ${warning}`);
    }
    if (report.warnings.length > 20) {
      console.log(`- ... ${report.warnings.length - 20} warnings supplémentaires`);
    }
  }

  if (report.errors.length > 0) {
    console.log('');
    console.log('Erreurs');
    for (const error of report.errors.slice(0, 20)) {
      console.log(`- ${error}`);
    }
    if (report.errors.length > 20) {
      console.log(`- ... ${report.errors.length - 20} erreurs supplémentaires`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    const report = await buildReport(prisma, options);
    printReport(report);
    if (options.mode === 'apply' && report.errors.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(error => {
  console.error('Echec import opérations legacy');
  console.error(error);
  process.exitCode = 1;
});
