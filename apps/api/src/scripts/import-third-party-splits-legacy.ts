import { PrismaClient } from '@moneyback/db';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

type Mode = 'preview' | 'apply';

type CliOptions = {
  file: string;
  mode: Mode;
};

type LegacyThirdPartySplitRow = {
  line: number;
  idSource: string | null;
  label: string | null;
  expense: string | null;
  income: string | null;
  subscriptionSourceId: string | null;
  budgetSourceId: string | null;
  categorySourceId: string | null;
  thirdPartySourceId: string | null;
  balance: string | null;
};

type ImportMessage = {
  line: number;
  splitIdSource: string | null;
  code: string;
  message: string;
};

type PreviewItem = {
  line: number;
  splitIdSource: string;
  label: string;
  action: 'create' | 'update';
  thirdPartySourceId: string | null;
  thirdPartyResolved: boolean;
  budgetSourceId: string | null;
  budgetResolved: boolean;
  categorySourceId: string | null;
  categoryResolved: boolean;
};

type ResolvedRow = {
  idSource: string;
  label: string | null;
  expense: string;
  income: string;
  balance: string | null;
  thirdPartyId: string;
  thirdPartySourceId: string;
  budgetId: string | null;
  categoryId: string | null;
  action: 'create' | 'update';
};

type LegacyReferenceMap = {
  available: boolean;
  values: Map<string, string>;
  missingColumnReason?: string;
};

type ImportReport = {
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
};

const DEFAULT_FILE = 'migration windev/export_operations_ventilees_tiers.xlsx';
const EXPECTED_HEADER = [
  'N° Enr.',
  '',
  'OVI_ID',
  'OVI_LIBELLE',
  'OVI_DEPENSE',
  'OVI_RECETTE',
  'ABO_ID',
  'BUD_ID',
  'CAT_ID',
  'TIE_ID',
  'OVI_SOLDE',
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

function unzipText(filePath: string, entry: string) {
  return execFileSync('unzip', ['-p', filePath, entry], { encoding: 'utf8' });
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function columnLettersToIndex(columnLetters: string) {
  let value = 0;
  for (const char of columnLetters) value = value * 26 + (char.charCodeAt(0) - 64);
  return value - 1;
}

function parseSharedStrings(xml: string) {
  const items = xml.match(/<si[\s\S]*?<\/si>/g) ?? [];
  return items.map(item => {
    const parts = Array.from(item.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g));
    return decodeXmlEntities(parts.map(part => part[1] ?? '').join(''));
  });
}

function parseSheetRows(xml: string, sharedStrings: string[]) {
  const rows: string[][] = [];
  const rowMatches = xml.match(/<row\b[\s\S]*?<\/row>/g) ?? [];

  for (const rowXml of rowMatches) {
    const row: string[] = [];
    const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let match: RegExpExecArray | null = cellRegex.exec(rowXml);

    while (match) {
      const attrs = match[1] ?? '';
      const inner = match[2] ?? '';
      const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1];
      if (ref) {
        const index = columnLettersToIndex(ref);
        const type = /t="([^"]+)"/.exec(attrs)?.[1];
        const rawValue = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '';
        const value = type === 's' ? sharedStrings[Number(rawValue)] ?? '' : decodeXmlEntities(rawValue);
        row[index] = value;
      }
      match = cellRegex.exec(rowXml);
    }

    rows.push(row.map(value => value ?? ''));
  }

  return rows;
}

function readWorkbookRows(filePath: string) {
  const sharedStringsXml = unzipText(filePath, 'xl/sharedStrings.xml');
  const sheetXml = unzipText(filePath, 'xl/worksheets/sheet1.xml');
  return parseSheetRows(sheetXml, parseSharedStrings(sharedStringsXml));
}

