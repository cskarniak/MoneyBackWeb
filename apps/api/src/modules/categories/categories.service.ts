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
      this.prisma.category.findMany({
        where,
        include: { grouping: { select: { id: true, label: true } } },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.category.count({ where }),
    ]);

    return { items: items.map(item => this.presenter(item)), total, page, limit };
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
    await this.findOne(id);
    return this.prisma.category.delete({ where: { id } });
  }
}
