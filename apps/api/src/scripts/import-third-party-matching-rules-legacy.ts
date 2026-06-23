import { PrismaClient } from '@moneyback/db';
import { ThirdPartyMatchingField, ThirdPartyMatchingMatcher, ThirdPartyMatchingOperator } from '@moneyback/shared';
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
  keyword1: string | null;
  keyword2: string | null;
  keyword3: string | null;
  formula: string | null;
  formulaEnabled: boolean | null;
};

type GeneratedCondition = {
  field: string;
  matcher: string;
  value: string | null;
  value2: string | null;
  negate: boolean;
};

type GeneratedRule = {
  label: string;
  description: string | null;
  operator: 'AND' | 'OR';
  conditions: GeneratedCondition[];
};

type PreviewAction = {
  line: number;
  thirdPartyIdSource: string;
  thirdPartyName: string;
  action: 'create' | 'replace';
  keywords: string[];
  formulaEnabled: boolean;
  generatedRules: number;
};

type ImportReport = {
  file: string;
  mode: Mode;
  totalRows: number;
  eligibleRows: number;
  skippedRows: number;
  createCount: number;
  replaceCount: number;
  actions: PreviewAction[];
  warnings: string[];
  errors: string[];
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
  if (!sameValues) throw new Error(`En-tête inattendu. Reçu: ${JSON.stringify(header)}`);
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

function normalizeRow(values: string[], line: number): LegacyThirdPartyRow {
  return {
    line,
    idSource: normalizeText(values[0]),
    name: normalizeText(values[1]),
    keyword1: normalizeText(values[4]),
    keyword2: normalizeText(values[5]),
    keyword3: normalizeText(values[6]),
    formula: normalizeText(values[14]),
    formulaEnabled: parseBoolean01(normalizeText(values[15])),
  };
}

function dedupeKeywords(row: LegacyThirdPartyRow) {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const keyword of [row.keyword1, row.keyword2, row.keyword3]) {
    if (!keyword) continue;
    const normalized = keyword.trim().toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    ordered.push(keyword.trim());
  }
  return ordered;
}

function parseLegacyNumeric(value: string) {
  return String(Number(value.replace(',', '.')));
}

function buildKeywordRule(thirdPartyName: string, keywords: string[]): GeneratedRule | null {
  if (keywords.length === 0) return null;

  return {
    label: `Matching ${thirdPartyName}`,
    description: `Généré depuis les mots-clés legacy (${keywords.join(', ')})`,
    operator: ThirdPartyMatchingOperator.OR,
    conditions: keywords.map(keyword => ({
      field: ThirdPartyMatchingField.NORMALIZED_LABEL,
      matcher: ThirdPartyMatchingMatcher.CONTAINS,
      value: keyword,
      value2: null,
      negate: false,
    })),
  };
}

