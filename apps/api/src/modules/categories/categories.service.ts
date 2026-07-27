import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateCategoryDto, UpdateCategoryDto, CategoryFiltersDto } from '@moneyback/shared';

const GROUPING_INCLUDE = { grouping: { select: { id: true, label: true } }, migratedTo: { select: { id: true, label: true } } } as const;

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
    migratedToId: string | null;
    migratedTo: { id: string; label: string } | null;
    migrationReport: string | null;
    migratedAt: Date | null;
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
        include: GROUPING_INCLUDE,
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
      include: GROUPING_INCLUDE,
    });
    if (!category) throw new NotFoundException(`Catégorie ${id} introuvable`);
    return this.presenter(category);
  }

  private assertSingleDirection(expense: boolean, income: boolean) {
    if (expense && income) {
      throw new BadRequestException('Une catégorie ne peut pas être à la fois en dépense et en recette.');
    }
    if (!expense && !income) {
      throw new BadRequestException('Une catégorie doit être soit en dépense, soit en recette.');
    }
  }

  async create(dto: CreateCategoryDto) {
    this.assertSingleDirection(dto.expense ?? false, dto.income ?? false);
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
      include: GROUPING_INCLUDE,
    });

    return this.presenter(category);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.findOne(id);
    this.assertSingleDirection(
      dto.expense !== undefined ? dto.expense : existing.expense,
      dto.income !== undefined ? dto.income : existing.income,
    );
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
      include: GROUPING_INCLUDE,
    });

    return this.presenter(category);
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    const [operationsCount, splitsCount, subscriptionsCount, subscriptionSplitsCount, thirdPartiesCount, thirdPartySplitsCount, migratedFromCount] =
      await this.prisma.$transaction([
        this.prisma.operation.count({ where: { categoryId: id, deletedAt: null } }),
        this.prisma.operationSplit.count({ where: { categoryId: id } }),
        this.prisma.subscription.count({ where: { categoryId: id } }),
        this.prisma.subscriptionSplit.count({ where: { categoryId: id } }),
        this.prisma.thirdParty.count({ where: { categoryId: id } }),
        this.prisma.thirdPartySplit.count({ where: { categoryId: id } }),
        this.prisma.category.count({ where: { migratedToId: id } }),
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
      const inactiveCategory = await this.prisma.category.update({
        where: { id },
        data: { active: false },
        include: GROUPING_INCLUDE,
      });

      return { status: 'deactivated' as const, item: this.presenter(inactiveCategory) };
    }

    await this.prisma.category.delete({ where: { id } });
    return { status: 'deleted' as const, item: category };
  }

  async findMixedDirectionUsage() {
    const [operations, operationSplits, subscriptions, subscriptionSplits, thirdPartySplits] = await Promise.all([
      this.prisma.operation.findMany({
        where: { categoryId: { not: null }, deletedAt: null },
        select: { categoryId: true, expense: true, income: true },
      }),
      this.prisma.operationSplit.findMany({
        where: { categoryId: { not: null } },
        select: { categoryId: true, expense: true, income: true },
      }),
      this.prisma.subscription.findMany({
        where: { categoryId: { not: null } },
        select: { categoryId: true, expense: true, income: true },
      }),
      this.prisma.subscriptionSplit.findMany({
        where: { categoryId: { not: null } },
        select: { categoryId: true, expense: true, income: true },
      }),
      this.prisma.thirdPartySplit.findMany({
        where: { categoryId: { not: null } },
        select: { categoryId: true, expense: true, income: true },
      }),
    ]);

    type Stat = { expenseCount: number; incomeCount: number; expenseTotal: number; incomeTotal: number; sources: Set<string> };
    const stats = new Map<string, Stat>();

    const ingest = (rows: Array<{ categoryId: string | null; expense: unknown; income: unknown }>, sourceLabel: string) => {
      for (const row of rows) {
        const categoryId = row.categoryId;
        if (!categoryId) continue;
        const expense = Number(row.expense ?? 0);
        const income = Number(row.income ?? 0);
        if (expense <= 0 && income <= 0) continue;

        let entry = stats.get(categoryId);
        if (!entry) {
          entry = { expenseCount: 0, incomeCount: 0, expenseTotal: 0, incomeTotal: 0, sources: new Set() };
          stats.set(categoryId, entry);
        }
        if (expense > 0) {
          entry.expenseCount += 1;
          entry.expenseTotal += expense;
          entry.sources.add(sourceLabel);
        }
        if (income > 0) {
          entry.incomeCount += 1;
          entry.incomeTotal += income;
          entry.sources.add(sourceLabel);
        }
      }
    };

    ingest(operations, 'Opérations');
    ingest(operationSplits, 'Opérations ventilées');
    ingest(subscriptions, 'Abonnements');
    ingest(subscriptionSplits, 'Abonnements ventilés');
    ingest(thirdPartySplits, 'Tiers ventilés');

    const mixedCategoryIds = [...stats.entries()]
      .filter(([, stat]) => stat.expenseCount > 0 && stat.incomeCount > 0)
      .map(([categoryId]) => categoryId);

    if (mixedCategoryIds.length === 0) {
      return { items: [] };
    }

    const categories = await this.prisma.category.findMany({
      where: { id: { in: mixedCategoryIds } },
      select: { id: true, label: true, active: true, expense: true, income: true },
    });

    const items = categories
      .map(category => {
        const stat = stats.get(category.id)!;
        return {
          id: category.id,
          label: category.label,
          active: category.active,
          expenseFlag: category.expense,
          incomeFlag: category.income,
          expenseCount: stat.expenseCount,
          incomeCount: stat.incomeCount,
          expenseTotal: stat.expenseTotal,
          incomeTotal: stat.incomeTotal,
          sources: [...stat.sources],
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'fr-FR'));

    return { items };
  }

  async migrate(id: string, targetId: string) {
    if (id === targetId) {
      throw new BadRequestException('Impossible de migrer une catégorie vers elle-même.');
    }

    const source = await this.findOne(id);
    const target = await this.findOne(targetId);

    if (source.migratedToId) {
      throw new BadRequestException(
        `Cette catégorie a déjà été migrée vers "${source.migratedTo?.label ?? ''}".`,
      );
    }

    if (target.migratedToId) {
      throw new BadRequestException(
        `La catégorie cible a elle-même été migrée vers "${target.migratedTo?.label ?? ''}". Choisissez une catégorie active.`,
      );
    }

    const [operationsCount, splitsCount, subscriptionsCount, subscriptionSplitsCount, thirdPartiesCount, thirdPartySplitsCount] =
      await this.prisma.$transaction([
        this.prisma.operation.updateMany({ where: { categoryId: id }, data: { categoryId: targetId } }),
        this.prisma.operationSplit.updateMany({ where: { categoryId: id }, data: { categoryId: targetId } }),
        this.prisma.subscription.updateMany({ where: { categoryId: id }, data: { categoryId: targetId } }),
        this.prisma.subscriptionSplit.updateMany({ where: { categoryId: id }, data: { categoryId: targetId } }),
        this.prisma.thirdParty.updateMany({ where: { categoryId: id }, data: { categoryId: targetId } }),
        this.prisma.thirdPartySplit.updateMany({ where: { categoryId: id }, data: { categoryId: targetId } }),
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
      `Catégorie "${source.label}" migrée vers "${target.label}"`,
      '',
      `Opérations mises à jour : ${operationsCount.count}`,
      `Opérations ventilées mises à jour : ${splitsCount.count}`,
      `Abonnements mis à jour : ${subscriptionsCount.count}`,
      `Abonnements ventilés mis à jour : ${subscriptionSplitsCount.count}`,
      `Tiers mis à jour (catégorie par défaut) : ${thirdPartiesCount.count}`,
      `Tiers ventilés mis à jour : ${thirdPartySplitsCount.count}`,
      '',
      `Total : ${total} référence(s) mise(s) à jour.`,
    ].join('\n');

    const updatedSource = await this.prisma.category.update({
      where: { id },
      data: {
        active: false,
        migratedToId: targetId,
        migrationReport: report,
        migratedAt: now,
      },
      include: GROUPING_INCLUDE,
    });

    return {
      report,
      source: this.presenter(updatedSource),
      target: this.presenter(await this.prisma.category.findUniqueOrThrow({ where: { id: targetId }, include: GROUPING_INCLUDE })),
    };
  }
}
