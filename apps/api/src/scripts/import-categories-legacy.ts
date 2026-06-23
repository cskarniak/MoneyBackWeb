import { PrismaClient } from '@moneyback/db';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

type Mode = 'preview' | 'apply';

type CliOptions = {
  file: string;
  mode: Mode;
};

type LegacyCategoryRow = {
  line: number;
  sourceRecordNumber: string | null;
  idSource: string | null;
  label: string | null;
  sens: string | null;
  operationTypeSourceId: string | null;
  legacyCode: string | null;
  groupingSourceId: string | null;
  comment: string | null;
  active: boolean | null;
};

type ImportMessage = {
  line: number;
  categoryIdSource: string | null;
  code: string;
  message: string;
};

type PreviewItem = {
  line: number;
  categoryIdSource: string;
  label: string;
  action: 'create' | 'update';
  groupingSourceId: string | null;
  groupingResolved: boolean;
  sens: 'expense' | 'income';
};

type ResolvedCategoryRow = {
  line: number;
  idSource: string;
  label: string;
  legacyCode: string | null;
  comment: string | null;
  expense: boolean;
  income: boolean;
  active: boolean;
  groupingId: string | null;
  groupingSourceId: string | null;
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
  unresolvedGroupings: Array<{
    idSource: string;
    count: number;
    sampleCategoryLabels: string[];
  }>;
};

const DEFAULT_FILE = 'migration windev/export categories.xlsx';
const EXPECTED_HEADER = [
  'N° Enr.',
  '',
  'CAT_ID',
  'CAT_LIBELLE',
  'CAT_SENS',
  'OVT_ID',
  'CAT_ANCIEN_CODE',
  'CAT_CAR_ID',
  'CAT_COMMENTAIRE',
  'CAT_DESACTIVE',
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
  for (const char of columnLetters) {
    value = value * 26 + (char.charCodeAt(0) - 64);
  }
  return value - 1;
}

