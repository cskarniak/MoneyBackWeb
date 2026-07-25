import { Body, Controller, Get, Param, Post, Put, Res, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseBackupsService } from './database-backups.service';
import { createReadStream } from 'node:fs';
import type { Response } from 'express';

type UpdateStorageSettingsBody = {
  backupsDir?: string | null;
  icloudDir?: string | null;
};

@ApiTags('database-backups')
@Controller('database-backups')
export class DatabaseBackupsController {
  constructor(private readonly service: DatabaseBackupsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste les sauvegardes disponibles' })
  list() {
    return this.service.listBackups();
  }

  @Get('settings')
  @ApiOperation({ summary: 'Récupère la configuration des dossiers de sauvegarde' })
  getSettings() {
    return this.service.getStorageSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Met à jour la configuration des dossiers de sauvegarde' })
  updateSettings(@Body() body: UpdateStorageSettingsBody) {
    return this.service.updateStorageSettings(body);
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

  @Post(':filename/icloud')
  @ApiOperation({ summary: 'Copie une sauvegarde vers le dossier iCloud configuré' })
  sendToICloud(@Param('filename') filename: string) {
    return this.service.sendToICloud(filename);
  }
}
