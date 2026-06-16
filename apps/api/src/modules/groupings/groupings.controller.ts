import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GroupingsService } from './groupings.service';
import { GroupingFiltersSchema } from '@moneyback/shared';
import type { CreateGroupingDto, UpdateGroupingDto } from '@moneyback/shared';

@ApiTags('regroupements')
@Controller('regroupements')
export class GroupingsController {
  constructor(private readonly service: GroupingsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des regroupements' })
  findAll(@Query() query: Record<string, string>) {
    const filters = GroupingFiltersSchema.parse(query);
    return this.service.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateGroupingDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGroupingDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
