import { PrismaClient } from '@moneyback/db';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

type Mode = 'preview' | 'apply';

type CliOptions = {
  file: string;
  mode: Mode;
};

type LegacyBudgetRowRaw = {
  line: number;
  values: string[];
};

type LegacyBudgetRowNormalized = {
  line: number;
  sourceRecordNumber: string | null;
  idSource: string | null;
  label: string | null;
  comment: string | null;
  legacyCode: string | null;
  groupingSourceId: string | null;
  summary: boolean | null;
  invoiceBalance: string | null;
  active: boolean | null;
  dashboardGroupingSourceId: string | null;
  balance: string | null;
  movementTypeSourceId: string | null;
};

type ImportMessage = {
  line: number;
  budgetIdSource: string | null;
  code: string;
  message: string;
};

type PreviewItem = {
  line: number;
  budgetIdSource: string;
  label: string;
  action: 'create' | 'update';
  groupingSourceId: string | null;
  groupingResolved: boolean;
  movementTypeSourceId: string | null;
  movementTypeResolved: boolean;
};

type LegacyBudgetImportReport = {
  file: string;
  mode: Mode;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  warnings: ImportMessage[];
  errors: ImportMessage[];
  previewItems: PreviewItem[];
  notes: string[];
  unresolvedGroupings: Array<{
    idSource: string;
    count: number;
    sampleBudgetLabels: string[];
  }>;
  unresolvedMovementTypes: Array<{
    idSource: string;
    count: number;
    sampleBudgetLabels: string[];
  }>;
};

type ResolvedBudgetRow = {
  line: number;
  idSource: string;
  label: string;
  comment: string | null;
  summary: boolean;
  invoiceBalance: string;
  active: boolean;
  balance: string;
  groupingId: string | null;
  groupingSourceId: string | null;
  movementTypeId: string | null;
  movementTypeSourceId: string | null;
  dashboard: boolean;
  dashboardGroupingId: string | null;
  dashboardGroupingSourceId: string | null;
  action: 'create' | 'update';
};

type LegacyReferenceMap = {
  available: boolean;
  values: Map<string, string>;
  missingColumnReason?: string;
};

const DEFAULT_FILE = 'migration windev/exports postes.csv';
const EXPECTED_HEADER = [
  'N° Enr.',
  '',
  'BUD_ID',
  'BUD_LIBELLE',
  'BUD_ANCIEN_CODE',
  'BUD_COMMENTAIRE',
  'CAR_ID',
  'BUD_SYNTHESE',
  'BUD_SOLDEFACTURE',
  'BUD_DESACTIVE',
  'BUD_TB',
  'BUD_SOLDE',
  'TYM_ID',
] as const;

function parseArgs(argv: string[]): CliOptions {
  let file = DEFAULT_FILE;
  let mode: Mode = 'preview';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--file') {
      file = argv[i + 1] ?? file;
      i += 1;
      continue;
    }
    if (arg === '--mode') {
      const candidate = argv[i + 1];
      if (candidate === 'preview' || candidate === 'apply') mode = candidate;
      i += 1;
    }
  }

  return { file, mode };
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

function normalizeText(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function parseBoolean01(value: string | null): boolean | null {
  if (value === null) return null;
  if (value === '1') return true;
  if (value === '0') return false;
  throw new Error(`booléen illisible: "${value}"`);
}

function parseLegacyDecimal(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value.replace(/\s+/g, '').replace(',', '.');
  if (normalized === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`décimal illisible: "${value}"`);
  }
  return normalized;
}

function parseLegacySourceId(value: string | null): string | null {
  if (value === null || value === '0') return null;
  if (!/^\d+$/.test(value)) {
    throw new Error(`identifiant source illisible: "${value}"`);
  }
  return value;
}

