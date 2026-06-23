import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentMethodFiltersSchema } from '@moneyback/shared';
import type { CreatePaymentMethodDto, UpdatePaymentMethodDto } from '@moneyback/shared';
import { PaymentMethodsService } from './payment-methods.service';

@ApiTags('payment-methods')
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly service: PaymentMethodsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des moyens de paiement' })
  findAll(@Query() query: Record<string, string>) {
    const filters = PaymentMethodFiltersSchema.parse(query);
    return this.service.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePaymentMethodDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePaymentMethodDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
