import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BudgetFiltersSchema, MigrateEntitySchema, RebuildBudgetBalancesSchema } from '@moneyback/shared';
import type { CreateBudgetDto, UpdateBudgetDto } from '@moneyback/shared';
import { BudgetsService } from './budgets.service';

@ApiTags('budgets')
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des budgets / enveloppes' })
  findAll(@Query() query: Record<string, string>) {
    const filters = BudgetFiltersSchema.parse(query);
    return this.service.findAll(filters);
  }

  @Post('rebuild-balances')
  @ApiOperation({ summary: 'Recalcule et persiste le solde de toutes les enveloppes' })
  rebuildBalances(@Body() body: Record<string, unknown>) {
    const { referenceDate } = RebuildBudgetBalancesSchema.parse(body);
    return this.service.rebuildBalances(referenceDate);
  }

  @Get('balance-anomalies')
  @ApiOperation({ summary: 'Liste les enveloppes dont le solde sort de la plage attendue configurée' })
  findBalanceAnomalies() {
    return this.service.findBalanceAnomalies();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBudgetDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/migrate')
  @ApiOperation({ summary: 'Migre toutes les références de cette enveloppe vers une autre' })
  migrate(@Param('id') id: string, @Body() body: unknown) {
    const { targetId } = MigrateEntitySchema.parse(body);
    return this.service.migrate(id, targetId);
  }
}
