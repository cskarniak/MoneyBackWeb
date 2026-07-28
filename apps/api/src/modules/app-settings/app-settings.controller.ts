import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateCurrentMonthSchema, type UpdateCurrentMonthDto } from '@moneyback/shared';
import { AppSettingsService } from './app-settings.service';

@ApiTags('app-settings')
@Controller('app-settings')
export class AppSettingsController {
  constructor(private readonly service: AppSettingsService) {}

  @Get('current-month')
  @ApiOperation({ summary: 'Mois en cours utilisé comme référence pour les moyennes (provisionnement)' })
  getCurrentMonth() {
    return this.service.getCurrentMonth();
  }

  @Patch('current-month')
  @ApiOperation({ summary: 'Modifier le mois en cours de référence' })
  updateCurrentMonth(@Body() body: UpdateCurrentMonthDto) {
    const { currentMonth } = UpdateCurrentMonthSchema.parse(body);
    return this.service.updateCurrentMonth(currentMonth);
  }
}