function normalizeText(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function parseLegacySourceId(value: string | null): string | null {
  if (value === null || value === '0') return null;
  if (!/^\d+$/.test(value)) throw new Error(`identifiant source illisible: "${value}"`);
  return value;
}

function parseLegacyDecimal(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value.replace(/\s+/g, '').replace(',', '.');
  if (normalized === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) throw new Error(`décimal illisible: "${value}"`);
  return normalized;
}

function validateHeader(header: string[]) {
  const sameLength = header.length === EXPECTED_HEADER.length;
  const sameValues = sameLength && header.every((value, index) => value === EXPECTED_HEADER[index]);
  if (!sameValues) throw new Error(`En-tête inattendu. Reçu: ${JSON.stringify(header)}`);
}

function normalizeRow(values: string[], line: number): LegacyThirdPartySplitRow {
  const [
    _sourceRecordNumber,
    _ignoredImagePath,
    oviId,
    label,
    expense,
    income,
    subscriptionSourceId,
    budgetSourceId,
    categorySourceId,
    thirdPartySourceId,
    balance,
  ] = values;

  return {
    line,
    idSource: normalizeText(oviId),
    label: normalizeText(label),
    expense: parseLegacyDecimal(normalizeText(expense)),
    income: parseLegacyDecimal(normalizeText(income)),
    subscriptionSourceId: normalizeText(subscriptionSourceId),
    budgetSourceId: normalizeText(budgetSourceId),
    categorySourceId: normalizeText(categorySourceId),
    thirdPartySourceId: normalizeText(thirdPartySourceId),
    balance: parseLegacyDecimal(normalizeText(balance)),
  };
}

async function loadLegacyReferenceMap(
  prisma: PrismaClient,
  tableName: 'tiers' | 'budgets' | 'categories' | 'operations_ventilees_tiers',
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

  const sql =
    tableName === 'tiers'
      ? 'SELECT id, id_source FROM "tiers" WHERE id_source IS NOT NULL'
      : tableName === 'budgets'
        ? 'SELECT id, id_source FROM "budgets" WHERE id_source IS NOT NULL'
        : tableName === 'categories'
          ? 'SELECT id, id_source FROM "categories" WHERE id_source IS NOT NULL'
          : 'SELECT id, id_source FROM "operations_ventilees_tiers" WHERE id_source IS NOT NULL';

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; id_source: string | number | null }>>(sql);

  return {
    available: true,
    values: new Map(
      rows
        .filter(row => row.id_source !== null)
        .map(row => [String(row.id_source), row.id]),
    ),
  };
}

function pushError(errors: ImportMessage[], row: LegacyThirdPartySplitRow, code: string, message: string) {
  errors.push({ line: row.line, splitIdSource: row.idSource, code, message });
}

function pushWarning(warnings: ImportMessage[], row: LegacyThirdPartySplitRow, code: string, message: string) {
  warnings.push({ line: row.line, splitIdSource: row.idSource, code, message });
}

