import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreatePaymentMethodDto,
  PaymentMethodFiltersDto,
  UpdatePaymentMethodDto,
} from '@moneyback/shared';

@Injectable()
export class PaymentMethodsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: PaymentMethodFiltersDto) {
    const { search, active, highlightId, page, limit, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    const where = {
      ...(active !== undefined && { active }),
      ...(search && { label: { contains: search, mode: 'insensitive' as const } }),
    };

    const orderBy = { [sortBy]: sortOrder };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.paymentMethod.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.paymentMethod.count({ where }),
    ]);

    let highlightIndex: number | null = null;
    if (highlightId) {
      const orderedIds = await this.prisma.paymentMethod.findMany({ where, orderBy, select: { id: true } });
      const index = orderedIds.findIndex(paymentMethod => paymentMethod.id === highlightId);
      highlightIndex = index >= 0 ? index : null;
    }

    return { items, total, page, limit, highlightIndex };
  }

  async findOne(id: string) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id },
    });
    if (!paymentMethod) throw new NotFoundException(`Moyen de paiement ${id} introuvable`);
    return paymentMethod;
  }

  async create(dto: CreatePaymentMethodDto) {
    return this.prisma.paymentMethod.create({
      data: {
        label: dto.label,
        code: dto.code ?? null,
        idSource: dto.idSource ?? null,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePaymentMethodDto) {
    await this.findOne(id);
    return this.prisma.paymentMethod.update({
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
    const paymentMethod = await this.findOne(id);
    const operationsCount = await this.prisma.operation.count({
      where: { paymentMethodId: id },
    });

    if (operationsCount > 0) {
      const inactivePaymentMethod = await this.prisma.paymentMethod.update({
        where: { id },
        data: { active: false },
      });

      return {
        status: 'deactivated' as const,
        item: inactivePaymentMethod,
      };
    }

    await this.prisma.paymentMethod.delete({ where: { id } });
    return {
      status: 'deleted' as const,
      item: paymentMethod,
    };
  }
}
