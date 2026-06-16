import { Module } from '@nestjs/common';
import { GroupingsController } from './groupings.controller';
import { GroupingsService } from './groupings.service';

@Module({
  controllers: [GroupingsController],
  providers: [GroupingsService],
})
export class GroupingsModule {}
