import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  BankCsvConfirmSchema,
  BankCsvPreviewSchema,
  CreateImportProfileSchema,
  ImportProfileFiltersSchema,
  UpdateImportProfileSchema,
} from '@moneyback/shared';
import { ImportProfilesService } from './import-profiles.service';

@ApiTags('import-profiles')
@Controller('import-profiles')
export class ImportProfilesController {
  constructor(private readonly service: ImportProfilesService) {}

  @Get()
  @ApiOperation({ summary: "Liste des masques d'import" })
  findAll(@Query() query: Record<string, string>) {
    const filters = ImportProfileFiltersSchema.parse(query);
    return this.service.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: "Detail d'un masque d'import" })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Creation d'un masque d'import bancaire CSV" })
  create(@Body() body: unknown) {
    const dto = CreateImportProfileSchema.parse(body);
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Mise a jour d'un masque d'import" })
  update(@Param('id') id: string, @Body() body: unknown) {
    const dto = UpdateImportProfileSchema.parse(body);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Suppression d'un masque d'import" })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('preview-bank-csv')
  @ApiOperation({ summary: "Preview d'un import CSV bancaire" })
  previewBankCsv(@Body() body: unknown) {
    const dto = BankCsvPreviewSchema.parse(body);
    return this.service.previewBankCsv(dto);
  }

  @Post('confirm-bank-csv')
  @ApiOperation({ summary: "Confirmation d'un import CSV bancaire" })
  confirmBankCsv(@Body() body: unknown) {
    const dto = BankCsvConfirmSchema.parse(body);
    return this.service.confirmBankCsv(dto);
  }
}