function unzipText(filePath: string, entry: string) {
  return execFileSync('unzip', ['-p', filePath, entry], { encoding: 'utf8' });
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
        const value =
          type === 's'
            ? sharedStrings[Number(rawValue)] ?? ''
            : decodeXmlEntities(rawValue);
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

function parseBoolean01(value: string | null): boolean | null {
  if (value === null) return null;
  if (value === '1') return true;
  if (value === '0') return false;
  throw new Error(`booléen illisible: "${value}"`);
}

function parseLegacySourceId(value: string | null): string | null {
  if (value === null || value === '0') return null;
  if (!/^\d+$/.test(value)) {
    throw new Error(`identifiant source illisible: "${value}"`);
  }
  return value;
}

function validateHeader(header: string[]) {
  const sameLength = header.length === EXPECTED_HEADER.length;
  const sameValues = sameLength && header.every((value, index) => value === EXPECTED_HEADER[index]);

  if (!sameValues) {
    throw new Error(`En-tête inattendu. Reçu: ${JSON.stringify(header)}`);
  }
}

function normalizeRow(values: string[], line: number): LegacyCategoryRow {
  const [
    sourceRecordNumber,
    _ignoredImagePath,
    categoryId,
    label,
    sens,
    operationTypeSourceId,
    legacyCode,
    groupingSourceId,
    comment,
    disabled,
  ] = values;

  return {
    line,
    sourceRecordNumber: normalizeText(sourceRecordNumber),
    idSource: normalizeText(categoryId),
    label: normalizeText(label),
    sens: normalizeText(sens),
    operationTypeSourceId: normalizeText(operationTypeSourceId),
    legacyCode: normalizeText(legacyCode),
    groupingSourceId: normalizeText(groupingSourceId),
    comment: normalizeText(comment),
    active: (() => {
      const disabledValue = parseBoolean01(normalizeText(disabled));
      return disabledValue === null ? null : !disabledValue;
    })(),
  };
}

async function loadLegacyReferenceMap(
  prisma: PrismaClient,
  tableName: 'regroupements',
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
    'SELECT id, id_source FROM "regroupements" WHERE id_source IS NOT NULL',
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

function pushError(errors: ImportMessage[], row: LegacyCategoryRow, code: string, message: string) {
  errors.push({
    line: row.line,
    categoryIdSource: row.idSource,
    code,
    message,
  });
}

function pushWarning(warnings: ImportMessage[], row: LegacyCategoryRow, code: string, message: string) {
  warnings.push({
    line: row.line,
    categoryIdSource: row.idSource,
    code,
    message,
  });
}

function resolveSens(value: string | null) {
  if (value === '1') return { expense: true, income: false, label: 'expense' as const };
  if (value === '2') return { expense: false, income: true, label: 'income' as const };
  throw new Error(`sens illisible: "${value}"`);
}

function validateNormalizedRow(
  row: LegacyCategoryRow,
  errors: ImportMessage[],
  warnings: ImportMessage[],
  groupingMap: LegacyReferenceMap,
) {
  if (!row.idSource) pushError(errors, row, 'MISSING_ID_SOURCE', 'CAT_ID est obligatoire.');
  else {
    try {
      parseLegacySourceId(row.idSource);
    } catch (error) {
      pushError(errors, row, 'INVALID_ID_SOURCE', (error as Error).message);
    }
  }

  if (!row.label) pushError(errors, row, 'MISSING_LABEL', 'CAT_LIBELLE est obligatoire.');

  try {
    resolveSens(row.sens);
  } catch (error) {
    pushError(errors, row, 'INVALID_SENS', (error as Error).message);
  }

  if (row.groupingSourceId && row.groupingSourceId !== '0') {
    try {
      const parsedGroupingId = parseLegacySourceId(row.groupingSourceId);
      if (parsedGroupingId && groupingMap.available && !groupingMap.values.has(parsedGroupingId)) {
        pushError(errors, row, 'GROUPING_NOT_FOUND', `Aucun regroupement trouvé pour CAT_CAR_ID=${parsedGroupingId}.`);
      }
      if (parsedGroupingId && !groupingMap.available) {
        pushWarning(warnings, row, 'GROUPING_ID_SOURCE_UNAVAILABLE', groupingMap.missingColumnReason ?? 'Mapping regroupement indisponible.');
      }
    } catch (error) {
      pushError(errors, row, 'INVALID_GROUPING_SOURCE_ID', (error as Error).message);
    }
  }

  if (row.operationTypeSourceId && row.operationTypeSourceId !== '0') {
    pushWarning(warnings, row, 'OPERATION_TYPE_IGNORED', `OVT_ID=${row.operationTypeSourceId} présent mais non importé.`);
  }
}

async function buildReport(prisma: PrismaClient, file: string, mode: Mode): Promise<ImportReport> {
  const filePath = resolveInputFile(file);
  const rows = readWorkbookRows(filePath);
  validateHeader(rows[0] ?? []);

  const dataRows = rows.slice(1);
  const groupingMap = await loadLegacyReferenceMap(prisma, 'regroupements');
  const existingCategories = await prisma.category.findMany({
    where: { idSource: { not: null } },
    select: { id: true, idSource: true },
  });
  const existingCategoryMap = new Map(
    existingCategories
      .filter((category): category is { id: string; idSource: string } => category.idSource !== null)
      .map(category => [category.idSource, category.id]),
  );

  const warnings: ImportMessage[] = [];
  const errors: ImportMessage[] = [];
  const previewItems: PreviewItem[] = [];
  const resolvedRows: ResolvedCategoryRow[] = [];
  const unresolvedGroupingSamples = new Map<string, { count: number; sampleCategoryLabels: string[] }>();

  for (let index = 0; index < dataRows.length; index += 1) {
    const rawValues = dataRows[index] ?? [];
    if (!rawValues.some(value => value !== '')) continue;

    let normalized: LegacyCategoryRow;
    try {
      normalized = normalizeRow(rawValues, index + 2);
    } catch (error) {
      errors.push({
        line: index + 2,
        categoryIdSource: normalizeText(rawValues[2]),
        code: 'ROW_PARSE_ERROR',
        message: (error as Error).message,
      });
      continue;
    }

    const rowErrorsBefore = errors.length;
    validateNormalizedRow(normalized, errors, warnings, groupingMap);

    if (errors.length > rowErrorsBefore || !normalized.idSource || !normalized.label) continue;

    const groupingSourceId = parseLegacySourceId(normalized.groupingSourceId);
    const groupingResolved = groupingSourceId === null || groupingMap.values.has(groupingSourceId);
    const sens = resolveSens(normalized.sens);

    if (groupingSourceId && !groupingResolved) {
      const existing = unresolvedGroupingSamples.get(groupingSourceId) ?? {
        count: 0,
        sampleCategoryLabels: [],
      };
      existing.count += 1;
      if (existing.sampleCategoryLabels.length < 3) existing.sampleCategoryLabels.push(normalized.label);
      unresolvedGroupingSamples.set(groupingSourceId, existing);
    }

    previewItems.push({
      line: normalized.line,
      categoryIdSource: normalized.idSource,
      label: normalized.label,
      action: existingCategoryMap.has(normalized.idSource) ? 'update' : 'create',
      groupingSourceId,
      groupingResolved,
      sens: sens.label,
    });

    resolvedRows.push({
      line: normalized.line,
      idSource: normalized.idSource,
      label: normalized.label,
      legacyCode: normalized.legacyCode,
      comment: normalized.comment,
      expense: sens.expense,
      income: sens.income,
      active: normalized.active ?? true,
      groupingId: groupingSourceId ? groupingMap.values.get(groupingSourceId) ?? null : null,
      groupingSourceId,
      action: existingCategoryMap.has(normalized.idSource) ? 'update' : 'create',
    });
  }

  if (mode === 'apply' && errors.length === 0) {
    await prisma.$transaction(async tx => {
      for (const row of resolvedRows) {
        const data = {
          label: row.label,
          idSource: row.idSource,
          legacyCode: row.legacyCode,
          comment: row.comment,
          expense: row.expense,
          income: row.income,
          active: row.active,
          groupingId: row.groupingId,
        };

        const existingCategoryId = existingCategoryMap.get(row.idSource);
        if (existingCategoryId) {
          await tx.category.update({
            where: { id: existingCategoryId },
            data,
          });
        } else {
          await tx.category.create({ data });
        }
      }
    });
  }

  const createdCount = previewItems.filter(item => item.action === 'create').length;
  const updatedCount = previewItems.filter(item => item.action === 'update').length;
  const notes: string[] = [];
  if (!groupingMap.available) {
    notes.push(groupingMap.missingColumnReason ?? 'Le mapping regroupements par id_source est indisponible.');
  }

  return {
    file: filePath,
    mode,
    totalRows: dataRows.filter(row => row.some(value => value !== '')).length,
    validRows: previewItems.length,
    errorRows: new Set(errors.map(error => error.line)).size,
    createdCount,
    updatedCount,
    skippedCount:
      dataRows.filter(row => row.some(value => value !== '')).length
      - previewItems.length
      - new Set(errors.map(error => error.line)).size,
    warnings,
    errors,
    previewItems,
    notes,
    unresolvedGroupings: Array.from(unresolvedGroupingSamples.entries())
      .map(([idSource, data]) => ({ idSource, ...data }))
      .sort((a, b) => b.count - a.count || a.idSource.localeCompare(b.idSource)),
  };
}

function printReport(report: ImportReport) {
  console.log('');
  console.log('Import categories legacy');
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
        `- ligne ${item.line}: ${item.action} catégorie ${item.categoryIdSource} "${item.label}"` +
          ` | sens=${item.sens}` +
          ` | CAT_CAR_ID=${item.groupingSourceId ?? 'null'} (${item.groupingResolved ? 'ok' : 'ko'})`,
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
        `- CAT_CAR_ID=${item.idSource} | ${item.count} catégorie(s) | exemples: ${item.sampleCategoryLabels.join(', ')}`,
      );
    }
    if (report.unresolvedGroupings.length > 15) {
      console.log(`- ... ${report.unresolvedGroupings.length - 15} regroupements supplémentaires`);
    }
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
  console.error('Echec import categories legacy');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
