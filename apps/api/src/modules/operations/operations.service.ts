import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationType } from '@moneyback/shared';
import type {
  AutoAssignOperationThirdPartiesDto,
  CreateOperationDto,
  DeleteStatementImportDto,
  OperationFiltersDto,
  UpdateOperationDto,
} from '@moneyback/shared';
import { ThirdPartyMatchingService } from '../third-parties/third-party-matching.service';

@Injectable()
export class OperationsService {
  constructor(
    private prisma: PrismaService,
    private thirdPartyMatchingService: ThirdPartyMatchingService,
  ) {}

  private async assertAccountActive(accountId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId }, select: { closed: true } });
    if (!account) throw new NotFoundException(`Compte ${accountId} introuvable`);
    if (account.closed) {
      throw new BadRequestException('Ce compte est inactif : il ne peut plus recevoir de nouvelles opérations');
    }
  }

  private async assertBudgetActive(budgetId: string) {
    const budget = await this.prisma.budget.findUnique({ where: { id: budgetId }, select: { active: true } });
    if (!budget) throw new NotFoundException(`Enveloppe ${budgetId} introuvable`);
    if (!budget.active) {
      throw new BadRequestException('Cette enveloppe est inactive : elle ne peut plus être affectée à une opération');
    }
  }

  private async assertCategoryActive(categoryId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId }, select: { active: true } });
    if (!category) throw new NotFoundException(`Catégorie ${categoryId} introuvable`);
    if (!category.active) {
      throw new BadRequestException('Cette catégorie est inactive : elle ne peut plus être affectée à une opération');
    }
  }

  private async assertThirdPartyActive(thirdPartyId: string) {
    const thirdParty = await this.prisma.thirdParty.findUnique({ where: { id: thirdPartyId }, select: { active: true } });
    if (!thirdParty) throw new NotFoundException(`Tiers ${thirdPartyId} introuvable`);
    if (!thirdParty.active) {
      throw new BadRequestException('Ce tiers est inactif : il ne peut plus être affecté à une opération');
    }
  }

  private async assertOperationEntitiesActive(dto: {
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

  async findUsedStatementRefs(accountId?: string) {
    const rows = await this.prisma.operation.findMany({
      where: {
        ...(accountId ? { accountId } : {}),
        statementRef: { not: null },
      },
      select: {
        statementRef: true,
      },
      distinct: ['statementRef'],
    });

    return Array.from(
      new Set(
        rows
          .map(row => row.statementRef?.trim() ?? '')
          .filter((statementRef): statementRef is string => statementRef.length > 0),
      ),
    ).sort((left, right) => right.localeCompare(left, 'fr-FR', { numeric: true, sensitivity: 'base' }));
  }

  private resolveValidationFields(operationValidated?: string | null) {
    return operationValidated === 'V'
      ? { operationValidated: 'V', entryMode: 'E' }
      : { operationValidated: null, entryMode: 'T' };
  }

  private resolveOperationType(
    operation: Pick<CreateOperationDto, 'expense' | 'income'>,
    splits: Array<Pick<NonNullable<CreateOperationDto['splits']>[number], 'expense' | 'income'>>,
  ) {
    if (splits.length === 0) {
      return null;
    }

    const operationBalance = Number(operation.income ?? 0) - Number(operation.expense ?? 0);
    const splitBalance = splits.reduce(
      (total, split) => total + (Number(split.income ?? 0) - Number(split.expense ?? 0)),
      0,
    );

    return Math.abs(operationBalance - splitBalance) < 0.005
      ? OperationType.SPLIT
      : OperationType.PARTIAL;
  }

  private presenter(operation: {
    id: string;
    idSource: string | null;
    label: string;
    expense: unknown;
    income: unknown;
    balance: unknown;
    simulation: boolean;
    operationDate: Date;
    dueDate: Date | null;
    integrationDate: Date | null;
    pieceNumber: string | null;
    lettering: string | null;
    comment: string | null;
    statementRef: string | null;
    operationType: string | null;
    entryMode: string | null;
    operationValidated: string | null;
    locked: boolean;
    closed: boolean;
    createdAt: Date;
    updatedAt: Date;
    accountId: string;
    budgetId: string | null;
    categoryId: string | null;
    thirdPartyId: string | null;
    paymentMethodId: string | null;
    movementTypeId: string | null;
    account: { id: string; name: string } | null;
    budget: { id: string; label: string } | null;
    category: { id: string; label: string } | null;
    thirdParty: { id: string; name: string } | null;
    paymentMethod: { id: string; label: string; code: string | null } | null;
    movementType: { id: string; label: string; code: string | null } | null;
    splits: Array<{
      id: string;
      label: string | null;
      expense: unknown;
      income: unknown;
      balance: unknown;
      createdAt: Date;
      updatedAt: Date;
      categoryId: string | null;
      budgetId: string | null;
      category: { id: string; label: string } | null;
      budget: { id: string; label: string } | null;
    }>;
  }) {
    const { account, budget, category, thirdParty, paymentMethod, movementType, splits, ...rest } = operation;

    return {
      ...rest,
      compte: account,
      enveloppe: budget,
      categorie: category,
      tiers: thirdParty,
      moyenPaiement: paymentMethod,
      typeMouvement: movementType,
      splits: splits.map(split => ({
        ...split,
        categorie: split.category,
        enveloppe: split.budget,
      })),
    };
  }

  async findAll(filters: OperationFiltersDto) {
    const {
      operationId,
      accountId,
      budgetId,
      categoryId,
      thirdPartyId,
      statementRef,
      dateFrom,
      dateTo,
      locked,
      hideLocked,
      emptyEnvelopeOnly,
      unvalidatedOnly,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    } = filters;
    const skip = (page - 1) * limit;
    const numericSearch = search
      ? Number(search.replace(',', '.').trim())
      : Number.NaN;
    const hasNumericSearch = Number.isFinite(numericSearch);

    const where = {
      ...(operationId && { id: operationId }),
      ...(accountId && { accountId }),
      ...(budgetId && { budgetId }),
      ...(categoryId && { categoryId }),
      ...(thirdPartyId && { thirdPartyId }),
      ...(statementRef && { statementRef: { contains: statementRef, mode: 'insensitive' as const } }),
      ...(locked !== undefined && { locked }),
      ...(hideLocked && { locked: false }),
      ...(emptyEnvelopeOnly && {
        budgetId: null,
        splits: {
          none: {
            budgetId: {
              not: null,
            },
          },
        },
      }),
      ...(unvalidatedOnly && {
        NOT: {
          operationValidated: 'V',
        },
      }),
      ...(dateFrom || dateTo
        ? {
            operationDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { label: { contains: search, mode: 'insensitive' as const } },
              { comment: { contains: search, mode: 'insensitive' as const } },
              { lettering: { contains: search, mode: 'insensitive' as const } },
              { pieceNumber: { contains: search, mode: 'insensitive' as const } },
              { statementRef: { contains: search, mode: 'insensitive' as const } },
              { account: { name: { contains: search, mode: 'insensitive' as const } } },
              { category: { label: { contains: search, mode: 'insensitive' as const } } },
              { budget: { label: { contains: search, mode: 'insensitive' as const } } },
              { thirdParty: { name: { contains: search, mode: 'insensitive' as const } } },
              { paymentMethod: { label: { contains: search, mode: 'insensitive' as const } } },
              { movementType: { label: { contains: search, mode: 'insensitive' as const } } },
              ...(hasNumericSearch
                ? [
                    { expense: numericSearch },
                    { income: numericSearch },
                    { splits: { some: { expense: numericSearch } } },
                    { splits: { some: { income: numericSearch } } },
                  ]
                : []),
              { splits: { some: { label: { contains: search, mode: 'insensitive' as const } } } },
              { splits: { some: { category: { label: { contains: search, mode: 'insensitive' as const } } } } },
              { splits: { some: { budget: { label: { contains: search, mode: 'insensitive' as const } } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.operation.findMany({
        where,
        include: {
          account: { select: { id: true, name: true } },
          budget: { select: { id: true, label: true } },
          category: { select: { id: true, label: true } },
          thirdParty: { select: { id: true, name: true } },
          paymentMethod: { select: { id: true, label: true, code: true } },
          movementType: { select: { id: true, label: true, code: true } },
          splits: {
            include: {
              category: { select: { id: true, label: true } },
              budget: { select: { id: true, label: true } },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.operation.count({ where }),
    ]);

    return { items: items.map(item => this.presenter(item)), total, page, limit };
  }

  async autoAssignThirdParties(dto: AutoAssignOperationThirdPartiesDto) {
    const rules = await this.thirdPartyMatchingService.loadActiveRules();

    const scopeWhere = {
      deletedAt: null,
      ...(dto.accountId ? { accountId: dto.accountId } : {}),
      ...((dto.operationDateFrom || dto.operationDateTo)
        ? {
            operationDate: {
              ...(dto.operationDateFrom ? { gte: new Date(dto.operationDateFrom) } : {}),
              ...(dto.operationDateTo ? { lte: new Date(dto.operationDateTo) } : {}),
            },
          }
        : {}),
    };

    const beforeWithoutBudgetCount = await this.prisma.operation.count({
      where: { ...scopeWhere, budgetId: null },
    });

    const operations = await this.prisma.operation.findMany({
      where: {
        ...scopeWhere,
        ...(dto.onlyWithoutBudget ? { budgetId: null } : {}),
      },
      select: {
        id: true,
        label: true,
        comment: true,
        expense: true,
        income: true,
        operationDate: true,
        accountId: true,
        statementRef: true,
        thirdPartyId: true,
        categoryId: true,
        budgetId: true,
        budget: {
          select: {
            label: true,
          },
        },
        thirdParty: {
          select: {
            name: true,
          },
        },
        _count: {
          select: { splits: true },
        },
      },
      orderBy: { operationDate: 'desc' },
    });

    const ventilatedThirdPartyIds = Array.from(
      new Set(rules.filter(rule => rule.thirdParty.ventilated).map(rule => rule.thirdPartyId)),
    );
    const splitTemplatesByThirdParty = new Map<
      string,
      Array<{ label: string | null; expense: number; income: number; categoryId: string | null; budgetId: string | null }>
    >();
    if (ventilatedThirdPartyIds.length > 0) {
      const splitTemplates = await this.prisma.thirdPartySplit.findMany({
        where: { thirdPartyId: { in: ventilatedThirdPartyIds } },
      });
      for (const template of splitTemplates) {
        const list = splitTemplatesByThirdParty.get(template.thirdPartyId) ?? [];
        list.push({
          label: template.label,
          expense: Number(template.expense),
          income: Number(template.income),
          categoryId: template.categoryId,
          budgetId: template.budgetId,
        });
        splitTemplatesByThirdParty.set(template.thirdPartyId, list);
      }
    }

    let matchedCount = 0;
    let updatedCount = 0;
    let assignedBudgetCount = 0;
    const details: Array<{
      operationId: string;
      operationDate: string;
      label: string;
      previousThirdPartyName: string | null;
      previousBudgetLabel: string | null;
      thirdPartyName: string;
      nextBudgetLabel: string | null;
      matchedRuleLabel: string;
      updated: boolean;
    }> = [];

    for (const operation of operations) {
      if (dto.onlyWithoutBudget && operation.budgetId) {
        continue;
      }

      const amount = Number(operation.income) > 0 ? Number(operation.income) : Number(operation.expense);
      const match = this.thirdPartyMatchingService.matchCandidateWithRules({
        label: operation.label,
        amount,
        direction: Number(operation.income) > 0 ? 'income' : 'expense',
        accountId: operation.accountId,
        statementRef: operation.statementRef,
        memo: operation.comment,
        dayOfMonth: operation.operationDate.getUTCDate(),
      }, rules);

      if (!match) {
        continue;
      }

      matchedCount += 1;

      const templateSplits = match.ventilated ? splitTemplatesByThirdParty.get(match.thirdPartyId) ?? [] : [];
      const hasSplitTemplate = templateSplits.length > 0;

      const nextCategoryId = match.ventilated ? null : match.categoryId;
      const nextBudgetId = match.ventilated ? null : match.budgetId;
      const assignsBudget = match.ventilated
        ? templateSplits.some(split => split.budgetId)
        : Boolean(nextBudgetId);
      if (assignsBudget) {
        assignedBudgetCount += 1;
      }

      const needsUpdate =
        operation.thirdPartyId !== match.thirdPartyId
        || operation.categoryId !== nextCategoryId
        || operation.budgetId !== nextBudgetId
        || (hasSplitTemplate && operation._count.splits === 0);

      if (dto.applyChanges && needsUpdate) {
        await this.prisma.operation.update({
          where: { id: operation.id },
          data: {
            thirdPartyId: match.thirdPartyId,
            categoryId: nextCategoryId,
            budgetId: nextBudgetId,
            operationType: hasSplitTemplate
              ? this.resolveOperationType(
                  { expense: Number(operation.expense), income: Number(operation.income) },
                  templateSplits,
                )
              : null,
            ...(hasSplitTemplate
              ? {
                  splits: {
                    deleteMany: {},
                    create: templateSplits.map(split => ({
                      label: split.label,
                      expense: split.expense,
                      income: split.income,
                      categoryId: split.categoryId,
                      budgetId: split.budgetId,
                    })),
                  },
                }
              : {}),
          },
        });
        updatedCount += 1;
      }

      if (needsUpdate) {
        details.push({
          operationId: operation.id,
          operationDate: operation.operationDate.toISOString(),
          label: operation.label,
          previousThirdPartyName: operation.thirdParty?.name ?? null,
          previousBudgetLabel: operation.budget?.label ?? null,
          thirdPartyName: match.thirdPartyName,
          nextBudgetLabel: match.ventilated
            ? (hasSplitTemplate ? `Ventilé (${templateSplits.length} ligne(s))` : 'Ventilé (aucun modèle de ventilation)')
            : match.budgetLabel,
          matchedRuleLabel: match.matchedRuleLabel,
          updated: needsUpdate,
        });
      }
    }

    const afterWithoutBudgetCount = await this.prisma.operation.count({
      where: { ...scopeWhere, budgetId: null },
    });

    const assignmentRate =
      beforeWithoutBudgetCount > 0
        ? ((beforeWithoutBudgetCount - afterWithoutBudgetCount) / beforeWithoutBudgetCount) * 100
        : null;

    return {
      onlyWithoutBudget: dto.onlyWithoutBudget,
      applyChanges: dto.applyChanges,
      scannedCount: operations.length,
      matchedCount,
      updatedCount,
      assignedBudgetCount,
      beforeWithoutBudgetCount,
      afterWithoutBudgetCount,
      assignmentRate,
      details: details.slice(0, 100),
    };
  }

  async findOne(id: string) {
    const operation = await this.prisma.operation.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, name: true } },
        budget: { select: { id: true, label: true } },
        category: { select: { id: true, label: true } },
        thirdParty: { select: { id: true, name: true } },
        paymentMethod: { select: { id: true, label: true, code: true } },
        movementType: { select: { id: true, label: true, code: true } },
        splits: {
          include: {
            category: { select: { id: true, label: true } },
            budget: { select: { id: true, label: true } },
          },
        },
      },
    });
    if (!operation) throw new NotFoundException(`Opération ${id} introuvable`);
    return this.presenter(operation);
  }

  async create(dto: CreateOperationDto) {
    const splits = (dto.splits ?? []).filter(split => split.label || split.categoryId || split.budgetId || split.expense > 0 || split.income > 0);
    await this.assertOperationEntitiesActive({
      accountId: dto.accountId,
      budgetId: dto.budgetId,
      categoryId: dto.categoryId,
      thirdPartyId: dto.thirdPartyId,
      splits,
    });
    const operation = await this.prisma.operation.create({
      data: {
        accountId: dto.accountId,
        label: dto.label,
        expense: dto.expense ?? 0,
        income: dto.income ?? 0,
        operationDate: new Date(dto.operationDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        budgetId: dto.budgetId ?? null,
        categoryId: dto.categoryId ?? null,
        thirdPartyId: dto.thirdPartyId ?? null,
        paymentMethodId: dto.paymentMethodId ?? null,
        movementTypeId: dto.movementTypeId ?? null,
        lettering: dto.lettering ?? null,
        comment: dto.comment ?? null,
        simulation: dto.simulation ?? false,
        pieceNumber: dto.pieceNumber ?? null,
        statementRef: dto.statementRef ?? null,
        ...this.resolveValidationFields(dto.operationValidated ?? 'V'),
        locked: dto.locked ?? false,
        closed: dto.closed ?? false,
        operationType: this.resolveOperationType(dto, splits),
        splits: splits.length > 0 ? {
          create: splits.map(split => ({
            label: split.label ?? null,
            expense: split.expense ?? 0,
            income: split.income ?? 0,
            categoryId: split.categoryId ?? null,
            budgetId: split.budgetId ?? null,
          })),
        } : undefined,
      },
      include: {
        account: { select: { id: true, name: true } },
        budget: { select: { id: true, label: true } },
        category: { select: { id: true, label: true } },
        thirdParty: { select: { id: true, name: true } },
        paymentMethod: { select: { id: true, label: true, code: true } },
        movementType: { select: { id: true, label: true, code: true } },
        splits: {
          include: {
            category: { select: { id: true, label: true } },
            budget: { select: { id: true, label: true } },
          },
        },
      },
    });

    return this.presenter(operation);
  }

  async update(id: string, dto: UpdateOperationDto) {
    const existingOperation = await this.prisma.operation.findUnique({
      where: { id },
      select: {
        expense: true,
        income: true,
        accountId: true,
        budgetId: true,
        categoryId: true,
        thirdPartyId: true,
        splits: { select: { categoryId: true, budgetId: true } },
      },
    });
    if (!existingOperation) {
      throw new NotFoundException(`Opération ${id} introuvable`);
    }

    const splits = dto.splits?.filter(
      split =>
        split.label || split.categoryId || split.budgetId || (split.expense ?? 0) > 0 || (split.income ?? 0) > 0,
    );

    const existingBudgetIds = new Set(existingOperation.splits.map(split => split.budgetId).filter(Boolean));
    const existingCategoryIds = new Set(existingOperation.splits.map(split => split.categoryId).filter(Boolean));

    await this.assertOperationEntitiesActive({
      accountId: dto.accountId !== undefined && dto.accountId !== existingOperation.accountId ? dto.accountId : undefined,
      budgetId: dto.budgetId !== undefined && dto.budgetId !== existingOperation.budgetId ? dto.budgetId : undefined,
      categoryId:
        dto.categoryId !== undefined && dto.categoryId !== existingOperation.categoryId ? dto.categoryId : undefined,
      thirdPartyId:
        dto.thirdPartyId !== undefined && dto.thirdPartyId !== existingOperation.thirdPartyId
          ? dto.thirdPartyId
          : undefined,
      splits: (splits ?? [])
        .filter(
          split =>
            (split.budgetId && !existingBudgetIds.has(split.budgetId))
            || (split.categoryId && !existingCategoryIds.has(split.categoryId)),
        )
        .map(split => ({ budgetId: split.budgetId, categoryId: split.categoryId })),
    });

    const operation = await this.prisma.operation.update({
      where: { id },
      data: {
        ...(dto.accountId !== undefined && { accountId: dto.accountId }),
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.expense !== undefined && { expense: dto.expense }),
        ...(dto.income !== undefined && { income: dto.income }),
        ...(dto.operationDate !== undefined && { operationDate: new Date(dto.operationDate) }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.budgetId !== undefined && { budgetId: dto.budgetId ?? null }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId ?? null }),
        ...(dto.thirdPartyId !== undefined && { thirdPartyId: dto.thirdPartyId ?? null }),
        ...(dto.paymentMethodId !== undefined && { paymentMethodId: dto.paymentMethodId ?? null }),
        ...(dto.movementTypeId !== undefined && { movementTypeId: dto.movementTypeId ?? null }),
        ...(dto.lettering !== undefined && { lettering: dto.lettering ?? null }),
        ...(dto.comment !== undefined && { comment: dto.comment ?? null }),
        ...(dto.simulation !== undefined && { simulation: dto.simulation }),
        ...(dto.pieceNumber !== undefined && { pieceNumber: dto.pieceNumber ?? null }),
        ...(dto.statementRef !== undefined && { statementRef: dto.statementRef ?? null }),
        ...(dto.operationValidated !== undefined && this.resolveValidationFields(dto.operationValidated)),
        ...(dto.locked !== undefined && { locked: dto.locked }),
        ...(dto.closed !== undefined && { closed: dto.closed }),
        ...(splits !== undefined && {
          operationType: this.resolveOperationType(
            {
              expense: dto.expense ?? Number(existingOperation.expense),
              income: dto.income ?? Number(existingOperation.income),
            },
            splits,
          ),
          splits: {
            deleteMany: {},
            create: splits.map(split => ({
              label: split.label ?? null,
              expense: split.expense ?? 0,
              income: split.income ?? 0,
              categoryId: split.categoryId ?? null,
              budgetId: split.budgetId ?? null,
            })),
          },
        }),
      },
      include: {
        account: { select: { id: true, name: true } },
        budget: { select: { id: true, label: true } },
        category: { select: { id: true, label: true } },
        thirdParty: { select: { id: true, name: true } },
        paymentMethod: { select: { id: true, label: true, code: true } },
        movementType: { select: { id: true, label: true, code: true } },
        splits: {
          include: {
            category: { select: { id: true, label: true } },
            budget: { select: { id: true, label: true } },
          },
        },
      },
    });

    return this.presenter(operation);
  }

  async removeStatementImport(dto: DeleteStatementImportDto) {
    const statementRef = dto.statementRef.trim();

    const deleted = await this.prisma.operation.deleteMany({
      where: {
        accountId: dto.accountId,
        statementRef,
      },
    });

    return {
      accountId: dto.accountId,
      statementRef,
      deletedCount: deleted.count,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.operation.delete({ where: { id } });
  }
}
