import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { BudgetFiltersDto, CreateBudgetDto, UpdateBudgetDto } from '@moneyback/shared';

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
    const { search, active, regroupementId, page, limit, sortBy, sortOrder } = filters;
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

    return { items: items.map(item => this.presenter(item)), total, page, limit };
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
    await this.findOne(id);
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
}
