import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type MissingDueDateItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  expense: number;
  income: number;
};

export type MissingDueDateResult = {
  check: 'missing-due-date';
  scannedCount: number;
  anomalyCount: number;
  fixedCount: number;
  applied: boolean;
  items: MissingDueDateItem[];
};

export type BalanceFieldItem = {
  id: string;
  operationId: string;
  source: 'operation' | 'ventilation';
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  expense: number;
  income: number;
  storedBalance: number;
  expectedBalance: number;
  diff: number;
};

export type BalanceFieldResult = {
  check: 'balance-field';
  scannedCount: number;
  anomalyCount: number;
  fixedCount: number;
  applied: boolean;
  items: BalanceFieldItem[];
};

export type MissingSplitsItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  expense: number;
  income: number;
};

export type MissingSplitsResult = {
  check: 'missing-splits';
  scannedCount: number;
  anomalyCount: number;
  items: MissingSplitsItem[];
};

export type UnexpectedSplitsItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  operationType: string | null;
  splitCount: number;
};

export type UnexpectedSplitsResult = {
  check: 'unexpected-splits';
  scannedCount: number;
  anomalyCount: number;
  items: UnexpectedSplitsItem[];
};

export type OrphanReferenceItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  source: 'operation' | 'ventilation';
  referenceType: 'enveloppe' | 'tiers' | 'categorie';
  referenceId: string;
};

export type OrphanReferenceResult = {
  check: 'orphan-references';
  scannedCount: number;
  anomalyCount: number;
  items: OrphanReferenceItem[];
};

export type DuplicateOperationItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  expense: number;
  income: number;
  comment: string | null;
  duplicateCount: number;
};

export type DuplicateOperationResult = {
  check: 'duplicate-operations';
  scannedCount: number;
  anomalyCount: number;
  fixedCount: number;
  applied: boolean;
  items: DuplicateOperationItem[];
};

export type ZeroAmountItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
};

export type ZeroAmountResult = {
  check: 'zero-amount';
  scannedCount: number;
  anomalyCount: number;
  items: ZeroAmountItem[];
};

export type PartialSplitItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  operationType: string | null;
  operationBalance: number;
  splitsBalance: number;
};

export type PartialSplitResult = {
  check: 'partial-split-unmarked';
  scannedCount: number;
  anomalyCount: number;
  items: PartialSplitItem[];
};

export type SplitMismatchItem = {
  operationId: string;
  accountId: string;
  accountName: string;
  operationDate: string;
  label: string;
  operationBalance: number;
  splitsBalance: number;
  diff: number;
};

export type SplitMismatchResult = {
  check: 'split-mismatch';
  scannedCount: number;
  anomalyCount: number;
  items: SplitMismatchItem[];
};

type BaseParams = {
  accountId?: string;
  dateFrom?: string;
};

@Injectable()
export class AnomaliesService {
  constructor(private prisma: PrismaService) {}

  private buildDateFilter(dateFrom?: string) {
    return dateFrom
      ? Prisma.sql`AND o.date_operation >= ${new Date(dateFrom)}`
      : Prisma.empty;
  }

  private buildPrismaDateFilter(dateFrom?: string): Prisma.OperationWhereInput {
    return dateFrom ? { operationDate: { gte: new Date(dateFrom) } } : {};
  }

