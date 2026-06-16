import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateGroupingDto, UpdateGroupingDto, GroupingFiltersDto } from '@moneyback/shared';

@Injectable()
export class GroupingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: GroupingFiltersDto) {
    const { search, page, limit, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;
    const where = search ? { label: { contains: search, mode: 'insensitive' as const } } : {};
    const orderBy = { [sortBy]: sortOrder };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.grouping.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.grouping.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const grouping = await this.prisma.grouping.findUnique({ where: { id } });
    if (!grouping) throw new NotFoundException(`Regroupement ${id} introuvable`);
    return grouping;
  }

  async create(dto: CreateGroupingDto) {
    return this.prisma.grouping.create({ data: dto });
  }

  async update(id: string, dto: UpdateGroupingDto) {
    await this.findOne(id);
    return this.prisma.grouping.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.grouping.delete({ where: { id } });
  }
}
