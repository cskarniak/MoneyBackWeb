import { Module } from '@nestjs/common';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { ThirdPartiesModule } from '../third-parties/third-parties.module';

@Module({
  imports: [ThirdPartiesModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