  async checkMissingDueDate(params: BaseParams & {
    applyFix: boolean;
  }): Promise<MissingDueDateResult> {
    const where: Prisma.OperationWhereInput = {
      dueDate: null,
      deletedAt: null,
      ...(params.accountId ? { accountId: params.accountId } : {}),
      ...this.buildPrismaDateFilter(params.dateFrom),
    };

    const operations = await this.prisma.operation.findMany({
      where,
      include: { account: { select: { name: true } } },
      orderBy: [{ operationDate: 'desc' }, { id: 'desc' }],
    });

    const anomalyCount = operations.length;
    let fixedCount = 0;

    if (params.applyFix && operations.length > 0) {
      const updates = operations.map(op =>
        this.prisma.operation.update({
          where: { id: op.id },
          data: { dueDate: op.operationDate },
        }),
      );
      const results = await this.prisma.$transaction(updates);
      fixedCount = results.length;
    }

    const items: MissingDueDateItem[] = operations.map(op => ({
      operationId: op.id,
      accountId: op.accountId,
      accountName: op.account.name,
      operationDate: op.operationDate.toISOString(),
      label: op.label,
      expense: Number(op.expense),
      income: Number(op.income),
    }));

    return {
      check: 'missing-due-date',
      scannedCount: anomalyCount,
      anomalyCount,
      fixedCount,
      applied: params.applyFix,
      items,
    };
  }

