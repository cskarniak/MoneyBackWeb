import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThirdPartyFiltersSchema } from '@moneyback/shared';
import type { CreateThirdPartyDto, UpdateThirdPartyDto } from '@moneyback/shared';
import { ThirdPartiesService } from './third-parties.service';

@ApiTags('third-parties')
@Controller('third-parties')
export class ThirdPartiesController {
  constructor(private readonly service: ThirdPartiesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des tiers' })
  findAll(@Query() query: Record<string, string>) {
    const filters = ThirdPartyFiltersSchema.parse(query);
    return this.service.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateThirdPartyDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateThirdPartyDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
