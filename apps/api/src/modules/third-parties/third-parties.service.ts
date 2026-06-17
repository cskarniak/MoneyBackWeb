import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateThirdPartyDto,
  ThirdPartyFiltersDto,
  ThirdPartyMatchingRuleDto,
  UpdateThirdPartyDto,
} from '@moneyback/shared';

@Injectable()
export class ThirdPartiesService {
  constructor(private prisma: PrismaService) {}

  private presenter(thirdParty: {
    id: string;
    name: string;
    comment: string | null;
    ventilated: boolean;
    active: boolean;
    categoryId: string | null;
    budgetId: string | null;
    category: { id: string; label: string } | null;
    budget: { id: string; label: string } | null;
    matchingRules: Array<{
      id: string;
      label: string;
      description: string | null;
      active: boolean;
      priority: number;
      score: number;
      operator: string;
      stopOnMatch: boolean;
      conditions: Array<{
        id: string;
        field: string;
        matcher: string;
        value: string | null;
        value2: string | null;
        negate: boolean;
        position: number;
      }>;
    }>;
    splits: Array<{
      id: string;
      label: string | null;
      expense: unknown;
      income: unknown;
      balance: unknown;
      categoryId: string | null;
      budgetId: string | null;
      category: { id: string; label: string } | null;
      budget: { id: string; label: string } | null;
    }>;
  }) {
    const { category, budget, matchingRules, splits, ...rest } = thirdParty;

    return {
      ...rest,
      categorie: category,
      enveloppe: budget,
      matchingRules,
      splits: splits.map(split => ({
        ...split,
        categorie: split.category,
        enveloppe: split.budget,
      })),
    };
  }

  async findAll(filters: ThirdPartyFiltersDto) {
    const { search, active, page, limit, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    const where = {
      ...(active !== undefined && { active }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { comment: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const orderBy = { [sortBy]: sortOrder };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.thirdParty.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, label: true } },
          budget: { select: { id: true, label: true } },
          matchingRules: {
            include: {
              conditions: {
                orderBy: { position: 'asc' },
              },
            },
            orderBy: [
              { priority: 'asc' },
              { createdAt: 'asc' },
            ],
          },
          splits: {
            include: {
              category: { select: { id: true, label: true } },
              budget: { select: { id: true, label: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.thirdParty.count({ where }),
    ]);

    return { items: items.map(item => this.presenter(item)), total, page, limit };
  }

  async findOne(id: string) {
    const thirdParty = await this.prisma.thirdParty.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, label: true } },
        budget: { select: { id: true, label: true } },
        matchingRules: {
          include: {
            conditions: {
              orderBy: { position: 'asc' },
            },
          },
          orderBy: [
            { priority: 'asc' },
            { createdAt: 'asc' },
          ],
        },
        splits: {
          include: {
            category: { select: { id: true, label: true } },
            budget: { select: { id: true, label: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!thirdParty) throw new NotFoundException(`Tiers ${id} introuvable`);
    return this.presenter(thirdParty);
  }

  async create(dto: CreateThirdPartyDto) {
    const matchingRules = (dto as CreateThirdPartyDto & { matchingRules?: ThirdPartyMatchingRuleDto[] }).matchingRules;
    const splits = (dto.splits ?? []).filter(
      split =>
        split.label || split.categoryId || split.budgetId || (split.expense ?? 0) > 0 || (split.income ?? 0) > 0,
    );

    const thirdParty = await this.prisma.thirdParty.create({
      data: {
        name: dto.name,
        comment: dto.comment ?? null,
        ventilated: dto.ventilated ?? false,
        categoryId: dto.categoryId ?? null,
        budgetId: dto.budgetId ?? null,
        active: dto.active ?? true,
        matchingRules: this.buildMatchingRulesCreate(matchingRules ?? []),
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
      include: {
        category: { select: { id: true, label: true } },
        budget: { select: { id: true, label: true } },
        matchingRules: {
          include: {
            conditions: {
              orderBy: { position: 'asc' },
            },
          },
          orderBy: [
            { priority: 'asc' },
            { createdAt: 'asc' },
          ],
        },
        splits: {
          include: {
            category: { select: { id: true, label: true } },
            budget: { select: { id: true, label: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return this.presenter(thirdParty);
  }

  async update(id: string, dto: UpdateThirdPartyDto) {
    await this.findOne(id);
    const matchingRules = (dto as UpdateThirdPartyDto & { matchingRules?: ThirdPartyMatchingRuleDto[] }).matchingRules;
    const splits = dto.splits?.filter(
      split =>
        split.label || split.categoryId || split.budgetId || (split.expense ?? 0) > 0 || (split.income ?? 0) > 0,
    );

    const thirdParty = await this.prisma.thirdParty.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.comment !== undefined && { comment: dto.comment ?? null }),
        ...(dto.ventilated !== undefined && { ventilated: dto.ventilated }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId ?? null }),
        ...(dto.budgetId !== undefined && { budgetId: dto.budgetId ?? null }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(matchingRules !== undefined && {
          matchingRules: {
            deleteMany: {},
            ...this.buildMatchingRulesCreate(matchingRules),
          },
        }),
        ...(splits !== undefined && {
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
      include: {
        category: { select: { id: true, label: true } },
        budget: { select: { id: true, label: true } },
        matchingRules: {
          include: {
            conditions: {
              orderBy: { position: 'asc' },
            },
          },
          orderBy: [
            { priority: 'asc' },
            { createdAt: 'asc' },
          ],
        },
        splits: {
          include: {
            category: { select: { id: true, label: true } },
            budget: { select: { id: true, label: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return this.presenter(thirdParty);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.thirdParty.delete({ where: { id } });
  }

  private buildMatchingRulesCreate(rules: ThirdPartyMatchingRuleDto[]) {
    const normalizedRules = rules
      .map(rule => ({
        ...rule,
        label: rule.label.trim(),
        description: rule.description?.trim() ?? null,
        conditions: rule.conditions
          .map((condition, index) => ({
            ...condition,
            value: condition.value?.trim() ?? null,
            value2: condition.value2?.trim() ?? null,
            position: index,
          }))
          .filter(condition => condition.value || condition.value2),
      }))
      .filter(rule => rule.label.length > 0);

    return normalizedRules.length > 0
      ? {
          create: normalizedRules.map(rule => ({
            label: rule.label,
            description: rule.description,
            active: rule.active,
            priority: rule.priority,
            score: rule.score,
            operator: rule.operator,
            stopOnMatch: rule.stopOnMatch,
            conditions: {
              create: rule.conditions.map(condition => ({
                field: condition.field,
                matcher: condition.matcher,
                value: condition.value,
                value2: condition.value2,
                negate: condition.negate,
                position: condition.position,
              })),
            },
          })),
        }
      : undefined;
  }
}