  async checkSplitMismatch(params: BaseParams): Promise<SplitMismatchResult> {
    const accountFilter = params.accountId
      ? Prisma.sql`AND o.compte_id = ${params.accountId}`
      : Prisma.empty;
    const dateFilter = this.buildDateFilter(params.dateFrom);

    const rows = await this.prisma.$queryRaw<
      Array<{
        operation_id: string;
        account_id: string;
        account_name: string;
        operation_date: Date;
        label: string;
        op_balance: Prisma.Decimal;
        splits_balance: Prisma.Decimal;
      }>
    >`
      SELECT
        o.id AS operation_id,
        o.compte_id AS account_id,
        c.nom AS account_name,
        o.date_operation AS operation_date,
        o.libelle AS label,
        (COALESCE(o.recette, 0) - COALESCE(o.depense, 0)) AS op_balance,
        (COALESCE(SUM(s.recette), 0) - COALESCE(SUM(s.depense), 0)) AS splits_balance
      FROM operations o
      JOIN comptes c ON c.id = o.compte_id
      LEFT JOIN operations_ventilees s ON s.operation_id = o.id
      WHERE o.type_operation = 'V'
        AND o.date_suppression IS NULL
        ${accountFilter}
        ${dateFilter}
      GROUP BY o.id, o.compte_id, c.nom, o.date_operation, o.libelle, o.recette, o.depense
      HAVING ABS((COALESCE(o.recette, 0) - COALESCE(o.depense, 0)) - (COALESCE(SUM(s.recette), 0) - COALESCE(SUM(s.depense), 0))) >= 0.05
      ORDER BY o.date_operation DESC, o.id DESC
    `;

    const scannedCountResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count
      FROM operations o
      WHERE type_operation = 'V'
        AND date_suppression IS NULL
        ${accountFilter}
        ${dateFilter}
    `;

    const scannedCount = Number(scannedCountResult[0].count);

    const items: SplitMismatchItem[] = rows.map(row => {
      const opBal = Number(row.op_balance);
      const spBal = Number(row.splits_balance);
      return {
        operationId: row.operation_id,
        accountId: row.account_id,
        accountName: row.account_name,
        operationDate: row.operation_date.toISOString(),
        label: row.label,
        operationBalance: opBal,
        splitsBalance: spBal,
        diff: Math.round((opBal - spBal) * 100) / 100,
      };
    });

    return {
      check: 'split-mismatch',
      scannedCount,
      anomalyCount: items.length,
      items,
    };
  }

  async checkBalanceField(params: BaseParams & {
    applyFix: boolean;
  }): Promise<BalanceFieldResult> {
    const accountFilter = params.accountId
      ? Prisma.sql`AND o.compte_id = ${params.accountId}`
      : Prisma.empty;
    const dateFilter = this.buildDateFilter(params.dateFrom);

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        operation_id: string;
        source: string;
        account_id: string;
        account_name: string;
        operation_date: Date;
        label: string;
        expense: Prisma.Decimal;
        income: Prisma.Decimal;
        stored_balance: Prisma.Decimal;
        expected_balance: Prisma.Decimal;
      }>
    >`
      SELECT
        o.id,
        o.id AS operation_id,
        'operation' AS source,
        o.compte_id AS account_id,
        c.nom AS account_name,
        o.date_operation AS operation_date,
        o.libelle AS label,
        o.depense AS expense,
        o.recette AS income,
        COALESCE(o.solde, 0) AS stored_balance,
        (COALESCE(o.recette, 0) - COALESCE(o.depense, 0)) AS expected_balance
      FROM operations o
      JOIN comptes c ON c.id = o.compte_id
      WHERE o.date_suppression IS NULL
        ${accountFilter}
        ${dateFilter}
        AND COALESCE(o.solde, 0) <> (COALESCE(o.recette, 0) - COALESCE(o.depense, 0))

      UNION ALL

      SELECT
        s.id,
        s.operation_id AS operation_id,
        'ventilation' AS source,
        o.compte_id AS account_id,
        c.nom AS account_name,
        o.date_operation AS operation_date,
        COALESCE(s.libelle, o.libelle) AS label,
        s.depense AS expense,
        s.recette AS income,
        COALESCE(s.solde, 0) AS stored_balance,
        (COALESCE(s.recette, 0) - COALESCE(s.depense, 0)) AS expected_balance
      FROM operations_ventilees s
      JOIN operations o ON o.id = s.operation_id
      JOIN comptes c ON c.id = o.compte_id
      WHERE o.date_suppression IS NULL
        ${accountFilter}
        ${dateFilter}
        AND COALESCE(s.solde, 0) <> (COALESCE(s.recette, 0) - COALESCE(s.depense, 0))

      ORDER BY operation_date DESC
    `;

    const scannedCountResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT
        (SELECT COUNT(*) FROM operations o WHERE date_suppression IS NULL ${accountFilter} ${dateFilter})
        +
        (SELECT COUNT(*) FROM operations_ventilees s JOIN operations o ON o.id = s.operation_id WHERE o.date_suppression IS NULL ${accountFilter} ${dateFilter})
      AS count
    `;
    const scannedCount = Number(scannedCountResult[0].count);

    const items: BalanceFieldItem[] = rows.map(row => {
      const stored = Number(row.stored_balance);
      const expected = Number(row.expected_balance);
      return {
        id: row.id,
        operationId: row.operation_id,
        source: row.source as 'operation' | 'ventilation',
        accountId: row.account_id,
        accountName: row.account_name,
        operationDate: row.operation_date.toISOString(),
        label: row.label,
        expense: Number(row.expense),
        income: Number(row.income),
        storedBalance: stored,
        expectedBalance: expected,
        diff: Math.round((stored - expected) * 100) / 100,
      };
    });

    let fixedCount = 0;

    if (params.applyFix && items.length > 0) {
      const opItems = items.filter(i => i.source === 'operation');
      const splitItems = items.filter(i => i.source === 'ventilation');

      const updates: Prisma.PrismaPromise<unknown>[] = [];

      for (const item of opItems) {
        updates.push(
          this.prisma.operation.update({
            where: { id: item.id },
            data: { balance: new Prisma.Decimal(item.expectedBalance) },
          }),
        );
      }

      for (const item of splitItems) {
        updates.push(
          this.prisma.operationSplit.update({
            where: { id: item.id },
            data: { balance: new Prisma.Decimal(item.expectedBalance) },
          }),
        );
      }

      await this.prisma.$transaction(updates);
      fixedCount = items.length;
    }

    return {
      check: 'balance-field',
      scannedCount,
      anomalyCount: items.length,
      fixedCount,
      applied: params.applyFix,
      items,
    };
  }