function normalizeFormulaExpression(formula: string) {
  return formula
    .replace(/\r/g, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractConditionFromAtom(atom: string): GeneratedCondition | null {
  const containsMatch = /contient\s*\(\s*operation\.ope_libelle\s*,\s*"([^"]+)"\s*\)/i.exec(atom);
  if (containsMatch) {
    return {
      field: ThirdPartyMatchingField.NORMALIZED_LABEL,
      matcher: ThirdPartyMatchingMatcher.CONTAINS,
      value: containsMatch[1] ?? null,
      value2: null,
      negate: false,
    };
  }

  const expenseMatch = /operation\.ope_depense\s*(=|<=|>=|<|>)\s*([0-9]+(?:[.,][0-9]+)?)/i.exec(atom);
  if (expenseMatch) {
    const operator = expenseMatch[1];
    const amount = parseLegacyNumeric(expenseMatch[2] ?? '');
    return operator === '='
      ? {
          field: ThirdPartyMatchingField.AMOUNT,
          matcher: ThirdPartyMatchingMatcher.EQUALS,
          value: amount,
          value2: null,
          negate: false,
        }
      : {
          field: ThirdPartyMatchingField.AMOUNT,
          matcher:
            operator === '<' ? ThirdPartyMatchingMatcher.LT
            : operator === '<=' ? ThirdPartyMatchingMatcher.LTE
            : operator === '>' ? ThirdPartyMatchingMatcher.GT
            : ThirdPartyMatchingMatcher.GTE,
          value: amount,
          value2: null,
          negate: false,
        };
  }

  const incomeMatch = /operation\.ope_recette\s*(=|<=|>=|<|>)\s*([0-9]+(?:[.,][0-9]+)?)/i.exec(atom);
  if (incomeMatch) {
    const operator = incomeMatch[1];
    const amount = parseLegacyNumeric(incomeMatch[2] ?? '');
    return operator === '='
      ? {
          field: ThirdPartyMatchingField.AMOUNT,
          matcher: ThirdPartyMatchingMatcher.EQUALS,
          value: amount,
          value2: null,
          negate: false,
        }
      : {
          field: ThirdPartyMatchingField.AMOUNT,
          matcher:
            operator === '<' ? ThirdPartyMatchingMatcher.LT
            : operator === '<=' ? ThirdPartyMatchingMatcher.LTE
            : operator === '>' ? ThirdPartyMatchingMatcher.GT
            : ThirdPartyMatchingMatcher.GTE,
          value: amount,
          value2: null,
          negate: false,
        };
  }

  return null;
}

function extractDirectionFromAtom(atom: string): GeneratedCondition | null {
  if (/operation\.ope_depense\s*(=|<=|>=|<|>)\s*[0-9]/i.test(atom)) {
    return {
      field: ThirdPartyMatchingField.DIRECTION,
      matcher: ThirdPartyMatchingMatcher.EQUALS,
      value: 'expense',
      value2: null,
      negate: false,
    };
  }
  if (/operation\.ope_recette\s*(=|<=|>=|<|>)\s*[0-9]/i.test(atom)) {
    return {
      field: ThirdPartyMatchingField.DIRECTION,
      matcher: ThirdPartyMatchingMatcher.EQUALS,
      value: 'income',
      value2: null,
      negate: false,
    };
  }
  return null;
}

function translateFormulaToRules(row: LegacyThirdPartyRow, warnings: string[]): GeneratedRule[] {
  if (!row.formulaEnabled || !row.formula) return [];

  const normalized = normalizeFormulaExpression(row.formula);
  if (/operation\.ope_date/i.test(normalized)) {
    warnings.push(`ligne ${row.line}: formule active pour "${row.name}" contient un test sur la date, non traduisible en V1`);
    return [];
  }

  const siMatch = /^si\s+(.+?)\s+alors/i.exec(normalized);
  if (!siMatch?.[1]) {
    warnings.push(`ligne ${row.line}: formule active pour "${row.name}" non reconnue, ignorée en V1`);
    return [];
  }

  const expression = siMatch[1];
  const branches = expression.split(/\s+ou\s+/i).map(part => part.trim()).filter(Boolean);
  const generatedRules: GeneratedRule[] = [];

  branches.forEach((branch, branchIndex) => {
    const atoms = branch.split(/\s+et\s+/i).map(part => part.trim()).filter(Boolean);
    const conditions: GeneratedCondition[] = [];
    let unsupported = false;

    for (const atom of atoms) {
      const condition = extractConditionFromAtom(atom);
      if (condition) {
        conditions.push(condition);
        const direction = extractDirectionFromAtom(atom);
        if (direction && !conditions.some(existing => existing.field === direction.field && existing.value === direction.value)) {
          conditions.push(direction);
        }
        continue;
      }

      unsupported = true;
      warnings.push(`ligne ${row.line}: segment de formule non traduit pour "${row.name}" -> ${atom}`);
    }

    if (unsupported || conditions.length === 0) return;

    generatedRules.push({
      label: branches.length > 1 ? `Matching formule ${row.name} #${branchIndex + 1}` : `Matching formule ${row.name}`,
      description: `Traduit depuis formule WLangage legacy`,
      operator: ThirdPartyMatchingOperator.AND,
      conditions,
    });
  });

  if (generatedRules.length === 0) {
    warnings.push(`ligne ${row.line}: formule active pour "${row.name}" ignorée en V1`);
  }

  return generatedRules;
}

async function buildReport(prisma: PrismaClient, file: string, mode: Mode): Promise<ImportReport> {
  const filePath = resolveInputFile(file);
  const content = await readFile(filePath, { encoding: 'latin1' });
  const rows = parseSemicolonCsv(content);
  const [header = [], ...dataRows] = rows;
  validateHeader(header);

  const thirdParties = await prisma.thirdParty.findMany({
    where: { idSource: { not: null } },
    select: {
      id: true,
      idSource: true,
      name: true,
      matchingRules: { select: { id: true } },
    },
  });
  const thirdPartyMap = new Map(
    thirdParties
      .filter((item): item is { id: string; idSource: string; name: string; matchingRules: Array<{ id: string }> } => item.idSource !== null)
      .map(item => [item.idSource, item]),
  );

  const warnings: string[] = [];
  const errors: string[] = [];
  const actions: PreviewAction[] = [];

  for (let index = 0; index < dataRows.length; index += 1) {
    const values = dataRows[index] ?? [];
    if (!values.some(value => value !== '')) continue;

    let row: LegacyThirdPartyRow;
    try {
      row = normalizeRow(values, index + 2);
    } catch (error) {
      errors.push(`ligne ${index + 2}: ${(error as Error).message}`);
      continue;
    }

    if (!row.idSource || !row.name) {
      errors.push(`ligne ${row.line}: TIE_ID et TIE_NOM sont obligatoires`);
      continue;
    }

    const thirdParty = thirdPartyMap.get(row.idSource);
    if (!thirdParty) {
      errors.push(`ligne ${row.line}: tiers TIE_ID=${row.idSource} introuvable en base`);
      continue;
    }

    const keywords = dedupeKeywords(row);
    const formulaEnabled = row.formulaEnabled === true;
    const generatedRules = [
      ...(() => {
        const keywordRule = buildKeywordRule(row.name, keywords);
        return keywordRule ? [keywordRule] : [];
      })(),
      ...translateFormulaToRules(row, warnings),
    ];

    if (generatedRules.length === 0) {
      if (formulaEnabled) {
        warnings.push(`ligne ${row.line}: formule active pour "${row.name}" mais aucune règle n'a pu être générée automatiquement`);
      }
      continue;
    }

    actions.push({
      line: row.line,
      thirdPartyIdSource: row.idSource,
      thirdPartyName: row.name,
      action: thirdParty.matchingRules.length > 0 ? 'replace' : 'create',
      keywords,
      formulaEnabled,
      generatedRules: generatedRules.length,
    });

    if (mode === 'apply') {
      await prisma.thirdParty.update({
        where: { id: thirdParty.id },
        data: {
          matchingRules: {
            deleteMany: {},
            create: generatedRules.map(rule => ({
              label: rule.label,
              description: rule.description,
              active: true,
              operator: rule.operator,
              stopOnMatch: false,
              conditions: {
                create: rule.conditions.map((condition, position) => ({
                  field: condition.field,
                  matcher: condition.matcher,
                  value: condition.value,
                  value2: condition.value2,
                  negate: condition.negate,
                  position,
                })),
              },
            })),
          },
        },
      });
    }
  }

  return {
    file: filePath,
    mode,
    totalRows: dataRows.filter(row => row.some(value => value !== '')).length,
    eligibleRows: actions.length,
    skippedRows: dataRows.filter(row => row.some(value => value !== '')).length - actions.length - errors.length,
    createCount: actions.filter(action => action.action === 'create').length,
    replaceCount: actions.filter(action => action.action === 'replace').length,
    actions,
    warnings,
    errors,
  };
}

function printReport(report: ImportReport) {
  console.log('');
  console.log('Import third-party matching rules legacy');
  console.log(`- fichier: ${report.file}`);
  console.log(`- mode: ${report.mode}`);
  console.log(`- lignes: ${report.totalRows}`);
  console.log(`- éligibles: ${report.eligibleRows}`);
  console.log(`- créations prévues: ${report.createCount}`);
  console.log(`- remplacements prévus: ${report.replaceCount}`);
  console.log(`- ignorées: ${report.skippedRows}`);
  console.log(`- erreurs: ${report.errors.length}`);

  if (report.actions.length > 0) {
    console.log('');
    console.log('Aperçu');
    for (const action of report.actions.slice(0, 15)) {
      console.log(
        `- ligne ${action.line}: ${action.action} règles pour tiers ${action.thirdPartyIdSource} "${action.thirdPartyName}"` +
        ` | mots-clés=${action.keywords.join(', ') || '—'}` +
        ` | règles=${action.generatedRules}`,
      );
    }
    if (report.actions.length > 15) {
      console.log(`- ... ${report.actions.length - 15} lignes supplémentaires`);
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
  console.error('Echec import third-party matching rules legacy');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
