import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { BudgetFiltersDto, CreateBudgetDto, UpdateBudgetDto } from '@moneyback/shared';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  private presenter(budget: {
    id: string;
    label: string;
    legacyCode: string | null;
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
  }) {
    const { grouping, groupingId, ...rest } = budget;

    return {
      ...rest,
      regroupementId: groupingId,
      regroupement: grouping,
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
        include: { grouping: { select: { id: true, label: true } } },
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
      include: { grouping: { select: { id: true, label: true } } },
    });
    if (!budget) throw new NotFoundException(`Budget ${id} introuvable`);
    return this.presenter(budget);
  }

  async create(dto: CreateBudgetDto) {
    const budget = await this.prisma.budget.create({
      data: {
        label: dto.label,
        legacyCode: dto.legacyCode ?? null,
        comment: dto.comment ?? null,
        summary: dto.summary ?? false,
        dashboard: dto.dashboard ?? false,
        active: dto.active ?? true,
        ...(dto.regroupementId && { groupingId: dto.regroupementId }),
      },
      include: { grouping: { select: { id: true, label: true } } },
    });

    return this.presenter(budget);
  }

  async update(id: string, dto: UpdateBudgetDto) {
    await this.findOne(id);
    const budget = await this.prisma.budget.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.legacyCode !== undefined && { legacyCode: dto.legacyCode }),
        ...(dto.comment !== undefined && { comment: dto.comment }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
        ...(dto.dashboard !== undefined && { dashboard: dto.dashboard }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.regroupementId !== undefined && { groupingId: dto.regroupementId }),
      },
      include: { grouping: { select: { id: true, label: true } } },
    });

    return this.presenter(budget);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.budget.delete({ where: { id } });
  }
}
