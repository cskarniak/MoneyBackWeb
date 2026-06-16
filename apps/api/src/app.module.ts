import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { GroupingsModule } from './modules/groupings/groupings.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { OperationsModule } from './modules/operations/operations.module';
import { ThirdPartiesModule } from './modules/third-parties/third-parties.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '../../.env.local'],
    }),
    PrismaModule,
    AccountsModule,
    CategoriesModule,
    GroupingsModule,
    BudgetsModule,
    OperationsModule,
    ThirdPartiesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
