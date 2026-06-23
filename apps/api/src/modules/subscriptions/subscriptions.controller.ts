import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  GenerateSubscriptionsSchema,
  PreviewSubscriptionsGenerationSchema,
  SubscriptionFiltersSchema,
} from '@moneyback/shared';
import type {
  CreateSubscriptionDto,
  GenerateSubscriptionsDto,
  PreviewSubscriptionsGenerationDto,
  UpdateSubscriptionDto,
} from '@moneyback/shared';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des abonnements' })
  findAll(@Query() query: Record<string, string>) {
    const filters = SubscriptionFiltersSchema.parse(query);
    return this.service.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSubscriptionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.service.update(id, dto);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Genere les operations des abonnements echus' })
  generate(@Body() body: GenerateSubscriptionsDto) {
    const dto = GenerateSubscriptionsSchema.parse(body);
    return this.service.generateDue(dto);
  }

  @Post('generate/eligible')
  @ApiOperation({ summary: 'Liste les abonnements eligibles a la generation' })
  previewGeneration(@Body() body: PreviewSubscriptionsGenerationDto) {
    const dto = PreviewSubscriptionsGenerationSchema.parse(body);
    return this.service.previewGeneration(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
