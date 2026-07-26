import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateCategoryDto, UpdateCategoryDto, CategoryFiltersDto } from '@moneyback/shared';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private presenter(category: {
    id: string;
    label: string;
    idSource: string | null;
    comment: string | null;
    expense: boolean;
    income: boolean;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    groupingId: string | null;
    grouping: { id: string; label: string } | null;
  }) {
    const { grouping, groupingId, ...rest } = category;

    return {
      ...rest,
      regroupementId: groupingId,
      regroupement: grouping,
    };
  }

  async findAll(filters: CategoryFiltersDto) {
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
      this.prisma.category.findMany({
        where,
        include: { grouping: { select: { id: true, label: true } } },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.category.count({ where }),
    ]);

    let highlightIndex: number | null = null;
    if (highlightId) {
      const orderedIds = await this.prisma.category.findMany({ where, orderBy, select: { id: true } });
      const index = orderedIds.findIndex(category => category.id === highlightId);
      highlightIndex = index >= 0 ? index : null;
    }

    return { items: items.map(item => this.presenter(item)), total, page, limit, highlightIndex };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { grouping: { select: { id: true, label: true } } },
    });
    if (!category) throw new NotFoundException(`Catégorie ${id} introuvable`);
    return this.presenter(category);
  }

  async create(dto: CreateCategoryDto) {
    const category = await this.prisma.category.create({
      data: {
        label: dto.label,
        idSource: dto.idSource ?? null,
        comment: dto.comment ?? null,
        expense: dto.expense ?? false,
        income: dto.income ?? false,
        active: dto.active ?? true,
        ...(dto.regroupementId && { groupingId: dto.regroupementId }),
      },
      include: { grouping: { select: { id: true, label: true } } },
    });

    return this.presenter(category);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.idSource !== undefined && { idSource: dto.idSource ?? null }),
        ...(dto.comment !== undefined && { comment: dto.comment }),
        ...(dto.expense !== undefined && { expense: dto.expense }),
        ...(dto.income !== undefined && { income: dto.income }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.regroupementId !== undefined && { groupingId: dto.regroupementId }),
      },
      include: { grouping: { select: { id: true, label: true } } },
    });

    return this.presenter(category);
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    const [operationsCount, splitsCount, subscriptionsCount, subscriptionSplitsCount, thirdPartiesCount, thirdPartySplitsCount] =
      await this.prisma.$transaction([
        this.prisma.operation.count({ where: { categoryId: id, deletedAt: null } }),
        this.prisma.operationSplit.count({ where: { categoryId: id } }),
        this.prisma.subscription.count({ where: { categoryId: id } }),
        this.prisma.subscriptionSplit.count({ where: { categoryId: id } }),
        this.prisma.thirdParty.count({ where: { categoryId: id } }),
        this.prisma.thirdPartySplit.count({ where: { categoryId: id } }),
      ]);

    const inUse =
      operationsCount > 0
      || splitsCount > 0
      || subscriptionsCount > 0
      || subscriptionSplitsCount > 0
      || thirdPartiesCount > 0
      || thirdPartySplitsCount > 0;

    if (inUse) {
      const inactiveCategory = await this.prisma.category.update({
        where: { id },
        data: { active: false },
        include: { grouping: { select: { id: true, label: true } } },
      });

      return { status: 'deactivated' as const, item: this.presenter(inactiveCategory) };
    }

    await this.prisma.category.delete({ where: { id } });
    return { status: 'deleted' as const, item: category };
  }
}
