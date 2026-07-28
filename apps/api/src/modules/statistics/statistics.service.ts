import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  DetailedStatisticsFiltersDto,
  EnvelopeSummaryFiltersDto,
  MonthlyCategoryDashboardFiltersDto,
} from '@moneyback/shared';
import { PrismaService } from '../../prisma/prisma.service';

type DetailedStatisticsRow = {
  operationId: string;
  splitId: string | null;
  accountId: string;
  accountName: string;
  operationDate: Date;
  dueDate: Date | null;
  effectiveDueDate: Date;
  pieceNumber: string | null;
  label: string;
  expense: Prisma.Decimal;
  income: Prisma.Decimal;
  balance: Prisma.Decimal;
  thirdPartyId: string | null;
  thirdPartyName: string | null;
  budgetId: string | null;
  budgetLabel: string | null;
  categoryId: string | null;
  categoryLabel: string | null;
  categoryGroupingId: string | null;
  categoryGroupingLabel: string | null;
  budgetGroupingId: string | null;
  budgetGroupingLabel: string | null;
  operationType: string | null;
  lettering: string | null;
  runningBalance: Prisma.Decimal;
};

type DetailedStatisticsAggregateRow = {
  totalCount: bigint | number;
  totalBalance: Prisma.Decimal | null;
};

type DetailedStatisticsSortKey =
  | 'accountName'
  | 'operationDate'
  | 'effectiveDueDate'
  | 'pieceNumber'
  | 'label'
  | 'balance'
  | 'thirdPartyName'
  | 'budgetLabel'
  | 'categoryLabel';

type EnvelopeSummaryRow = {
  budgetId: string;
  budgetLabel: string;
  budgetActive: boolean;
  budgetGroupingId: string | null;
  budgetGroupingLabel: string | null;
  totalExpense: Prisma.Decimal | null;
  totalIncome: Prisma.Decimal | null;
  totalBalance: Prisma.Decimal | null;
  operationCount: bigint | number;
  lastEffectiveDate: Date | null;
};

type MonthlyCategoryDashboardRow = {
  groupingId: string | null;
  groupingLabel: string | null;
  groupingDashboardKind: string | null;
  month: Date;
  totalExpense: Prisma.Decimal | null;
  totalIncome: Prisma.Decimal | null;
};