function parseCsvRows(content: string): Array<{ line: number; values: string[] }> {
  const rows: Array<{ line: number; values: string[] }> = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;
  let rowStartLine = 1;
  let line = 1;

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
      currentRow.push(currentField.trim());
      currentField = '';
      continue;
    }

    if (char === '\n' && !inQuotes) {
      currentRow.push(currentField.replace(/\r/g, '').trim());
      if (currentRow.some(value => value !== '')) {
        rows.push({ line: rowStartLine, values: currentRow });
      }
      currentField = '';
      currentRow = [];
      line += 1;
      rowStartLine = line;
      continue;
    }

    if (char === '\n') {
      line += 1;
    }

    currentField += char;
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.replace(/\r/g, '').trim());
    if (currentRow.some(value => value !== '')) {
      rows.push({ line: rowStartLine, values: currentRow });
    }
  }

  return rows;
}

function readRawRows(rows: Array<{ line: number; values: string[] }>): LegacyBudgetRowRaw[] {
  return rows.slice(1).map(row => ({
    line: row.line,
    values: row.values,
  }));
}

function validateHeader(header: string[]) {
  const sameLength = header.length === EXPECTED_HEADER.length;
  const sameValues = sameLength && header.every((value, index) => value === EXPECTED_HEADER[index]);

  if (!sameValues) {
    throw new Error(`En-tête inattendu. Reçu: ${JSON.stringify(header)}`);
  }
}

function normalizeRow(raw: LegacyBudgetRowRaw): LegacyBudgetRowNormalized {
  const [
    sourceRecordNumber,
    _ignoredImagePath,
    budId,
    label,
    legacyCode,
    comment,
    groupingSourceId,
    summary,
    invoiceBalance,
    disabled,
    dashboardGroupingSourceId,
    balance,
    movementTypeSourceId,
  ] = raw.values;

  return {
    line: raw.line,
    sourceRecordNumber: normalizeText(sourceRecordNumber),
    idSource: normalizeText(budId),
    label: normalizeText(label),
    comment: normalizeText(comment),
    legacyCode: normalizeText(legacyCode),
    groupingSourceId: normalizeText(groupingSourceId),
    summary: parseBoolean01(normalizeText(summary)),
    invoiceBalance: parseLegacyDecimal(normalizeText(invoiceBalance)),
    active: (() => {
      const disabledValue = parseBoolean01(normalizeText(disabled));
      return disabledValue === null ? null : !disabledValue;
    })(),
    dashboardGroupingSourceId: normalizeText(dashboardGroupingSourceId),
    balance: parseLegacyDecimal(normalizeText(balance)),
    movementTypeSourceId: normalizeText(movementTypeSourceId),
  };
}

