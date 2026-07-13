import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationType, Periodicity } from '@moneyback/shared';
import type {
  CreateSubscriptionDto,
  CreateSubscriptionSplitDto,
  GenerateSubscriptionsDto,
  PreviewSubscriptionsGenerationDto,
  SubscriptionFiltersDto,
  UpdateSubscriptionDto,
} from '@moneyback/shared';

type SubscriptionWithRelations = {
  id: string;
  label: string;
  entryLabel: string | null;
  expense: unknown;
  income: unknown;
  periodicity: string;
  dayOfPeriod: number | null;
  subscriptionType: string | null;
  firstDueDate: Date;
  nextDueDate: Date | null;
  endDate: Date | null;
  lastGeneratedDate: Date | null;
  lastGeneratedDueDate: Date | null;
  active: boolean;
  hasSplits: boolean;
  createdAt: Date;
  updatedAt: Date;
  accountId: string;
  thirdPartyId: string | null;
  categoryId: string | null;
  budgetId: string | null;
  movementTypeId: string | null;
  lastGeneratedOperationId: string | null;
  account: { id: string; name: string };
  thirdParty: { id: string; name: string } | null;
  category: { id: string; label: string } | null;
  budget: { id: string; label: string } | null;
  movementType: { id: string; label: string; code: string | null } | null;
  lastGeneratedOperation: { id: string; label: string; operationDate: Date } | null;
  splits: Array<{
    id: string;
    label: string | null;
    expense: unknown;
    income: unknown;
    balance: unknown;
    categoryId: string | null;
    budgetId: string | null;
    createdAt: Date;
    updatedAt: Date;
    category: { id: string; label: string } | null;
    budget: { id: string; label: string } | null;
  }>;
  planning: Array<{
    id: string;
    dueDate: Date;
    generatedAt: Date | null;
    status: string;
    operationId: string | null;
    createdAt: Date;
  }>;
};

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  private include = {
    account: { select: { id: true, name: true } },
    thirdParty: { select: { id: true, name: true } },
    category: { select: { id: true, label: true } },
    budget: { select: { id: true, label: true } },
    movementType: { select: { id: true, label: true, code: true } },
    lastGeneratedOperation: { select: { id: true, label: true, operationDate: true } },
    splits: {
      include: {
        category: { select: { id: true, label: true } },
        budget: { select: { id: true, label: true } },
      },
      orderBy: { createdAt: 'asc' as const },
    },
    planning: {
      orderBy: { dueDate: 'asc' as const },
      take: 24,
    },
  };

  private async assertAccountActive(accountId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId }, select: { closed: true } });
    if (!account) throw new NotFoundException(`Compte ${accountId} introuvable`);
    if (account.closed) {
      throw new BadRequestException('Ce compte est inactif : il ne peut plus recevoir de nouvel abonnement');
    }
  }

  private async assertBudgetActive(budgetId: string) {
    const budget = await this.prisma.budget.findUnique({ where: { id: budgetId }, select: { active: true } });
    if (!budget) throw new NotFoundException(`Enveloppe ${budgetId} introuvable`);
    if (!budget.active) {
      throw new BadRequestException('Cette enveloppe est inactive : elle ne peut plus être affectée à un abonnement');
    }
  }

  private async assertCategoryActive(categoryId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId }, select: { active: true } });
    if (!category) throw new NotFoundException(`Catégorie ${categoryId} introuvable`);
    if (!category.active) {
      throw new BadRequestException('Cette catégorie est inactive : elle ne peut plus être affectée à un abonnement');
    }
  }

  private async assertThirdPartyActive(thirdPartyId: string) {
    const thirdParty = await this.prisma.thirdParty.findUnique({ where: { id: thirdPartyId }, select: { active: true } });
    if (!thirdParty) throw new NotFoundException(`Tiers ${thirdPartyId} introuvable`);
    if (!thirdParty.active) {
      throw new BadRequestException('Ce tiers est inactif : il ne peut plus être affecté à un abonnement');
    }
  }

  private async assertSubscriptionEntitiesActive(dto: {
    accountId?: string;
    budgetId?: string | null;
    categoryId?: string | null;
    thirdPartyId?: string | null;
    splits?: Array<{ categoryId?: string | null; budgetId?: string | null }>;
  }) {
    const checks: Promise<void>[] = [];
    if (dto.accountId) checks.push(this.assertAccountActive(dto.accountId));
    if (dto.budgetId) checks.push(this.assertBudgetActive(dto.budgetId));
    if (dto.categoryId) checks.push(this.assertCategoryActive(dto.categoryId));
    if (dto.thirdPartyId) checks.push(this.assertThirdPartyActive(dto.thirdPartyId));
    for (const split of dto.splits ?? []) {
      if (split.budgetId) checks.push(this.assertBudgetActive(split.budgetId));
      if (split.categoryId) checks.push(this.assertCategoryActive(split.categoryId));
    }
    await Promise.all(checks);
  }

  private normalizeSplits(splits: CreateSubscriptionSplitDto[] | undefined) {
    return (splits ?? []).filter(
      split =>
        split.label
        || split.categoryId
        || split.budgetId
        || (split.expense ?? 0) > 0
        || (split.income ?? 0) > 0,
    );
  }

  private computeNextDueDate(currentDueDate: Date, periodicity: string, dayOfPeriod: number | null) {
    const next = new Date(currentDueDate);

    if (periodicity === Periodicity.DAILY) {
      next.setUTCDate(next.getUTCDate() + 1);
      return next;
    }

    if (periodicity === Periodicity.WEEKLY) {
      next.setUTCDate(next.getUTCDate() + 7);
      return next;
    }

    const targetDay = dayOfPeriod ?? currentDueDate.getUTCDate();
    const monthIncrement =
      periodicity === Periodicity.BIMONTHLY
        ? 2
        : periodicity === Periodicity.QUARTERLY
        ? 3
        : periodicity === Periodicity.SEMIANNUAL
          ? 6
        : periodicity === Periodicity.ANNUAL
          ? 12
          : 1;

    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + monthIncrement);
    const lastDayOfMonth = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(targetDay, lastDayOfMonth));

    return next;
  }

  private resolveOperationType(
    expense: number,
    income: number,
    splits: Array<{ expense: number; income: number }>,
  ) {
    if (splits.length === 0) {
      return null;
    }

    const operationBalance = income - expense;
    const splitBalance = splits.reduce(
      (total, split) => total + (split.income - split.expense),
      0,
    );

    return Math.abs(operationBalance - splitBalance) < 0.005
      ? OperationType.SPLIT
      : OperationType.PARTIAL;
  }

  private presenter(subscription: SubscriptionWithRelations) {
    const {
      account,
      thirdParty,
      category,
      budget,
      movementType,
      lastGeneratedOperation,
      splits,
      planning,
      ...rest
    } = subscription;

    return {
      ...rest,
      compte: account,
      tiers: thirdParty,
      categorie: category,
      enveloppe: budget,
      typeMouvement: movementType,
      operationGeneree: lastGeneratedOperation,
      splits: splits.map(split => ({
        ...split,
        categorie: split.category,
        enveloppe: split.budget,
      })),
      planning,
    };
  }

  private async findEligibleSubscriptions(dateRef: Date) {
    return this.prisma.subscription.findMany({
      where: {
        active: true,
        nextDueDate: {
          lte: dateRef,
        },
      },
      include: {
        account: { select: { id: true, name: true } },
        thirdParty: { select: { id: true, name: true } },
        splits: true,
      },
      orderBy: {
        nextDueDate: 'asc',
      },
    });
  }

  async findAll(filters: SubscriptionFiltersDto) {
    const { search, active, periodicity, highlightId, page, limit, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    const where = {
      ...(active !== undefined && { active }),
      ...(periodicity && { periodicity }),
      ...(search && {
        OR: [
          { label: { contains: search, mode: 'insensitive' as const } },
          { entryLabel: { contains: search, mode: 'insensitive' as const } },
          { thirdParty: { name: { contains: search, mode: 'insensitive' as const } } },
          { account: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const orderBy = { [sortBy]: sortOrder };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        include: this.include,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    let highlightIndex: number | null = null;
    if (highlightId) {
      const orderedIds = await this.prisma.subscription.findMany({ where, orderBy, select: { id: true } });
      const index = orderedIds.findIndex(subscription => subscription.id === highlightId);
      highlightIndex = index >= 0 ? index : null;
    }

    return {
      items: items.map(item => this.presenter(item as SubscriptionWithRelations)),
      total,
      page,
      limit,
      highlightIndex,
    };
  }

  async findOne(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: this.include,
    });

    if (!subscription) {
      throw new NotFoundException(`Abonnement ${id} introuvable`);
    }

    return this.presenter(subscription as SubscriptionWithRelations);
  }

  async create(dto: CreateSubscriptionDto) {
    const splits = this.normalizeSplits(dto.splits);
    await this.assertSubscriptionEntitiesActive({
      accountId: dto.accountId,
      budgetId: dto.budgetId,
      categoryId: dto.categoryId,
      thirdPartyId: dto.thirdPartyId,
      splits,
    });
    const firstDueDate = new Date(dto.firstDueDate);

    const subscription = await this.prisma.subscription.create({
      data: {
        accountId: dto.accountId,
        label: dto.label,
        entryLabel: dto.entryLabel ?? null,
        expense: dto.expense ?? 0,
        income: dto.income ?? 0,
        periodicity: dto.periodicity,
        dayOfPeriod: dto.dayOfPeriod ?? null,
        subscriptionType: dto.subscriptionType ?? null,
        firstDueDate,
        nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : firstDueDate,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        active: dto.active ?? true,
        hasSplits: splits.length > 0,
        categoryId: dto.categoryId ?? null,
        budgetId: dto.budgetId ?? null,
        thirdPartyId: dto.thirdPartyId ?? null,
        movementTypeId: dto.movementTypeId ?? null,
        splits: splits.length > 0 ? {
          create: splits.map(split => ({
            label: split.label ?? null,
            expense: split.expense ?? 0,
            income: split.income ?? 0,
            balance: (split.income ?? 0) - (split.expense ?? 0),
            categoryId: split.categoryId ?? null,
            budgetId: split.budgetId ?? null,
          })),
        } : undefined,
      },
      include: this.include,
    });

    return this.presenter(subscription as SubscriptionWithRelations);
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    const existing = await this.findOne(id);

    const splits = dto.splits !== undefined ? this.normalizeSplits(dto.splits) : undefined;

    const existingBudgetIds = new Set(existing.splits.map(split => split.budgetId).filter(Boolean));
    const existingCategoryIds = new Set(existing.splits.map(split => split.categoryId).filter(Boolean));

    await this.assertSubscriptionEntitiesActive({
      accountId: dto.accountId !== undefined && dto.accountId !== existing.accountId ? dto.accountId : undefined,
      budgetId: dto.budgetId !== undefined && dto.budgetId !== existing.budgetId ? dto.budgetId : undefined,
      categoryId: dto.categoryId !== undefined && dto.categoryId !== existing.categoryId ? dto.categoryId : undefined,
      thirdPartyId:
        dto.thirdPartyId !== undefined && dto.thirdPartyId !== existing.thirdPartyId ? dto.thirdPartyId : undefined,
      splits: (splits ?? [])
        .filter(
          split =>
            (split.budgetId && !existingBudgetIds.has(split.budgetId))
            || (split.categoryId && !existingCategoryIds.has(split.categoryId)),
        )
        .map(split => ({ budgetId: split.budgetId, categoryId: split.categoryId })),
    });

    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        ...(dto.accountId !== undefined && { accountId: dto.accountId }),
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.entryLabel !== undefined && { entryLabel: dto.entryLabel ?? null }),
        ...(dto.expense !== undefined && { expense: dto.expense }),
        ...(dto.income !== undefined && { income: dto.income }),
        ...(dto.periodicity !== undefined && { periodicity: dto.periodicity }),
        ...(dto.dayOfPeriod !== undefined && { dayOfPeriod: dto.dayOfPeriod ?? null }),
        ...(dto.subscriptionType !== undefined && { subscriptionType: dto.subscriptionType ?? null }),
        ...(dto.firstDueDate !== undefined && { firstDueDate: new Date(dto.firstDueDate) }),
        ...(dto.nextDueDate !== undefined && { nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId ?? null }),
        ...(dto.budgetId !== undefined && { budgetId: dto.budgetId ?? null }),
        ...(dto.thirdPartyId !== undefined && { thirdPartyId: dto.thirdPartyId ?? null }),
        ...(dto.movementTypeId !== undefined && { movementTypeId: dto.movementTypeId ?? null }),
        ...(splits !== undefined && {
          hasSplits: splits.length > 0,
          splits: {
            deleteMany: {},
            create: splits.map(split => ({
              label: split.label ?? null,
              expense: split.expense ?? 0,
              income: split.income ?? 0,
              balance: (split.income ?? 0) - (split.expense ?? 0),
              categoryId: split.categoryId ?? null,
              budgetId: split.budgetId ?? null,
            })),
          },
        }),
      },
      include: this.include,
    });

    return this.presenter(subscription as SubscriptionWithRelations);
  }

  async previewGeneration(dto: PreviewSubscriptionsGenerationDto) {
    const dateRef = new Date(dto.dateRef);
    const eligibleSubscriptions = await this.findEligibleSubscriptions(dateRef);

    return {
      dateRef: dateRef.toISOString(),
      totalEligible: eligibleSubscriptions.length,
      items: eligibleSubscriptions.map(subscription => ({
        id: subscription.id,
        label: subscription.label,
        entryLabel: subscription.entryLabel,
        subscriptionType: subscription.subscriptionType,
        nextDueDate: subscription.nextDueDate?.toISOString() ?? null,
        endDate: subscription.endDate?.toISOString() ?? null,
        periodicity: subscription.periodicity,
        account: subscription.account,
        thirdParty: subscription.thirdParty,
        hasSplits: subscription.hasSplits,
        splitCount: subscription.splits.length,
      })),
    };
  }

  async generateDue(dto: GenerateSubscriptionsDto) {
    const dateRef = new Date(dto.dateRef);
    const selectedIds = dto.subscriptionIds ?? [];
    const eligibleSubscriptions = await this.findEligibleSubscriptions(dateRef);
    const dueSubscriptions =
      selectedIds.length > 0
        ? eligibleSubscriptions.filter(subscription => selectedIds.includes(subscription.id))
        : [];

    let generatedOperations = 0;
    const generatedBySubscription: Array<{
      id: string;
      label: string;
      generated: number;
      lastDueDate: string | null;
      nextDueDate: string | null;
    }> = [];

    for (const subscription of dueSubscriptions) {
      let currentDueDate = subscription.nextDueDate;
      let generatedForSubscription = 0;
      let lastOperationId: string | null = subscription.lastGeneratedOperationId;
      let lastGeneratedDueDate: Date | null = subscription.lastGeneratedDueDate;

      if (!currentDueDate) {
        continue;
      }

      while (currentDueDate && currentDueDate <= dateRef) {
        if (subscription.endDate && currentDueDate > subscription.endDate) {
          currentDueDate = null;
          break;
        }

        const splitPayload = subscription.splits.map(split => ({
          label: split.label,
          expense: Number(split.expense),
          income: Number(split.income),
          categoryId: split.categoryId,
          budgetId: split.budgetId,
        }));

        const createdOperation = await this.prisma.operation.create({
          data: {
            accountId: subscription.accountId,
            label:
              subscription.subscriptionType === 'simulation'
                ? `[SIMULATION] ${subscription.label}`
                : subscription.label,
            expense: subscription.expense,
            income: subscription.income,
            simulation: subscription.subscriptionType === 'simulation',
            operationDate: currentDueDate,
            dueDate: currentDueDate,
            budgetId: subscription.budgetId,
            categoryId: subscription.categoryId,
            thirdPartyId: subscription.thirdPartyId,
            movementTypeId: subscription.movementTypeId,
            subscriptionId: subscription.id,
            operationValidated: null,
            entryMode: 'T',
            comment:
              subscription.subscriptionType === 'simulation'
                ? 'Écriture générée en mode simulation.'
                : null,
            operationType: this.resolveOperationType(
              Number(subscription.expense),
              Number(subscription.income),
              splitPayload,
            ),
            splits: splitPayload.length > 0 ? {
              create: splitPayload.map(split => ({
                label: split.label ?? null,
                expense: split.expense,
                income: split.income,
                categoryId: split.categoryId ?? null,
                budgetId: split.budgetId ?? null,
              })),
            } : undefined,
          },
          select: { id: true },
        });

        await this.prisma.subscriptionPlanning.create({
          data: {
            subscriptionId: subscription.id,
            dueDate: currentDueDate,
            generatedAt: new Date(),
            status: 'generated',
            operationId: createdOperation.id,
          },
        });

        generatedForSubscription += 1;
        generatedOperations += 1;
        lastOperationId = createdOperation.id;
        lastGeneratedDueDate = currentDueDate;
        currentDueDate = this.computeNextDueDate(
          currentDueDate,
          subscription.periodicity,
          subscription.dayOfPeriod,
        );
      }

      if (generatedForSubscription > 0) {
        const nextDueDate =
          currentDueDate && (!subscription.endDate || currentDueDate <= subscription.endDate)
            ? currentDueDate
            : null;

        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            nextDueDate,
            lastGeneratedDate: new Date(),
            lastGeneratedDueDate,
            lastGeneratedOperationId: lastOperationId,
          },
        });

        await this.prisma.subscriptionRun.create({
          data: {
            subscriptionId: subscription.id,
            dateRef,
            generated: generatedForSubscription,
          },
        });

        generatedBySubscription.push({
          id: subscription.id,
          label: subscription.label,
          generated: generatedForSubscription,
          lastDueDate: lastGeneratedDueDate?.toISOString() ?? null,
          nextDueDate: nextDueDate?.toISOString() ?? null,
        });
      }
    }

    return {
      dateRef: dateRef.toISOString(),
      subscriptionsProcessed: generatedBySubscription.length,
      generatedOperations,
      items: generatedBySubscription,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.subscription.delete({ where: { id } });
  }
}
