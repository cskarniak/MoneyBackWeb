import { PrismaClient } from '@moneyback/db';
import { Periodicity, SubscriptionType } from '@moneyback/shared';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

type Mode = 'preview' | 'apply';

type CliOptions = {
  subscriptionsFile: string;
  splitsFile: string;
  mode: Mode;
};

type LegacySubscriptionRow = {
  line: number;
  idSource: string | null;
  label: string | null;
  periodicityCode: string | null;
  firstDueDate: Date | null;
  endDate: Date | null;
  templateOperationSourceId: string | null;
  budgetSourceId: string | null;
  thirdPartySourceId: string | null;
  categorySourceId: string | null;
  accountSourceId: string | null;
  lastDueDateRaw: string | null;
  lastGeneratedDate: Date | null;
  generatedOperationLegacyValue: string | null;
  expense: string | null;
  entryLabel: string | null;
  dayOfPeriod: number | null;
  nextDueDate: Date | null;
  lastGeneratedDueDate: Date | null;
  income: string | null;
  hasSplits: boolean | null;
  subscriptionTypeCode: string | null;
  planned: boolean | null;
  movementTypeSourceId: string | null;
  active: boolean | null;
};

type LegacySubscriptionSplitRow = {
  line: number;
  idSource: string | null;
  label: string | null;
  expense: string | null;
  income: string | null;
  subscriptionSourceId: string | null;
  budgetSourceId: string | null;
  categorySourceId: string | null;
  balance: string | null;
};

type ResolvedSubscriptionSplitRow = {
  idSource: string;
  label: string | null;
  expense: string;
  income: string;
  balance: string | null;
  budgetId: string | null;
  categoryId: string | null;
};

type ResolvedSubscriptionRow = {
  line: number;
  idSource: string;
  label: string;
  periodicity: string;
  firstDueDate: Date;
  nextDueDate: Date | null;
  endDate: Date | null;
  lastGeneratedDate: Date | null;
  lastGeneratedDueDate: Date | null;
  expense: string;
  income: string;
  entryLabel: string | null;
  dayOfPeriod: number | null;
  hasSplits: boolean;
  subscriptionType: string;
  active: boolean;
  accountId: string;
  budgetId: string | null;
  thirdPartyId: string | null;
  categoryId: string | null;
  movementTypeId: string | null;
  action: 'create' | 'update';
  splits: ResolvedSubscriptionSplitRow[];
};

type PreviewItem = {
  line: number;
  subscriptionIdSource: string;
  label: string;
  action: 'create' | 'update';
  accountSourceId: string | null;
  budgetSourceId: string | null;
  categorySourceId: string | null;
  thirdPartySourceId: string | null;
  movementTypeSourceId: string | null;
  periodicity: string;
  splitCount: number;
};

type ImportReport = {
  subscriptionsFile: string;
  splitsFile: string;
  mode: Mode;
  totalSubscriptions: number;
  validSubscriptions: number;
  errorSubscriptions: number;
  createSubscriptionCount: number;
  updateSubscriptionCount: number;
  totalSplits: number;
  validSplits: number;
  errorSplits: number;
  previewItems: PreviewItem[];
  warnings: string[];
  errors: string[];
  notes: string[];
};

const DEFAULT_SUBSCRIPTIONS_FILE = 'migration windev/export_abonnement.csv';
const DEFAULT_SPLITS_FILE = 'migration windev/export_abonnement_ventilé.csv';

const EXPECTED_SUBSCRIPTIONS_HEADER = [
  'ABO_ID',
  'ABO_LIBELLE',
  'ABO_PERIODICITE',
  'ABO_DatePremiereEcheance',
  'ABO_DateFin',
  'OPE_ID',
  'BUD_ID',
  'TIE_ID',
  'CAT_ID',
  'CPT_ID',
  'ABO_DateDerniereEcheance',
  'ABO_DateDerniereGénération',
  'ABO_OPerationGeneree',
  'ABO_Depense',
  'ABO_LibelleEcriture',
  'ABO_Jour',
  'ABO_DateProchaineEcheance',
  'ABO_DatederniereEcheanceGeneree',
  'ABO_Recette',
  'ABO_Ventile',
  'ABO_TYPE',
  'ABO_Plannifie',
  'ABO_TYM_ID',
  'ABO_Actif',
] as const;

