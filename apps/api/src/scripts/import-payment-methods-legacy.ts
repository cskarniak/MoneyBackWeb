import { PrismaClient } from '@moneyback/db';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

type Mode = 'preview' | 'apply';

type CliOptions = {
  file: string;
  mode: Mode;
};

type ImportReport = {
  file: string;
  mode: Mode;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createCount: number;
  updateCount: number;
  actions: Array<{
    line: number;
    action: 'create' | 'update';
    idSource: string;
    label: string;
    details: string;
  }>;
  errors: string[];
};

const DEFAULT_FILE = 'migration windev/export_type de règlement.csv';
const EXPECTED_HEADER = ['MOP_ID', 'MOP_LIBELLE', 'MOP_CODE', 'MOT_MOTCLE'] as const;

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
      const value = argv[i + 1];
      if (value === 'preview' || value === 'apply') mode = value;
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

async function buildReport(prisma: PrismaClient, file: string, mode: Mode): Promise<ImportReport> {
  const filePath = resolveInputFile(file);
  const content = await readFile(filePath, { encoding: 'latin1' });
  const rows = parseSemicolonCsv(content);
  const [header = [], ...dataRows] = rows;
  validateHeader(header);

  const existing = await prisma.paymentMethod.findMany({ select: { id: true, idSource: true } });
  const existingByIdSource = new Map(
    existing.filter(item => item.idSource).map(item => [item.idSource as string, item.id]),
  );

  const actions: ImportReport['actions'] = [];
  const errors: string[] = [];

  for (let index = 0; index < dataRows.length; index += 1) {
    const line = index + 2;
    const row = dataRows[index] ?? [];
    try {
      const idSource = normalizeText(row[0]);
      const label = normalizeText(row[1]);
      const code = normalizeText(row[2]);
      const keyword = normalizeText(row[3]);

      if (!idSource) throw new Error('MOP_ID obligatoire');
      if (!/^\d+$/.test(idSource)) throw new Error(`MOP_ID illisible: "${idSource}"`);
      if (!label) throw new Error('MOP_LIBELLE obligatoire');

      const action = existingByIdSource.has(idSource) ? 'update' as const : 'create' as const;

      actions.push({
        line,
        action,
        idSource,
        label,
        details: `code=${code ?? 'null'}${keyword ? ` | motCle=${keyword}` : ''}`,
      });

      if (mode === 'apply') {
        const data = {
          label,
          code,
          idSource,
          active: true,
        };
        const existingId = existingByIdSource.get(idSource);
        if (existingId) {
          await prisma.paymentMethod.update({
            where: { id: existingId },
            data,
          });
        } else {
          await prisma.paymentMethod.create({ data });
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
    errors,
  };
}

function printReport(report: ImportReport) {
  console.log('');
  console.log('Import payment methods legacy');
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
      console.log(`- ligne ${item.line}: ${item.action} moyen ${item.idSource} "${item.label}" | ${item.details}`);
    }
    if (report.actions.length > 15) {
      console.log(`- ... ${report.actions.length - 15} lignes supplémentaires`);
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
  console.error('Echec import payment methods legacy');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
