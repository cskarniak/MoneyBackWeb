import { Module } from '@nestjs/common';
import { ImportProfilesController } from './import-profiles.controller';
import { ImportProfilesService } from './import-profiles.service';

@Module({
  controllers: [ImportProfilesController],
  providers: [ImportProfilesService],
})
export class ImportProfilesModule {}
