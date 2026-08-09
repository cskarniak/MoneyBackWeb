import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateMovementTypeDto,
  MovementTypeFiltersDto,
  UpdateMovementTypeDto,
} from '@moneyback/shared';

@Injectable()
export class MovementTypesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: MovementTypeFiltersDto) {
    const { search, active, highlightId, page, limit, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    const where = {
      ...(active !== undefined && { active }),
      ...(search && { label: { contains: search, mode: 'insensitive' as const } }),
    };

    const orderBy = { [sortBy]: sortOrder };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.movementType.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.movementType.count({ where }),
    ]);

    let highlightIndex: number | null = null;
    if (highlightId) {
      const orderedIds = await this.prisma.movementType.findMany({ where, orderBy, select: { id: true } });
      const index = orderedIds.findIndex(movementType => movementType.id === highlightId);
      highlightIndex = index >= 0 ? index : null;
    }

    return { items, total, page, limit, highlightIndex };
  }

  async findOne(id: string) {
    const movementType = await this.prisma.movementType.findUnique({
      where: { id },
    });
    if (!movementType) throw new NotFoundException(`Type de mouvement ${id} introuvable`);
    return movementType;
  }

  async create(dto: CreateMovementTypeDto) {
    return this.prisma.movementType.create({
      data: {
        label: dto.label,
        code: dto.code ?? null,
        idSource: dto.idSource ?? null,
        active: dto.active ?? true,
        allowsCategoryReversal: dto.allowsCategoryReversal ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateMovementTypeDto) {
    await this.findOne(id);
    return this.prisma.movementType.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.code !== undefined && { code: dto.code ?? null }),
        ...(dto.idSource !== undefined && { idSource: dto.idSource ?? null }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.allowsCategoryReversal !== undefined && { allowsCategoryReversal: dto.allowsCategoryReversal }),
      },
    });
  }

  async remove(id: string) {
    const movementType = await this.findOne(id);
    const [operationsCount, budgetsCount, subscriptionsCount] = await this.prisma.$transaction([
      this.prisma.operation.count({ where: { movementTypeId: id } }),
      this.prisma.budget.count({ where: { movementTypeId: id } }),
      this.prisma.subscription.count({ where: { movementTypeId: id } }),
    ]);

    if (operationsCount > 0 || budgetsCount > 0 || subscriptionsCount > 0) {
      const details: string[] = [];
      if (operationsCount > 0) details.push(`${operationsCount} opération(s)`);
      if (budgetsCount > 0) details.push(`${budgetsCount} enveloppe(s)`);
      if (subscriptionsCount > 0) details.push(`${subscriptionsCount} abonnement(s)`);

      throw new ConflictException(
        `Impossible de supprimer le type de mouvement "${movementType.label}" : utilisé par ${details.join(', ')}.`,
      );
    }

    await this.prisma.movementType.delete({ where: { id } });
    return {
      status: 'deleted' as const,
      item: movementType,
    };
  }
}