  async checkMissingSplits(params: BaseParams): Promise<MissingSplitsResult> {
    const accountFilter = params.accountId
      ? Prisma.sql`AND o.compte_id = ${params.accountId}`
      : Prisma.empty;
    const dateFilter = this.buildDateFilter(params.dateFrom);

    const rows = await this.prisma.$queryRaw<
      Array<{
        operation_id: string;
        account_id: string;
        account_name: string;
        operation_date: Date;
        label: string;
        expense: Prisma.Decimal;
        income: Prisma.Decimal;
      }>
    >`
      SELECT
        o.id AS operation_id,
        o.compte_id AS account_id,
        c.nom AS account_name,
        o.date_operation AS operation_date,
        o.libelle AS label,
        o.depense AS expense,
        o.recette AS income
      FROM operations o
      JOIN comptes c ON c.id = o.compte_id
      LEFT JOIN operations_ventilees s ON s.operation_id = o.id
      WHERE o.type_operation = 'V'
        AND o.date_suppression IS NULL
        ${accountFilter}
        ${dateFilter}
      GROUP BY o.id, o.compte_id, c.nom, o.date_operation, o.libelle, o.depense, o.recette
      HAVING COUNT(s.id) = 0
      ORDER BY o.date_operation DESC, o.id DESC
    `;

    const scannedCountResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count
      FROM operations o
      WHERE type_operation = 'V'
        AND date_suppression IS NULL
        ${accountFilter}
        ${dateFilter}
    `;
    const scannedCount = Number(scannedCountResult[0].count);

    const items: MissingSplitsItem[] = rows.map(row => ({
      operationId: row.operation_id,
      accountId: row.account_id,
      accountName: row.account_name,
      operationDate: row.operation_date.toISOString(),
      label: row.label,
      expense: Number(row.expense),
      income: Number(row.income),
    }));

    return {
      check: 'missing-splits',
      scannedCount,
      anomalyCount: items.length,
      items,
    };
  }

  async checkUnexpectedSplits(params: BaseParams): Promise<UnexpectedSplitsResult> {
    const accountFilter = params.accountId
      ? Prisma.sql`AND o.compte_id = ${params.accountId}`
      : Prisma.empty;
    const dateFilter = this.buildDateFilter(params.dateFrom);

    const rows = await this.prisma.$queryRaw<
      Array<{
        operation_id: string;
        account_id: string;
        account_name: string;
        operation_date: Date;
        label: string;
        operation_type: string | null;
        split_count: bigint;
      }>
    >`
      SELECT
        o.id AS operation_id,
        o.compte_id AS account_id,
        c.nom AS account_name,
        o.date_operation AS operation_date,
        o.libelle AS label,
        o.type_operation AS operation_type,
        COUNT(s.id) AS split_count
      FROM operations o
      JOIN comptes c ON c.id = o.compte_id
      JOIN operations_ventilees s ON s.operation_id = o.id
      WHERE o.date_suppression IS NULL
        AND (o.type_operation IS NULL OR o.type_operation NOT IN ('V', 'P'))
        ${accountFilter}
        ${dateFilter}
      GROUP BY o.id, o.compte_id, c.nom, o.date_operation, o.libelle, o.type_operation
      ORDER BY o.date_operation DESC, o.id DESC
    `;

    const scannedCountResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count
      FROM operations o
      WHERE date_suppression IS NULL
        AND (type_operation IS NULL OR type_operation NOT IN ('V', 'P'))
        ${accountFilter}
        ${dateFilter}
    `;
    const scannedCount = Number(scannedCountResult[0].count);

    const items: UnexpectedSplitsItem[] = rows.map(row => ({
      operationId: row.operation_id,
      accountId: row.account_id,
      accountName: row.account_name,
      operationDate: row.operation_date.toISOString(),
      label: row.label,
      operationType: row.operation_type,
      splitCount: Number(row.split_count),
    }));

    return {
      check: 'unexpected-splits',
      scannedCount,
      anomalyCount: items.length,
      items,
    };
  }

