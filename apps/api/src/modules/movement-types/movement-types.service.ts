import { Injectable, NotFoundException } from '@nestjs/common';
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
    const { search, active, page, limit, sortBy, sortOrder } = filters;
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

    return { items, total, page, limit };
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
      const inactiveMovementType = await this.prisma.movementType.update({
        where: { id },
        data: { active: false },
      });

      return {
        status: 'deactivated' as const,
        item: inactiveMovementType,
      };
    }

    await this.prisma.movementType.delete({ where: { id } });
    return {
      status: 'deleted' as const,
      item: movementType,
    };
  }
}
