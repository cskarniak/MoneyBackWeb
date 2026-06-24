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
import { PaymentMethodsModule } from './modules/payment-methods/payment-methods.module';
import { MovementTypesModule } from './modules/movement-types/movement-types.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { DatabaseBackupsModule } from './modules/database-backups/database-backups.module';
import { StatisticsModule } from './modules/statistics/statistics.module';

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
    PaymentMethodsModule,
    MovementTypesModule,
    OperationsModule,
    ThirdPartiesModule,
    SubscriptionsModule,
    DatabaseBackupsModule,
    StatisticsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
