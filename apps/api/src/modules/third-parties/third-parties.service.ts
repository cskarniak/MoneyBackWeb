import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateThirdPartyDto,
  ThirdPartyFiltersDto,
  UpdateThirdPartyDto,
} from '@moneyback/shared';

@Injectable()
export class ThirdPartiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: ThirdPartyFiltersDto) {
    const { search, active, page, limit, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    const where = {
      ...(active !== undefined && { active }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { keyword1: { contains: search, mode: 'insensitive' as const } },
          { keyword2: { contains: search, mode: 'insensitive' as const } },
          { keyword3: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const orderBy = { [sortBy]: sortOrder };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.thirdParty.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.thirdParty.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const thirdParty = await this.prisma.thirdParty.findUnique({ where: { id } });
    if (!thirdParty) throw new NotFoundException(`Tiers ${id} introuvable`);
    return thirdParty;
  }

  async create(dto: CreateThirdPartyDto) {
    return this.prisma.thirdParty.create({
      data: {
        name: dto.name,
        keyword1: dto.keyword1 ?? null,
        keyword2: dto.keyword2 ?? null,
        keyword3: dto.keyword3 ?? null,
        keywordMode: dto.keywordMode ?? 'OR',
        affectationFormula: dto.affectationFormula ?? null,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateThirdPartyDto) {
    await this.findOne(id);
    return this.prisma.thirdParty.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.keyword1 !== undefined && { keyword1: dto.keyword1 ?? null }),
        ...(dto.keyword2 !== undefined && { keyword2: dto.keyword2 ?? null }),
        ...(dto.keyword3 !== undefined && { keyword3: dto.keyword3 ?? null }),
        ...(dto.keywordMode !== undefined && { keywordMode: dto.keywordMode }),
        ...(dto.affectationFormula !== undefined && {
          affectationFormula: dto.affectationFormula ?? null,
        }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.thirdParty.delete({ where: { id } });
  }
}
