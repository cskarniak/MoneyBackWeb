import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DetailedStatisticsFiltersSchema,
  EnvelopeSummaryFiltersSchema,
  MonthlyCategoryDashboardFiltersSchema,
} from '@moneyback/shared';
import { StatisticsService } from './statistics.service';

@ApiTags('statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly service: StatisticsService) {}

  @Get('detailed')
  @ApiOperation({ summary: 'Statistiques détaillées par critères analytiques' })
  findDetailed(@Query() query: Record<string, string>) {
    const filters = DetailedStatisticsFiltersSchema.parse(query);
    return this.service.findDetailed(filters);
  }

  @Get('envelope-summary')
  @ApiOperation({ summary: 'Synthèse agrégée par enveloppe à une date donnée' })
  findEnvelopeSummary(@Query() query: Record<string, string>) {
    const filters = EnvelopeSummaryFiltersSchema.parse(query);
    return this.service.findEnvelopeSummary(filters);
  }

  @Get('monthly-category-dashboard')
  @ApiOperation({ summary: 'Tableau de bord mensuel des montants par regroupement de catégories' })
  findMonthlyCategoryDashboard(@Query() query: Record<string, string>) {
    const filters = MonthlyCategoryDashboardFiltersSchema.parse(query);
    return this.service.findMonthlyCategoryDashboard(filters);
  }
}