async function loadLegacyReferenceMap(
  prisma: PrismaClient,
  tableName: 'regroupements' | 'types_mouvement',
): Promise<LegacyReferenceMap> {
  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
  `;

  const hasIdSource = columns.some(column => column.column_name === 'id_source');
  if (!hasIdSource) {
    return {
      available: false,
      values: new Map(),
      missingColumnReason: `La table "${tableName}" ne possède pas encore la colonne "id_source".`,
    };
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; id_source: string | number | null }>>(
    tableName === 'regroupements'
      ? 'SELECT id, id_source FROM "regroupements" WHERE id_source IS NOT NULL'
      : 'SELECT id, id_source FROM "types_mouvement" WHERE id_source IS NOT NULL',
  );

  return {
    available: true,
    values: new Map(
      rows
        .filter(row => row.id_source !== null)
        .map(row => [String(row.id_source), row.id]),
    ),
  };
}

function pushError(
  errors: ImportMessage[],
  row: LegacyBudgetRowNormalized,
  code: string,
  message: string,
) {
  errors.push({
    line: row.line,
    budgetIdSource: row.idSource,
    code,
    message,
  });
}

function pushWarning(
  warnings: ImportMessage[],
  row: LegacyBudgetRowNormalized,
  code: string,
  message: string,
) {
  warnings.push({
    line: row.line,
    budgetIdSource: row.idSource,
    code,
    message,
  });
}

function validateNormalizedRow(
  row: LegacyBudgetRowNormalized,
  errors: ImportMessage[],
  warnings: ImportMessage[],
  groupingMap: LegacyReferenceMap,
  movementTypeMap: LegacyReferenceMap,
) {
  if (!row.idSource) pushError(errors, row, 'MISSING_ID_SOURCE', 'BUD_ID est obligatoire.');
  else {
    try {
      parseLegacySourceId(row.idSource);
    } catch (error) {
      pushError(errors, row, 'INVALID_ID_SOURCE', (error as Error).message);
    }
  }

  if (!row.label) pushError(errors, row, 'MISSING_LABEL', 'BUD_LIBELLE est obligatoire.');

  if (row.groupingSourceId && row.groupingSourceId !== '0') {
    try {
      const parsedGroupingId = parseLegacySourceId(row.groupingSourceId);
      if (parsedGroupingId && groupingMap.available && !groupingMap.values.has(parsedGroupingId)) {
        pushError(errors, row, 'GROUPING_NOT_FOUND', `Aucun regroupement trouvé pour CAR_ID=${parsedGroupingId}.`);
      }
      if (parsedGroupingId && !groupingMap.available) {
        pushWarning(warnings, row, 'GROUPING_ID_SOURCE_UNAVAILABLE', groupingMap.missingColumnReason ?? 'Mapping regroupement indisponible.');
      }
    } catch (error) {
      pushError(errors, row, 'INVALID_GROUPING_SOURCE_ID', (error as Error).message);
    }
  }

  if (row.movementTypeSourceId && row.movementTypeSourceId !== '0') {
    try {
      const parsedMovementTypeId = parseLegacySourceId(row.movementTypeSourceId);
      if (parsedMovementTypeId && movementTypeMap.available && !movementTypeMap.values.has(parsedMovementTypeId)) {
        pushError(errors, row, 'MOVEMENT_TYPE_NOT_FOUND', `Aucun type de mouvement trouvé pour TYM_ID=${parsedMovementTypeId}.`);
      }
      if (parsedMovementTypeId && !movementTypeMap.available) {
        pushWarning(warnings, row, 'MOVEMENT_TYPE_ID_SOURCE_UNAVAILABLE', movementTypeMap.missingColumnReason ?? 'Mapping type mouvement indisponible.');
      }
    } catch (error) {
      pushError(errors, row, 'INVALID_MOVEMENT_TYPE_SOURCE_ID', (error as Error).message);
    }
  }

  if (row.dashboardGroupingSourceId && row.dashboardGroupingSourceId !== '0') {
    try {
      const parsedDashboardGroupingId = parseLegacySourceId(row.dashboardGroupingSourceId);
      if (parsedDashboardGroupingId && groupingMap.available && !groupingMap.values.has(parsedDashboardGroupingId)) {
        pushError(errors, row, 'DASHBOARD_GROUPING_NOT_FOUND', `Aucun regroupement trouvé pour BUD_TB=${parsedDashboardGroupingId}.`);
      }
      if (parsedDashboardGroupingId && !groupingMap.available) {
        pushWarning(warnings, row, 'DASHBOARD_GROUPING_ID_SOURCE_UNAVAILABLE', groupingMap.missingColumnReason ?? 'Mapping regroupement tableau de bord indisponible.');
      }
    } catch (error) {
      pushError(errors, row, 'INVALID_DASHBOARD_GROUPING_SOURCE_ID', (error as Error).message);
    }
  }

  if (row.legacyCode) {
    pushWarning(warnings, row, 'LEGACY_CODE_IGNORED', 'BUD_ANCIEN_CODE est présent mais n’est pas importé.');
  }
}

function printReport(report: LegacyBudgetImportReport) {
  console.log('');
  console.log('Import budgets legacy');
  console.log(`- fichier: ${report.file}`);
  console.log(`- mode: ${report.mode}`);
  console.log(`- lignes: ${report.totalRows}`);
  console.log(`- valides: ${report.validRows}`);
  console.log(`- erreurs: ${report.errorRows}`);
  console.log(`- créations prévues: ${report.createdCount}`);
  console.log(`- mises à jour prévues: ${report.updatedCount}`);
  console.log(`- ignorées: ${report.skippedCount}`);

  if (report.notes.length > 0) {
    console.log('');
    console.log('Notes');
    for (const note of report.notes) console.log(`- ${note}`);
  }

  if (report.previewItems.length > 0) {
    console.log('');
    console.log('Aperçu');
    for (const item of report.previewItems.slice(0, 15)) {
      console.log(
        `- ligne ${item.line}: ${item.action} budget ${item.budgetIdSource} "${item.label}"` +
          ` | CAR_ID=${item.groupingSourceId ?? 'null'} (${item.groupingResolved ? 'ok' : 'ko'})` +
          ` | TYM_ID=${item.movementTypeSourceId ?? 'null'} (${item.movementTypeResolved ? 'ok' : 'ko'})`,
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
      console.log(`- ligne ${warning.line} [${warning.code}] ${warning.message}`);
    }
    if (report.warnings.length > 20) {
      console.log(`- ... ${report.warnings.length - 20} warnings supplémentaires`);
    }
  }

  if (report.errors.length > 0) {
    console.log('');
    console.log('Erreurs');
    for (const error of report.errors.slice(0, 20)) {
      console.log(`- ligne ${error.line} [${error.code}] ${error.message}`);
    }
    if (report.errors.length > 20) {
      console.log(`- ... ${report.errors.length - 20} erreurs supplémentaires`);
    }
  }

  if (report.unresolvedGroupings.length > 0) {
    console.log('');
    console.log('Regroupements manquants');
    for (const item of report.unresolvedGroupings.slice(0, 15)) {
      console.log(
        `- CAR_ID=${item.idSource} | ${item.count} budget(s) | exemples: ${item.sampleBudgetLabels.join(', ')}`,
      );
    }
    if (report.unresolvedGroupings.length > 15) {
      console.log(`- ... ${report.unresolvedGroupings.length - 15} regroupements supplémentaires`);
    }
  }

  if (report.unresolvedMovementTypes.length > 0) {
    console.log('');
    console.log('Types de mouvement manquants');
    for (const item of report.unresolvedMovementTypes.slice(0, 15)) {
      console.log(
        `- TYM_ID=${item.idSource} | ${item.count} budget(s) | exemples: ${item.sampleBudgetLabels.join(', ')}`,
      );
    }
    if (report.unresolvedMovementTypes.length > 15) {
      console.log(`- ... ${report.unresolvedMovementTypes.length - 15} types supplémentaires`);
    }
  }
}

async function buildPreviewReport(prisma: PrismaClient, file: string): Promise<LegacyBudgetImportReport> {
  return buildBudgetReport(prisma, file, 'preview');
}

async function prepareBudgetRows(
  prisma: PrismaClient,
  file: string,
): Promise<{
  filePath: string;
  rawRows: LegacyBudgetRowRaw[];
  warnings: ImportMessage[];
  errors: ImportMessage[];
  previewItems: PreviewItem[];
  notes: string[];
  unresolvedGroupings: LegacyBudgetImportReport['unresolvedGroupings'];
  unresolvedMovementTypes: LegacyBudgetImportReport['unresolvedMovementTypes'];
  resolvedRows: ResolvedBudgetRow[];
}> {
  const filePath = resolveInputFile(file);
  const content = await readFile(filePath, { encoding: 'latin1' });
  const parsedRows = parseCsvRows(content);
  validateHeader(parsedRows[0]?.values ?? []);

  const rawRows = readRawRows(parsedRows);
  const groupingMap = await loadLegacyReferenceMap(prisma, 'regroupements');
  const movementTypeMap = await loadLegacyReferenceMap(prisma, 'types_mouvement');

  const existingBudgets = await prisma.budget.findMany({
    where: { idSource: { not: null } },
    select: { id: true, idSource: true },
  });

  const existingBudgetMap = new Set(
    existingBudgets
      .map(budget => budget.idSource)
      .filter((value): value is string => value !== null),
  );

  const warnings: ImportMessage[] = [];
  const errors: ImportMessage[] = [];
  const previewItems: PreviewItem[] = [];
  const resolvedRows: ResolvedBudgetRow[] = [];
  const unresolvedGroupingSamples = new Map<string, { count: number; sampleBudgetLabels: string[] }>();
  const unresolvedMovementTypeSamples = new Map<string, { count: number; sampleBudgetLabels: string[] }>();

  for (const rawRow of rawRows) {
    let normalized: LegacyBudgetRowNormalized;

    try {
      normalized = normalizeRow(rawRow);
    } catch (error) {
      errors.push({
        line: rawRow.line,
        budgetIdSource: normalizeText(rawRow.values[2]),
        code: 'ROW_PARSE_ERROR',
        message: (error as Error).message,
      });
      continue;
    }

    const rowErrorsBefore = errors.length;
    validateNormalizedRow(normalized, errors, warnings, groupingMap, movementTypeMap);

    if (errors.length > rowErrorsBefore || !normalized.idSource || !normalized.label) {
      continue;
    }

    const normalizedGroupingId = parseLegacySourceId(normalized.groupingSourceId);
    const normalizedMovementTypeId = parseLegacySourceId(normalized.movementTypeSourceId);
    const normalizedDashboardGroupingId = parseLegacySourceId(normalized.dashboardGroupingSourceId);
    const groupingResolved = normalizedGroupingId === null || groupingMap.values.has(normalizedGroupingId);
    const movementTypeResolved =
      normalizedMovementTypeId === null || movementTypeMap.values.has(normalizedMovementTypeId);

    if (normalizedGroupingId && !groupingResolved) {
      const existing = unresolvedGroupingSamples.get(normalizedGroupingId) ?? {
        count: 0,
        sampleBudgetLabels: [],
      };
      existing.count += 1;
      if (existing.sampleBudgetLabels.length < 3) existing.sampleBudgetLabels.push(normalized.label);
      unresolvedGroupingSamples.set(normalizedGroupingId, existing);
    }

    if (normalizedMovementTypeId && !movementTypeResolved) {
      const existing = unresolvedMovementTypeSamples.get(normalizedMovementTypeId) ?? {
        count: 0,
        sampleBudgetLabels: [],
      };
      existing.count += 1;
      if (existing.sampleBudgetLabels.length < 3) existing.sampleBudgetLabels.push(normalized.label);
      unresolvedMovementTypeSamples.set(normalizedMovementTypeId, existing);
    }

    previewItems.push({
      line: normalized.line,
      budgetIdSource: normalized.idSource,
      label: normalized.label,
      action: existingBudgetMap.has(normalized.idSource) ? 'update' : 'create',
      groupingSourceId: normalizedGroupingId,
      groupingResolved,
      movementTypeSourceId: normalizedMovementTypeId,
      movementTypeResolved,
    });

    resolvedRows.push({
      line: normalized.line,
      idSource: normalized.idSource,
      label: normalized.label,
      comment: normalized.comment,
      summary: normalized.summary ?? false,
      invoiceBalance: normalized.invoiceBalance ?? '0',
      active: normalized.active ?? true,
      balance: normalized.balance ?? '0',
      groupingId: normalizedGroupingId ? groupingMap.values.get(normalizedGroupingId) ?? null : null,
      groupingSourceId: normalizedGroupingId,
      movementTypeId: normalizedMovementTypeId ? movementTypeMap.values.get(normalizedMovementTypeId) ?? null : null,
      movementTypeSourceId: normalizedMovementTypeId,
      dashboard: normalizedDashboardGroupingId !== null,
      dashboardGroupingId:
        normalizedDashboardGroupingId ? groupingMap.values.get(normalizedDashboardGroupingId) ?? null : null,
      dashboardGroupingSourceId: normalizedDashboardGroupingId,
      action: existingBudgetMap.has(normalized.idSource) ? 'update' : 'create',
    });
  }

  const notes: string[] = [];
  if (!groupingMap.available) {
    notes.push(groupingMap.missingColumnReason ?? 'Le mapping regroupements par id_source est indisponible.');
  }
  if (!movementTypeMap.available) {
    notes.push(movementTypeMap.missingColumnReason ?? 'Le mapping types_mouvement par id_source est indisponible.');
  }

  return {
    filePath,
    rawRows,
    warnings,
    errors,
    previewItems,
    notes,
    resolvedRows,
    unresolvedGroupings: Array.from(unresolvedGroupingSamples.entries())
      .map(([idSource, data]) => ({ idSource, ...data }))
      .sort((a, b) => b.count - a.count || a.idSource.localeCompare(b.idSource)),
    unresolvedMovementTypes: Array.from(unresolvedMovementTypeSamples.entries())
      .map(([idSource, data]) => ({ idSource, ...data }))
      .sort((a, b) => b.count - a.count || a.idSource.localeCompare(b.idSource)),
  };
}

async function buildBudgetReport(
  prisma: PrismaClient,
  file: string,
  mode: Mode,
): Promise<LegacyBudgetImportReport> {
  const prepared = await prepareBudgetRows(prisma, file);
  const {
    filePath,
    rawRows,
    warnings,
    errors,
    previewItems,
    notes,
    resolvedRows,
    unresolvedGroupings,
    unresolvedMovementTypes,
  } = prepared;

  if (mode === 'apply' && errors.length === 0) {
    const existingBudgets = await prisma.budget.findMany({
      where: { idSource: { in: resolvedRows.map(row => row.idSource) } },
      select: { id: true, idSource: true },
    });
    const existingBudgetMap = new Map(
      existingBudgets
        .filter((budget): budget is { id: string; idSource: string } => budget.idSource !== null)
        .map(budget => [budget.idSource, budget.id]),
    );

    await prisma.$transaction(async tx => {
      for (const row of resolvedRows) {
        const data = {
          label: row.label,
          idSource: row.idSource,
          comment: row.comment,
          summary: row.summary,
          dashboard: row.dashboard,
          balance: row.balance,
          invoiceBalance: row.invoiceBalance,
          active: row.active,
          groupingId: row.groupingId,
          dashboardGroupingId: row.dashboardGroupingId,
          movementTypeId: row.movementTypeId,
        };

        const existingBudgetId = existingBudgetMap.get(row.idSource);
        if (existingBudgetId) {
          await tx.budget.update({
            where: { id: existingBudgetId },
            data,
          });
        } else {
          await tx.budget.create({ data });
        }
      }
    });
  }

  const createdCount = previewItems.filter(item => item.action === 'create').length;
  const updatedCount = previewItems.filter(item => item.action === 'update').length;

  return {
    file: filePath,
    mode,
    totalRows: rawRows.length,
    validRows: previewItems.length,
    errorRows: new Set(errors.map(error => error.line)).size,
    createdCount,
    updatedCount,
    skippedCount: rawRows.length - previewItems.length - new Set(errors.map(error => error.line)).size,
    warnings,
    errors,
    previewItems,
    notes,
    unresolvedGroupings,
    unresolvedMovementTypes,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const report = await buildBudgetReport(prisma, options.file, options.mode);
    printReport(report);
    process.exitCode = report.errors.length > 0 ? 1 : 0;
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(error => {
  console.error('');
  console.error('Echec import budgets legacy');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