const EXPECTED_SPLITS_HEADER = [
  'OVT_ID',
  'OVT_LIBELLE',
  'OVT_DEPENSE',
  'OVT_RECETTE',
  'ABO_ID',
  'BUD_ID',
  'CAT_ID',
  'OVT_SOLDE',
] as const;

function parseArgs(argv: string[]): CliOptions {
  let subscriptionsFile = DEFAULT_SUBSCRIPTIONS_FILE;
  let splitsFile = DEFAULT_SPLITS_FILE;
  let mode: Mode = 'preview';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--subscriptions-file') {
      subscriptionsFile = argv[index + 1] ?? subscriptionsFile;
      index += 1;
      continue;
    }
    if (arg === '--splits-file') {
      splitsFile = argv[index + 1] ?? splitsFile;
      index += 1;
      continue;
    }
    if (arg === '--mode') {
      const candidate = argv[index + 1];
      if (candidate === 'preview' || candidate === 'apply') mode = candidate;
      index += 1;
    }
  }

  return { subscriptionsFile, splitsFile, mode };
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

function parseLegacySourceId(value: string | null, { zeroIsNull = true }: { zeroIsNull?: boolean } = {}) {
  if (value === null) return null;
  const normalized = value.replace(/\s+/g, '');
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

function parseLegacyDecimal(value: string | null) {
  if (value === null) return null;
  const normalized = value.replace(/\s+/g, '').replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error(`décimal illisible: "${value}"`);
  }
  return normalized;
}

function parseLegacyInteger(value: string | null, { zeroIsNull = false }: { zeroIsNull?: boolean } = {}) {
  if (value === null || value === '') return null;
  if (zeroIsNull && value === '0') return null;
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`entier illisible: "${value}"`);
  }
  return Number(value);
}

