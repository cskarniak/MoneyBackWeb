import { PrismaClient } from '@moneyback/db';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

type Kind = 'groupings' | 'movement-types';
type Mode = 'preview' | 'apply';

type CliOptions = {
  kind: Kind;
  file: string;
  mode: Mode;
};

type ParsedCsv = {
  header: string[];
  rows: string[][];
};

type PreviewAction = {
  line: number;
  action: 'create' | 'update';
  idSource: string;
  label: string;
  details: string;
};

type ImportReport = {
  file: string;
  kind: Kind;
  mode: Mode;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createCount: number;
  updateCount: number;
  actions: PreviewAction[];
  errors: string[];
};

const DEFAULT_FILES: Record<Kind, string> = {
  groupings: 'migration windev/export_regroupements.csv',
  'movement-types': 'migration windev/export type mouvement.csv',
};

function parseArgs(argv: string[]): CliOptions {
  let kind: Kind = 'groupings';
  let mode: Mode = 'preview';
  let file = DEFAULT_FILES.groupings;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--kind') {
      const value = argv[i + 1];
      if (value === 'groupings' || value === 'movement-types') kind = value;
      i += 1;
      continue;
    }
    if (arg === '--mode') {
      const value = argv[i + 1];
      if (value === 'preview' || value === 'apply') mode = value;
      i += 1;
      continue;
    }
    if (arg === '--file') {
      file = argv[i + 1] ?? file;
      i += 1;
    }
  }

  if (file === DEFAULT_FILES.groupings) file = DEFAULT_FILES[kind];

  return { kind, file, mode };
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

function detectEncoding(filePath: string): 'utf8' | 'latin1' {
  const lower = filePath.toLowerCase();
  if (lower.includes('type mouvement')) return 'utf8';
  return 'latin1';
}

function parseSemicolonCsv(content: string): ParsedCsv {
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

  const [header = [], ...dataRows] = rows;
  return { header, rows: dataRows };
}

function asRecord(header: string[], row: string[]) {
  return Object.fromEntries(header.map((key, index) => [key, row[index] ?? '']));
}

function parseBoolean01(value: string, field: string) {
  if (value === '1') return true;
  if (value === '0') return false;
  throw new Error(`${field} illisible: "${value}"`);
}

async function buildGroupingReport(prisma: PrismaClient, file: string, mode: Mode): Promise<ImportReport> {
  const filePath = resolveInputFile(file);
  const content = await readFile(filePath, detectEncoding(filePath));
  const parsed = parseSemicolonCsv(content);
  const existing = await prisma.grouping.findMany({ select: { id: true, idSource: true } });
  const existingByIdSource = new Map(
    existing.filter(item => item.idSource).map(item => [item.idSource as string, item.id]),
  );

  const actions: PreviewAction[] = [];
  const errors: string[] = [];

  for (let index = 0; index < parsed.rows.length; index += 1) {
    const line = index + 2;
    const rowValues = parsed.rows[index];
    if (!rowValues) {
      errors.push(`ligne ${line}: ligne CSV introuvable`);
      continue;
    }
    const row = asRecord(parsed.header, rowValues);

    try {
      const idSource = row.CAR_ID?.trim();
      const label = row.CAR_LIBELLE?.trim();
      if (!idSource) throw new Error('CAR_ID obligatoire');
      if (!label) throw new Error('CAR_LIBELLE obligatoire');

      const expense = parseBoolean01((row.CAT_TYPE_POSTE ?? '').trim(), 'CAT_TYPE_POSTE');
      const income = parseBoolean01((row.CAT_TYPE_CATEGORIE ?? '').trim(), 'CAT_TYPE_CATEGORIE');
      const dashboard = parseBoolean01((row.CAR_TYPE_TB ?? '').trim(), 'CAR_TYPE_TB');
      const dashboardType = dashboard ? idSource : null;

      actions.push({
        line,
        action: existingByIdSource.has(idSource) ? 'update' : 'create',
        idSource,
        label,
        details: `catégorie=${income ? 'oui' : 'non'} | poste=${expense ? 'oui' : 'non'} | tableau=${dashboard ? 'oui' : 'non'}${dashboardType ? ` | type_tableau_bord=${dashboardType}` : ''}`,
      });

      if (mode === 'apply') {
        await prisma.grouping.upsert({
          where: { id: existingByIdSource.get(idSource) ?? '__missing__' },
          update: {
            label,
            idSource,
            expense,
            income,
            dashboard,
            dashboardType,
          },
          create: {
            label,
            idSource,
            expense,
            income,
            dashboard,
            dashboardType,
          },
        }).catch(async error => {
          if (existingByIdSource.has(idSource)) throw error;
          await prisma.grouping.create({
            data: { label, idSource, expense, income, dashboard, dashboardType },
          });
        });
      }
    } catch (error) {
      errors.push(`ligne ${line}: ${(error as Error).message}`);
    }
  }

  return {
    file: filePath,
    kind: 'groupings',
    mode,
    totalRows: parsed.rows.length,
    validRows: actions.length,
    errorRows: errors.length,
    createCount: actions.filter(action => action.action === 'create').length,
    updateCount: actions.filter(action => action.action === 'update').length,
    actions,
    errors,
  };
}

