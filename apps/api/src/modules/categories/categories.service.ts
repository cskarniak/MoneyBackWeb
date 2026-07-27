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

  private resolveDirection(expense?: unknown, income?: unknown): 'expense' | 'income' | null {
    if (Number(expense ?? 0) > 0) return 'expense';
    if (Number(income ?? 0) > 0) return 'income';
    return null;
  }

  async findMixedDirectionDetail(dateFrom: Date, dateTo: Date) {
    const categoryDirectionOf = (category: { expense: boolean; income: boolean }): 'expense' | 'income' | null =>
      category.expense ? 'expense' : category.income ? 'income' : null;

    const categorySelect = { id: true, label: true, expense: true, income: true } as const;

    const [operations, operationSplits, subscriptions, subscriptionSplits, thirdPartySplits] = await Promise.all([
      this.prisma.operation.findMany({
        where: { categoryId: { not: null }, deletedAt: null, operationDate: { gte: dateFrom, lte: dateTo } },
        select: {
          id: true,
          label: true,
          operationDate: true,
          expense: true,
          income: true,
          accountId: true,
          account: { select: { name: true } },
          category: { select: categorySelect },
          movementType: { select: { label: true, code: true } },
        },
      }),
      this.prisma.operationSplit.findMany({
        where: {
          categoryId: { not: null },
          operation: { deletedAt: null, operationDate: { gte: dateFrom, lte: dateTo } },
        },
        select: {
          id: true,
          label: true,
          expense: true,
          income: true,
          category: { select: categorySelect },
          operation: {
            select: {
              id: true,
              label: true,
              operationDate: true,
              accountId: true,
              account: { select: { name: true } },
              movementType: { select: { label: true, code: true } },
            },
          },
        },
      }),
      this.prisma.subscription.findMany({
        where: { categoryId: { not: null } },
        select: {
          id: true,
          label: true,
          expense: true,
          income: true,
          category: { select: categorySelect },
          movementType: { select: { label: true, code: true } },
        },
      }),
      this.prisma.subscriptionSplit.findMany({
        where: { categoryId: { not: null } },
        select: {
          id: true,
          label: true,
          expense: true,
          income: true,
          category: { select: categorySelect },
          subscription: { select: { id: true, label: true, movementType: { select: { label: true, code: true } } } },
        },
      }),
      this.prisma.thirdPartySplit.findMany({
        where: { categoryId: { not: null } },
        select: {
          id: true,
          label: true,
          expense: true,
          income: true,
          category: { select: categorySelect },
          thirdParty: { select: { id: true, name: true } },
        },
      }),
    ]);

    type AnomalyRow = {
      source: 'operation' | 'operationSplit' | 'subscription' | 'subscriptionSplit' | 'thirdPartySplit';
      id: string;
      openId: string;
      date: string | null;
      label: string;
      accountName: string | null;
      categoryId: string;
      categoryLabel: string;
      categoryDirection: 'expense' | 'income' | null;
      amountDirection: 'expense' | 'income';
      amount: number;
      accountId: string | null;
      movementTypeLabel: string | null;
    };

    const movementTypeLabelOf = (movementType: { label: string; code: string | null } | null | undefined) =>
      movementType ? (movementType.code ? `${movementType.code} - ${movementType.label}` : movementType.label) : null;

    const rows: AnomalyRow[] = [];

    for (const op of operations) {
      if (!op.category) continue;
      const direction = this.resolveDirection(op.expense, op.income);
      const categoryDirection = categoryDirectionOf(op.category);
      if (!direction || direction === categoryDirection) continue;
      rows.push({
        source: 'operation',
        id: op.id,
        openId: op.id,
        date: op.operationDate.toISOString(),
        label: op.label,
        accountName: op.account?.name ?? null,
        accountId: op.accountId,
        movementTypeLabel: movementTypeLabelOf(op.movementType),
        categoryId: op.category.id,
        categoryLabel: op.category.label,
        categoryDirection,
        amountDirection: direction,
        amount: direction === 'expense' ? Number(op.expense) : Number(op.income),
      });
    }

    for (const split of operationSplits) {
      if (!split.category || !split.operation) continue;
      const direction = this.resolveDirection(split.expense, split.income);
      const categoryDirection = categoryDirectionOf(split.category);
      if (!direction || direction === categoryDirection) continue;
      rows.push({
        source: 'operationSplit',
        id: split.id,
        openId: split.operation.id,
        date: split.operation.operationDate.toISOString(),
        label: split.label || split.operation.label,
        accountName: split.operation.account?.name ?? null,
        accountId: split.operation.accountId,
        movementTypeLabel: movementTypeLabelOf(split.operation.movementType),
        categoryId: split.category.id,
        categoryLabel: split.category.label,
        categoryDirection,
        amountDirection: direction,
        amount: direction === 'expense' ? Number(split.expense) : Number(split.income),
      });
    }

    for (const subscription of subscriptions) {
      if (!subscription.category) continue;
      const direction = this.resolveDirection(subscription.expense, subscription.income);
      const categoryDirection = categoryDirectionOf(subscription.category);
      if (!direction || direction === categoryDirection) continue;
      rows.push({
        source: 'subscription',
        id: subscription.id,
        openId: subscription.id,
        date: null,
        label: subscription.label,
        accountName: null,
        accountId: null,
        movementTypeLabel: movementTypeLabelOf(subscription.movementType),
        categoryId: subscription.category.id,
        categoryLabel: subscription.category.label,
        categoryDirection,
        amountDirection: direction,
        amount: direction === 'expense' ? Number(subscription.expense) : Number(subscription.income),
      });
    }

    for (const split of subscriptionSplits) {
      if (!split.category || !split.subscription) continue;
      const direction = this.resolveDirection(split.expense, split.income);
      const categoryDirection = categoryDirectionOf(split.category);
      if (!direction || direction === categoryDirection) continue;
      rows.push({
        source: 'subscriptionSplit',
        id: split.id,
        openId: split.subscription.id,
        date: null,
        label: split.label || split.subscription.label,
        accountName: null,
        accountId: null,
        movementTypeLabel: movementTypeLabelOf(split.subscription.movementType),
        categoryId: split.category.id,
        categoryLabel: split.category.label,
        categoryDirection,
        amountDirection: direction,
        amount: direction === 'expense' ? Number(split.expense) : Number(split.income),
      });
    }

    for (const split of thirdPartySplits) {
      if (!split.category || !split.thirdParty) continue;
      const direction = this.resolveDirection(split.expense, split.income);
      const categoryDirection = categoryDirectionOf(split.category);
      if (!direction || direction === categoryDirection) continue;
      rows.push({
        source: 'thirdPartySplit',
        id: split.id,
        openId: split.thirdParty.id,
        date: null,
        label: split.label || split.thirdParty.name,
        accountName: null,
        accountId: null,
        movementTypeLabel: null,
        categoryId: split.category.id,
        categoryLabel: split.category.label,
        categoryDirection,
        amountDirection: direction,
        amount: direction === 'expense' ? Number(split.expense) : Number(split.income),
      });
    }

    rows.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

    return { items: rows };
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
