import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CategoryFiltersSchema, MigrateEntitySchema } from '@moneyback/shared';
import type { CreateCategoryDto, UpdateCategoryDto } from '@moneyback/shared';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des catégories' })
  findAll(@Query() query: Record<string, string>) {
    const filters = CategoryFiltersSchema.parse(query);
    return this.service.findAll(filters);
  }

  @Get('diagnostics/mixed-direction')
  @ApiOperation({ summary: 'Liste les catégories utilisées à la fois en dépense et en recette' })
  findMixedDirection() {
    return this.service.findMixedDirectionUsage();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/migrate')
  @ApiOperation({ summary: 'Migre toutes les références de cette catégorie vers une autre' })
  migrate(@Param('id') id: string, @Body() body: unknown) {
    const { targetId } = MigrateEntitySchema.parse(body);
    return this.service.migrate(id, targetId);
  }
}
