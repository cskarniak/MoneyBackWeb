import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OperationFiltersSchema } from '@moneyback/shared';
import type { CreateOperationDto, UpdateOperationDto } from '@moneyback/shared';
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateOperationDto) {
    return this.service.create(dto);
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
