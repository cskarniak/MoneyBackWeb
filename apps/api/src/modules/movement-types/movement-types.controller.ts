import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MovementTypeFiltersSchema } from '@moneyback/shared';
import type { CreateMovementTypeDto, UpdateMovementTypeDto } from '@moneyback/shared';
import { MovementTypesService } from './movement-types.service';

@ApiTags('movement-types')
@Controller('movement-types')
export class MovementTypesController {
  constructor(private readonly service: MovementTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des types de mouvement' })
  findAll(@Query() query: Record<string, string>) {
    const filters = MovementTypeFiltersSchema.parse(query);
    return this.service.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMovementTypeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMovementTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
