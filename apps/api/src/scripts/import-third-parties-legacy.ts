import { PrismaClient } from '@moneyback/db';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

type Mode = 'preview' | 'apply';

type CliOptions = {
  file: string;
  mode: Mode;
};

type LegacyThirdPartyRow = {
  line: number;
  idSource: string | null;
  name: string | null;
  budgetSourceId: string | null;
  categorySourceId: string | null;
  keyword1: string | null;
  keyword2: string | null;
  keyword3: string | null;
  ventilated: boolean | null;
  movementTypeSourceId: string | null;
  comment: string | null;
  operator1: string | null;
  operator2: string | null;
  budgetMode: string | null;
  active: boolean | null;
  assignmentFormula: string | null;
  assignmentFormulaEnabled: boolean | null;
};

type ImportMessage = {
  line: number;
  thirdPartyIdSource: string | null;
  code: string;
  message: string;
};

type PreviewItem = {
  line: number;
  thirdPartyIdSource: string;
  name: string;
  action: 'create' | 'update';
  budgetSourceId: string | null;
  budgetResolved: boolean;
  categorySourceId: string | null;
  categoryResolved: boolean;
  ventilated: boolean;
};

type ResolvedThirdPartyRow = {
  idSource: string;
  name: string;
  comment: string | null;
  budgetBearer: boolean;
  ventilated: boolean;
  active: boolean;
  budgetId: string | null;
  budgetSourceId: string | null;
  categoryId: string | null;
  categorySourceId: string | null;
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
  unresolvedBudgets: Array<{
    idSource: string;
    count: number;
    sampleThirdPartyNames: string[];
  }>;
  unresolvedCategories: Array<{
    idSource: string;
    count: number;
    sampleThirdPartyNames: string[];
  }>;
};