function parseMonth(value: string, fieldName: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    throw new BadRequestException(`${fieldName} invalide, format attendu AAAA-MM.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new BadRequestException(`${fieldName} invalide, mois hors limites.`);
  }

  return { year, month };
}

function toMonthKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function toLocalDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Les filtres de date arrivent en ISO (ex. "2026-06-01T00:00:00.000Z") construits côté frontend en UTC à
// partir d'une saisie AAAA-MM-JJ : les 10 premiers caractères donnent la date calendaire voulue, sans jamais
// repasser par un objet Date (qui réintroduirait un risque de décalage de fuseau côté SQL).
function toDateOnly(isoValue: string) {
  return isoValue.slice(0, 10);
}

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  async findEnvelopeSummary(filters: EnvelopeSummaryFiltersDto) {
    const referenceDateOnly = filters.referenceDate
      ? filters.referenceDate.slice(0, 10)
      : toLocalDateOnly(new Date());
    const effectiveDateSql = filters.useDueDate
      ? Prisma.sql`COALESCE(s.date_periode, o.date_echeance, o.date_operation)`
      : Prisma.sql`o.date_operation`;
    const whereClauses: Prisma.Sql[] = [
      Prisma.sql`o.date_suppression IS NULL`,
      Prisma.sql`entry.budget_id IS NOT NULL`,
      Prisma.sql`entry.effective_date::date <= ${referenceDateOnly}::date`,
    ];

    if (filters.accountId) {
      whereClauses.push(Prisma.sql`o.compte_id = ${filters.accountId}`);
    }

    const whereSql = Prisma.sql`WHERE ${Prisma.join(whereClauses, ' AND ')}`;

    const rows = await this.prisma.$queryRaw<EnvelopeSummaryRow[]>(Prisma.sql`
      WITH entry AS (
        SELECT
          o.id AS operation_id,
          CASE
            WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN s.budget_id
            ELSE o.budget_id
          END AS budget_id,
          CASE
            WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN s.depense
            ELSE o.depense
          END AS expense,
          CASE
            WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN s.recette
            ELSE o.recette
          END AS income,
          CASE
            WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN (s.recette - s.depense)
            ELSE (o.recette - o.depense)
          END AS balance,
          ${effectiveDateSql} AS effective_date
        FROM operations o
        LEFT JOIN operations_ventilees s ON s.operation_id = o.id
        WHERE (
          o.type_operation IS NULL
          OR o.type_operation NOT IN ('V', 'P')
          OR s.id IS NOT NULL
        )
      )
      SELECT
        b.id AS "budgetId",
        b.libelle AS "budgetLabel",
        b.actif AS "budgetActive",
        g.id AS "budgetGroupingId",
        g.libelle AS "budgetGroupingLabel",
        SUM(entry.expense) AS "totalExpense",
        SUM(entry.income) AS "totalIncome",
        SUM(entry.balance) AS "totalBalance",
        COUNT(*) AS "operationCount",
        MAX(entry.effective_date) AS "lastEffectiveDate"
      FROM entry
      INNER JOIN operations o ON o.id = entry.operation_id
      INNER JOIN budgets b ON b.id = entry.budget_id
      LEFT JOIN regroupements g ON g.id = b.regroupement_id
      ${whereSql}
      GROUP BY b.id, b.libelle, b.actif, g.id, g.libelle
      ORDER BY b.libelle ASC
    `);

    return {
      referenceDate: referenceDateOnly,
      items: rows.map(row => ({
        budgetId: row.budgetId,
        budgetLabel: row.budgetLabel,
        budgetActive: row.budgetActive,
        budgetGroupingId: row.budgetGroupingId,
        budgetGroupingLabel: row.budgetGroupingLabel,
        totalExpense: String(row.totalExpense ?? 0),
        totalIncome: String(row.totalIncome ?? 0),
        totalBalance: String(row.totalBalance ?? 0),
        operationCount: Number(row.operationCount ?? 0),
        lastEffectiveDate: row.lastEffectiveDate?.toISOString() ?? null,
      })),
    };
  }

  async findDetailed(filters: DetailedStatisticsFiltersDto) {
    const whereClauses: Prisma.Sql[] = [Prisma.sql`o.date_suppression IS NULL`];

    if (filters.accountId) {
      whereClauses.push(Prisma.sql`o.compte_id = ${filters.accountId}`);
    }

    if (filters.budgetId) {
      whereClauses.push(
        Prisma.sql`(
          CASE
            WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN s.budget_id
            ELSE o.budget_id
          END
        ) = ${filters.budgetId}`,
      );
    }

    if (filters.categoryId) {
      whereClauses.push(
        Prisma.sql`(
          CASE
            WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN s.categorie_id
            ELSE o.categorie_id
          END
        ) = ${filters.categoryId}`,
      );
    }

    if (filters.thirdPartyId) {
      whereClauses.push(Prisma.sql`o.tiers_id = ${filters.thirdPartyId}`);
    }

    if (filters.categoryGroupingId) {
      whereClauses.push(
        Prisma.sql`(
          CASE
            WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN csplit.regroupement_id
            ELSE c.regroupement_id
          END
        ) = ${filters.categoryGroupingId}`,
      );
    }

    if (filters.budgetGroupingId) {
      whereClauses.push(
        Prisma.sql`(
          CASE
            WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN bsplit.regroupement_id
            ELSE b.regroupement_id
          END
        ) = ${filters.budgetGroupingId}`,
      );
    }

    if (filters.pieceNumber) {
      whereClauses.push(Prisma.sql`o.numero_piece ILIKE ${`%${filters.pieceNumber}%`}`);
    }

    // Comparaisons en dates calendaires pures (::date des deux côtés) : comparer directement une colonne
    // timestamp (sans fuseau) à un objet Date/timestamptz laisse Postgres appliquer un cast implicite selon
    // le fuseau de la session, ce qui peut faire déborder une opération du 1er du mois sur le mois précédent.
    if (filters.operationDateFrom) {
      whereClauses.push(Prisma.sql`o.date_operation::date >= ${toDateOnly(filters.operationDateFrom)}::date`);
    }

    if (filters.operationDateTo) {
      whereClauses.push(Prisma.sql`o.date_operation::date <= ${toDateOnly(filters.operationDateTo)}::date`);
    }

    if (filters.dueDateFrom) {
      whereClauses.push(
        Prisma.sql`COALESCE(s.date_periode, o.date_echeance, o.date_operation)::date >= ${toDateOnly(filters.dueDateFrom)}::date`,
      );
    }

    if (filters.dueDateTo) {
      whereClauses.push(
        Prisma.sql`COALESCE(s.date_periode, o.date_echeance, o.date_operation)::date <= ${toDateOnly(filters.dueDateTo)}::date`,
      );
    }

    const whereSql = whereClauses.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(whereClauses, ' AND ')}`
      : Prisma.empty;

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;
    const baseSortKey: DetailedStatisticsSortKey = filters.sortByDueDate ? 'effectiveDueDate' : 'operationDate';
    const resolvedSortKey: DetailedStatisticsSortKey = filters.sortKey ?? baseSortKey;
    const resolvedSortDirection = (filters.sortDirection ?? 'desc').toUpperCase();
    const baseSortDirection = 'DESC';

    const sortColumns: Record<DetailedStatisticsSortKey, Prisma.Sql> = {
      accountName: Prisma.sql`"accountName"`,
      operationDate: Prisma.sql`"operationDate"`,
      effectiveDueDate: Prisma.sql`"effectiveDueDate"`,
      pieceNumber: Prisma.sql`COALESCE("pieceNumber", '')`,
      label: Prisma.sql`"label"`,
      balance: Prisma.sql`"balance"`,
      thirdPartyName: Prisma.sql`COALESCE("thirdPartyName", '')`,
      budgetLabel: Prisma.sql`COALESCE("budgetLabel", '')`,
      categoryLabel: Prisma.sql`COALESCE("categoryLabel", '')`,
    };

    const orderFragments: Prisma.Sql[] = [
      Prisma.sql`${sortColumns[resolvedSortKey]} ${Prisma.raw(resolvedSortDirection)}`,
    ];

    if (resolvedSortKey !== baseSortKey) {
      orderFragments.push(Prisma.sql`${sortColumns[baseSortKey]} ${Prisma.raw(baseSortDirection)}`);
    }

    orderFragments.push(Prisma.sql`"operationId" DESC`);
    orderFragments.push(Prisma.sql`"splitId" DESC NULLS LAST`);

    const orderBySql = Prisma.sql`ORDER BY ${Prisma.join(orderFragments, ', ')}`;

    const baseSelectSql = Prisma.sql`
      SELECT
        o.id AS "operationId",
        s.id AS "splitId",
        a.id AS "accountId",
        a.nom AS "accountName",
        o.date_operation AS "operationDate",
        o.date_echeance AS "dueDate",
        COALESCE(s.date_periode, o.date_echeance, o.date_operation) AS "effectiveDueDate",
        o.numero_piece AS "pieceNumber",
        CASE
          WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN COALESCE(NULLIF(s.libelle, ''), o.libelle)
          ELSE o.libelle
        END AS "label",
        CASE
          WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN s.depense
          ELSE o.depense
        END AS "expense",
        CASE
          WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN s.recette
          ELSE o.recette
        END AS "income",
        CASE
          WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN (s.recette - s.depense)
          ELSE (o.recette - o.depense)
        END AS "balance",
        t.id AS "thirdPartyId",
        t.nom AS "thirdPartyName",
        CASE
          WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN bsplit.id
          ELSE b.id
        END AS "budgetId",
        CASE
          WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN bsplit.libelle
          ELSE b.libelle
        END AS "budgetLabel",
        CASE
          WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN csplit.id
          ELSE c.id
        END AS "categoryId",
        CASE
          WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN csplit.libelle
          ELSE c.libelle
        END AS "categoryLabel",
        CASE
          WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN gcsplit.id
          ELSE gc.id
        END AS "categoryGroupingId",
        CASE
          WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN gcsplit.libelle
          ELSE gc.libelle
        END AS "categoryGroupingLabel",
        CASE
          WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN gbsplit.id
          ELSE gb.id
        END AS "budgetGroupingId",
        CASE
          WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN gbsplit.libelle
          ELSE gb.libelle
        END AS "budgetGroupingLabel",
        o.type_operation AS "operationType",
        CASE
          WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN COALESCE(s.lettrage, o.lettrage)
          ELSE o.lettrage
        END AS "lettering"
      FROM operations o
      INNER JOIN comptes a ON a.id = o.compte_id
      LEFT JOIN operations_ventilees s ON s.operation_id = o.id
      LEFT JOIN tiers t ON t.id = o.tiers_id
      LEFT JOIN budgets b ON b.id = o.budget_id
      LEFT JOIN categories c ON c.id = o.categorie_id
      LEFT JOIN regroupements gb ON gb.id = b.regroupement_id
      LEFT JOIN regroupements gc ON gc.id = c.regroupement_id
      LEFT JOIN budgets bsplit ON bsplit.id = s.budget_id
      LEFT JOIN categories csplit ON csplit.id = s.categorie_id
      LEFT JOIN regroupements gbsplit ON gbsplit.id = bsplit.regroupement_id
      LEFT JOIN regroupements gcsplit ON gcsplit.id = csplit.regroupement_id
      ${whereSql}
      AND (
        o.type_operation IS NULL
        OR o.type_operation NOT IN ('V', 'P')
        OR s.id IS NOT NULL
      )
    `;

    const rows = await this.prisma.$queryRaw<DetailedStatisticsRow[]>(Prisma.sql`
      WITH base AS (
        ${baseSelectSql}
      )
      SELECT
        base.*,
        SUM("balance") OVER (${orderBySql} ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING) AS "runningBalance"
      FROM base
      ${orderBySql}
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const [aggregate] = await this.prisma.$queryRaw<DetailedStatisticsAggregateRow[]>(Prisma.sql`
      WITH base AS (
        ${baseSelectSql}
      )
      SELECT
        COUNT(*) AS "totalCount",
        COALESCE(SUM("balance"), 0) AS "totalBalance"
      FROM base
    `);

    return {
      total: Number(aggregate?.totalCount ?? 0),
      page,
      limit,
      totalBalance: (aggregate?.totalBalance ?? new Prisma.Decimal(0)).toString(),
      items: rows.map(row => ({
        operationId: row.operationId,
        splitId: row.splitId,
        accountId: row.accountId,
        accountName: row.accountName,
        operationDate: row.operationDate.toISOString(),
        dueDate: row.dueDate?.toISOString() ?? null,
        effectiveDueDate: row.effectiveDueDate.toISOString(),
        pieceNumber: row.pieceNumber,
        label: row.label,
        expense: row.expense.toString(),
        income: row.income.toString(),
        balance: row.balance.toString(),
        runningBalance: row.runningBalance.toString(),
        thirdPartyId: row.thirdPartyId,
        thirdPartyName: row.thirdPartyName,
        budgetId: row.budgetId,
        budgetLabel: row.budgetLabel,
        categoryId: row.categoryId,
        categoryLabel: row.categoryLabel,
        categoryGroupingId: row.categoryGroupingId,
        categoryGroupingLabel: row.categoryGroupingLabel,
        budgetGroupingId: row.budgetGroupingId,
        budgetGroupingLabel: row.budgetGroupingLabel,
        operationType: row.operationType,
        lettering: row.lettering,
      })),
    };
  }

  async findMonthlyCategoryDashboard(filters: MonthlyCategoryDashboardFiltersDto) {
    const from = parseMonth(filters.monthFrom, 'monthFrom');
    const to = parseMonth(filters.monthTo, 'monthTo');

    if (from.year > to.year || (from.year === to.year && from.month > to.month)) {
      throw new BadRequestException('monthFrom doit être antérieur ou égal à monthTo.');
    }

    const months: string[] = [];
    for (let year = from.year, month = from.month; year < to.year || (year === to.year && month <= to.month); ) {
      months.push(`${year}-${String(month).padStart(2, '0')}`);
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }

    // Comparaisons en dates calendaires pures (chaînes AAAA-MM-JJ, castées ::date des deux côtés) plutôt
    // qu'avec des objets Date/timestamptz : sinon Postgres caste implicitement la colonne timestamp (sans
    // fuseau) selon le fuseau de la session, ce qui décale une opération du 1er du mois vers le mois
    // précédent et fausse les totaux mensuels.
    const rangeStartStr = `${from.year}-${String(from.month).padStart(2, '0')}-01`;
    const rangeEndLastDay = new Date(to.year, to.month, 0).getDate();
    const rangeEndStr = `${to.year}-${String(to.month).padStart(2, '0')}-${String(rangeEndLastDay).padStart(2, '0')}`;

    const whereClauses: Prisma.Sql[] = [
      Prisma.sql`entry.category_id IS NOT NULL`,
      Prisma.sql`entry.reference_date::date >= ${rangeStartStr}::date`,
      Prisma.sql`entry.reference_date::date <= ${rangeEndStr}::date`,
    ];

    if (filters.accountId) {
      whereClauses.push(Prisma.sql`entry.account_id = ${filters.accountId}`);
    }

    const whereSql = Prisma.sql`WHERE ${Prisma.join(whereClauses, ' AND ')}`;

    const rows = await this.prisma.$queryRaw<MonthlyCategoryDashboardRow[]>(Prisma.sql`
      WITH entry AS (
        SELECT
          o.compte_id AS account_id,
          CASE
            WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN s.categorie_id
            ELSE o.categorie_id
          END AS category_id,
          CASE
            WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN s.depense
            ELSE o.depense
          END AS expense,
          CASE
            WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN s.recette
            ELSE o.recette
          END AS income,
          -- Date de rattachement : date de la période de ventilation si présente, sinon date d'échéance
          -- de l'opération, sinon sa date d'opération bancaire. C'est cette date qui sert de référence
          -- comptable (voir docs/regles_gestion_impl.md), pas la date d'opération.
          COALESCE(s.date_periode, o.date_echeance, o.date_operation) AS reference_date
        FROM operations o
        LEFT JOIN operations_ventilees s ON s.operation_id = o.id
        WHERE o.date_suppression IS NULL
          AND (
            o.type_operation IS NULL
            OR o.type_operation NOT IN ('V', 'P')
            OR s.id IS NOT NULL
          )
      )
      SELECT
        g.id AS "groupingId",
        g.libelle AS "groupingLabel",
        g.sens_tableau_bord AS "groupingDashboardKind",
        date_trunc('month', entry.reference_date::date)::date AS "month",
        SUM(entry.expense) AS "totalExpense",
        SUM(entry.income) AS "totalIncome"
      FROM entry
      INNER JOIN categories c ON c.id = entry.category_id
      INNER JOIN regroupements g ON g.id = c.regroupement_id AND g.tableau_bord = true
      ${whereSql}
      GROUP BY g.id, g.libelle, g.sens_tableau_bord, date_trunc('month', entry.reference_date::date)
      ORDER BY g.libelle ASC NULLS LAST, month ASC
    `);

    const groupsByKey = new Map<
      string,
      {
        groupingId: string | null;
        groupingLabel: string;
        groupingDashboardKind: string | null;
        monthly: Record<string, { totalExpense: string; totalIncome: string }>;
      }
    >();

    for (const row of rows) {
      const key = row.groupingId ?? '__none__';
      let group = groupsByKey.get(key);
      if (!group) {
        group = {
          groupingId: row.groupingId,
          groupingLabel: row.groupingLabel ?? 'Sans regroupement',
          groupingDashboardKind: row.groupingDashboardKind,
          // Un mois absent de cet objet signifie qu'aucune opération n'a été enregistrée ce mois-là pour ce
          // regroupement (à distinguer d'un mois avec des opérations dont le solde net vaut 0).
          monthly: {},
        };
        groupsByKey.set(key, group);
      }

      const monthKey = toMonthKey(row.month);
      group.monthly[monthKey] = {
        totalExpense: (row.totalExpense ?? new Prisma.Decimal(0)).toString(),
        totalIncome: (row.totalIncome ?? new Prisma.Decimal(0)).toString(),
      };
    }

    // Le sens (dépense/revenu) d'un regroupement est décidé explicitement sur sa fiche (dashboardKind).
    // Repli sur le solde net calculé uniquement pour les regroupements pas encore classés — les flags
    // depense/recette portés par regroupements servent à un tout autre usage (type de regroupement
    // catégorie vs budget, voir GroupingsService.findAll) et ne reflètent pas le sens de l'argent.
    const items = Array.from(groupsByKey.values())
      .map(group => {
        let kind: 'expense' | 'income';
        if (group.groupingDashboardKind === 'expense' || group.groupingDashboardKind === 'income') {
          kind = group.groupingDashboardKind;
        } else {
          const totalExpense = Object.values(group.monthly).reduce((sum, m) => sum + Number(m.totalExpense || 0), 0);
          const totalIncome = Object.values(group.monthly).reduce((sum, m) => sum + Number(m.totalIncome || 0), 0);
          kind = totalExpense >= totalIncome ? 'expense' : 'income';
        }

        return { ...group, kind };
      })
      .sort((a, b) => a.groupingLabel.localeCompare(b.groupingLabel, 'fr', { sensitivity: 'base' }));

    return { months, items };
  }
}
