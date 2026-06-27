import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AutoAssignOperationThirdPartiesSchema,
  DeleteStatementImportSchema,
  OperationFiltersSchema,
} from '@moneyback/shared';
import type {
  AutoAssignOperationThirdPartiesDto,
  CreateOperationDto,
  DeleteStatementImportDto,
  UpdateOperationDto,
} from '@moneyback/shared';
import { OperationsService } from './operations.service';

@ApiTags('operations')
@Controller('operations')
export class OperationsController {
  constructor(private readonly service: OperationsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des opérations' })
  findAll(@Query() query: Record<string, string>) {
    const filters = OperationFiltersSchema.parse(query);
    return this.service.findAll(filters);
  }

  @Get('statement-refs')
  @ApiOperation({ summary: 'Liste des numéros de lot utilisés' })
  findUsedStatementRefs(@Query() query: Record<string, string>) {
    const filters = OperationFiltersSchema.pick({ accountId: true }).parse(query);
    return this.service.findUsedStatementRefs(filters.accountId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateOperationDto) {
    return this.service.create(dto);
  }

  @Post('auto-assign-third-parties')
  @ApiOperation({ summary: 'Affecte automatiquement les tiers selon les règles de matching' })
  autoAssignThirdParties(@Body() body: AutoAssignOperationThirdPartiesDto) {
    const dto = AutoAssignOperationThirdPartiesSchema.parse(body);
    return this.service.autoAssignThirdParties(dto);
  }

  @Delete('statement-import')
  @ApiOperation({ summary: "Supprime un relevé importé à partir de sa référence" })
  removeStatementImport(@Body() body: DeleteStatementImportDto) {
    const dto = DeleteStatementImportSchema.parse(body);
    return this.service.removeStatementImport(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOperationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
