import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateGroupingDto, UpdateGroupingDto, GroupingFiltersDto } from '@moneyback/shared';

@Injectable()
export class GroupingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: GroupingFiltersDto) {
    const { search, highlightId, page, limit, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;
    const where = search ? { label: { contains: search, mode: 'insensitive' as const } } : {};
    const orderBy = { [sortBy]: sortOrder };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.grouping.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.grouping.count({ where }),
    ]);

    let highlightIndex: number | null = null;
    if (highlightId) {
      const orderedIds = await this.prisma.grouping.findMany({ where, orderBy, select: { id: true } });
      const index = orderedIds.findIndex(grouping => grouping.id === highlightId);
      highlightIndex = index >= 0 ? index : null;
    }

    return { items, total, page, limit, highlightIndex };
  }

  async findOne(id: string) {
    const grouping = await this.prisma.grouping.findUnique({ where: { id } });
    if (!grouping) throw new NotFoundException(`Regroupement ${id} introuvable`);
    return grouping;
  }

  async create(dto: CreateGroupingDto) {
    return this.prisma.grouping.create({
      data: {
        label: dto.label,
        idSource: dto.idSource ?? null,
        expense: dto.expense ?? false,
        income: dto.income ?? false,
        dashboard: dto.dashboard ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateGroupingDto) {
    await this.findOne(id);
    return this.prisma.grouping.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.idSource !== undefined && { idSource: dto.idSource ?? null }),
        ...(dto.expense !== undefined && { expense: dto.expense }),
        ...(dto.income !== undefined && { income: dto.income }),
        ...(dto.dashboard !== undefined && { dashboard: dto.dashboard }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.grouping.delete({ where: { id } });
  }
}