  async checkOrphanReferences(params: BaseParams): Promise<OrphanReferenceResult> {
    const accountFilter = params.accountId
      ? Prisma.sql`AND o.compte_id = ${params.accountId}`
      : Prisma.empty;
    const dateFilter = this.buildDateFilter(params.dateFrom);

    const rows = await this.prisma.$queryRaw<
      Array<{
        operation_id: string;
        account_id: string;
        account_name: string;
        operation_date: Date;
        label: string;
        source: string;
        reference_type: string;
        reference_id: string;
      }>
    >`
      SELECT o.id AS operation_id, o.compte_id AS account_id, c.nom AS account_name,
             o.date_operation AS operation_date, o.libelle AS label,
             'operation' AS source, 'enveloppe' AS reference_type, o.budget_id AS reference_id
      FROM operations o
      JOIN comptes c ON c.id = o.compte_id
      LEFT JOIN budgets b ON b.id = o.budget_id
      WHERE o.date_suppression IS NULL AND o.budget_id IS NOT NULL AND b.id IS NULL ${accountFilter} ${dateFilter}

      UNION ALL

      SELECT o.id, o.compte_id, c.nom,
             o.date_operation, o.libelle,
             'operation', 'tiers', o.tiers_id
      FROM operations o
      JOIN comptes c ON c.id = o.compte_id
      LEFT JOIN tiers t ON t.id = o.tiers_id
      WHERE o.date_suppression IS NULL AND o.tiers_id IS NOT NULL AND t.id IS NULL ${accountFilter} ${dateFilter}

      UNION ALL

      SELECT o.id, o.compte_id, c.nom,
             o.date_operation, o.libelle,
             'operation', 'categorie', o.categorie_id
      FROM operations o
      JOIN comptes c ON c.id = o.compte_id
      LEFT JOIN categories cat ON cat.id = o.categorie_id
      WHERE o.date_suppression IS NULL AND o.categorie_id IS NOT NULL AND cat.id IS NULL ${accountFilter} ${dateFilter}

      UNION ALL

      SELECT o.id, o.compte_id, c.nom,
             o.date_operation, COALESCE(s.libelle, o.libelle),
             'ventilation', 'enveloppe', s.budget_id
      FROM operations_ventilees s
      JOIN operations o ON o.id = s.operation_id
      JOIN comptes c ON c.id = o.compte_id
      LEFT JOIN budgets b ON b.id = s.budget_id
      WHERE o.date_suppression IS NULL AND s.budget_id IS NOT NULL AND b.id IS NULL ${accountFilter} ${dateFilter}

      UNION ALL

      SELECT o.id, o.compte_id, c.nom,
             o.date_operation, COALESCE(s.libelle, o.libelle),
             'ventilation', 'categorie', s.categorie_id
      FROM operations_ventilees s
      JOIN operations o ON o.id = s.operation_id
      JOIN comptes c ON c.id = o.compte_id
      LEFT JOIN categories cat ON cat.id = s.categorie_id
      WHERE o.date_suppression IS NULL AND s.categorie_id IS NOT NULL AND cat.id IS NULL ${accountFilter} ${dateFilter}

      ORDER BY operation_date DESC
    `;

    const scannedCountResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT
        (SELECT COUNT(*) FROM operations o WHERE o.date_suppression IS NULL ${accountFilter} ${dateFilter})
        +
        (SELECT COUNT(*) FROM operations_ventilees s JOIN operations o ON o.id = s.operation_id WHERE o.date_suppression IS NULL ${accountFilter} ${dateFilter})
      AS count
    `;
    const scannedCount = Number(scannedCountResult[0].count);

    const items: OrphanReferenceItem[] = rows.map(row => ({
      operationId: row.operation_id,
      accountId: row.account_id,
      accountName: row.account_name,
      operationDate: row.operation_date.toISOString(),
      label: row.label,
      source: row.source as 'operation' | 'ventilation',
      referenceType: row.reference_type as 'enveloppe' | 'tiers' | 'categorie',
      referenceId: row.reference_id,
    }));

    return {
      check: 'orphan-references',
      scannedCount,
      anomalyCount: items.length,
      items,
    };
  }

  async checkDuplicateOperations(params: BaseParams & {
    applyFix: boolean;
  }): Promise<DuplicateOperationResult> {
    const accountFilter = params.accountId
      ? Prisma.sql`AND o.compte_id = ${params.accountId}`
      : Prisma.empty;
    const dateFilter = this.buildDateFilter(params.dateFrom);

    const rows = await this.prisma.$queryRaw<
      Array<{
        operation_id: string;
        account_id: string;
        account_name: string;
        operation_date: Date;
        label: string;
        expense: Prisma.Decimal;
        income: Prisma.Decimal;
        comment: string | null;
        duplicate_count: bigint;
      }>
    >`
      SELECT
        o.id AS operation_id,
        o.compte_id AS account_id,
        c.nom AS account_name,
        o.date_operation AS operation_date,
        o.libelle AS label,
        o.depense AS expense,
        o.recette AS income,
        o.commentaire AS comment,
        dup.cnt AS duplicate_count
      FROM operations o
      JOIN comptes c ON c.id = o.compte_id
      JOIN (
        SELECT date_operation, date_echeance, libelle, depense, recette, commentaire, compte_id, COUNT(*) AS cnt
        FROM operations
        WHERE date_suppression IS NULL
        GROUP BY date_operation, date_echeance, libelle, depense, recette, commentaire, compte_id
        HAVING COUNT(*) > 1
      ) dup ON dup.date_operation = o.date_operation
           AND dup.libelle = o.libelle
           AND dup.depense = o.depense
           AND dup.recette = o.recette
           AND dup.compte_id = o.compte_id
           AND dup.date_echeance IS NOT DISTINCT FROM o.date_echeance
           AND dup.commentaire IS NOT DISTINCT FROM o.commentaire
      WHERE o.date_suppression IS NULL
        ${accountFilter}
        ${dateFilter}
        AND NOT (
          o.mode_saisie = 'E'
          AND o.reference_releve IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM operations o2
            WHERE o2.date_suppression IS NULL
              AND o2.id <> o.id
              AND o2.date_operation = o.date_operation
              AND o2.libelle = o.libelle
              AND o2.depense = o.depense
              AND o2.recette = o.recette
              AND o2.compte_id = o.compte_id
              AND o2.date_echeance IS NOT DISTINCT FROM o.date_echeance
              AND o2.commentaire IS NOT DISTINCT FROM o.commentaire
              AND (o2.mode_saisie <> 'E' OR o2.reference_releve IS DISTINCT FROM o.reference_releve)
          )
        )
      ORDER BY o.date_operation DESC, o.libelle, o.id
    `;

    const scannedCountResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count
      FROM operations o
      WHERE date_suppression IS NULL
        ${accountFilter}
        ${dateFilter}
    `;
    const scannedCount = Number(scannedCountResult[0].count);

