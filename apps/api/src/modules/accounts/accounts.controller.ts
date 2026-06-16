import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountFiltersSchema } from '@moneyback/shared';
import type { CreateAccountDto, UpdateAccountDto } from '@moneyback/shared';
import { AccountsService } from './accounts.service';

@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly service: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des comptes bancaires' })
  findAll(@Query() query: Record<string, string>) {
    const filters = AccountFiltersSchema.parse(query);
    return this.service.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
