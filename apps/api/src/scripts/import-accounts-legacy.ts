import { PrismaClient } from '@moneyback/db';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

type Mode = 'preview' | 'apply';

type CliOptions = {
  file: string;
  mode: Mode;
};

type LegacyAccountRow = {
  line: number;
  idSource: string | null;
  name: string | null;
  agency: string | null;
  counter: string | null;
  number: string | null;
  rib: string | null;
  syncDate: Date | null;
  closureDate: Date | null;
  closureBalance: string | null;
  lastStatementRef: string | null;
  closed: boolean | null;
  comment: string | null;
  bankUrl: string | null;
  bankLogin: string | null;
  calculatedBalance: string | null;
  managedForOther: boolean | null;
};

type ImportAction = {
  line: number;
  action: 'create' | 'update';
  matching: 'idSource' | 'name';
  idSource: string;
  name: string;
  details: string;
};

type ImportReport = {
  file: string;
  mode: Mode;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createCount: number;
  updateCount: number;
  actions: ImportAction[];
  warnings: string[];
  errors: string[];
};

const DEFAULT_FILE = 'migration windev/export_compte.csv';
const EXPECTED_HEADER = [
  'CPT_ID',
  'CPT_NOM',
  'CPT_AGENCE',
  'CPT_GUICHET',
  'CPT_COMPTE',
  'CPT_RIB',
  'CPT_DaTE_SYNCHRO',
  'CPT_Date_Cloture',
  'CPT_Solde_Cloture',
  'CPT_Date_Rapprochement',
  'CPT_Reférence_Rapprochement',
  'CPT_Solde_Départ_Rapprochement',
  'CPT_Solde_Final_Rapprochement',
  'CPT_Rapprochementencours',
  'CPT_REference_dernierReleve',
  'CPT_FERME',
  'CPT_COMMENTAIRE',
  'CPT_URL_SITE',
  'CPT_Identifiant',
  'CPT_SOLDE_CALCULE',
  'CPT_CompteGerePourAutrui',
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

function validateHeader(header: string[]) {
  const sameLength = header.length === EXPECTED_HEADER.length;
  const sameValues = sameLength && header.every((value, index) => value === EXPECTED_HEADER[index]);

  if (!sameValues) {
    throw new Error(`En-tête inattendu. Reçu: ${JSON.stringify(header)}`);
  }
}

function normalizeText(value: string | undefined) {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function parseBoolean01(value: string | null) {
  if (value === null) return null;
  if (value === '1') return true;
  if (value === '0') return false;
  throw new Error(`booléen illisible: "${value}"`);
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

function parseLegacySourceId(value: string | null) {
  if (value === null) return null;
  if (!/^\d+$/.test(value)) {
    throw new Error(`identifiant source illisible: "${value}"`);
  }
  return value;
}

function normalizeRow(values: string[], line: number): LegacyAccountRow {
  return {
    line,
    idSource: parseLegacySourceId(normalizeText(values[0])),
    name: normalizeText(values[1]),
    agency: normalizeText(values[2]),
    counter: normalizeText(values[3]),
    number: normalizeText(values[4]),
    rib: normalizeText(values[5]),
    syncDate: parseDateFr(normalizeText(values[6])),
    closureDate: parseDateFr(normalizeText(values[7])),
    closureBalance: parseDecimal(normalizeText(values[8])),
    lastStatementRef: normalizeText(values[14]),
    closed: parseBoolean01(normalizeText(values[15])),
    comment: normalizeText(values[16]),
    bankUrl: normalizeText(values[17]),
    bankLogin: normalizeText(values[18]),
    calculatedBalance: parseDecimal(normalizeText(values[19])),
    managedForOther: parseBoolean01(normalizeText(values[20])),
  };
}

async function buildReport(prisma: PrismaClient, file: string, mode: Mode): Promise<ImportReport> {
  const filePath = resolveInputFile(file);
  const content = await readFile(filePath, { encoding: 'latin1' });
  const rows = parseSemicolonCsv(content);
  const [header = [], ...dataRows] = rows;
  validateHeader(header);

  const existingAccounts = await prisma.account.findMany({
    select: { id: true, idSource: true, name: true },
  });

  const existingByIdSource = new Map(
    existingAccounts
      .filter((item): item is { id: string; idSource: string; name: string } => item.idSource !== null)
      .map(item => [item.idSource, item]),
  );

  const existingByNormalizedName = new Map<string, Array<{ id: string; idSource: string | null; name: string }>>();
  for (const account of existingAccounts) {
    const key = normalizeName(account.name);
    const items = existingByNormalizedName.get(key) ?? [];
    items.push(account);
    existingByNormalizedName.set(key, items);
  }

  const actions: ImportAction[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (let index = 0; index < dataRows.length; index += 1) {
    const line = index + 2;
    const row = dataRows[index] ?? [];

    try {
      const normalized = normalizeRow(row, line);

      if (!normalized.idSource) throw new Error('CPT_ID obligatoire');
      if (!normalized.name) throw new Error('CPT_NOM obligatoire');

      let targetId: string | null = null;
      let action: 'create' | 'update' = 'create';
      let matching: 'idSource' | 'name' = 'idSource';

      const existingBySource = existingByIdSource.get(normalized.idSource);
      if (existingBySource) {
        targetId = existingBySource.id;
        action = 'update';
      } else {
        const nameMatches = (existingByNormalizedName.get(normalizeName(normalized.name)) ?? []).filter(item => item.idSource === null);
        if (nameMatches.length === 1) {
          targetId = nameMatches[0]?.id ?? null;
          action = 'update';
          matching = 'name';
          warnings.push(`ligne ${line}: compte "${normalized.name}" réutilisé par nom pour définir idSource=${normalized.idSource}`);
        } else if (nameMatches.length > 1) {
          throw new Error(`plusieurs comptes existants sans idSource portent déjà le nom "${normalized.name}"`);
        }
      }

      if (normalized.calculatedBalance !== null && normalized.calculatedBalance !== '0' && normalized.calculatedBalance !== '0.000000') {
        warnings.push(`ligne ${line}: CPT_SOLDE_CALCULE présent pour "${normalized.name}" mais non importé en V1`);
      }

      actions.push({
        line,
        action,
        matching,
        idSource: normalized.idSource,
        name: normalized.name,
        details:
          `agence=${normalized.agency ?? 'null'} | compte=${normalized.number ?? 'null'} | ferme=${normalized.closed ? 'oui' : 'non'}`,
      });

      if (mode === 'apply') {
        const data = {
          idSource: normalized.idSource,
          name: normalized.name,
          agency: normalized.agency,
          counter: normalized.counter,
          number: normalized.number,
          rib: normalized.rib,
          syncDate: normalized.syncDate,
          closureDate: normalized.closureDate,
          closureBalance: normalized.closureBalance,
          lastStatementRef: normalized.lastStatementRef,
          comment: normalized.comment,
          bankUrl: normalized.bankUrl,
          bankLogin: normalized.bankLogin,
          openingBalance: null,
          managedForOther: normalized.managedForOther ?? false,
          closed: normalized.closed ?? false,
        };

        if (targetId) {
          await prisma.account.update({
            where: { id: targetId },
            data,
          });
        } else {
          await prisma.account.create({ data });
        }
      }
    } catch (error) {
      errors.push(`ligne ${line}: ${(error as Error).message}`);
    }
  }

  return {
    file: filePath,
    mode,
    totalRows: dataRows.length,
    validRows: actions.length,
    errorRows: errors.length,
    createCount: actions.filter(item => item.action === 'create').length,
    updateCount: actions.filter(item => item.action === 'update').length,
    actions,
    warnings,
    errors,
  };
}

function printReport(report: ImportReport) {
  console.log('');
  console.log('Import accounts legacy');
  console.log(`- fichier: ${report.file}`);
  console.log(`- mode: ${report.mode}`);
  console.log(`- lignes: ${report.totalRows}`);
  console.log(`- valides: ${report.validRows}`);
  console.log(`- erreurs: ${report.errorRows}`);
  console.log(`- créations prévues: ${report.createCount}`);
  console.log(`- mises à jour prévues: ${report.updateCount}`);

  if (report.actions.length > 0) {
    console.log('');
    console.log('Aperçu');
    for (const item of report.actions.slice(0, 15)) {
      console.log(
        `- ligne ${item.line}: ${item.action} compte ${item.idSource} "${item.name}" | match=${item.matching} | ${item.details}`,
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
    const report = await buildReport(prisma, options.file, options.mode);
    printReport(report);

    if (options.mode === 'apply' && report.errors.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(error => {
  console.error('Echec import comptes legacy');
  console.error(error);
  process.exitCode = 1;
});
