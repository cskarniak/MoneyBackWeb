import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateGroupingDto, UpdateGroupingDto, GroupingFiltersDto } from '@moneyback/shared';

@Injectable()
export class GroupingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: GroupingFiltersDto) {
    const { search, type, highlightId, page, limit, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;
    const where = {
      ...(search && { label: { contains: search, mode: 'insensitive' as const } }),
      ...(type === 'category' && { income: true }),
      ...(type === 'budget' && { expense: true }),
      ...(type === 'dashboard' && { dashboard: true }),
    };
    const orderBy = { [sortBy]: sortOrder };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.grouping.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.grouping.count({ where }),
    ]);

    let highlightIndex: number | null = null;
    if (highlightId) {
      const orderedIds = await this.prisma.grouping.findMany({ where, orderBy, select: { id: true } });
      const index = orderedIds.findIndex(grouping => grouping.id === highlightId);
      highlightIndex = index >= 0 ? index : null;
    }

    return { items, total, page, limit, highlightIndex };
  }

  async findOne(id: string) {
    const grouping = await this.prisma.grouping.findUnique({ where: { id } });
    if (!grouping) throw new NotFoundException(`Regroupement ${id} introuvable`);
    return grouping;
  }

  async create(dto: CreateGroupingDto) {
    return this.prisma.grouping.create({
      data: {
        label: dto.label,
        idSource: dto.idSource ?? null,
        expense: dto.expense ?? false,
        income: dto.income ?? false,
        dashboard: dto.dashboard ?? false,
        dashboardKind: dto.dashboardKind ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateGroupingDto) {
    await this.findOne(id);
    return this.prisma.grouping.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.idSource !== undefined && { idSource: dto.idSource ?? null }),
        ...(dto.expense !== undefined && { expense: dto.expense }),
        ...(dto.income !== undefined && { income: dto.income }),
        ...(dto.dashboard !== undefined && { dashboard: dto.dashboard }),
        ...(dto.dashboardKind !== undefined && { dashboardKind: dto.dashboardKind }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const [categoriesCount, budgetsCount, dashboardBudgetsCount] = await this.prisma.$transaction([
      this.prisma.category.count({ where: { groupingId: id } }),
      this.prisma.budget.count({ where: { groupingId: id } }),
      this.prisma.budget.count({ where: { dashboardGroupingId: id } }),
    ]);

    if (categoriesCount > 0 || budgetsCount > 0 || dashboardBudgetsCount > 0) {
      const details: string[] = [];
      if (categoriesCount > 0) details.push(`${categoriesCount} catégorie(s)`);
      if (budgetsCount > 0) details.push(`${budgetsCount} enveloppe(s)`);
      if (dashboardBudgetsCount > 0) details.push(`${dashboardBudgetsCount} enveloppe(s) (tableau de bord)`);

      throw new ConflictException(
        `Impossible de supprimer ce regroupement : utilisé par ${details.join(', ')}.`,
      );
    }

    return this.prisma.grouping.delete({ where: { id } });
  }
}
