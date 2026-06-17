import { Module } from '@nestjs/common';
import { ThirdPartiesController } from './third-parties.controller';
import { ThirdPartiesService } from './third-parties.service';
import { ThirdPartyMatchingService } from './third-party-matching.service';

@Module({
  controllers: [ThirdPartiesController],
  providers: [ThirdPartiesService, ThirdPartyMatchingService],
  exports: [ThirdPartyMatchingService],
})
export class ThirdPartiesModule {}
