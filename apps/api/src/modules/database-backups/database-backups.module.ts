import { Module } from '@nestjs/common';
import { DatabaseBackupsController } from './database-backups.controller';
import { DatabaseBackupsService } from './database-backups.service';

@Module({
  controllers: [DatabaseBackupsController],
  providers: [DatabaseBackupsService],
})
export class DatabaseBackupsModule {}
