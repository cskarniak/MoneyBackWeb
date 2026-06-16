import { Module } from '@nestjs/common';
import { ThirdPartiesController } from './third-parties.controller';
import { ThirdPartiesService } from './third-parties.service';

@Module({
  controllers: [ThirdPartiesController],
  providers: [ThirdPartiesService],
})
export class ThirdPartiesModule {}