function validateNormalizedRow(
  row: LegacyThirdPartySplitRow,
  errors: ImportMessage[],
  warnings: ImportMessage[],
  thirdPartyMap: LegacyReferenceMap,
  budgetMap: LegacyReferenceMap,
  categoryMap: LegacyReferenceMap,
) {
  if (!row.idSource) pushError(errors, row, 'MISSING_ID_SOURCE', 'OVI_ID est obligatoire.');
  else {
    try {
      parseLegacySourceId(row.idSource);
    } catch (error) {
      pushError(errors, row, 'INVALID_ID_SOURCE', (error as Error).message);
    }
  }

  if (!row.thirdPartySourceId) pushError(errors, row, 'MISSING_THIRD_PARTY', 'TIE_ID est obligatoire.');
  else {
    try {
      const parsed = parseLegacySourceId(row.thirdPartySourceId);
      if (parsed && thirdPartyMap.available && !thirdPartyMap.values.has(parsed)) {
        pushError(errors, row, 'THIRD_PARTY_NOT_FOUND', `Aucun tiers trouvé pour TIE_ID=${parsed}.`);
      }
    } catch (error) {
      pushError(errors, row, 'INVALID_THIRD_PARTY_SOURCE_ID', (error as Error).message);
    }
  }

  if (row.budgetSourceId && row.budgetSourceId !== '0') {
    try {
      const parsed = parseLegacySourceId(row.budgetSourceId);
      if (parsed && budgetMap.available && !budgetMap.values.has(parsed)) {
        pushError(errors, row, 'BUDGET_NOT_FOUND', `Aucune enveloppe trouvée pour BUD_ID=${parsed}.`);
      }
    } catch (error) {
      pushError(errors, row, 'INVALID_BUDGET_SOURCE_ID', (error as Error).message);
    }
  }

  if (row.categorySourceId && row.categorySourceId !== '0') {
    try {
      const parsed = parseLegacySourceId(row.categorySourceId);
      if (parsed && categoryMap.available && !categoryMap.values.has(parsed)) {
        pushError(errors, row, 'CATEGORY_NOT_FOUND', `Aucune catégorie trouvée pour CAT_ID=${parsed}.`);
      }
    } catch (error) {
      pushError(errors, row, 'INVALID_CATEGORY_SOURCE_ID', (error as Error).message);
    }
  }

  if (row.subscriptionSourceId && row.subscriptionSourceId !== '0') {
    pushWarning(warnings, row, 'SUBSCRIPTION_IGNORED', `ABO_ID=${row.subscriptionSourceId} présent mais non importé automatiquement en V0.`);
  }
}

async function buildReport(prisma: PrismaClient, file: string, mode: Mode): Promise<ImportReport> {
  const filePath = resolveInputFile(file);
  const rows = readWorkbookRows(filePath);
  validateHeader(rows[0] ?? []);
  const dataRows = rows.slice(1).filter(row => row.some(value => value !== ''));

  const thirdPartyMap = await loadLegacyReferenceMap(prisma, 'tiers');
  const budgetMap = await loadLegacyReferenceMap(prisma, 'budgets');
  const categoryMap = await loadLegacyReferenceMap(prisma, 'categories');
  const splitMap = await loadLegacyReferenceMap(prisma, 'operations_ventilees_tiers');

  const warnings: ImportMessage[] = [];
  const errors: ImportMessage[] = [];
  const previewItems: PreviewItem[] = [];
  const resolvedRows: ResolvedRow[] = [];

  for (let index = 0; index < dataRows.length; index += 1) {
    const rawValues = dataRows[index] ?? [];
    let normalized: LegacyThirdPartySplitRow;
    try {
      normalized = normalizeRow(rawValues, index + 2);
    } catch (error) {
      errors.push({
        line: index + 2,
        splitIdSource: normalizeText(rawValues[2]),
        code: 'ROW_PARSE_ERROR',
        message: (error as Error).message,
      });
      continue;
    }

    const rowErrorsBefore = errors.length;
    validateNormalizedRow(normalized, errors, warnings, thirdPartyMap, budgetMap, categoryMap);
    if (errors.length > rowErrorsBefore || !normalized.idSource || !normalized.thirdPartySourceId) continue;

    const thirdPartySourceId = parseLegacySourceId(normalized.thirdPartySourceId);
    const budgetSourceId = parseLegacySourceId(normalized.budgetSourceId);
    const categorySourceId = parseLegacySourceId(normalized.categorySourceId);
    const thirdPartyResolved = thirdPartySourceId !== null && thirdPartyMap.values.has(thirdPartySourceId);
    const budgetResolved = budgetSourceId === null || budgetMap.values.has(budgetSourceId);
    const categoryResolved = categorySourceId === null || categoryMap.values.has(categorySourceId);

    previewItems.push({
      line: normalized.line,
      splitIdSource: normalized.idSource,
      label: normalized.label ?? '',
      action: splitMap.values.has(normalized.idSource) ? 'update' : 'create',
      thirdPartySourceId,
      thirdPartyResolved,
      budgetSourceId,
      budgetResolved,
      categorySourceId,
      categoryResolved,
    });

    resolvedRows.push({
      idSource: normalized.idSource,
      label: normalized.label,
      expense: normalized.expense ?? '0',
      income: normalized.income ?? '0',
      balance: normalized.balance,
      thirdPartyId: thirdPartyMap.values.get(thirdPartySourceId!)!,
      thirdPartySourceId: thirdPartySourceId!,
      budgetId: budgetSourceId ? budgetMap.values.get(budgetSourceId) ?? null : null,
      categoryId: categorySourceId ? categoryMap.values.get(categorySourceId) ?? null : null,
      action: splitMap.values.has(normalized.idSource) ? 'update' : 'create',
    });
  }

  if (mode === 'apply' && errors.length === 0) {
    await prisma.$transaction(async tx => {
      for (const row of resolvedRows) {
        const data = {
          idSource: row.idSource,
          label: row.label,
          expense: row.expense,
          income: row.income,
          balance: row.balance,
          thirdPartyId: row.thirdPartyId,
          budgetId: row.budgetId,
          categoryId: row.categoryId,
        };

        const existingId = splitMap.values.get(row.idSource);
        if (existingId) {
          await tx.thirdPartySplit.update({
            where: { id: existingId },
            data,
          });
        } else {
          await tx.thirdPartySplit.create({ data });
        }
      }
    });
  }

  const notes: string[] = [];
  if (!thirdPartyMap.available) notes.push(thirdPartyMap.missingColumnReason ?? 'Le mapping tiers par id_source est indisponible.');
  if (!budgetMap.available) notes.push(budgetMap.missingColumnReason ?? 'Le mapping enveloppes par id_source est indisponible.');
  if (!categoryMap.available) notes.push(categoryMap.missingColumnReason ?? 'Le mapping catégories par id_source est indisponible.');

  return {
    file: filePath,
    mode,
    totalRows: dataRows.length,
    validRows: previewItems.length,
    errorRows: new Set(errors.map(error => error.line)).size,
    createdCount: previewItems.filter(item => item.action === 'create').length,
    updatedCount: previewItems.filter(item => item.action === 'update').length,
    skippedCount: dataRows.length - previewItems.length - new Set(errors.map(error => error.line)).size,
    warnings,
    errors,
    previewItems,
    notes,
  };
}

