import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AccountFiltersDto, CreateAccountDto, UpdateAccountDto } from '@moneyback/shared';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: AccountFiltersDto) {
    const { search, closed, page, limit, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    const where = {
      ...(closed !== undefined && { closed }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { agency: { contains: search, mode: 'insensitive' as const } },
          { number: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const orderBy = { [sortBy]: sortOrder };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.account.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.account.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException(`Compte ${id} introuvable`);
    return account;
  }

  async create(dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        name: dto.name,
        agency: dto.agency ?? null,
        number: dto.number ?? null,
        rib: dto.rib ?? null,
        bankUrl: dto.bankUrl || null,
        bankLogin: dto.bankLogin ?? null,
        comment: dto.comment ?? null,
        openingBalance: dto.openingBalance ?? null,
        managedForOther: dto.managedForOther ?? false,
        closed: dto.closed ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateAccountDto) {
    await this.findOne(id);
    return this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.agency !== undefined && { agency: dto.agency ?? null }),
        ...(dto.number !== undefined && { number: dto.number ?? null }),
        ...(dto.rib !== undefined && { rib: dto.rib ?? null }),
        ...(dto.bankUrl !== undefined && { bankUrl: dto.bankUrl || null }),
        ...(dto.bankLogin !== undefined && { bankLogin: dto.bankLogin ?? null }),
        ...(dto.comment !== undefined && { comment: dto.comment ?? null }),
        ...(dto.openingBalance !== undefined && { openingBalance: dto.openingBalance ?? null }),
        ...(dto.managedForOther !== undefined && { managedForOther: dto.managedForOther }),
        ...(dto.closed !== undefined && { closed: dto.closed }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.account.delete({ where: { id } });
  }
}
