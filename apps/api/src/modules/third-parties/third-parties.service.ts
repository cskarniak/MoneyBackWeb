import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateThirdPartyDto,
  ThirdPartyFiltersDto,
  ThirdPartyMatchingRuleDto,
  UpdateThirdPartyDto,
} from '@moneyback/shared';

const THIRD_PARTY_INCLUDE = {
  category: { select: { id: true, label: true } },
  budget: { select: { id: true, label: true } },
  movementType: { select: { id: true, label: true, code: true } },
  migratedTo: { select: { id: true, name: true } },
  matchingRules: {
    include: {
      conditions: {
        orderBy: { position: 'asc' as const },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  splits: {
    include: {
      category: { select: { id: true, label: true } },
      budget: { select: { id: true, label: true } },
    },
    orderBy: { position: 'asc' as const },
  },
};

@Injectable()
export class ThirdPartiesService {
  constructor(private prisma: PrismaService) {}

  private presenter(thirdParty: {
    id: string;
    name: string;
    idSource: string | null;
    comment: string | null;
    budgetBearer: boolean;
    ventilated: boolean;
    active: boolean;
    categoryId: string | null;
    budgetId: string | null;
    movementTypeId: string | null;
    category: { id: string; label: string } | null;
    budget: { id: string; label: string } | null;
    movementType: { id: string; label: string; code: string | null } | null;
    migratedToId: string | null;
    migratedTo: { id: string; name: string } | null;
    migrationReport: string | null;
    migratedAt: Date | null;
    matchingRules: Array<{
      id: string;
      label: string;
      description: string | null;
      active: boolean;
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
    const { category, budget, movementType, matchingRules, splits, ...rest } = thirdParty;

    return {
      ...rest,
      categorie: category,
      enveloppe: budget,
      typeMouvement: movementType,
      matchingRules,
      splits: splits.map(split => ({
        ...split,
        categorie: split.category,
        enveloppe: split.budget,
      })),
    };
  }

  async findAll(filters: ThirdPartyFiltersDto) {
    const { search, active, highlightId, page, limit, sortBy, sortOrder } = filters;
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
        include: THIRD_PARTY_INCLUDE,
      }),
      this.prisma.thirdParty.count({ where }),
    ]);

    let highlightIndex: number | null = null;
    if (highlightId) {
      const orderedIds = await this.prisma.thirdParty.findMany({ where, orderBy, select: { id: true } });
      const index = orderedIds.findIndex(thirdParty => thirdParty.id === highlightId);
      highlightIndex = index >= 0 ? index : null;
    }

    return { items: items.map(item => this.presenter(item)), total, page, limit, highlightIndex };
  }

  async findOne(id: string) {
    const thirdParty = await this.prisma.thirdParty.findUnique({
      where: { id },
      include: THIRD_PARTY_INCLUDE,
    });
    if (!thirdParty) throw new NotFoundException(`Tiers ${id} introuvable`);
    return this.presenter(thirdParty);
  }

  private resolveDirection(expense?: number | null, income?: number | null): 'expense' | 'income' | null {
    if (Number(expense ?? 0) > 0) return 'expense';
    if (Number(income ?? 0) > 0) return 'income';
    return null;
  }

  private async resolveMovementTypeAllowsReversal(movementTypeId?: string | null): Promise<boolean> {
    if (!movementTypeId) return false;
    const movementType = await this.prisma.movementType.findUnique({
      where: { id: movementTypeId },
      select: { allowsCategoryReversal: true },
    });
    return movementType?.allowsCategoryReversal ?? false;
  }

  private async assertSplitCategoryDirections(
    splits: Array<{ categoryId?: string | null; expense?: number | null; income?: number | null }>,
    allowReversal = false,
  ) {
    if (allowReversal) return;
    const checks: Promise<void>[] = [];
    for (const split of splits) {
      if (!split.categoryId) continue;
      const direction = this.resolveDirection(split.expense, split.income);
      if (!direction) continue;
      checks.push(
        (async () => {
          const category = await this.prisma.category.findUnique({
            where: { id: split.categoryId! },
            select: { label: true, expense: true, income: true },
          });
          if (!category) throw new NotFoundException(`Catégorie ${split.categoryId} introuvable`);
          if (direction === 'expense' && !category.expense) {
            throw new BadRequestException(`La catégorie "${category.label}" n'est pas paramétrée en dépense.`);
          }
          if (direction === 'income' && !category.income) {
            throw new BadRequestException(`La catégorie "${category.label}" n'est pas paramétrée en recette.`);
          }
        })(),
      );
    }
    await Promise.all(checks);
  }

  async create(dto: CreateThirdPartyDto) {
    const matchingRules = (dto as CreateThirdPartyDto & { matchingRules?: ThirdPartyMatchingRuleDto[] }).matchingRules;
    const splits = (dto.splits ?? []).filter(
      split =>
        split.label || split.categoryId || split.budgetId || (split.expense ?? 0) > 0 || (split.income ?? 0) > 0,
    );
    const allowReversal = await this.resolveMovementTypeAllowsReversal(dto.movementTypeId);
    await this.assertSplitCategoryDirections(splits, allowReversal);

    const thirdParty = await this.prisma.thirdParty.create({
      data: {
        name: dto.name,
        idSource: dto.idSource ?? null,
        comment: dto.comment ?? null,
        budgetBearer: dto.budgetBearer ?? false,
        ventilated: dto.ventilated ?? false,
        categoryId: dto.categoryId ?? null,
        budgetId: dto.budgetId ?? null,
        movementTypeId: dto.movementTypeId ?? null,
        active: dto.active ?? true,
        matchingRules: this.buildMatchingRulesCreate(matchingRules ?? []),
        splits: splits.length > 0 ? {
          create: splits.map((split, index) => ({
            label: split.label ?? null,
            expense: split.expense ?? 0,
            income: split.income ?? 0,
            balance: (split.income ?? 0) - (split.expense ?? 0),
            categoryId: split.categoryId ?? null,
            budgetId: split.budgetId ?? null,
            position: index,
          })),
        } : undefined,
      },
      include: THIRD_PARTY_INCLUDE,
    });

    return this.presenter(thirdParty);
  }

  async update(id: string, dto: UpdateThirdPartyDto) {
    const existing = await this.findOne(id);
    const matchingRules = (dto as UpdateThirdPartyDto & { matchingRules?: ThirdPartyMatchingRuleDto[] }).matchingRules;
    const splits = dto.splits?.filter(
      split =>
        split.label || split.categoryId || split.budgetId || (split.expense ?? 0) > 0 || (split.income ?? 0) > 0,
    );
    if (splits) {
      const effectiveMovementTypeId = dto.movementTypeId !== undefined ? dto.movementTypeId : existing.movementTypeId;
      const allowReversal = await this.resolveMovementTypeAllowsReversal(effectiveMovementTypeId);
      await this.assertSplitCategoryDirections(splits, allowReversal);
    }

    const thirdParty = await this.prisma.thirdParty.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.idSource !== undefined && { idSource: dto.idSource ?? null }),
        ...(dto.comment !== undefined && { comment: dto.comment ?? null }),
        ...(dto.budgetBearer !== undefined && { budgetBearer: dto.budgetBearer }),
        ...(dto.ventilated !== undefined && { ventilated: dto.ventilated }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId ?? null }),
        ...(dto.budgetId !== undefined && { budgetId: dto.budgetId ?? null }),
        ...(dto.movementTypeId !== undefined && { movementTypeId: dto.movementTypeId ?? null }),
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
            create: splits.map((split, index) => ({
              label: split.label ?? null,
              expense: split.expense ?? 0,
              income: split.income ?? 0,
              balance: (split.income ?? 0) - (split.expense ?? 0),
              categoryId: split.categoryId ?? null,
              budgetId: split.budgetId ?? null,
              position: index,
            })),
          },
        }),
      },
      include: THIRD_PARTY_INCLUDE,
    });

    return this.presenter(thirdParty);
  }

  async remove(id: string) {
    const thirdParty = await this.findOne(id);

    const [operationsCount, subscriptionsCount, migratedFromCount] = await this.prisma.$transaction([
      this.prisma.operation.count({ where: { thirdPartyId: id, deletedAt: null } }),
      this.prisma.subscription.count({ where: { thirdPartyId: id } }),
      this.prisma.thirdParty.count({ where: { migratedToId: id } }),
    ]);

    if (operationsCount > 0 || subscriptionsCount > 0 || migratedFromCount > 0) {
      const details: string[] = [];
      if (operationsCount > 0) details.push(`${operationsCount} opération(s)`);
      if (subscriptionsCount > 0) details.push(`${subscriptionsCount} abonnement(s)`);
      if (migratedFromCount > 0) details.push(`${migratedFromCount} tiers migré(s) depuis celui-ci`);

      throw new ConflictException(
        `Impossible de supprimer le tiers "${thirdParty.name}" : utilisé par ${details.join(', ')}.`,
      );
    }

    await this.prisma.thirdParty.delete({ where: { id } });
    return { status: 'deleted' as const, item: thirdParty };
  }

  async duplicate(id: string) {
    const existing = await this.prisma.thirdParty.findUnique({
      where: { id },
      include: { splits: { orderBy: { position: 'asc' } } },
    });
    if (!existing) {
      throw new NotFoundException(`Tiers ${id} introuvable`);
    }

    const duplicated = await this.prisma.thirdParty.create({
      data: {
        name: `${existing.name} (copie)`,
        comment: existing.comment,
        budgetBearer: existing.budgetBearer,
        ventilated: existing.ventilated,
        categoryId: existing.categoryId,
        budgetId: existing.budgetId,
        movementTypeId: existing.movementTypeId,
        active: existing.active,
        splits: existing.splits.length > 0 ? {
          create: existing.splits.map((split, index) => ({
            label: split.label,
            expense: split.expense,
            income: split.income,
            balance: split.balance,
            categoryId: split.categoryId,
            budgetId: split.budgetId,
            position: index,
          })),
        } : undefined,
      },
      include: THIRD_PARTY_INCLUDE,
    });

    return this.presenter(duplicated);
  }

  async migrate(id: string, targetId: string) {
    if (id === targetId) {
      throw new BadRequestException('Impossible de migrer un tiers vers lui-même.');
    }

    const source = await this.findOne(id);
    const target = await this.findOne(targetId);

    if (source.migratedToId) {
      throw new BadRequestException(`Ce tiers a déjà été migré vers "${source.migratedTo?.name ?? ''}".`);
    }

    if (target.migratedToId) {
      throw new BadRequestException(
        `Le tiers cible a lui-même été migré vers "${target.migratedTo?.name ?? ''}". Choisissez un tiers actif.`,
      );
    }

    const [operationsCount, subscriptionsCount] = await this.prisma.$transaction([
      this.prisma.operation.updateMany({ where: { thirdPartyId: id }, data: { thirdPartyId: targetId } }),
      this.prisma.subscription.updateMany({ where: { thirdPartyId: id }, data: { thirdPartyId: targetId } }),
    ]);

    const total = operationsCount.count + subscriptionsCount.count;

    const now = new Date();
    const report = [
      `Migration effectuée le ${now.toLocaleString('fr-FR')}`,
      `Tiers "${source.name}" migré vers "${target.name}"`,
      '',
      `Opérations mises à jour : ${operationsCount.count}`,
      `Abonnements mis à jour : ${subscriptionsCount.count}`,
      '',
      `Total : ${total} référence(s) mise(s) à jour.`,
      '',
      "Remarque : les règles d'affectation automatique et le profil de ventilation de ce tiers ne sont pas transférés automatiquement — vérifiez-les sur le tiers cible si besoin.",
    ].join('\n');

    const updatedSource = await this.prisma.thirdParty.update({
      where: { id },
      data: {
        active: false,
        migratedToId: targetId,
        migrationReport: report,
        migratedAt: now,
      },
      include: THIRD_PARTY_INCLUDE,
    });

    return {
      report,
      source: this.presenter(updatedSource),
      target: this.presenter(await this.prisma.thirdParty.findUniqueOrThrow({ where: { id: targetId }, include: THIRD_PARTY_INCLUDE })),
    };
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