function printReport(report: ImportReport) {
  console.log('');
  console.log('Import third-party splits legacy');
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
        `- ligne ${item.line}: ${item.action} ventilation tiers ${item.splitIdSource}` +
        ` | TIE_ID=${item.thirdPartySourceId ?? 'null'} (${item.thirdPartyResolved ? 'ok' : 'ko'})` +
        ` | BUD_ID=${item.budgetSourceId ?? 'null'} (${item.budgetResolved ? 'ok' : 'ko'})` +
        ` | CAT_ID=${item.categorySourceId ?? 'null'} (${item.categoryResolved ? 'ok' : 'ko'})`,
      );
    }
    if (report.previewItems.length > 15) console.log(`- ... ${report.previewItems.length - 15} lignes supplémentaires`);
  }

  if (report.warnings.length > 0) {
    console.log('');
    console.log('Warnings');
    for (const warning of report.warnings.slice(0, 20)) {
      console.log(`- ligne ${warning.line} [${warning.code}] ${warning.message}`);
    }
    if (report.warnings.length > 20) console.log(`- ... ${report.warnings.length - 20} warnings supplémentaires`);
  }

  if (report.errors.length > 0) {
    console.log('');
    console.log('Erreurs');
    for (const error of report.errors.slice(0, 20)) {
      console.log(`- ligne ${error.line} [${error.code}] ${error.message}`);
    }
    if (report.errors.length > 20) console.log(`- ... ${report.errors.length - 20} erreurs supplémentaires`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const report = await buildReport(prisma, options.file, options.mode);
    printReport(report);
    process.exitCode = report.errors.length > 0 ? 1 : 0;
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(error => {
  console.error('');
  console.error('Echec import third-party splits legacy');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