    const items: DuplicateOperationItem[] = rows.map(row => ({
      operationId: row.operation_id,
      accountId: row.account_id,
      accountName: row.account_name,
      operationDate: row.operation_date.toISOString(),
      label: row.label,
      expense: Number(row.expense),
      income: Number(row.income),
      comment: row.comment,
      duplicateCount: Number(row.duplicate_count),
    }));

    let fixedCount = 0;

    if (params.applyFix && items.length > 0) {
      const groups = new Map<string, DuplicateOperationItem[]>();
      for (const item of items) {
        const key = `${item.operationDate}|${item.label}|${item.expense}|${item.income}|${item.accountId}|${item.comment ?? ''}`;
        const group = groups.get(key) ?? [];
        group.push(item);
        groups.set(key, group);
      }

      const updates: Prisma.PrismaPromise<unknown>[] = [];
      for (const group of groups.values()) {
        for (let i = 1; i < group.length; i++) {
          updates.push(
            this.prisma.operation.update({
              where: { id: group[i]!.operationId },
              data: { comment: `opération ${i + 1}` },
            }),
          );
        }
      }

      if (updates.length > 0) {
        await this.prisma.$transaction(updates);
        fixedCount = updates.length;
      }
    }

    return {
      check: 'duplicate-operations',
      scannedCount,
      anomalyCount: items.length,
      fixedCount,
      applied: params.applyFix,
      items,
    };
  }

  async checkZeroAmount(params: BaseParams): Promise<ZeroAmountResult> {
    const where: Prisma.OperationWhereInput = {
      expense: 0,
      income: 0,
      deletedAt: null,
      OR: [{ operationType: null }, { operationType: { notIn: ['V', 'P'] } }],
      ...(params.accountId ? { accountId: params.accountId } : {}),
      ...this.buildPrismaDateFilter(params.dateFrom),
    };

    const operations = await this.prisma.operation.findMany({
      where,
      include: { account: { select: { name: true } } },
      orderBy: [{ operationDate: 'desc' }, { id: 'desc' }],
    });

    return {
      check: 'zero-amount',
      scannedCount: operations.length,
      anomalyCount: operations.length,
      items: operations.map(op => ({
        operationId: op.id,
        accountId: op.accountId,
        accountName: op.account.name,
        operationDate: op.operationDate.toISOString(),
        label: op.label,
      })),
    };
  }

  async checkPartialSplitUnmarked(params: BaseParams): Promise<PartialSplitResult> {
    const accountFilter = params.accountId
      ? Prisma.sql`AND o.compte_id = ${params.accountId}`
      : Prisma.empty;
    const dateFilter = this.buildDateFilter(params.dateFrom);

    const rows = await this.prisma.$queryRaw<
      Array<{
        operation_id: string;
        account_id: string;
        account_name: string;
        operation_date: Date;
        label: string;
        operation_type: string | null;
        op_balance: Prisma.Decimal;
        splits_balance: Prisma.Decimal;
      }>
    >`
      SELECT
        o.id AS operation_id,
        o.compte_id AS account_id,
        c.nom AS account_name,
        o.date_operation AS operation_date,
        o.libelle AS label,
        o.type_operation AS operation_type,
        (COALESCE(o.recette, 0) - COALESCE(o.depense, 0)) AS op_balance,
        (COALESCE(SUM(s.recette), 0) - COALESCE(SUM(s.depense), 0)) AS splits_balance
      FROM operations o
      JOIN comptes c ON c.id = o.compte_id
      JOIN operations_ventilees s ON s.operation_id = o.id
      WHERE o.date_suppression IS NULL
        AND (o.type_operation IS NULL OR o.type_operation NOT IN ('P'))
        ${accountFilter}
        ${dateFilter}
      GROUP BY o.id, o.compte_id, c.nom, o.date_operation, o.libelle, o.type_operation, o.recette, o.depense
      HAVING ABS((COALESCE(o.recette, 0) - COALESCE(o.depense, 0)) - (COALESCE(SUM(s.recette), 0) - COALESCE(SUM(s.depense), 0))) >= 0.05
        AND (COALESCE(SUM(s.recette), 0) - COALESCE(SUM(s.depense), 0)) <> 0
      ORDER BY o.date_operation DESC, o.id DESC
    `;

    const scannedCountResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count
      FROM operations o
      JOIN operations_ventilees s ON s.operation_id = o.id
      WHERE o.date_suppression IS NULL
        AND (o.type_operation IS NULL OR o.type_operation NOT IN ('P'))
        ${accountFilter}
        ${dateFilter}
      GROUP BY o.id
      HAVING COUNT(s.id) > 0
    `;
    const scannedCount = scannedCountResult.length;

    return {
      check: 'partial-split-unmarked',
      scannedCount,
      anomalyCount: rows.length,
      items: rows.map(row => ({
        operationId: row.operation_id,
        accountId: row.account_id,
        accountName: row.account_name,
        operationDate: row.operation_date.toISOString(),
        label: row.label,
        operationType: row.operation_type,
        operationBalance: Number(row.op_balance),
        splitsBalance: Number(row.splits_balance),
      })),
    };
  }
}
