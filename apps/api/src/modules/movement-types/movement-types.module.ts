import { Module } from '@nestjs/common';
import { MovementTypesController } from './movement-types.controller';
import { MovementTypesService } from './movement-types.service';

@Module({
  controllers: [MovementTypesController],
  providers: [MovementTypesService],
})
export class MovementTypesModule {}
