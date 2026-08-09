import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { BudgetFiltersDto, CreateBudgetDto, UpdateBudgetDto } from '@moneyback/shared';

type BudgetBalanceRow = {
  budgetId: string;
  balance: Prisma.Decimal | null;
  invoiceBalance: Prisma.Decimal | null;
};

function toLocalDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const BUDGET_INCLUDE = {
  grouping: { select: { id: true, label: true } },
  dashboardGrouping: { select: { id: true, label: true } },
  movementType: { select: { id: true, label: true, code: true } },
  migratedTo: { select: { id: true, label: true } },
} as const;

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  private presenter(budget: {
    id: string;
    label: string;
    idSource: string | null;
    comment: string | null;
    summary: boolean;
    dashboard: boolean;
    active: boolean;
    balance: unknown;
    invoiceBalance: unknown;
    balanceReferenceDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    groupingId: string | null;
    grouping: { id: string; label: string } | null;
    dashboardGroupingId: string | null;
    dashboardGrouping: { id: string; label: string } | null;
    movementTypeId: string | null;
    movementType: { id: string; label: string; code: string | null } | null;
    migratedToId: string | null;
    migratedTo: { id: string; label: string } | null;
    migrationReport: string | null;
    migratedAt: Date | null;
  }) {
    const {
      grouping,
      groupingId,
      dashboardGrouping,
      dashboardGroupingId,
      movementType,
      ...rest
    } = budget;

    return {
      ...rest,
      regroupementId: groupingId,
      regroupement: grouping,
      regroupementTableauDeBordId: dashboardGroupingId,
      regroupementTableauDeBord: dashboardGrouping,
      typeMouvement: movementType,
    };
  }

  async findAll(filters: BudgetFiltersDto) {
    const { search, active, regroupementId, highlightId, page, limit, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    const where = {
      ...(active !== undefined && { active }),
      ...(regroupementId && { groupingId: regroupementId }),
      ...(search && { label: { contains: search, mode: 'insensitive' as const } }),
    };

    const orderBy =
      sortBy === 'regroupement'
        ? { grouping: { label: sortOrder } }
        : { [sortBy]: sortOrder };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.budget.findMany({
        where,
        include: BUDGET_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.budget.count({ where }),
    ]);

    let highlightIndex: number | null = null;
    if (highlightId) {
      const orderedIds = await this.prisma.budget.findMany({ where, orderBy, select: { id: true } });
      const index = orderedIds.findIndex(budget => budget.id === highlightId);
      highlightIndex = index >= 0 ? index : null;
    }

    return { items: items.map(item => this.presenter(item)), total, page, limit, highlightIndex };
  }

  async findOne(id: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: BUDGET_INCLUDE,
    });
    if (!budget) throw new NotFoundException(`Budget ${id} introuvable`);
    return this.presenter(budget);
  }

  async create(dto: CreateBudgetDto) {
    const budget = await this.prisma.budget.create({
      data: {
        label: dto.label,
        idSource: dto.idSource ?? null,
        comment: dto.comment ?? null,
        summary: dto.summary ?? false,
        dashboard: dto.regroupementTableauDeBordId ? true : (dto.dashboard ?? false),
        active: dto.active ?? true,
        ...(dto.regroupementId && { groupingId: dto.regroupementId }),
        ...(dto.regroupementTableauDeBordId && { dashboardGroupingId: dto.regroupementTableauDeBordId }),
        ...(dto.movementTypeId && { movementTypeId: dto.movementTypeId }),
      },
      include: BUDGET_INCLUDE,
    });

    return this.presenter(budget);
  }

  async update(id: string, dto: UpdateBudgetDto) {
    const existing = await this.findOne(id);

    if (dto.active === false && existing.active) {
      const todayOnly = toLocalDateOnly(new Date());
      const referenceDateOnly = existing.balanceReferenceDate
        ? toLocalDateOnly(new Date(existing.balanceReferenceDate))
        : null;

      if (referenceDateOnly !== todayOnly) {
        throw new BadRequestException(
          "Impossible de désactiver cette enveloppe : son solde n'a pas été recalculé à la date du jour. Lancez d'abord l'outil \"Recalcul soldes enveloppes\".",
        );
      }

      if (Math.abs(Number(existing.balance)) >= 0.005) {
        throw new BadRequestException(
          `Impossible de désactiver cette enveloppe : son solde au ${todayOnly} n'est pas nul (${existing.balance}).`,
        );
      }
    }

    const budget = await this.prisma.budget.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.idSource !== undefined && { idSource: dto.idSource }),
        ...(dto.comment !== undefined && { comment: dto.comment }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
        ...((dto.dashboard !== undefined || dto.regroupementTableauDeBordId !== undefined) && {
          dashboard: dto.regroupementTableauDeBordId ? true : (dto.dashboard ?? false),
        }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.regroupementId !== undefined && { groupingId: dto.regroupementId }),
        ...(dto.regroupementTableauDeBordId !== undefined && { dashboardGroupingId: dto.regroupementTableauDeBordId }),
        ...(dto.movementTypeId !== undefined && { movementTypeId: dto.movementTypeId ?? null }),
      },
      include: BUDGET_INCLUDE,
    });

    return this.presenter(budget);
  }

  async remove(id: string) {
    const budget = await this.findOne(id);

    const [operationsCount, splitsCount, subscriptionsCount, subscriptionSplitsCount, thirdPartiesCount, thirdPartySplitsCount, migratedFromCount] =
      await this.prisma.$transaction([
        this.prisma.operation.count({ where: { budgetId: id, deletedAt: null } }),
        this.prisma.operationSplit.count({ where: { budgetId: id } }),
        this.prisma.subscription.count({ where: { budgetId: id } }),
        this.prisma.subscriptionSplit.count({ where: { budgetId: id } }),
        this.prisma.thirdParty.count({ where: { budgetId: id } }),
        this.prisma.thirdPartySplit.count({ where: { budgetId: id } }),
        this.prisma.budget.count({ where: { migratedToId: id } }),
      ]);

    const inUse =
      operationsCount > 0
      || splitsCount > 0
      || subscriptionsCount > 0
      || subscriptionSplitsCount > 0
      || thirdPartiesCount > 0
      || thirdPartySplitsCount > 0
      || migratedFromCount > 0;

    if (inUse) {
      const details: string[] = [];
      if (operationsCount > 0) details.push(`${operationsCount} opération(s)`);
      if (splitsCount > 0) details.push(`${splitsCount} opération(s) ventilée(s)`);
      if (subscriptionsCount > 0) details.push(`${subscriptionsCount} abonnement(s)`);
      if (subscriptionSplitsCount > 0) details.push(`${subscriptionSplitsCount} abonnement(s) ventilé(s)`);
      if (thirdPartiesCount > 0) details.push(`${thirdPartiesCount} tiers`);
      if (thirdPartySplitsCount > 0) details.push(`${thirdPartySplitsCount} tiers ventilé(s)`);
      if (migratedFromCount > 0) details.push(`${migratedFromCount} enveloppe(s) migrée(s) depuis celle-ci`);

      throw new ConflictException(
        `Impossible de supprimer l'enveloppe "${budget.label}" : utilisée par ${details.join(', ')}.`,
      );
    }

    await this.prisma.budget.delete({ where: { id } });
    return { status: 'deleted' as const, item: budget };
  }

  async migrate(id: string, targetId: string) {
    if (id === targetId) {
      throw new BadRequestException('Impossible de migrer une enveloppe vers elle-même.');
    }

    const source = await this.findOne(id);
    const target = await this.findOne(targetId);

    if (source.migratedToId) {
      throw new BadRequestException(`Cette enveloppe a déjà été migrée vers "${source.migratedTo?.label ?? ''}".`);
    }

    if (target.migratedToId) {
      throw new BadRequestException(
        `L'enveloppe cible a elle-même été migrée vers "${target.migratedTo?.label ?? ''}". Choisissez une enveloppe active.`,
      );
    }

    const [operationsCount, splitsCount, subscriptionsCount, subscriptionSplitsCount, thirdPartiesCount, thirdPartySplitsCount] =
      await this.prisma.$transaction([
        this.prisma.operation.updateMany({ where: { budgetId: id }, data: { budgetId: targetId } }),
        this.prisma.operationSplit.updateMany({ where: { budgetId: id }, data: { budgetId: targetId } }),
        this.prisma.subscription.updateMany({ where: { budgetId: id }, data: { budgetId: targetId } }),
        this.prisma.subscriptionSplit.updateMany({ where: { budgetId: id }, data: { budgetId: targetId } }),
        this.prisma.thirdParty.updateMany({ where: { budgetId: id }, data: { budgetId: targetId } }),
        this.prisma.thirdPartySplit.updateMany({ where: { budgetId: id }, data: { budgetId: targetId } }),
      ]);

    const total =
      operationsCount.count
      + splitsCount.count
      + subscriptionsCount.count
      + subscriptionSplitsCount.count
      + thirdPartiesCount.count
      + thirdPartySplitsCount.count;

    const now = new Date();
    const report = [
      `Migration effectuée le ${now.toLocaleString('fr-FR')}`,
      `Enveloppe "${source.label}" migrée vers "${target.label}"`,
      '',
      `Opérations mises à jour : ${operationsCount.count}`,
      `Opérations ventilées mises à jour : ${splitsCount.count}`,
      `Abonnements mis à jour : ${subscriptionsCount.count}`,
      `Abonnements ventilés mis à jour : ${subscriptionSplitsCount.count}`,
      `Tiers mis à jour (enveloppe par défaut) : ${thirdPartiesCount.count}`,
      `Tiers ventilés mis à jour : ${thirdPartySplitsCount.count}`,
      '',
      `Total : ${total} référence(s) mise(s) à jour.`,
    ].join('\n');

    // Désactivation forcée : la règle de solde nul ne s'applique pas ici, puisque
    // toutes les références réelles viennent d'être déplacées vers la cible.
    const updatedSource = await this.prisma.budget.update({
      where: { id },
      data: {
        active: false,
        migratedToId: targetId,
        migrationReport: report,
        migratedAt: now,
      },
      include: BUDGET_INCLUDE,
    });

    return {
      report,
      source: this.presenter(updatedSource),
      target: this.presenter(await this.prisma.budget.findUniqueOrThrow({ where: { id: targetId }, include: BUDGET_INCLUDE })),
    };
  }

  /**
   * RebuildBudgetBalances : recalcule et persiste le solde de chaque enveloppe
   * (`balance` sur la date d'opération, `invoiceBalance` sur la date de rattachement)
   * à partir des opérations et ventilations existantes, à la date de référence fournie
   * (ou à la date du jour par défaut). La date de référence utilisée est elle-même
   * persistée sur l'enveloppe (`balanceReferenceDate`).
   */
  async rebuildBalances(referenceDate?: string) {
    const referenceDateOnly = referenceDate ? referenceDate.slice(0, 10) : toLocalDateOnly(new Date());

    const rows = await this.prisma.$queryRaw<BudgetBalanceRow[]>(Prisma.sql`
      WITH entry AS (
        SELECT
          CASE
            WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN s.budget_id
            ELSE o.budget_id
          END AS budget_id,
          CASE
            WHEN o.type_operation IN ('V', 'P') AND s.id IS NOT NULL THEN (s.recette - s.depense)
            ELSE (o.recette - o.depense)
          END AS balance,
          o.date_operation AS operation_date,
          COALESCE(s.date_periode, o.date_echeance, o.date_operation) AS due_effective_date
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
        budget_id AS "budgetId",
        SUM(CASE WHEN operation_date::date <= ${referenceDateOnly}::date THEN balance ELSE 0 END) AS "balance",
        SUM(CASE WHEN due_effective_date::date <= ${referenceDateOnly}::date THEN balance ELSE 0 END) AS "invoiceBalance"
      FROM entry
      WHERE budget_id IS NOT NULL
      GROUP BY budget_id
    `);

    const balancesByBudgetId = new Map(
      rows.map(row => [
        row.budgetId,
        {
          balance: Number(row.balance ?? 0),
          invoiceBalance: Number(row.invoiceBalance ?? 0),
        },
      ]),
    );

    const budgets = await this.prisma.budget.findMany({ select: { id: true } });
    const balanceReferenceDate = new Date(`${referenceDateOnly}T00:00:00.000Z`);

    await this.prisma.$transaction(
      budgets.map(budget => {
        const values = balancesByBudgetId.get(budget.id) ?? { balance: 0, invoiceBalance: 0 };
        return this.prisma.budget.update({
          where: { id: budget.id },
          data: { ...values, balanceReferenceDate },
        });
      }),
    );

    return { updatedCount: budgets.length, referenceDate: referenceDateOnly };
  }
}
