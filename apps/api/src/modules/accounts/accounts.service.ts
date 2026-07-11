import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AccountFiltersDto, CreateAccountDto, UpdateAccountDto } from '@moneyback/shared';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  private toNumber(value: unknown) {
    if (value === null || value === undefined) {
      return 0;
    }

    return Number(value);
  }

  private async getCurrentBalances(accountIds: string[]) {
    if (accountIds.length === 0) {
      return new Map<string, number>();
    }

    const [accounts, operations] = await this.prisma.$transaction([
      this.prisma.account.findMany({
        where: { id: { in: accountIds } },
        select: {
          id: true,
          closureBalance: true,
          openingBalance: true,
        },
      }),
      this.prisma.operation.findMany({
        where: {
          accountId: { in: accountIds },
          closed: false,
        },
        select: {
          accountId: true,
          income: true,
          expense: true,
        },
      }),
    ]);

    const operationSumsByAccount = operations.reduce((map, operation) => {
      const current = map.get(operation.accountId) ?? 0;
      const next = current + this.toNumber(operation.income) - this.toNumber(operation.expense);
      map.set(operation.accountId, next);
      return map;
    }, new Map<string, number>());

    return new Map(
      accounts.map(account => {
        const baseBalance =
          account.closureBalance !== null && account.closureBalance !== undefined
            ? this.toNumber(account.closureBalance)
            : this.toNumber(account.openingBalance);

        return [account.id, baseBalance + (operationSumsByAccount.get(account.id) ?? 0)];
      }),
    );
  }

  private async presentAccount<T extends { id: string }>(account: T) {
    const balances = await this.getCurrentBalances([account.id]);

    return {
      ...account,
      currentBalance: balances.get(account.id) ?? 0,
    };
  }

  private async presentAccounts<T extends { id: string }>(accounts: T[]) {
    const balances = await this.getCurrentBalances(accounts.map(account => account.id));

    return accounts.map(account => ({
      ...account,
      currentBalance: balances.get(account.id) ?? 0,
    }));
  }

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

    return { items: await this.presentAccounts(items), total, page, limit };
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException(`Compte ${id} introuvable`);
    return this.presentAccount(account);
  }

  async create(dto: CreateAccountDto) {
    const showOnHome = 'showOnHome' in dto ? dto.showOnHome : undefined;

    const account = await this.prisma.account.create({
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
        showOnHome: showOnHome ?? false,
        closed: dto.closed ?? false,
      },
    });

    return this.presentAccount(account);
  }

  async update(id: string, dto: UpdateAccountDto) {
    await this.findOne(id);
    const showOnHome = 'showOnHome' in dto ? dto.showOnHome : undefined;
    const account = await this.prisma.account.update({
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
        ...(showOnHome !== undefined && { showOnHome }),
        ...(dto.closed !== undefined && { closed: dto.closed }),
      },
    });

    return this.presentAccount(account);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.account.delete({ where: { id } });
  }
}
