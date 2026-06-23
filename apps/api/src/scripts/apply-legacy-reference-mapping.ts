import { PrismaClient } from '@moneyback/db';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

type MappingKind = 'groupings' | 'movement-types';
type Mode = 'preview' | 'apply';

type CliOptions = {
  kind: MappingKind;
  file: string;
  mode: Mode;
};

type CsvRow = Record<string, string>;

type MappingAction = {
  line: number;
  targetId: string;
  targetLabel: string;
  legacyIdSource: string;
  currentCode?: string | null;
};

function parseArgs(argv: string[]): CliOptions {
  let kind: MappingKind = 'groupings';
  let file = 'migration windev/templates/mapping_regroupements.csv';
  let mode: Mode = 'preview';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--kind') {
      const value = argv[i + 1];
      if (value === 'groupings' || value === 'movement-types') kind = value;
      i += 1;
      continue;
    }
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

  if (kind === 'movement-types' && file === 'migration windev/templates/mapping_regroupements.csv') {
    file = 'migration windev/templates/mapping_types_mouvement.csv';
  }

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

function parseSemicolonCsv(content: string): Array<{ line: number; row: CsvRow }> {
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
      if (currentRow.some(value => value !== '')) rows.push({ line: rowStartLine, values: currentRow });
      currentField = '';
      currentRow = [];
      line += 1;
      rowStartLine = line;
      continue;
    }
    if (char === '\n') line += 1;
    currentField += char;
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.replace(/\r/g, '').trim());
    if (currentRow.some(value => value !== '')) rows.push({ line: rowStartLine, values: currentRow });
  }

  if (rows.length === 0) return [];
  const firstRow = rows[0];
  if (!firstRow) return [];
  const header = firstRow.values;
  return rows.slice(1).map(item => ({
    line: item.line,
    row: Object.fromEntries(header.map((key, index) => [key, item.values[index] ?? ''])),
  }));
}

async function buildActions(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<{ actions: MappingAction[]; warnings: string[]; errors: string[] }> {
  const content = await readFile(resolveInputFile(options.file), 'utf-8');
  const rows = parseSemicolonCsv(content);
  const warnings: string[] = [];
  const errors: string[] = [];
  const actions: MappingAction[] = [];

  if (options.kind === 'groupings') {
    const groupings = await prisma.grouping.findMany({
      select: { id: true, label: true, idSource: true },
    });
    const byLabel = new Map(groupings.map(grouping => [grouping.label, grouping]));

    for (const item of rows) {
      const legacyId = item.row.legacy_id?.trim();
      const currentLabel = item.row.current_label?.trim();
      if (!legacyId || !currentLabel) continue;

      const target = byLabel.get(currentLabel);
      if (!target) {
        errors.push(`ligne ${item.line}: aucun regroupement trouvé pour "${currentLabel}"`);
        continue;
      }
      if (target.idSource && target.idSource !== legacyId) {
        warnings.push(`ligne ${item.line}: "${currentLabel}" a déjà idSource=${target.idSource}, remplacement prévu par ${legacyId}`);
      }
      actions.push({
        line: item.line,
        targetId: target.id,
        targetLabel: target.label,
        legacyIdSource: legacyId,
      });
    }
  } else {
    const movementTypes = await prisma.movementType.findMany({
      select: { id: true, label: true, code: true, idSource: true },
    });

    for (const item of rows) {
      const legacyId = item.row.legacy_id?.trim();
      const currentLabel = item.row.current_label?.trim();
      const currentCode = item.row.current_code?.trim() || null;
      if (!legacyId || !currentLabel) continue;

      const matches = movementTypes.filter(movementType =>
        movementType.label === currentLabel && (currentCode === null || movementType.code === currentCode),
      );

      if (matches.length === 0) {
        errors.push(`ligne ${item.line}: aucun type de mouvement trouvé pour "${currentLabel}"${currentCode ? ` / code ${currentCode}` : ''}`);
        continue;
      }
      if (matches.length > 1) {
        errors.push(`ligne ${item.line}: plusieurs types de mouvement correspondent à "${currentLabel}"${currentCode ? ` / code ${currentCode}` : ''}`);
        continue;
      }

      const target = matches[0];
      if (!target) {
        errors.push(`ligne ${item.line}: type de mouvement introuvable après filtrage`);
        continue;
      }
      if (target.idSource && target.idSource !== legacyId) {
        warnings.push(`ligne ${item.line}: "${currentLabel}" a déjà idSource=${target.idSource}, remplacement prévu par ${legacyId}`);
      }
      actions.push({
        line: item.line,
        targetId: target.id,
        targetLabel: target.label,
        currentCode: target.code,
        legacyIdSource: legacyId,
      });
    }
  }

  return { actions, warnings, errors };
}

async function applyActions(prisma: PrismaClient, kind: MappingKind, actions: MappingAction[]) {
  if (kind === 'groupings') {
    await prisma.$transaction(
      actions.map(action =>
        prisma.grouping.update({
          where: { id: action.targetId },
          data: { idSource: action.legacyIdSource },
        }),
      ),
    );
    return;
  }

  await prisma.$transaction(
    actions.map(action =>
      prisma.movementType.update({
        where: { id: action.targetId },
        data: { idSource: action.legacyIdSource },
      }),
    ),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const { actions, warnings, errors } = await buildActions(prisma, options);

    console.log('');
    console.log(`Mapping legacy ${options.kind}`);
    console.log(`- fichier: ${resolveInputFile(options.file)}`);
    console.log(`- mode: ${options.mode}`);
    console.log(`- actions: ${actions.length}`);
    console.log(`- warnings: ${warnings.length}`);
    console.log(`- erreurs: ${errors.length}`);

    if (actions.length > 0) {
      console.log('');
      console.log('Aperçu');
      for (const action of actions.slice(0, 20)) {
        console.log(
          `- ligne ${action.line}: ${action.targetLabel}${action.currentCode ? ` (${action.currentCode})` : ''} -> idSource=${action.legacyIdSource}`,
        );
      }
      if (actions.length > 20) console.log(`- ... ${actions.length - 20} actions supplémentaires`);
    }

    if (warnings.length > 0) {
      console.log('');
      console.log('Warnings');
      for (const warning of warnings.slice(0, 20)) console.log(`- ${warning}`);
      if (warnings.length > 20) console.log(`- ... ${warnings.length - 20} warnings supplémentaires`);
    }

    if (errors.length > 0) {
      console.log('');
      console.log('Erreurs');
      for (const error of errors.slice(0, 20)) console.log(`- ${error}`);
      if (errors.length > 20) console.log(`- ... ${errors.length - 20} erreurs supplémentaires`);
    }

    if (options.mode === 'apply' && errors.length === 0) {
      await applyActions(prisma, options.kind, actions);
      console.log('');
      console.log('Mise à jour appliquée.');
    }

    process.exitCode = errors.length > 0 ? 1 : 0;
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(error => {
  console.error('');
  console.error('Echec mapping références legacy');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