const DEFAULT_FILE = 'migration windev/export_tiers.csv';
const EXPECTED_HEADER = [
  'TIE_ID',
  'TIE_NOM',
  'BUD_ID',
  'CAT_ID',
  'TIE_MOTCLE1',
  'TIE_MOTCLE2',
  'TIE_MOTCLE3',
  'TIE_VENTILATION',
  'TIE_TYM_ID',
  'tIE_COMMENTAIRE',
  'tIE_OPERATEUR1',
  'tIE_OPERATEUR2',
  'tIE_BUDGET',
  'TIE_DESACTIVE',
  'TIE_FORMULEAFFECTATION',
  'TIE_FORMULEACTIVEE',
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

function parseLegacySourceId(value: string | null): string | null {
  if (value === null || value === '0') return null;
  if (!/^\d+$/.test(value)) {
    throw new Error(`identifiant source illisible: "${value}"`);
  }
  return value;
}

function parseSemicolonCsv(content: string): string[][] {
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

function validateHeader(header: string[]) {
  const sameLength = header.length === EXPECTED_HEADER.length;
  const sameValues = sameLength && header.every((value, index) => value === EXPECTED_HEADER[index]);

  if (!sameValues) {
    throw new Error(`En-tête inattendu. Reçu: ${JSON.stringify(header)}`);
  }
}

function normalizeRow(values: string[], line: number): LegacyThirdPartyRow {
  const [
    tieId,
    tieNom,
    budId,
    catId,
    keyword1,
    keyword2,
    keyword3,
    ventilation,
    movementTypeSourceId,
    comment,
    operator1,
    operator2,
    budgetMode,
    disabled,
    assignmentFormula,
    assignmentFormulaEnabled,
  ] = values;

  return {
    line,
    idSource: normalizeText(tieId),
    name: normalizeText(tieNom),
    budgetSourceId: normalizeText(budId),
    categorySourceId: normalizeText(catId),
    keyword1: normalizeText(keyword1),
    keyword2: normalizeText(keyword2),
    keyword3: normalizeText(keyword3),
    ventilated: parseBoolean01(normalizeText(ventilation)),
    movementTypeSourceId: normalizeText(movementTypeSourceId),
    comment: normalizeText(comment),
    operator1: normalizeText(operator1),
    operator2: normalizeText(operator2),
    budgetMode: normalizeText(budgetMode),
    active: (() => {
      const disabledValue = parseBoolean01(normalizeText(disabled));
      return disabledValue === null ? null : !disabledValue;
    })(),
    assignmentFormula: normalizeText(assignmentFormula),
    assignmentFormulaEnabled: parseBoolean01(normalizeText(assignmentFormulaEnabled)),
  };
}

async function loadLegacyReferenceMap(
  prisma: PrismaClient,
  tableName: 'budgets' | 'categories',
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
    tableName === 'budgets'
      ? 'SELECT id, id_source FROM "budgets" WHERE id_source IS NOT NULL'
      : 'SELECT id, id_source FROM "categories" WHERE id_source IS NOT NULL',
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

function pushError(errors: ImportMessage[], row: LegacyThirdPartyRow, code: string, message: string) {
  errors.push({
    line: row.line,
    thirdPartyIdSource: row.idSource,
    code,
    message,
  });
}

function pushWarning(warnings: ImportMessage[], row: LegacyThirdPartyRow, code: string, message: string) {
  warnings.push({
    line: row.line,
    thirdPartyIdSource: row.idSource,
    code,
    message,
  });
}

function validateNormalizedRow(
  row: LegacyThirdPartyRow,
  errors: ImportMessage[],
  warnings: ImportMessage[],
  budgetMap: LegacyReferenceMap,
  categoryMap: LegacyReferenceMap,
) {
  if (!row.idSource) pushError(errors, row, 'MISSING_ID_SOURCE', 'TIE_ID est obligatoire.');
  else {
    try {
      parseLegacySourceId(row.idSource);
    } catch (error) {
      pushError(errors, row, 'INVALID_ID_SOURCE', (error as Error).message);
    }
  }

  if (!row.name) pushError(errors, row, 'MISSING_NAME', 'TIE_NOM est obligatoire.');

  if (row.budgetSourceId && row.budgetSourceId !== '0') {
    try {
      const parsedBudgetId = parseLegacySourceId(row.budgetSourceId);
      if (parsedBudgetId && budgetMap.available && !budgetMap.values.has(parsedBudgetId)) {
        pushError(errors, row, 'BUDGET_NOT_FOUND', `Aucune enveloppe trouvée pour BUD_ID=${parsedBudgetId}.`);
      }
      if (parsedBudgetId && !budgetMap.available) {
        pushWarning(warnings, row, 'BUDGET_ID_SOURCE_UNAVAILABLE', budgetMap.missingColumnReason ?? 'Mapping enveloppe indisponible.');
      }
    } catch (error) {
      pushError(errors, row, 'INVALID_BUDGET_SOURCE_ID', (error as Error).message);
    }
  }

  if (row.categorySourceId && row.categorySourceId !== '0') {
    try {
      const parsedCategoryId = parseLegacySourceId(row.categorySourceId);
      if (parsedCategoryId && categoryMap.available && !categoryMap.values.has(parsedCategoryId)) {
        pushError(errors, row, 'CATEGORY_NOT_FOUND', `Aucune catégorie trouvée pour CAT_ID=${parsedCategoryId}.`);
      }
      if (parsedCategoryId && !categoryMap.available) {
        pushWarning(warnings, row, 'CATEGORY_ID_SOURCE_UNAVAILABLE', categoryMap.missingColumnReason ?? 'Mapping catégorie indisponible.');
      }
    } catch (error) {
      pushError(errors, row, 'INVALID_CATEGORY_SOURCE_ID', (error as Error).message);
    }
  }

  if (row.keyword1 || row.keyword2 || row.keyword3) {
    pushWarning(
      warnings,
      row,
      'KEYWORDS_IGNORED',
      `Mots-clés présents (${[row.keyword1, row.keyword2, row.keyword3].filter(Boolean).join(', ')}) mais non importés automatiquement en V0.`,
    );
  }

  if (row.movementTypeSourceId && row.movementTypeSourceId !== '0') {
    pushWarning(warnings, row, 'MOVEMENT_TYPE_IGNORED', `TIE_TYM_ID=${row.movementTypeSourceId} présent mais non importé sur le tiers.`);
  }

  if (row.assignmentFormulaEnabled) {
    pushWarning(warnings, row, 'ASSIGNMENT_FORMULA_IGNORED', 'Formule d’affectation active détectée mais non importée automatiquement en V0.');
  }
}

async function buildReport(prisma: PrismaClient, file: string, mode: Mode): Promise<ImportReport> {
  const filePath = resolveInputFile(file);
  const content = await readFile(filePath, { encoding: 'latin1' });
  const rows = parseSemicolonCsv(content);
  const [header = [], ...dataRows] = rows;
  validateHeader(header);

  const budgetMap = await loadLegacyReferenceMap(prisma, 'budgets');
  const categoryMap = await loadLegacyReferenceMap(prisma, 'categories');
  const existingThirdParties = await prisma.thirdParty.findMany({
    where: { idSource: { not: null } },
    select: { id: true, idSource: true },
  });
  const existingThirdPartyMap = new Map(
    existingThirdParties
      .filter((item): item is { id: string; idSource: string } => item.idSource !== null)
      .map(item => [item.idSource, item.id]),
  );

  const warnings: ImportMessage[] = [];
  const errors: ImportMessage[] = [];
  const previewItems: PreviewItem[] = [];
  const resolvedRows: ResolvedThirdPartyRow[] = [];
  const unresolvedBudgetSamples = new Map<string, { count: number; sampleThirdPartyNames: string[] }>();
  const unresolvedCategorySamples = new Map<string, { count: number; sampleThirdPartyNames: string[] }>();

  for (let index = 0; index < dataRows.length; index += 1) {
    const rawValues = dataRows[index] ?? [];
    if (!rawValues.some(value => value !== '')) continue;

    let normalized: LegacyThirdPartyRow;
    try {
      normalized = normalizeRow(rawValues, index + 2);
    } catch (error) {
      errors.push({
        line: index + 2,
        thirdPartyIdSource: normalizeText(rawValues[0]),
        code: 'ROW_PARSE_ERROR',
        message: (error as Error).message,
      });
      continue;
    }

    const rowErrorsBefore = errors.length;
    validateNormalizedRow(normalized, errors, warnings, budgetMap, categoryMap);

    if (errors.length > rowErrorsBefore || !normalized.idSource || !normalized.name) continue;

    const budgetSourceId = parseLegacySourceId(normalized.budgetSourceId);
    const categorySourceId = parseLegacySourceId(normalized.categorySourceId);
    const budgetResolved = budgetSourceId === null || budgetMap.values.has(budgetSourceId);
    const categoryResolved = categorySourceId === null || categoryMap.values.has(categorySourceId);
    const ventilated = normalized.ventilated ?? false;

    if (budgetSourceId && !budgetResolved) {
      const existing = unresolvedBudgetSamples.get(budgetSourceId) ?? {
        count: 0,
        sampleThirdPartyNames: [],
      };
      existing.count += 1;
      if (existing.sampleThirdPartyNames.length < 3) existing.sampleThirdPartyNames.push(normalized.name);
      unresolvedBudgetSamples.set(budgetSourceId, existing);
    }

    if (categorySourceId && !categoryResolved) {
      const existing = unresolvedCategorySamples.get(categorySourceId) ?? {
        count: 0,
        sampleThirdPartyNames: [],
      };
      existing.count += 1;
      if (existing.sampleThirdPartyNames.length < 3) existing.sampleThirdPartyNames.push(normalized.name);
      unresolvedCategorySamples.set(categorySourceId, existing);
    }

    previewItems.push({
      line: normalized.line,
      thirdPartyIdSource: normalized.idSource,
      name: normalized.name,
      action: existingThirdPartyMap.has(normalized.idSource) ? 'update' : 'create',
      budgetSourceId,
      budgetResolved,
      categorySourceId,
      categoryResolved,
      ventilated,
    });

    resolvedRows.push({
      idSource: normalized.idSource,
      name: normalized.name,
      comment: normalized.comment,
      budgetBearer: normalized.budgetMode === '1',
      ventilated,
      active: normalized.active ?? true,
      budgetId: budgetSourceId ? budgetMap.values.get(budgetSourceId) ?? null : null,
      budgetSourceId,
      categoryId: categorySourceId ? categoryMap.values.get(categorySourceId) ?? null : null,
      categorySourceId,
      action: existingThirdPartyMap.has(normalized.idSource) ? 'update' : 'create',
    });
  }

  if (mode === 'apply' && errors.length === 0) {
    await prisma.$transaction(async tx => {
      for (const row of resolvedRows) {
        const data = {
          name: row.name,
          idSource: row.idSource,
          comment: row.comment,
          budgetBearer: row.budgetBearer,
          ventilated: row.ventilated,
          active: row.active,
          budgetId: row.ventilated ? null : row.budgetId,
          categoryId: row.ventilated ? null : row.categoryId,
        };

        const existingThirdPartyId = existingThirdPartyMap.get(row.idSource);
        if (existingThirdPartyId) {
          await tx.thirdParty.update({
            where: { id: existingThirdPartyId },
            data,
          });
        } else {
          await tx.thirdParty.create({ data });
        }
      }
    });
  }

  const createdCount = previewItems.filter(item => item.action === 'create').length;
  const updatedCount = previewItems.filter(item => item.action === 'update').length;
  const notes: string[] = [];
  if (!budgetMap.available) {
    notes.push(budgetMap.missingColumnReason ?? 'Le mapping enveloppes par id_source est indisponible.');
  }
  if (!categoryMap.available) {
    notes.push(categoryMap.missingColumnReason ?? 'Le mapping catégories par id_source est indisponible.');
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
    unresolvedBudgets: Array.from(unresolvedBudgetSamples.entries())
      .map(([idSource, data]) => ({ idSource, ...data }))
      .sort((a, b) => b.count - a.count || a.idSource.localeCompare(b.idSource)),
    unresolvedCategories: Array.from(unresolvedCategorySamples.entries())
      .map(([idSource, data]) => ({ idSource, ...data }))
      .sort((a, b) => b.count - a.count || a.idSource.localeCompare(b.idSource)),
  };
}

function printReport(report: ImportReport) {
  console.log('');
  console.log('Import third parties legacy');
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
        `- ligne ${item.line}: ${item.action} tiers ${item.thirdPartyIdSource} "${item.name}"` +
        ` | ventilé=${item.ventilated ? 'oui' : 'non'}` +
        ` | BUD_ID=${item.budgetSourceId ?? 'null'} (${item.budgetResolved ? 'ok' : 'ko'})` +
        ` | CAT_ID=${item.categorySourceId ?? 'null'} (${item.categoryResolved ? 'ok' : 'ko'})`,
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
  console.error('Echec import third parties legacy');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
