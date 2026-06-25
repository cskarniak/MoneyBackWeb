import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationType } from '@moneyback/shared';
import type {
  CreateOperationDto,
  OperationFiltersDto,
  UpdateOperationDto,
} from '@moneyback/shared';

@Injectable()
export class OperationsService {
  constructor(private prisma: PrismaService) {}

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

    const operationAmount = Number(operation.income ?? 0) > 0
      ? Number(operation.income ?? 0)
      : Number(operation.expense ?? 0);
    const splitAmount = splits.reduce(
      (total, split) => total + (Number(split.income ?? 0) > 0 ? Number(split.income ?? 0) : Number(split.expense ?? 0)),
      0,
    );

    return Math.abs(operationAmount - splitAmount) < 0.005
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
      select: { expense: true, income: true },
    });
    if (!existingOperation) {
      throw new NotFoundException(`Opération ${id} introuvable`);
    }

    const splits = dto.splits?.filter(
      split =>
        split.label || split.categoryId || split.budgetId || (split.expense ?? 0) > 0 || (split.income ?? 0) > 0,
    );

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

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.operation.delete({ where: { id } });
  }
}