function parseLegacyDate(value: string | null) {
  if (value === null) return null;

  const fr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (fr) {
    const [, day, month, year] = fr;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (compact) {
    const [, year, month, day] = compact;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  throw new Error(`date illisible: "${value}"`);
}

function normalizeSubscriptionRow(values: string[], line: number): LegacySubscriptionRow {
  return {
    line,
    idSource: parseLegacySourceId(normalizeText(values[0]), { zeroIsNull: false }),
    label: normalizeText(values[1]),
    periodicityCode: normalizeText(values[2]),
    firstDueDate: parseLegacyDate(normalizeText(values[3])),
    endDate: parseLegacyDate(normalizeText(values[4])),
    templateOperationSourceId: parseLegacySourceId(normalizeText(values[5])),
    budgetSourceId: parseLegacySourceId(normalizeText(values[6])),
    thirdPartySourceId: parseLegacySourceId(normalizeText(values[7])),
    categorySourceId: parseLegacySourceId(normalizeText(values[8])),
    accountSourceId: parseLegacySourceId(normalizeText(values[9]), { zeroIsNull: false }),
    lastDueDateRaw: normalizeText(values[10]),
    lastGeneratedDate: parseLegacyDate(normalizeText(values[11])),
    generatedOperationLegacyValue: normalizeText(values[12]),
    expense: parseLegacyDecimal(normalizeText(values[13])),
    entryLabel: normalizeText(values[14]),
    dayOfPeriod: parseLegacyInteger(normalizeText(values[15]), { zeroIsNull: true }),
    nextDueDate: parseLegacyDate(normalizeText(values[16])),
    lastGeneratedDueDate: parseLegacyDate(normalizeText(values[17])),
    income: parseLegacyDecimal(normalizeText(values[18])),
    hasSplits: parseBoolean01(normalizeText(values[19])),
    subscriptionTypeCode: normalizeText(values[20]),
    planned: parseBoolean01(normalizeText(values[21])),
    movementTypeSourceId: parseLegacySourceId(normalizeText(values[22])),
    active: parseBoolean01(normalizeText(values[23])),
  };
}

function normalizeSplitRow(values: string[], line: number): LegacySubscriptionSplitRow {
  return {
    line,
    idSource: parseLegacySourceId(normalizeText(values[0]), { zeroIsNull: false }),
    label: normalizeText(values[1]),
    expense: parseLegacyDecimal(normalizeText(values[2])),
    income: parseLegacyDecimal(normalizeText(values[3])),
    subscriptionSourceId: parseLegacySourceId(normalizeText(values[4]), { zeroIsNull: false }),
    budgetSourceId: parseLegacySourceId(normalizeText(values[5])),
    categorySourceId: parseLegacySourceId(normalizeText(values[6])),
    balance: parseLegacyDecimal(normalizeText(values[7])),
  };
}

function buildMap<T extends { id: string; idSource: string | null }>(items: T[]) {
  return new Map(
    items
      .filter((item): item is T & { idSource: string } => item.idSource !== null)
      .map(item => [item.idSource, item.id]),
  );
}

function mapLegacyPeriodicity(code: string | null) {
  switch (code) {
    case '1':
      return Periodicity.DAILY;
    case '2':
      return Periodicity.WEEKLY;
    case '3':
      return Periodicity.MONTHLY;
    case '4':
      return Periodicity.BIMONTHLY;
    case '5':
      return Periodicity.QUARTERLY;
    case '6':
      return Periodicity.SEMIANNUAL;
    case '7':
      return Periodicity.ANNUAL;
    default:
      throw new Error(`ABO_PERIODICITE inconnue: "${code}"`);
  }
}

function mapLegacySubscriptionType(code: string | null) {
  switch (code) {
    case null:
    case '1':
      return SubscriptionType.REAL;
    case '2':
      return SubscriptionType.SIMULATION;
    default:
      throw new Error(`ABO_TYPE inconnu: "${code}"`);
  }
}

async function hasColumn(prisma: PrismaClient, tableName: string, columnName: string) {
  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
  `;

  return columns.some(column => column.column_name === columnName);
}

async function buildReport(prisma: PrismaClient, options: CliOptions): Promise<ImportReport> {
  const subscriptionsPath = resolveInputFile(options.subscriptionsFile);
  const splitsPath = resolveInputFile(options.splitsFile);

  const [subscriptionsContent, splitsContent] = await Promise.all([
    readFile(subscriptionsPath, { encoding: 'latin1' }),
    readFile(splitsPath, { encoding: 'latin1' }),
  ]);

  const subscriptionRows = parseSemicolonCsv(subscriptionsContent);
  const splitRows = parseSemicolonCsv(splitsContent);
  const [subscriptionHeader = [], ...subscriptionDataRows] = subscriptionRows;
  const [splitHeader = [], ...splitDataRows] = splitRows;
  validateHeader(subscriptionHeader, EXPECTED_SUBSCRIPTIONS_HEADER);
  validateHeader(splitHeader, EXPECTED_SPLITS_HEADER);

  const subscriptionIdSourceAvailable = await hasColumn(prisma, 'abonnements', 'id_source');

  const [
    accounts,
    budgets,
    categories,
    thirdParties,
    movementTypes,
  ] = await Promise.all([
    prisma.account.findMany({ select: { id: true, idSource: true } }),
    prisma.budget.findMany({ select: { id: true, idSource: true } }),
    prisma.category.findMany({ select: { id: true, idSource: true } }),
    prisma.thirdParty.findMany({ select: { id: true, idSource: true } }),
    prisma.movementType.findMany({ select: { id: true, idSource: true } }),
  ]);

  const existingSubscriptions = subscriptionIdSourceAvailable
    ? await prisma.subscription.findMany({ select: { id: true, idSource: true } })
    : [];

  const accountMap = buildMap(accounts);
  const budgetMap = buildMap(budgets);
  const categoryMap = buildMap(categories);
  const thirdPartyMap = buildMap(thirdParties);
  const movementTypeMap = buildMap(movementTypes);
  const existingSubscriptionMap = buildMap(existingSubscriptions);

  const warnings: string[] = [];
  const errors: string[] = [];
  const notes = [
    "OPE_ID n'est pas importé en V1 sur les abonnements.",
    "ABO_OPerationGeneree et ABO_Plannifie sont ignorés en V1.",
  ];
  if (!subscriptionIdSourceAvailable) {
    notes.push('La colonne abonnements.id_source est absente en base: le preview considère tous les abonnements comme des créations.');
  }

  const splitRowsBySubscription = new Map<string, LegacySubscriptionSplitRow[]>();

  for (let index = 0; index < splitDataRows.length; index += 1) {
    const line = index + 2;
    const values = splitDataRows[index] ?? [];
    if (!values.some(value => value !== '')) continue;

    try {
      const row = normalizeSplitRow(values, line);
      if (!row.idSource) throw new Error('OVT_ID obligatoire');
      if (!row.subscriptionSourceId) throw new Error('ABO_ID obligatoire');

      const bucket = splitRowsBySubscription.get(row.subscriptionSourceId) ?? [];
      bucket.push(row);
      splitRowsBySubscription.set(row.subscriptionSourceId, bucket);
    } catch (error) {
      errors.push(`ventilation ligne ${line}: ${(error as Error).message}`);
    }
  }

  const resolvedSubscriptions: ResolvedSubscriptionRow[] = [];
  const previewItems: PreviewItem[] = [];

  for (let index = 0; index < subscriptionDataRows.length; index += 1) {
    const line = index + 2;
    const values = subscriptionDataRows[index] ?? [];
    if (!values.some(value => value !== '')) continue;

    try {
      const row = normalizeSubscriptionRow(values, line);
      if (!row.idSource) throw new Error('ABO_ID obligatoire');
      if (!row.label) throw new Error('ABO_LIBELLE obligatoire');
      if (!row.firstDueDate) throw new Error('ABO_DatePremiereEcheance obligatoire');
      if (!row.accountSourceId) throw new Error('CPT_ID obligatoire');

      const accountId = accountMap.get(row.accountSourceId);
      if (!accountId) throw new Error(`compte introuvable pour CPT_ID=${row.accountSourceId}`);

      const budgetId = row.budgetSourceId ? budgetMap.get(row.budgetSourceId) : null;
      if (row.budgetSourceId && !budgetId) throw new Error(`budget introuvable pour BUD_ID=${row.budgetSourceId}`);

      const categoryId = row.categorySourceId ? categoryMap.get(row.categorySourceId) : null;
      if (row.categorySourceId && !categoryId) throw new Error(`catégorie introuvable pour CAT_ID=${row.categorySourceId}`);

      const thirdPartyId = row.thirdPartySourceId ? thirdPartyMap.get(row.thirdPartySourceId) : null;
      if (row.thirdPartySourceId && !thirdPartyId) throw new Error(`tiers introuvable pour TIE_ID=${row.thirdPartySourceId}`);

      const movementTypeId = row.movementTypeSourceId ? movementTypeMap.get(row.movementTypeSourceId) : null;
      if (row.movementTypeSourceId && !movementTypeId) throw new Error(`type de mouvement introuvable pour ABO_TYM_ID=${row.movementTypeSourceId}`);

      if (row.templateOperationSourceId) {
        warnings.push(`abonnement ligne ${line}: OPE_ID=${row.templateOperationSourceId} ignoré en V1`);
      }
      if (row.generatedOperationLegacyValue && row.generatedOperationLegacyValue !== '0') {
        warnings.push(`abonnement ligne ${line}: ABO_OPerationGeneree=${row.generatedOperationLegacyValue} ignoré en V1`);
      }
      if (row.planned) {
        warnings.push(`abonnement ligne ${line}: ABO_Plannifie=1 ignoré en V1`);
      }
      if (row.lastDueDateRaw) {
        warnings.push(`abonnement ligne ${line}: ABO_DateDerniereEcheance="${row.lastDueDateRaw}" non exploité en V1`);
      }

      const legacySplits = splitRowsBySubscription.get(row.idSource) ?? [];
      const resolvedSplits = legacySplits.map(split => {
        const splitBudgetId = split.budgetSourceId ? budgetMap.get(split.budgetSourceId) : null;
        if (split.budgetSourceId && !splitBudgetId) {
          throw new Error(`budget introuvable pour BUD_ID=${split.budgetSourceId} (ventilation)`);
        }

        const splitCategoryId = split.categorySourceId ? categoryMap.get(split.categorySourceId) : null;
        if (split.categorySourceId && !splitCategoryId) {
          throw new Error(`catégorie introuvable pour CAT_ID=${split.categorySourceId} (ventilation)`);
        }

        return {
          idSource: split.idSource as string,
          label: split.label,
          expense: split.expense ?? '0',
          income: split.income ?? '0',
          balance: split.balance,
          budgetId: splitBudgetId ?? null,
          categoryId: splitCategoryId ?? null,
        };
      });

      if ((row.hasSplits ?? false) && resolvedSplits.length === 0) {
        warnings.push(`abonnement ligne ${line}: ABO_Ventile=1 mais aucune ventilation trouvée`);
      }

      const resolvedRow: ResolvedSubscriptionRow = {
        line,
        idSource: row.idSource,
        label: row.label,
        periodicity: mapLegacyPeriodicity(row.periodicityCode),
        firstDueDate: row.firstDueDate,
        nextDueDate: row.nextDueDate ?? row.firstDueDate,
        endDate: row.endDate,
        lastGeneratedDate: row.lastGeneratedDate,
        lastGeneratedDueDate: row.lastGeneratedDueDate,
        expense: row.expense ?? '0',
        income: row.income ?? '0',
        entryLabel: row.entryLabel,
        dayOfPeriod: row.dayOfPeriod,
        hasSplits: resolvedSplits.length > 0,
        subscriptionType: mapLegacySubscriptionType(row.subscriptionTypeCode),
        active: row.active ?? true,
        accountId,
        budgetId: budgetId ?? null,
        thirdPartyId: thirdPartyId ?? null,
        categoryId: categoryId ?? null,
        movementTypeId: movementTypeId ?? null,
        action: existingSubscriptionMap.has(row.idSource) ? 'update' : 'create',
        splits: resolvedSplits,
      };

      resolvedSubscriptions.push(resolvedRow);
      previewItems.push({
        line,
        subscriptionIdSource: row.idSource,
        label: row.label,
        action: resolvedRow.action,
        accountSourceId: row.accountSourceId,
        budgetSourceId: row.budgetSourceId,
        categorySourceId: row.categorySourceId,
        thirdPartySourceId: row.thirdPartySourceId,
        movementTypeSourceId: row.movementTypeSourceId,
        periodicity: resolvedRow.periodicity,
        splitCount: resolvedSplits.length,
      });
    } catch (error) {
      errors.push(`abonnement ligne ${line}: ${(error as Error).message}`);
    }
  }

  if (options.mode === 'apply' && errors.length === 0) {
    if (!subscriptionIdSourceAvailable) {
      throw new Error('La colonne abonnements.id_source est absente en base. Applique d’abord la migration Prisma.');
    }
    await prisma.$transaction(async tx => {
      for (const row of resolvedSubscriptions) {
        const data = {
          idSource: row.idSource,
          label: row.label,
          entryLabel: row.entryLabel,
          expense: row.expense,
          income: row.income,
          periodicity: row.periodicity,
          dayOfPeriod: row.dayOfPeriod,
          subscriptionType: row.subscriptionType,
          firstDueDate: row.firstDueDate,
          nextDueDate: row.nextDueDate,
          endDate: row.endDate,
          lastGeneratedDate: row.lastGeneratedDate,
          lastGeneratedDueDate: row.lastGeneratedDueDate,
          active: row.active,
          hasSplits: row.hasSplits,
          accountId: row.accountId,
          budgetId: row.budgetId,
          thirdPartyId: row.thirdPartyId,
          categoryId: row.categoryId,
          movementTypeId: row.movementTypeId,
        };

        const existingId = existingSubscriptionMap.get(row.idSource);
        if (existingId) {
          await tx.subscription.update({
            where: { id: existingId },
            data: {
              ...data,
              splits: {
                deleteMany: {},
                create: row.splits.map(split => ({
                  idSource: split.idSource,
                  label: split.label,
                  expense: split.expense,
                  income: split.income,
                  balance: split.balance,
                  budgetId: split.budgetId,
                  categoryId: split.categoryId,
                })),
              },
            },
          });
        } else {
          const created = await tx.subscription.create({
            data: {
              ...data,
              splits: {
                create: row.splits.map(split => ({
                  idSource: split.idSource,
                  label: split.label,
                  expense: split.expense,
                  income: split.income,
                  balance: split.balance,
                  budgetId: split.budgetId,
                  categoryId: split.categoryId,
                })),
              },
            },
            select: { id: true },
          });
          existingSubscriptionMap.set(row.idSource, created.id);
        }
      }
    });
  }

  return {
    subscriptionsFile: subscriptionsPath,
    splitsFile: splitsPath,
    mode: options.mode,
    totalSubscriptions: subscriptionDataRows.filter(row => row.some(value => value !== '')).length,
    validSubscriptions: resolvedSubscriptions.length,
    errorSubscriptions: errors.filter(item => item.startsWith('abonnement')).length,
    createSubscriptionCount: resolvedSubscriptions.filter(item => item.action === 'create').length,
    updateSubscriptionCount: resolvedSubscriptions.filter(item => item.action === 'update').length,
    totalSplits: splitDataRows.filter(row => row.some(value => value !== '')).length,
    validSplits: resolvedSubscriptions.reduce((sum, row) => sum + row.splits.length, 0),
    errorSplits: errors.filter(item => item.startsWith('ventilation')).length,
    previewItems,
    warnings,
    errors,
    notes,
  };
}

function printReport(report: ImportReport) {
  console.log('');
  console.log('Import abonnements legacy');
  console.log(`- fichier abonnements: ${report.subscriptionsFile}`);
  console.log(`- fichier ventilations: ${report.splitsFile}`);
  console.log(`- mode: ${report.mode}`);
  console.log(`- abonnements lus: ${report.totalSubscriptions}`);
  console.log(`- abonnements valides: ${report.validSubscriptions}`);
  console.log(`- abonnements en erreur: ${report.errorSubscriptions}`);
  console.log(`- créations abonnements: ${report.createSubscriptionCount}`);
  console.log(`- mises à jour abonnements: ${report.updateSubscriptionCount}`);
  console.log(`- ventilations lues: ${report.totalSplits}`);
  console.log(`- ventilations valides: ${report.validSplits}`);
  console.log(`- ventilations en erreur: ${report.errorSplits}`);

  if (report.previewItems.length > 0) {
    console.log('');
    console.log('Aperçu');
    for (const item of report.previewItems.slice(0, 15)) {
      console.log(
        `- ligne ${item.line}: ${item.action} abonnement ${item.subscriptionIdSource} "${item.label}"` +
        ` | compte=${item.accountSourceId ?? '—'}` +
        ` | budget=${item.budgetSourceId ?? '—'}` +
        ` | catégorie=${item.categorySourceId ?? '—'}` +
        ` | tiers=${item.thirdPartySourceId ?? '—'}` +
        ` | typeMouvement=${item.movementTypeSourceId ?? '—'}` +
        ` | périodicité=${item.periodicity}` +
        ` | ventilations=${item.splitCount}`,
      );
    }
    if (report.previewItems.length > 15) {
      console.log(`- ... ${report.previewItems.length - 15} lignes supplémentaires`);
    }
  }

  if (report.notes.length > 0) {
    console.log('');
    console.log('Notes');
    for (const note of report.notes) {
      console.log(`- ${note}`);
    }
  }

  if (report.warnings.length > 0) {
    console.log('');
    console.log('Warnings');
    for (const warning of report.warnings.slice(0, 20)) {
      console.log(`- ${warning}`);
    }
    if (report.warnings.length > 20) {
      console.log(`- ... ${report.warnings.length - 20} warning(s) supplémentaires`);
    }
  }

  if (report.errors.length > 0) {
    console.log('');
    console.log('Errors');
    for (const error of report.errors.slice(0, 20)) {
      console.log(`- ${error}`);
    }
    if (report.errors.length > 20) {
      console.log(`- ... ${report.errors.length - 20} erreur(s) supplémentaires`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    const report = await buildReport(prisma, options);
    printReport(report);

    if (report.errors.length > 0) {
      process.exitCode = 1;
      return;
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
