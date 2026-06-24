import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DetailedStatisticsFiltersSchema } from '@moneyback/shared';
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
}
