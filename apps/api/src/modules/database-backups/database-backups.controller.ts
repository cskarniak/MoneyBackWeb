import { Controller, Get, Param, Post, Res, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseBackupsService } from './database-backups.service';
import { createReadStream } from 'node:fs';
import type { Response } from 'express';

@ApiTags('database-backups')
@Controller('database-backups')
export class DatabaseBackupsController {
  constructor(private readonly service: DatabaseBackupsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste les sauvegardes disponibles' })
  list() {
    return this.service.listBackups();
  }

  @Post()
  @ApiOperation({ summary: 'Crée une sauvegarde datée de la base PostgreSQL' })
  create() {
    return this.service.createBackup();
  }

  @Get(':filename/download')
  @ApiOperation({ summary: 'Télécharge une sauvegarde SQL' })
  async download(@Param('filename') filename: string, @Res({ passthrough: true }) response: Response) {
    const backup = await this.service.getBackupFile(filename);
    response.setHeader('Content-Type', 'application/sql');
    response.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
    response.setHeader('Content-Length', String(backup.sizeBytes));
    return new StreamableFile(createReadStream(backup.path));
  }

  @Post(':filename/restore')
  @ApiOperation({ summary: 'Restaure la base PostgreSQL à partir d\'une sauvegarde' })
  restore(@Param('filename') filename: string) {
    return this.service.restoreBackup(filename);
  }
}