async function buildMovementTypeReport(prisma: PrismaClient, file: string, mode: Mode): Promise<ImportReport> {
  const filePath = resolveInputFile(file);
  const content = await readFile(filePath, detectEncoding(filePath));
  const parsed = parseSemicolonCsv(content);
  const existing = await prisma.movementType.findMany({ select: { id: true, idSource: true } });
  const existingByIdSource = new Map(
    existing.filter(item => item.idSource).map(item => [item.idSource as string, item.id]),
  );

  const actions: PreviewAction[] = [];
  const errors: string[] = [];

  for (let index = 0; index < parsed.rows.length; index += 1) {
    const line = index + 2;
    const rowValues = parsed.rows[index];
    if (!rowValues) {
      errors.push(`ligne ${line}: ligne CSV introuvable`);
      continue;
    }
    const row = asRecord(parsed.header, rowValues);

    try {
      const idSource = row.TYM_ID?.trim();
      const label = row.TYM_Libelle?.trim();
      const code = row.TYM_Code?.trim() || null;
      if (!idSource) throw new Error('TYM_ID obligatoire');
      if (!label) throw new Error('TYM_Libelle obligatoire');

      actions.push({
        line,
        action: existingByIdSource.has(idSource) ? 'update' : 'create',
        idSource,
        label,
        details: `code=${code ?? '—'}`,
      });

      if (mode === 'apply') {
        await prisma.movementType.upsert({
          where: { id: existingByIdSource.get(idSource) ?? '__missing__' },
          update: {
            label,
            code,
            idSource,
            active: true,
          },
          create: {
            label,
            code,
            idSource,
            active: true,
          },
        }).catch(async error => {
          if (existingByIdSource.has(idSource)) throw error;
          await prisma.movementType.create({
            data: { label, code, idSource, active: true },
          });
        });
      }
    } catch (error) {
      errors.push(`ligne ${line}: ${(error as Error).message}`);
    }
  }

  return {
    file: filePath,
    kind: 'movement-types',
    mode,
    totalRows: parsed.rows.length,
    validRows: actions.length,
    errorRows: errors.length,
    createCount: actions.filter(action => action.action === 'create').length,
    updateCount: actions.filter(action => action.action === 'update').length,
    actions,
    errors,
  };
}

function printReport(report: ImportReport) {
  console.log('');
  console.log(`Import legacy ${report.kind}`);
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
    for (const action of report.actions.slice(0, 20)) {
      console.log(`- ligne ${action.line}: ${action.action} ${action.idSource} "${action.label}" | ${action.details}`);
    }
    if (report.actions.length > 20) {
      console.log(`- ... ${report.actions.length - 20} lignes supplémentaires`);
    }
  }

  if (report.errors.length > 0) {
    console.log('');
    console.log('Erreurs');
    for (const error of report.errors.slice(0, 20)) console.log(`- ${error}`);
    if (report.errors.length > 20) console.log(`- ... ${report.errors.length - 20} erreurs supplémentaires`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    const report =
      options.kind === 'groupings'
        ? await buildGroupingReport(prisma, options.file, options.mode)
        : await buildMovementTypeReport(prisma, options.file, options.mode);
    printReport(report);
    process.exitCode = report.errors.length > 0 ? 1 : 0;
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(error => {
  console.error('');
  console.error('Echec import legacy references');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
