import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
        include: {
          grouping: { select: { id: true, label: true } },
          dashboardGrouping: { select: { id: true, label: true } },
          movementType: { select: { id: true, label: true, code: true } },
        },
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
      include: {
        grouping: { select: { id: true, label: true } },
        dashboardGrouping: { select: { id: true, label: true } },
        movementType: { select: { id: true, label: true, code: true } },
      },
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
      include: {
        grouping: { select: { id: true, label: true } },
        dashboardGrouping: { select: { id: true, label: true } },
        movementType: { select: { id: true, label: true, code: true } },
      },
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
      include: {
        grouping: { select: { id: true, label: true } },
        dashboardGrouping: { select: { id: true, label: true } },
        movementType: { select: { id: true, label: true, code: true } },
      },
    });

    return this.presenter(budget);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.budget.delete({ where: { id } });
  }

  /**
   * RebuildBudgetBalances : recalcule et persiste le solde de chaque enveloppe
   * (`balance` sur la date d'opération, `invoiceBalance` sur la date d'échéance)
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
